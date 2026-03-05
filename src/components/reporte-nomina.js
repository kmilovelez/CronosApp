// reporte-nomina.js — Consolidado quincenal tipo Excel para nómina
import React, { useState, useEffect, useMemo } from 'react';
import {
    calcularDuracion,
    TIPO_ACTIVIDAD_LABELS,
    TIPO_NOVEDAD_LABELS,
    STATUS_LABELS,
    exportToCSV,
    formatDateISO,
} from '../utils/helpers.js';
import { getTimeEntries, getNovelties, getEmployees } from '../js/db.js';

const ReporteNomina = () => {
    const [entries, setEntries] = useState([]);
    const [novedades, setNovedades] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filtroEmpleado, setFiltroEmpleado] = useState('');
    const [filtroDesde, setFiltroDesde] = useState('');
    const [filtroHasta, setFiltroHasta] = useState('');

    useEffect(() => {
        loadData();
        // Default: quincena actual
        const now = new Date();
        const day = now.getDate();
        const year = now.getFullYear();
        const month = now.getMonth();
        if (day <= 15) {
            setFiltroDesde(formatDateISO(new Date(year, month, 1)));
            setFiltroHasta(formatDateISO(new Date(year, month, 15)));
        } else {
            setFiltroDesde(formatDateISO(new Date(year, month, 16)));
            setFiltroHasta(formatDateISO(new Date(year, month + 1, 0)));
        }
    }, []);

    const loadData = async () => {
        const [ents, novs, emps] = await Promise.all([getTimeEntries(), getNovelties(), getEmployees()]);
        setEntries(ents);
        setNovedades(novs);
        setEmployees(emps);
    };

    // Agrupar marcaciones por empleado + día → filas tipo Excel
    const consolidado = useMemo(() => {
        let filtered = entries;

        if (filtroDesde) filtered = filtered.filter((e) => e.date >= filtroDesde);
        if (filtroHasta) filtered = filtered.filter((e) => e.date <= filtroHasta);
        if (filtroEmpleado) filtered = filtered.filter((e) => e.employeeId === Number(filtroEmpleado));

        // Agrupar por employeeId + date
        const grouped = {};
        for (const entry of filtered) {
            const key = `${entry.employeeId}_${entry.date}`;
            if (!grouped[key]) {
                grouped[key] = {
                    employeeId: entry.employeeId,
                    employeeName: entry.employeeName,
                    cedula: entry.cedula,
                    date: entry.date,
                    entradas: [],
                    salidas: [],
                    projectCode: entry.projectCode,
                    tipoActividad: entry.tipoActividad,
                    esViaje: false,
                    horasViaje: 0,
                    status: entry.status,
                };
            }
            if (entry.tipoMarcacion === 'entrada') grouped[key].entradas.push(entry);
            if (entry.tipoMarcacion === 'salida') grouped[key].salidas.push(entry);
            if (entry.esViaje) {
                grouped[key].esViaje = true;
                grouped[key].horasViaje = Math.max(grouped[key].horasViaje, entry.horasViajeReconocidas || 0);
            }
        }

        // Construir filas
        return Object.values(grouped).map((g) => {
            const entrada = g.entradas[0];
            const salida = g.salidas[0];
            const horaEntrada = entrada?.esTardia ? entrada.horaDeclared : entrada?.horaLocal?.substring(0, 5);
            const horaSalida = salida?.esTardia ? salida.horaDeclared : salida?.horaLocal?.substring(0, 5);

            const duracion = calcularDuracion(horaEntrada || '', horaSalida || '', false);
            const duracionSinAlmuerzo = duracion > 5 ? duracion - 1 : duracion;

            // Buscar novedad del día
            const novedad = novedades.find((n) => n.employeeId === g.employeeId && n.date === g.date);

            return {
                empleado: g.employeeName,
                cedula: g.cedula,
                fecha: g.date,
                horaEntrada: horaEntrada || '—',
                horaSalida: horaSalida || '—',
                duracionTotal: duracion.toFixed(1) + 'h',
                almuerzo: duracion > 5 ? 'Sí (1h)' : 'No',
                duracionNeta: duracionSinAlmuerzo.toFixed(1) + 'h',
                horasViaje: g.horasViaje > 0 ? g.horasViaje.toFixed(1) + 'h' : '—',
                ot: g.projectCode || '—',
                actividad: TIPO_ACTIVIDAD_LABELS[g.tipoActividad] || g.tipoActividad,
                novedad: novedad ? TIPO_NOVEDAD_LABELS[novedad.tipo] || novedad.tipo : '—',
                novedadDetalle: novedad?.descripcion || '',
                estado: STATUS_LABELS[g.status] || g.status,
                marcacionIncompleta: (!entrada || !salida) ? '⚠️ Sí' : 'No',
            };
        }).sort((a, b) => a.empleado.localeCompare(b.empleado) || a.fecha.localeCompare(b.fecha));
    }, [entries, novedades, filtroEmpleado, filtroDesde, filtroHasta]);

    const handleExportCSV = () => {
        exportToCSV(consolidado, `CronosApp_Nomina_${filtroDesde}_${filtroHasta}.csv`);
    };

    return (
        <div className="card">
            <h2>📊 Consolidado para Nómina</h2>
            <p className="card-subtitle">Reporte quincenal de horas por empleado</p>

            {/* Filtros */}
            <div className="filters-bar">
                <div className="form-group">
                    <label>Empleado</label>
                    <select value={filtroEmpleado} onChange={(e) => setFiltroEmpleado(e.target.value)} className="input">
                        <option value="">Todos</option>
                        {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.cedula})</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Desde</label>
                    <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="input" />
                </div>
                <div className="form-group">
                    <label>Hasta</label>
                    <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="input" />
                </div>
                <button className="btn btn-outline" onClick={handleExportCSV} title="Exportar a CSV">
                    📥 Exportar CSV
                </button>
            </div>

            {/* Tabla */}
            {consolidado.length === 0 ? (
                <p className="empty-state">No hay registros para el período seleccionado.</p>
            ) : (
                <div className="table-responsive">
                    <table className="report-table nomina-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cédula</th>
                                <th>Fecha</th>
                                <th>Entrada</th>
                                <th>Salida</th>
                                <th>Duración</th>
                                <th>Almuerzo</th>
                                <th>Neto</th>
                                <th>H. Viaje</th>
                                <th>OT</th>
                                <th>Actividad</th>
                                <th>Novedad</th>
                                <th>Estado</th>
                                <th>⚠️</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consolidado.map((row, i) => (
                                <tr key={i} className={row.marcacionIncompleta.includes('Sí') ? 'row-warning' : ''}>
                                    <td>{row.empleado}</td>
                                    <td>{row.cedula}</td>
                                    <td>{row.fecha}</td>
                                    <td>{row.horaEntrada}</td>
                                    <td>{row.horaSalida}</td>
                                    <td>{row.duracionTotal}</td>
                                    <td>{row.almuerzo}</td>
                                    <td><strong>{row.duracionNeta}</strong></td>
                                    <td>{row.horasViaje}</td>
                                    <td>{row.ot}</td>
                                    <td>{row.actividad}</td>
                                    <td>{row.novedad}</td>
                                    <td><span className={`badge badge-${row.estado === 'Registrada' || row.estado === 'Aprobada' ? 'success' : 'warning'}`}>{row.estado}</span></td>
                                    <td>{row.marcacionIncompleta}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="report-summary">
                <span>Total registros: <strong>{consolidado.length}</strong></span>
                <span>Incompletos: <strong>{consolidado.filter((r) => r.marcacionIncompleta.includes('Sí')).length}</strong></span>
            </div>
        </div>
    );
};

export default ReporteNomina;

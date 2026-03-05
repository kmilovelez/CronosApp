// historial.js — Historial de marcaciones y detección de patrones
import React, { useState, useEffect, useMemo } from 'react';
import { STATUS_LABELS, TIPO_ACTIVIDAD_LABELS } from '../utils/helpers.js';
import { getTimeEntries, getEmployees } from '../js/db.js';

const Historial = () => {
    const [entries, setEntries] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filtroEmpleado, setFiltroEmpleado] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [ents, emps] = await Promise.all([getTimeEntries(), getEmployees()]);
        setEntries(ents);
        setEmployees(emps);
    };

    // Análisis de patrones por empleado
    const analisis = useMemo(() => {
        const empMap = {};

        for (const entry of entries) {
            const key = entry.employeeId;
            if (!empMap[key]) {
                empMap[key] = {
                    employeeId: key,
                    nombre: entry.employeeName,
                    cedula: entry.cedula,
                    totalMarcaciones: 0,
                    tardias: 0,
                    rechazadas: 0,
                    sinGPS: 0,
                    marcaciones: [],
                };
            }
            empMap[key].totalMarcaciones++;
            if (entry.esTardia) empMap[key].tardias++;
            if (entry.status === 'rechazada') empMap[key].rechazadas++;
            if (!entry.gps) empMap[key].sinGPS++;
            empMap[key].marcaciones.push(entry);
        }

        return Object.values(empMap).map((emp) => ({
            ...emp,
            porcentajeTardias: emp.totalMarcaciones > 0 ? ((emp.tardias / emp.totalMarcaciones) * 100).toFixed(1) : 0,
            alerta: emp.tardias >= 5 ? 'alta' : emp.tardias >= 3 ? 'media' : 'baja',
        })).sort((a, b) => b.tardias - a.tardias);
    }, [entries]);

    const empleadoSeleccionado = useMemo(() => {
        if (!filtroEmpleado) return null;
        return analisis.find((a) => a.employeeId === Number(filtroEmpleado));
    }, [analisis, filtroEmpleado]);

    return (
        <div className="card">
            <h2>📈 Historial y Patrones</h2>
            <p className="card-subtitle">Análisis de marcaciones tardías y patrones por empleado</p>

            {/* Resumen general */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-number">{entries.length}</span>
                    <span className="stat-label">Total marcaciones</span>
                </div>
                <div className="stat-card stat-warning">
                    <span className="stat-number">{entries.filter((e) => e.esTardia).length}</span>
                    <span className="stat-label">Tardías</span>
                </div>
                <div className="stat-card stat-danger">
                    <span className="stat-number">{entries.filter((e) => e.status === 'rechazada').length}</span>
                    <span className="stat-label">Rechazadas</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">{entries.filter((e) => !e.gps).length}</span>
                    <span className="stat-label">Sin GPS</span>
                </div>
            </div>

            {/* Tabla de empleados */}
            <h3>Resumen por empleado</h3>
            {analisis.length === 0 ? (
                <p className="empty-state">No hay datos para analizar.</p>
            ) : (
                <div className="table-responsive">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cédula</th>
                                <th>Total</th>
                                <th>Tardías</th>
                                <th>% Tardías</th>
                                <th>Rechazadas</th>
                                <th>Sin GPS</th>
                                <th>Alerta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analisis.map((emp) => (
                                <tr
                                    key={emp.employeeId}
                                    className={`clickable ${filtroEmpleado === String(emp.employeeId) ? 'row-selected' : ''}`}
                                    onClick={() => setFiltroEmpleado(String(emp.employeeId))}
                                >
                                    <td>{emp.nombre}</td>
                                    <td>{emp.cedula}</td>
                                    <td>{emp.totalMarcaciones}</td>
                                    <td>{emp.tardias}</td>
                                    <td>{emp.porcentajeTardias}%</td>
                                    <td>{emp.rechazadas}</td>
                                    <td>{emp.sinGPS}</td>
                                    <td>
                                        <span className={`badge badge-${emp.alerta === 'alta' ? 'error' : emp.alerta === 'media' ? 'warning' : 'success'}`}>
                                            {emp.alerta === 'alta' ? '🔴 Alta' : emp.alerta === 'media' ? '🟡 Media' : '🟢 Normal'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detalle del empleado seleccionado */}
            {empleadoSeleccionado && (
                <div className="detalle-empleado">
                    <h3>Detalle: {empleadoSeleccionado.nombre} ({empleadoSeleccionado.cedula})</h3>
                    <button className="btn btn-outline btn-sm" onClick={() => setFiltroEmpleado('')}>✕ Cerrar detalle</button>

                    <div className="table-responsive">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Hora</th>
                                    <th>OT</th>
                                    <th>Actividad</th>
                                    <th>Tardía</th>
                                    <th>Motivo</th>
                                    <th>Estado</th>
                                    <th>Ubicación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empleadoSeleccionado.marcaciones
                                    .sort((a, b) => b.date.localeCompare(a.date))
                                    .map((m) => (
                                    <tr key={m.id} className={m.esTardia ? 'row-warning' : ''}>
                                        <td>{m.date}</td>
                                        <td>{m.tipoMarcacion === 'entrada' ? '🟢' : '🔴'} {m.tipoMarcacion}</td>
                                        <td>{m.esTardia ? m.horaDeclared : m.horaLocal?.substring(0, 5)}</td>
                                        <td>{m.projectCode}</td>
                                        <td>{TIPO_ACTIVIDAD_LABELS[m.tipoActividad] || '—'}</td>
                                        <td>{m.esTardia ? '⏰ Sí' : 'No'}</td>
                                        <td>{m.motivoTardia || '—'}</td>
                                        <td>
                                            <span className={`badge badge-${m.status === 'aprobada' || m.status === 'registrada' ? 'success' : m.status === 'rechazada' ? 'error' : 'warning'}`}>
                                                {STATUS_LABELS[m.status] || m.status}
                                            </span>
                                        </td>
                                        <td>{m.gps ? '📍' : '❌'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Historial;

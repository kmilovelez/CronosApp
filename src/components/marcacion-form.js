// marcacion-form.js — Formulario de marcación (entrada / salida)
import React, { useState, useEffect, useCallback } from 'react';
import {
    obtenerUbicacion,
    reverseGeocode,
    getCurrentTimeString,
    getTimezone,
    formatDateISO,
    TIPO_ACTIVIDAD_LABELS,
} from '../utils/helpers.js';
import { getEmployees, getProjects, addTimeEntry } from '../js/db.js';

const MarcacionForm = ({ onSuccess, currentEmployee }) => {
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    // Si hay un empleado logueado, auto-llenar; si no, permitir búsqueda manual
    const isAutoFilled = !!currentEmployee;

    // Campos del formulario
    const [cedula, setCedula] = useState(currentEmployee?.cedula || '');
    const [selectedEmployee, setSelectedEmployee] = useState(currentEmployee || null);
    const [tipoMarcacion, setTipoMarcacion] = useState('entrada');
    const [projectId, setProjectId] = useState('');
    const [tipoActividad, setTipoActividad] = useState('montaje_sitio');
    const [observaciones, setObservaciones] = useState('');
    const [gps, setGps] = useState(null);
    const [direccion, setDireccion] = useState('');
    const [horaActual, setHoraActual] = useState(getCurrentTimeString());

    useEffect(() => {
        loadData();
        const interval = setInterval(() => setHoraActual(getCurrentTimeString()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Sincronizar cuando currentEmployee cambie (login tardío)
    useEffect(() => {
        if (currentEmployee) {
            setCedula(currentEmployee.cedula || '');
            setSelectedEmployee(currentEmployee);
        }
    }, [currentEmployee]);

    const loadData = async () => {
        const [emps, projs] = await Promise.all([getEmployees(), getProjects()]);
        setEmployees(emps);
        setProjects(projs);
    };

    // Buscar empleado por cédula
    const handleCedulaChange = useCallback((val) => {
        setCedula(val);
        const emp = employees.find((e) => e.cedula === val);
        setSelectedEmployee(emp || null);
    }, [employees]);

    // Capturar GPS
    const capturarGPS = useCallback(async () => {
        setGpsLoading(true);
        try {
            const pos = await obtenerUbicacion();
            setGps(pos);
            const addr = await reverseGeocode(pos.lat, pos.lng);
            setDireccion(addr);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: 'No se pudo obtener ubicación: ' + err.message });
        }
        setGpsLoading(false);
    }, []);

    // Enviar marcación
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) {
            setMensaje({ tipo: 'error', texto: 'Ingrese una cédula válida registrada.' });
            return;
        }
        if (!projectId) {
            setMensaje({ tipo: 'error', texto: 'Seleccione un proyecto / OT.' });
            return;
        }
        if (!gps) {
            setMensaje({ tipo: 'error', texto: '📡 Debe capturar la ubicación GPS antes de registrar.' });
            return;
        }

        setLoading(true);
        const proj = projects.find((p) => p.id === Number(projectId));

        const entry = {
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.nombre,
            cedula: selectedEmployee.cedula,
            date: formatDateISO(),
            tipoMarcacion,
            horaLocal: getCurrentTimeString(),
            zonaHoraria: getTimezone(),
            projectId: proj?.id,
            projectCode: proj?.codigo || '',
            tipoActividad,
            esTardia: false,
            esViaje: false,
            gps: gps || null,
            direccionLegible: direccion || 'No capturada',
            observaciones,
        };

        try {
            await addTimeEntry(entry);
            setMensaje({ tipo: 'ok', texto: `✅ Marcación de ${tipoMarcacion} registrada para ${selectedEmployee.nombre}` });
            // Reset — mantener cédula si está auto-llenada
            if (!isAutoFilled) {
                setCedula('');
                setSelectedEmployee(null);
            }
            setObservaciones('');
            setGps(null);
            setDireccion('');
            if (onSuccess) onSuccess();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: '❌ Error al guardar: ' + err });
        }
        setLoading(false);
        setTimeout(() => setMensaje(null), 5000);
    };

    return (
        <div className="card">
            <h2>📍 Marcación de Asistencia</h2>
            <p className="card-subtitle">Registre su entrada o salida</p>

            <div className="time-display-box">
                <span className="time-big">{horaActual}</span>
                <span className="time-zone">{getTimezone()}</span>
                <span className="time-date">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            <form onSubmit={handleSubmit} className="form">
                {/* Empleado identificado */}
                {isAutoFilled ? (
                    <div className="form-group">
                        <label>Empleado</label>
                        <div className="auto-filled-employee">
                            <span className="badge badge-success">✓ {selectedEmployee.nombre} — {selectedEmployee.cedula} — {selectedEmployee.pais}</span>
                        </div>
                    </div>
                ) : (
                    /* Cédula manual (modo offline / sin sesión) */
                    <div className="form-group">
                        <label>Cédula / Identificación</label>
                        <input
                            type="text"
                            value={cedula}
                            onChange={(e) => handleCedulaChange(e.target.value)}
                            placeholder="Ingrese número de cédula"
                            className="input"
                            required
                        />
                        {selectedEmployee && (
                            <span className="badge badge-success">✓ {selectedEmployee.nombre} — {selectedEmployee.pais}</span>
                        )}
                        {cedula && !selectedEmployee && (
                            <span className="badge badge-warning">Cédula no encontrada</span>
                        )}
                    </div>
                )}

                {/* Tipo de marcación */}
                <div className="form-group">
                    <label>Tipo de marcación</label>
                    <div className="toggle-group">
                        <button
                            type="button"
                            className={`toggle-btn ${tipoMarcacion === 'entrada' ? 'toggle-active' : ''}`}
                            onClick={() => setTipoMarcacion('entrada')}
                        >
                            🟢 Entrada
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${tipoMarcacion === 'salida' ? 'toggle-active' : ''}`}
                            onClick={() => setTipoMarcacion('salida')}
                        >
                            🔴 Salida
                        </button>
                    </div>
                </div>

                {/* Proyecto / OT */}
                <div className="form-group">
                    <label>Proyecto / OT</label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input" required>
                        <option value="">— Seleccione —</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.codigo} — {p.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tipo de actividad */}
                <div className="form-group">
                    <label>Tipo de actividad</label>
                    <select value={tipoActividad} onChange={(e) => setTipoActividad(e.target.value)} className="input">
                        {Object.entries(TIPO_ACTIVIDAD_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* GPS */}
                <div className="form-group">
                    <label>Ubicación GPS</label>
                    <button type="button" className="btn btn-outline" onClick={capturarGPS} disabled={gpsLoading}>
                        {gpsLoading ? '⏳ Obteniendo…' : '📡 Capturar ubicación'}
                    </button>
                    {gps && (
                        <div className="gps-info">
                            <span>📍 {direccion}</span>
                            <small>Lat: {gps.lat.toFixed(5)}, Lng: {gps.lng.toFixed(5)} (±{Math.round(gps.precision)}m)</small>
                        </div>
                    )}
                </div>

                {/* Observaciones */}
                <div className="form-group">
                    <label>Observaciones (opcional)</label>
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Comentarios adicionales…"
                        className="input textarea"
                        rows={2}
                    />
                </div>

                {mensaje && (
                    <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`}>
                        {mensaje.texto}
                    </div>
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={loading || !selectedEmployee || !gps}>
                    {loading ? '⏳ Registrando…' : `Registrar ${tipoMarcacion === 'entrada' ? '🟢 Entrada' : '🔴 Salida'}`}
                </button>
                {!gps && (
                    <p className="gps-required-hint">📡 Capture la ubicación GPS para habilitar el registro</p>
                )}
            </form>
        </div>
    );
};

export default MarcacionForm;

// marcacion-tardia.js — Marcaciones Pendientes: lista de días incompletos
import React, { useState, useEffect, useCallback } from 'react';
import {
    obtenerUbicacion,
    reverseGeocode,
    getCurrentTimeString,
    getTimezone,
    formatDateISO,
    fileToBase64,
    TIPO_ACTIVIDAD_LABELS,
} from '../utils/helpers.js';
import { getEmployees, getProjects, addTimeEntry, addAttachment, getTimeEntriesByEmployee } from '../js/db.js';

const MOTIVOS_TARDIA = [
    { value: 'olvido', label: 'Olvidó marcar' },
    { value: 'problema_tecnico', label: 'Problema técnico con el dispositivo' },
    { value: 'viaje', label: 'En tránsito / vuelo' },
    { value: 'otro', label: 'Otro motivo' },
];

/* ─── Componente fila de registro pendiente ─── */
const PendienteRow = ({ pendiente, projects, onEditar }) => {
    const [editando, setEditando] = useState(false);
    const [hora, setHora] = useState('');
    const [motivo, setMotivo] = useState('olvido');
    const [descripcion, setDescripcion] = useState('');
    const [projectId, setProjectId] = useState(pendiente.projectId || '');
    const [archivos, setArchivos] = useState([]);
    const [gps, setGps] = useState(null);
    const [direccion, setDireccion] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const faltante = pendiente.falta; // 'entrada' o 'salida'

    // Nombre del proyecto asignado al registro existente
    const projExistente = projects.find(
        (p) => p.id === Number(pendiente.projectId)
    );
    const otLabel = projExistente
        ? `${projExistente.codigo} — ${projExistente.nombre}`
        : '—';

    const capturarGPS = async () => {
        setGpsLoading(true);
        try {
            const pos = await obtenerUbicacion();
            setGps(pos);
            const addr = await reverseGeocode(pos.lat, pos.lng);
            setDireccion(addr);
        } catch (err) {
            setError('No se pudo obtener ubicación: ' + err.message);
        }
        setGpsLoading(false);
    };

    const handleFileChange = (e) => {
        setArchivos(Array.from(e.target.files));
    };

    const handleGuardar = async () => {
        if (!hora) { setError('La hora es obligatoria.'); return; }
        if (!motivo) { setError('El motivo es obligatorio.'); return; }
        if (!descripcion.trim()) { setError('La descripción es obligatoria.'); return; }
        if (!gps) { setError('📡 Debe capturar la ubicación GPS.'); return; }
        setError('');
        setLoading(true);
        try {
            await onEditar({
                date: pendiente.date,
                tipo: faltante,
                hora,
                motivo,
                descripcion,
                projectId: projectId || pendiente.projectId,
                existingEntry: pendiente.existingEntry,
                gps,
                direccion,
                archivos,
            });
            setEditando(false);
        } catch (err) {
            setError('Error: ' + err.message);
        }
        setLoading(false);
    };

    return (
        <tr className={`pendiente-row ${editando ? 'pendiente-editing' : ''}`}>
            <td>{pendiente.date}</td>
            <td className="td-ot">{otLabel}</td>
            <td>
                {pendiente.tiene === 'entrada' && <span className="badge badge-success">✓ Entrada</span>}
                {pendiente.tiene === 'salida' && <span className="badge badge-warning">✓ Salida</span>}
            </td>
            <td>
                <span className="badge badge-error">Falta {faltante}</span>
            </td>
            <td>
                {!editando ? (
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditando(true)}>
                        ✏️ Completar
                    </button>
                ) : (
                    <div className="pendiente-edit-form">
                        <div className="form-group">
                            <label>Hora de {faltante}</label>
                            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="input" required />
                        </div>
                        <div className="form-group">
                            <label>Proyecto / OT</label>
                            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
                                <option value="">— Mismo proyecto —</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Motivo *</label>
                            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="input" required>
                                {MOTIVOS_TARDIA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Descripción / Justificación *</label>
                            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Explique por qué no marcó…" className="input textarea" rows={2} required />
                        </div>

                        {/* Evidencias */}
                        <div className="form-group">
                            <label>📎 Evidencias (opcional)</label>
                            <input type="file" multiple onChange={handleFileChange} className="input-file" accept="image/*,.pdf,.doc,.docx" />
                            {archivos.length > 0 && (
                                <ul className="file-list">
                                    {archivos.map((f, i) => <li key={i}>📄 {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                                </ul>
                            )}
                        </div>

                        {/* GPS */}
                        <div className="form-group">
                            <label>Ubicación GPS *</label>
                            <button type="button" className="btn btn-sm btn-outline" onClick={capturarGPS} disabled={gpsLoading}>
                                {gpsLoading ? '⏳ Obteniendo…' : '📡 Capturar ubicación'}
                            </button>
                            {gps && (
                                <div className="gps-info">
                                    <span>📍 {direccion}</span>
                                    <small>Lat: {gps.lat.toFixed(5)}, Lng: {gps.lng.toFixed(5)} (±{Math.round(gps.precision)}m)</small>
                                </div>
                            )}
                            {!gps && <p className="gps-required-hint">📡 Capture la ubicación para poder guardar</p>}
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="pendiente-edit-actions">
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleGuardar} disabled={loading || !gps}>
                                {loading ? '⏳…' : '💾 Guardar'}
                            </button>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditando(false)} disabled={loading}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </td>
        </tr>
    );
};

/* ─── Componente principal ─── */
const MarcacionTardia = ({ onSuccess, currentEmployee }) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    const selectedEmployee = currentEmployee || null;

    // Pendientes
    const [pendientes, setPendientes] = useState([]);
    const [loadingPendientes, setLoadingPendientes] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Cargar pendientes cuando currentEmployee cambie
    useEffect(() => {
        if (selectedEmployee?.id) {
            loadPendientes(selectedEmployee.id);
        } else {
            setPendientes([]);
        }
    }, [selectedEmployee]);

    const loadData = async () => {
        const projs = await getProjects();
        setProjects(projs);
    };

    /* ─── Lógica de pendientes ─── */
    const loadPendientes = async (employeeId) => {
        setLoadingPendientes(true);
        try {
            const entries = await getTimeEntriesByEmployee(employeeId);
            // Agrupar por fecha
            const porFecha = {};
            entries.forEach((e) => {
                const d = e.date;
                if (!porFecha[d]) porFecha[d] = { entradas: [], salidas: [] };
                const tipo = e.tipo || e.tipoMarcacion;
                if (tipo === 'entrada') porFecha[d].entradas.push(e);
                else if (tipo === 'salida') porFecha[d].salidas.push(e);
            });
            // Encontrar días incompletos
            const list = [];
            Object.keys(porFecha).sort().reverse().forEach((date) => {
                const { entradas, salidas } = porFecha[date];
                if (entradas.length > 0 && salidas.length === 0) {
                    list.push({
                        date,
                        tiene: 'entrada',
                        falta: 'salida',
                        existingEntry: entradas[0],
                        projectId: entradas[0].projectId || entradas[0].project_id,
                    });
                } else if (salidas.length > 0 && entradas.length === 0) {
                    list.push({
                        date,
                        tiene: 'salida',
                        falta: 'entrada',
                        existingEntry: salidas[0],
                        projectId: salidas[0].projectId || salidas[0].project_id,
                    });
                }
            });
            setPendientes(list);
        } catch (err) {
            console.error('Error cargando pendientes:', err);
            setPendientes([]);
        }
        setLoadingPendientes(false);
    };

    const handleCompletarPendiente = async ({ date, tipo, hora, motivo, descripcion, projectId, existingEntry, gps, direccion, archivos }) => {
        const proj = projects.find((p) => p.id === Number(projectId || existingEntry?.projectId || existingEntry?.project_id));
        const entry = {
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.nombre,
            cedula: selectedEmployee.cedula,
            date,
            tipoMarcacion: tipo,
            horaLocal: getCurrentTimeString(),
            zonaHoraria: getTimezone(),
            projectId: proj?.id || null,
            projectCode: proj?.codigo || existingEntry?.projectCode || existingEntry?.project_code || '',
            tipoActividad: existingEntry?.tipoActividad || existingEntry?.tipo_actividad || 'montaje_sitio',
            esTardia: true,
            horaDeclared: hora,
            motivoTardia: motivo,
            descripcionTardia: descripcion,
            observaciones: descripcion,
            gps: gps || null,
            direccionLegible: direccion || 'Registro completado desde pendientes',
        };
        const entryId = await addTimeEntry(entry);

        // Guardar adjuntos si los hay
        if (archivos && archivos.length > 0) {
            for (const file of archivos) {
                const base64 = await fileToBase64(file);
                await addAttachment({
                    referenceId: entryId,
                    type: 'evidencia_pendiente',
                    fileName: file.name,
                    mimeType: file.type,
                    dataBase64: base64,
                });
            }
        }

        // Recargar pendientes
        await loadPendientes(selectedEmployee.id);
        setMensaje({ tipo: 'ok', texto: `✅ ${tipo === 'entrada' ? 'Entrada' : 'Salida'} del ${date} registrada correctamente` });
        setTimeout(() => setMensaje(null), 5000);
        if (onSuccess) onSuccess();
    };

    return (
        <div className="card">
            <h2>📋 Marcaciones Pendientes</h2>
            <p className="card-subtitle">Días con registros incompletos que requieren completar</p>

            <div className="alert alert-info">
                ⚠️ Los registros completados aquí quedan como <strong>marcación tardía</strong> y son revisados por el supervisor.
            </div>

            {mensaje && (
                <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`}>
                    {mensaje.texto}
                </div>
            )}

            {!selectedEmployee ? (
                <div className="alert alert-warning">
                    Inicie sesión para ver sus marcaciones pendientes.
                </div>
            ) : (
                <div className="pendientes-section">
                    {selectedEmployee && (
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <span className="badge badge-success">✓ {selectedEmployee.nombre} — {selectedEmployee.cedula}</span>
                        </div>
                    )}

                    {loadingPendientes ? (
                        <div style={{ textAlign: 'center', padding: 24 }}>
                            <div className="spinner"></div>
                            <p className="text-muted">Cargando registros…</p>
                        </div>
                    ) : pendientes.length === 0 ? (
                        <div className="alert alert-success">✅ No tiene días pendientes por completar. ¡Todo al día!</div>
                    ) : (
                        <>
                            <p className="text-muted" style={{ marginBottom: 8 }}>
                                {pendientes.length} día{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}
                            </p>
                            <div className="table-responsive">
                                <table className="table pendientes-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>OT / Proyecto</th>
                                            <th>Registrado</th>
                                            <th>Faltante</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendientes.map((p) => (
                                            <PendienteRow
                                                key={p.date}
                                                pendiente={p}
                                                projects={projects}
                                                onEditar={handleCompletarPendiente}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <button
                            className="btn btn-outline"
                            onClick={() => loadPendientes(selectedEmployee.id)}
                            disabled={loadingPendientes}
                        >
                            🔄 Refrescar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarcacionTardia;

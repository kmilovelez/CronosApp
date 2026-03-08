// novedades-form.js — Registro de novedades (incapacidad, vacaciones, calamidad, etc.)
import React, { useState, useEffect, useCallback } from 'react';
import { TIPO_NOVEDAD_LABELS, fileToBase64, formatDateISO, obtenerUbicacion, reverseGeocode } from '../utils/helpers.js';
import { getEmployees, getProjects, addNovelty, addAttachment } from '../js/db.js';

const NovedadesForm = ({ onSuccess, currentEmployee }) => {
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    const isAutoFilled = !!currentEmployee;

    const [cedula, setCedula] = useState(currentEmployee?.cedula || '');
    const [selectedEmployee, setSelectedEmployee] = useState(currentEmployee || null);
    const [tipo, setTipo] = useState('incapacidad');
    const [fecha, setFecha] = useState(formatDateISO());
    const [fechaFin, setFechaFin] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [projectId, setProjectId] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [gps, setGps] = useState(null);
    const [direccion, setDireccion] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);

    const esParcial = tipo === 'cita_medica' || tipo === 'permiso_remunerado' || tipo === 'permiso_no_remunerado';
    const esVuelo = tipo === 'viaje_vuelo';

    useEffect(() => {
        loadData();
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

    const handleCedulaChange = useCallback((val) => {
        setCedula(val);
        setSelectedEmployee(employees.find((e) => e.cedula === val) || null);
    }, [employees]);

    const handleFileChange = (e) => setArchivos(Array.from(e.target.files));

    // Capturar GPS (para viaje/vuelo)
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

    // Reset campos de vuelo al cambiar tipo
    useEffect(() => {
        if (!esVuelo) {
            setGps(null);
            setDireccion('');
        }
    }, [tipo]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) { setMensaje({ tipo: 'error', texto: 'Cédula no encontrada.' }); return; }

        // Validaciones especiales para Viaje / Vuelo
        if (esVuelo) {
            if (archivos.length === 0) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe adjuntar la imagen del tiquete de vuelo.' });
                return;
            }
            if (!descripcion.trim()) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe ingresar una observación / descripción del viaje.' });
                return;
            }
            if (!projectId) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe seleccionar un Proyecto / OT.' });
                return;
            }
            if (!fecha) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe ingresar la fecha de inicio.' });
                return;
            }
            if (!fechaFin) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe ingresar la fecha de fin.' });
                return;
            }
            if (!gps) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe capturar la ubicación GPS.' });
                return;
            }
        }

        setLoading(true);
        const proj = projects.find((p) => p.id === Number(projectId));

        const nov = {
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.nombre,
            cedula: selectedEmployee.cedula,
            date: fecha,
            fechaFin: fechaFin || fecha,
            tipo,
            descripcion,
            horaInicio: esParcial ? horaInicio : null,
            horaFin: esParcial ? horaFin : null,
            projectCode: proj?.codigo || '',
            gpsLat: gps?.lat || null,
            gpsLng: gps?.lng || null,
            gpsAddress: direccion || null,
        };

        try {
            const novId = await addNovelty(nov);

            for (const file of archivos) {
                const base64 = await fileToBase64(file);
                await addAttachment({
                    referenceId: novId,
                    type: tipo,
                    fileName: file.name,
                    mimeType: file.type,
                    dataBase64: base64,
                });
            }

            setMensaje({ tipo: 'ok', texto: `✅ Novedad "${TIPO_NOVEDAD_LABELS[tipo]}" registrada para ${selectedEmployee.nombre}` });
            if (!isAutoFilled) {
                setCedula('');
                setSelectedEmployee(null);
            }
            setDescripcion('');
            setArchivos([]);
            setFechaFin('');
            setGps(null);
            setDireccion('');
            if (onSuccess) onSuccess();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: '❌ Error: ' + err });
        }
        setLoading(false);
        setTimeout(() => setMensaje(null), 5000);
    };

    return (
        <div className="card">
            <h2>📋 Registrar Novedad</h2>
            <p className="card-subtitle">Incapacidades, vacaciones, calamidades, viajes, licencias y permisos</p>

            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <label>Cédula / Identificación</label>
                    {isAutoFilled ? (
                        <div className="auto-filled-field">
                            <span className="input input-disabled">{cedula}</span>
                            <span className="badge badge-success">✓ {selectedEmployee?.nombre}</span>
                        </div>
                    ) : (
                        <>
                            <input type="text" value={cedula} onChange={(e) => handleCedulaChange(e.target.value)} placeholder="Número de cédula" className="input" required />
                            {selectedEmployee && <span className="badge badge-success">✓ {selectedEmployee.nombre}</span>}
                        </>
                    )}
                </div>

                <div className="form-group">
                    <label>Tipo de novedad</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
                        {Object.entries(TIPO_NOVEDAD_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                {esVuelo && (
                    <div className="alert alert-warning">
                        ✈️ <strong>Viaje / Vuelo:</strong> Debe adjuntar imagen del tiquete de vuelo, indicar observaciones, seleccionar OT, fechas y capturar ubicación GPS. No se podrá guardar sin estos datos.
                    </div>
                )}

                <div className="form-row">
                    <div className="form-group">
                        <label>Fecha inicio</label>
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" required />
                    </div>
                    <div className="form-group">
                        <label>Fecha fin (si aplica)</label>
                        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input" />
                    </div>
                </div>

                {esParcial && (
                    <div className="form-row">
                        <div className="form-group">
                            <label>Hora inicio</label>
                            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="input" />
                        </div>
                        <div className="form-group">
                            <label>Hora fin</label>
                            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="input" />
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label>Proyecto / OT {esVuelo ? '(requerido)' : '(opcional)'}</label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input" required={esVuelo}>
                        <option value="">— Ninguno —</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Descripción {esVuelo ? '(requerida)' : ''}</label>
                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={esVuelo ? 'Detalle del viaje, itinerario, motivo…' : 'Detalle de la novedad…'} className="input textarea" rows={3} required />
                </div>

                <div className="form-group">
                    <label>📎 {esVuelo ? 'Adjuntar imagen del tiquete de vuelo (obligatorio)' : 'Adjuntar evidencia (incapacidad, comprobante cita, etc.)'}</label>
                    <input type="file" multiple onChange={handleFileChange} className="input-file" accept="image/*,.pdf,.doc,.docx" />
                    {archivos.length > 0 && (
                        <ul className="file-list">
                            {archivos.map((f, i) => <li key={i}>📄 {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                        </ul>
                    )}
                    {esVuelo && archivos.length === 0 && (
                        <span className="badge badge-warning">⚠️ Debe adjuntar al menos un archivo</span>
                    )}
                </div>

                {esVuelo && (
                    <div className="form-group">
                        <label>Ubicación GPS (requerida)</label>
                        <button type="button" className="btn btn-outline" onClick={capturarGPS} disabled={gpsLoading}>
                            {gpsLoading ? '⏳ Obteniendo…' : '📡 Capturar ubicación'}
                        </button>
                        {gps && (
                            <div className="gps-info">
                                <span>📍 {direccion}</span>
                                <small>Lat: {gps.lat.toFixed(5)}, Lng: {gps.lng.toFixed(5)} (±{Math.round(gps.precision)}m)</small>
                            </div>
                        )}
                        {!gps && (
                            <span className="badge badge-warning">⚠️ Debe capturar GPS</span>
                        )}
                    </div>
                )}

                {mensaje && (
                    <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`}>{mensaje.texto}</div>
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={loading || !selectedEmployee || (esVuelo && (archivos.length === 0 || !gps || !projectId || !fechaFin))}>
                    {loading ? '⏳ Registrando…' : '📋 Registrar novedad'}
                </button>
            </form>
        </div>
    );
};

export default NovedadesForm;

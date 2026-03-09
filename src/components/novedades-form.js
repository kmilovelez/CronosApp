// novedades-form.js — Gestión de novedades: lista + formulario en modal
import React, { useState, useEffect, useCallback } from 'react';
import { TIPO_NOVEDAD_LABELS, fileToBase64, formatDateISO, obtenerUbicacion, reverseGeocode } from '../utils/helpers.js';
import { getEmployees, getProjects, addNovelty, updateNovelty, deleteNovelty, getNoveltiesByEmployee, getNovelties, addAttachment } from '../js/db.js';

/* ─── Modal de formulario ─── */
const NovedadModal = ({ isOpen, onClose, onSaved, editData, currentEmployee, employees, projects }) => {
    const isAutoFilled = !!currentEmployee;
    const isEdit = !!editData;

    const [cedula, setCedula] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
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
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    // Reset / pre-fill al abrir modal
    useEffect(() => {
        if (!isOpen) return;
        setMensaje(null);
        setArchivos([]);
        setLoading(false);

        if (editData) {
            const emp = employees.find(e => e.id === editData.employeeId) || currentEmployee;
            setSelectedEmployee(emp);
            setCedula(emp?.cedula || editData.cedula || '');
            setTipo(editData.tipo || 'incapacidad');
            setFecha(editData.date || formatDateISO());
            setFechaFin(editData.fechaFin || '');
            setHoraInicio(editData.horaInicio || '');
            setHoraFin(editData.horaFin || '');
            setDescripcion(editData.descripcion || '');
            const proj = projects.find(p => p.codigo === editData.projectCode);
            setProjectId(proj ? String(proj.id) : '');
            if (editData.gpsLat && editData.gpsLng) {
                setGps({ lat: editData.gpsLat, lng: editData.gpsLng, precision: 0 });
                setDireccion(editData.gpsAddress || '');
            } else {
                setGps(null);
                setDireccion('');
            }
        } else {
            setSelectedEmployee(currentEmployee || null);
            setCedula(currentEmployee?.cedula || '');
            setTipo('incapacidad');
            setFecha(formatDateISO());
            setFechaFin('');
            setHoraInicio('');
            setHoraFin('');
            setProjectId('');
            setDescripcion('');
            setGps(null);
            setDireccion('');
        }
    }, [isOpen, editData]);

    const esParcial = tipo === 'cita_medica' || tipo === 'permiso_remunerado' || tipo === 'permiso_no_remunerado';
    const esVuelo = tipo === 'viaje_vuelo';

    const handleCedulaChange = useCallback((val) => {
        setCedula(val);
        setSelectedEmployee(employees.find(e => e.cedula === val) || null);
    }, [employees]);

    const handleFileChange = (e) => setArchivos(Array.from(e.target.files));

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

    useEffect(() => {
        if (!esVuelo) { setGps(null); setDireccion(''); }
    }, [tipo]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) { setMensaje({ tipo: 'error', texto: 'Cédula no encontrada.' }); return; }

        if (esVuelo) {
            if (!isEdit && archivos.length === 0) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe adjuntar la imagen del tiquete de vuelo.' }); return;
            }
            if (!descripcion.trim()) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe ingresar una observación / descripción del viaje.' }); return;
            }
            if (!projectId) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe seleccionar un Proyecto / OT.' }); return;
            }
            if (!fecha || !fechaFin) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe ingresar fechas de inicio y fin.' }); return;
            }
            if (!gps) {
                setMensaje({ tipo: 'error', texto: '✈️ Debe capturar la ubicación GPS.' }); return;
            }
        }

        setLoading(true);
        const proj = projects.find(p => p.id === Number(projectId));

        const nov = {
            ...(isEdit ? { id: editData.id } : {}),
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
            let novResult;
            if (isEdit) {
                novResult = await updateNovelty(nov);
            } else {
                novResult = await addNovelty(nov);
            }

            const novId = novResult?.id || editData?.id;
            for (const file of archivos) {
                const base64 = await fileToBase64(file);
                await addAttachment({
                    referenceId: novId,
                    referenceType: tipo,
                    fileName: file.name,
                    fileType: file.type,
                    base64Data: base64,
                });
            }

            onSaved(isEdit ? 'updated' : 'created');
        } catch (err) {
            setMensaje({ tipo: 'error', texto: '❌ Error: ' + err });
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const disableSubmit = loading || !selectedEmployee ||
        (esVuelo && (!isEdit && archivos.length === 0 || !gps || !projectId || !fechaFin));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content novedad-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isEdit ? '✏️ Editar Novedad' : '📋 Nueva Novedad'}</h3>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="novedad-modal-body">
                    <form onSubmit={handleSubmit} className="form">
                        {/* Empleado */}
                        <div className="form-group">
                            <label>Empleado</label>
                            {isAutoFilled || isEdit ? (
                                <div className="auto-filled-field">
                                    <span className="input input-disabled">{cedula}</span>
                                    <span className="badge badge-success">✓ {selectedEmployee?.nombre}</span>
                                </div>
                            ) : (
                                <>
                                    <input type="text" value={cedula} onChange={e => handleCedulaChange(e.target.value)} placeholder="Número de cédula" className="input" required />
                                    {selectedEmployee && <span className="badge badge-success">✓ {selectedEmployee.nombre}</span>}
                                </>
                            )}
                        </div>

                        {/* Tipo */}
                        <div className="form-group">
                            <label>Tipo de novedad</label>
                            <select value={tipo} onChange={e => setTipo(e.target.value)} className="input">
                                {Object.entries(TIPO_NOVEDAD_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {esVuelo && (
                            <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                                ✈️ <strong>Viaje / Vuelo:</strong> Adjuntar imagen del tiquete, observaciones, OT, fechas y GPS son obligatorios.
                            </div>
                        )}

                        {/* Fechas */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Fecha inicio</label>
                                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input" required />
                            </div>
                            <div className="form-group">
                                <label>Fecha fin {esVuelo ? '(requerida)' : '(si aplica)'}</label>
                                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="input" required={esVuelo} />
                            </div>
                        </div>

                        {esParcial && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hora inicio</label>
                                    <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="input" />
                                </div>
                                <div className="form-group">
                                    <label>Hora fin</label>
                                    <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="input" />
                                </div>
                            </div>
                        )}

                        {/* OT */}
                        <div className="form-group">
                            <label>Proyecto / OT {esVuelo ? '(requerido)' : '(opcional)'}</label>
                            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input" required={esVuelo}>
                                <option value="">— Ninguno —</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                            </select>
                        </div>

                        {/* Descripción */}
                        <div className="form-group">
                            <label>Descripción {esVuelo ? '(requerida)' : ''}</label>
                            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                                placeholder={esVuelo ? 'Detalle del viaje, itinerario, motivo…' : 'Detalle de la novedad…'}
                                className="input textarea" rows={3} required />
                        </div>

                        {/* Adjuntos */}
                        <div className="form-group">
                            <label>📎 {esVuelo ? 'Tiquete de vuelo (obligatorio)' : 'Evidencia (opcional)'}</label>
                            <input type="file" multiple onChange={handleFileChange} className="input-file" accept="image/*,.pdf,.doc,.docx" />
                            {archivos.length > 0 && (
                                <ul className="file-list">
                                    {archivos.map((f, i) => <li key={i}>📄 {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                                </ul>
                            )}
                            {esVuelo && !isEdit && archivos.length === 0 && (
                                <span className="badge badge-warning">⚠️ Debe adjuntar al menos un archivo</span>
                            )}
                        </div>

                        {/* GPS para vuelo */}
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
                                {!gps && <span className="badge badge-warning">⚠️ Debe capturar GPS</span>}
                            </div>
                        )}

                        {mensaje && (
                            <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`}>{mensaje.texto}</div>
                        )}

                        <div className="novedad-modal-actions">
                            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={disableSubmit}>
                                {loading ? '⏳ Guardando…' : isEdit ? '💾 Guardar cambios' : '📋 Registrar novedad'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

/* ─── Confirmación de eliminación ─── */
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, novedad }) => {
    if (!isOpen || !novedad) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <h3>🗑️ Confirmar eliminación</h3>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: '18px' }}>
                    <p style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
                        ¿Está seguro que desea eliminar esta novedad?
                    </p>
                    <div className="confirm-delete-detail">
                        <strong>{TIPO_NOVEDAD_LABELS[novedad.tipo] || novedad.tipo}</strong><br/>
                        📅 {novedad.date}{novedad.fechaFin && novedad.fechaFin !== novedad.date ? ` → ${novedad.fechaFin}` : ''}<br/>
                        👤 {novedad.employeeName}
                    </div>
                    <div className="novedad-modal-actions">
                        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
                        <button className="btn btn-danger" onClick={onConfirm}>🗑️ Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── Componente principal ─── */
const NovedadesForm = ({ onSuccess, currentEmployee }) => {
    const [novedades, setNovedades] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [mensaje, setMensaje] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, novedad: null });

    const rol = currentEmployee?.rol || 'tecnico';
    const isSuperOrAdmin = rol === 'supervisor' || rol === 'admin';

    const loadData = async () => {
        setLoadingList(true);
        try {
            const [emps, projs] = await Promise.all([getEmployees(), getProjects()]);
            setEmployees(emps);
            setProjects(projs);

            let novs;
            if (isSuperOrAdmin) {
                novs = await getNovelties();
            } else {
                novs = currentEmployee ? await getNoveltiesByEmployee(currentEmployee.id) : [];
            }
            setNovedades(novs);
        } catch (err) {
            console.error('Error cargando novedades:', err);
        }
        setLoadingList(false);
    };

    useEffect(() => { loadData(); }, [currentEmployee]);

    const handleNew = () => {
        setEditData(null);
        setModalOpen(true);
    };

    const handleEdit = (nov) => {
        setEditData(nov);
        setModalOpen(true);
    };

    const handleSaved = (action) => {
        setModalOpen(false);
        setEditData(null);
        setMensaje({ tipo: 'ok', texto: action === 'created' ? '✅ Novedad registrada exitosamente' : '✅ Novedad actualizada exitosamente' });
        loadData();
        if (onSuccess) onSuccess();
        setTimeout(() => setMensaje(null), 4000);
    };

    const handleDeleteClick = (nov) => {
        setDeleteModal({ open: true, novedad: nov });
    };

    const handleDeleteConfirm = async () => {
        const nov = deleteModal.novedad;
        setDeleteModal({ open: false, novedad: null });
        try {
            await deleteNovelty(nov.id);
            setMensaje({ tipo: 'ok', texto: '✅ Novedad eliminada' });
            loadData();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: '❌ Error al eliminar: ' + err });
        }
        setTimeout(() => setMensaje(null), 4000);
    };

    return (
        <div className="card">
            <div className="novedades-header">
                <div>
                    <h2>📋 Novedades</h2>
                    <p className="card-subtitle">Incapacidades, vacaciones, viajes, licencias y permisos</p>
                </div>
                <button className="btn btn-primary" onClick={handleNew}>+ Nueva novedad</button>
            </div>

            {mensaje && (
                <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`} style={{ margin: '0 0 12px' }}>{mensaje.texto}</div>
            )}

            {loadingList ? (
                <div className="novedades-empty">⏳ Cargando novedades…</div>
            ) : novedades.length === 0 ? (
                <div className="novedades-empty">
                    <span style={{ fontSize: '2.5rem' }}>�</span>
                    <p>No hay novedades registradas</p>
                    <button className="btn btn-outline" onClick={handleNew}>Registrar primera novedad</button>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Fin</th>
                                <th>Tipo</th>
                                {isSuperOrAdmin && <th>Empleado</th>}
                                <th>OT</th>
                                <th>Descripción</th>
                                <th style={{ textAlign: 'center', width: 90 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {novedades.map(nov => (
                                <tr key={nov.id}>
                                    <td className="td-nowrap">{nov.date}</td>
                                    <td className="td-nowrap">{nov.fechaFin && nov.fechaFin !== nov.date ? nov.fechaFin : '—'}</td>
                                    <td>
                                        <span className={`badge ${nov.tipo === 'viaje_vuelo' ? 'badge-info' : 'badge-outline'}`}>
                                            {TIPO_NOVEDAD_LABELS[nov.tipo] || nov.tipo}
                                        </span>
                                    </td>
                                    {isSuperOrAdmin && <td>{nov.employeeName || '—'}</td>}
                                    <td>{nov.projectCode || '—'}</td>
                                    <td className="td-truncate">{nov.descripcion || '—'}</td>
                                    <td className="td-actions">
                                        <button className="btn-icon" title="Editar" onClick={() => handleEdit(nov)}>✏️</button>
                                        <button className="btn-icon btn-icon-danger" title="Eliminar" onClick={() => handleDeleteClick(nov)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <NovedadModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditData(null); }}
                onSaved={handleSaved}
                editData={editData}
                currentEmployee={currentEmployee}
                employees={employees}
                projects={projects}
            />

            <ConfirmDeleteModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, novedad: null })}
                onConfirm={handleDeleteConfirm}
                novedad={deleteModal.novedad}
            />
        </div>
    );
};

export default NovedadesForm;

// supervisor-panel.js — Panel de aprobación para supervisor / ingeniero
import React, { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    STATUS_LABELS,
    TIPO_ACTIVIDAD_LABELS,
} from '../utils/helpers.js';
import {
    getTimeEntriesByStatus,
    updateTimeEntry,
    addApproval,
    getAttachmentsByReference,
    getTimeEntries,
    getNovelties,
} from '../js/db.js';

// Fix Leaflet default marker icons (webpack asset/resource)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Iconos personalizados para entrada y salida
const entradaIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const salidaIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* ─── Mini componente de mapa ─── */
const GPSMap = ({ gps, tipoMarcacion, direccion }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!gps || !gps.lat || !gps.lng || !mapRef.current) return;
        // Crear mapa si no existe
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
                zoomControl: true,
                scrollWheelZoom: false,
            }).setView([gps.lat, gps.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(mapInstanceRef.current);
        } else {
            mapInstanceRef.current.setView([gps.lat, gps.lng], 15);
        }
        // Limpiar marcadores anteriores
        mapInstanceRef.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) mapInstanceRef.current.removeLayer(layer);
        });
        // Agregar marcador
        const icon = tipoMarcacion === 'entrada' ? entradaIcon : salidaIcon;
        const label = tipoMarcacion === 'entrada' ? '🟢 Entrada' : '🔴 Salida';
        L.marker([gps.lat, gps.lng], { icon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<strong>${label}</strong><br/>${direccion || ''}<br/><small>${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}</small>`)
            .openPopup();

        // Forzar redimensión del mapa
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);

        return () => {
            // Cleanup on unmount
        };
    }, [gps, tipoMarcacion, direccion]);

    // Cleanup completo al desmontar
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    if (!gps || !gps.lat || !gps.lng) return null;

    return (
        <div className="gps-map-container">
            <div ref={mapRef} className="gps-map" />
        </div>
    );
};

const SupervisorPanel = () => {
    const [pendientes, setPendientes] = useState([]);
    const [todas, setTodas] = useState([]);
    const [novedades, setNovedades] = useState([]);
    const [tab, setTab] = useState('pendientes');
    const [expandedId, setExpandedId] = useState(null);
    const [attachments, setAttachments] = useState({});
    const [accionForm, setAccionForm] = useState({ id: null, action: '', justificacion: '', horasAjustadas: '' });
    const [mensaje, setMensaje] = useState(null);
    const [supervisorName, setSupervisorName] = useState('Jordan Orozco');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const pend = await getTimeEntriesByStatus('pendiente_aprobacion');
        setPendientes(pend);
        const all = await getTimeEntries();
        setTodas(all);
        const novs = await getNovelties();
        setNovedades(novs);
    };

    const toggleExpand = useCallback(async (id) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        // cargar adjuntos
        if (!attachments[id]) {
            const atts = await getAttachmentsByReference(id);
            setAttachments((prev) => ({ ...prev, [id]: atts }));
        }
    }, [expandedId, attachments]);

    const handleAction = async (entry, action) => {
        if (action === 'ajustada' && !accionForm.horasAjustadas) {
            setMensaje({ tipo: 'error', texto: 'Indique las horas ajustadas.' });
            return;
        }
        if (!accionForm.justificacion && action !== 'aprobada') {
            setMensaje({ tipo: 'error', texto: 'Indique una justificación.' });
            return;
        }

        try {
            // Actualizar estado de la marcación
            const updated = { ...entry, status: action };
            if (action === 'ajustada') {
                updated.horaLocal = accionForm.horasAjustadas;
            }
            await updateTimeEntry(updated);

            // Registrar aprobación
            await addApproval({
                entryId: entry.id,
                action,
                approvedBy: supervisorName,
                justificacion: accionForm.justificacion || 'Aprobado sin observaciones',
                horasAjustadas: accionForm.horasAjustadas || null,
            });

            setMensaje({ tipo: 'ok', texto: `✅ Marcación ${STATUS_LABELS[action]} correctamente.` });
            setAccionForm({ id: null, action: '', justificacion: '', horasAjustadas: '' });
            await loadData();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: '❌ Error: ' + err });
        }
        setTimeout(() => setMensaje(null), 4000);
    };

    const renderEntryCard = (entry) => {
        const isExpanded = expandedId === entry.id;
        const statusClass = entry.status === 'pendiente_aprobacion' ? 'status-pending' :
            entry.status === 'aprobada' ? 'status-approved' :
            entry.status === 'rechazada' ? 'status-rejected' : 'status-default';

        return (
            <div key={entry.id} className={`entry-card ${statusClass}`}>
                <div className="entry-header" onClick={() => toggleExpand(entry.id)}>
                    <div className="entry-header-left">
                        <strong>{entry.employeeName}</strong>
                        <span className="entry-meta">
                            {entry.tipoMarcacion === 'entrada' ? '🟢' : '🔴'} {entry.tipoMarcacion} — {entry.date}
                        </span>
                    </div>
                    <div className="entry-header-right">
                        <span className={`badge badge-${entry.status === 'pendiente_aprobacion' ? 'warning' : entry.status === 'aprobada' ? 'success' : 'error'}`}>
                            {STATUS_LABELS[entry.status] || entry.status}
                        </span>
                        <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                </div>

                {isExpanded && (
                    <div className="entry-detail">
                        <div className="detail-grid">
                            <div><strong>Cédula:</strong> {entry.cedula || '—'}</div>
                            <div><strong>OT:</strong> {entry.projectCode || '—'}</div>
                            <div><strong>Actividad:</strong> {TIPO_ACTIVIDAD_LABELS[entry.tipoActividad] || entry.tipoActividad || '—'}</div>
                            <div><strong>Hora registrada:</strong> {entry.horaLocal || '—'}</div>
                            {entry.esTardia && (
                                <>
                                    <div><strong>Hora declarada:</strong> {entry.horaDeclared || entry.horaDeclarada || '—'}</div>
                                    <div><strong>Motivo tardía:</strong> {entry.motivoTardia || '—'}</div>
                                    <div className="detail-full"><strong>Justificación:</strong> {entry.descripcionTardia || entry.observaciones || '—'}</div>
                                </>
                            )}
                            <div><strong>Zona horaria:</strong> {entry.zonaHoraria || entry.timezone || '—'}</div>
                            {entry.esViaje && (
                                <div className="detail-full">
                                    <strong>✈️ Viaje {entry.vueloTipo || entry.viajeTipo}:</strong> {entry.vueloHoraSalida || entry.viajeHoraSalida} → {entry.vueloHoraLlegada || entry.viajeHoraLlegada} — {entry.horasViajeReconocidas || entry.viajeHorasExtra || 0}h reconocidas
                                </div>
                            )}
                            <div className="detail-full"><strong>Observaciones:</strong> {entry.observaciones || '—'}</div>
                        </div>

                        {/* Mapa de ubicación GPS */}
                        {entry.gps ? (
                            <div className="location-box">
                                <strong>📍 Ubicación de marcación ({entry.tipoMarcacion === 'entrada' ? '🟢 Entrada' : '🔴 Salida'}):</strong>
                                <p>{entry.direccionLegible || entry.gpsAddress || 'Dirección no disponible'}</p>
                                <small>Lat: {entry.gps.lat?.toFixed(5)}, Lng: {entry.gps.lng?.toFixed(5)}</small>
                                <GPSMap
                                    gps={entry.gps}
                                    tipoMarcacion={entry.tipoMarcacion}
                                    direccion={entry.direccionLegible || entry.gpsAddress || ''}
                                />
                                <a
                                    href={`https://www.google.com/maps?q=${entry.gps.lat},${entry.gps.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline btn-sm"
                                    style={{ marginTop: '0.5rem' }}
                                >
                                    🗺️ Abrir en Google Maps
                                </a>
                            </div>
                        ) : (
                            <div className="location-box location-empty">
                                <strong>📍 Ubicación:</strong> <span className="text-muted">No capturada</span>
                            </div>
                        )}

                        {/* Adjuntos */}
                        {attachments[entry.id] && attachments[entry.id].length > 0 && (
                            <div className="attachments-box">
                                <strong>📎 Evidencias adjuntas:</strong>
                                <ul className="file-list">
                                    {attachments[entry.id].map((att, i) => (
                                        <li key={i}>
                                            {att.mimeType?.startsWith('image/') ? (
                                                <img src={att.dataBase64} alt={att.fileName} className="attachment-thumb" />
                                            ) : (
                                                <span>📄 {att.fileName}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Acciones del supervisor */}
                        {entry.status === 'pendiente_aprobacion' && (
                            <div className="approval-actions">
                                <h4>Acciones del supervisor</h4>
                                <div className="form-group">
                                    <label>Justificación</label>
                                    <textarea
                                        value={accionForm.id === entry.id ? accionForm.justificacion : ''}
                                        onChange={(e) => setAccionForm({ ...accionForm, id: entry.id, justificacion: e.target.value })}
                                        placeholder="Observaciones del supervisor…"
                                        className="input textarea"
                                        rows={2}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Ajustar hora (opcional)</label>
                                    <input
                                        type="time"
                                        value={accionForm.id === entry.id ? accionForm.horasAjustadas : ''}
                                        onChange={(e) => setAccionForm({ ...accionForm, id: entry.id, horasAjustadas: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div className="action-buttons">
                                    <button className="btn btn-success" onClick={() => handleAction(entry, 'aprobada')}>✅ Aprobar</button>
                                    <button className="btn btn-warning" onClick={() => handleAction(entry, 'ajustada')}>✏️ Ajustar</button>
                                    <button className="btn btn-danger" onClick={() => handleAction(entry, 'rechazada')}>❌ Rechazar</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const filterEntries = tab === 'pendientes' ? pendientes :
        tab === 'todas' ? todas : [];

    return (
        <div className="card">
            <h2>🔍 Panel de Supervisor</h2>
            <p className="card-subtitle">Revise y apruebe marcaciones — Supervisor: <strong>{supervisorName}</strong></p>

            {mensaje && (
                <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`}>{mensaje.texto}</div>
            )}

            <div className="tab-group">
                <button className={`tab-btn ${tab === 'pendientes' ? 'tab-active' : ''}`} onClick={() => setTab('pendientes')}>
                    ⏳ Pendientes ({pendientes.length})
                </button>
                <button className={`tab-btn ${tab === 'todas' ? 'tab-active' : ''}`} onClick={() => setTab('todas')}>
                    📋 Todas ({todas.length})
                </button>
                <button className={`tab-btn ${tab === 'novedades' ? 'tab-active' : ''}`} onClick={() => setTab('novedades')}>
                    📌 Novedades ({novedades.length})
                </button>
            </div>

            <div className="entries-list">
                {tab === 'novedades' ? (
                    novedades.length === 0 ? (
                        <p className="empty-state">No hay novedades registradas.</p>
                    ) : (
                        novedades.map((nov) => (
                            <div key={nov.id} className="entry-card status-default">
                                <div className="entry-header">
                                    <div className="entry-header-left">
                                        <strong>{nov.employeeName}</strong>
                                        <span className="entry-meta">{nov.tipo} — {nov.date}</span>
                                    </div>
                                    <div className="entry-header-right">
                                        <span className="badge badge-info">{nov.tipo}</span>
                                    </div>
                                </div>
                                <div className="entry-detail" style={{ display: 'block' }}>
                                    <p>{nov.descripcion}</p>
                                    {nov.horaInicio && <p>Horario: {nov.horaInicio} - {nov.horaFin}</p>}
                                    {nov.projectCode && <p>OT: {nov.projectCode}</p>}
                                </div>
                            </div>
                        ))
                    )
                ) : filterEntries.length === 0 ? (
                    <p className="empty-state">
                        {tab === 'pendientes' ? '✅ No hay marcaciones pendientes de aprobación.' : 'No hay marcaciones registradas.'}
                    </p>
                ) : (
                    filterEntries.map(renderEntryCard)
                )}
            </div>
        </div>
    );
};

export default SupervisorPanel;

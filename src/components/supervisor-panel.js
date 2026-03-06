// supervisor-panel.js — Panel de aprobación para supervisor / ingeniero
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    getEmployees,
    getAllProjects,
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

/* ─── Mapa con soporte para múltiples marcas (entrada + salida) ─── */
const GPSMapMulti = ({ markers }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!markers || markers.length === 0 || !mapRef.current) return;
        const valid = markers.filter((m) => m.gps && m.gps.lat && m.gps.lng);
        if (valid.length === 0) return;

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
                zoomControl: true,
                scrollWheelZoom: false,
            }).setView([valid[0].gps.lat, valid[0].gps.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap', maxZoom: 19,
            }).addTo(mapInstanceRef.current);
        }

        // Limpiar marcadores anteriores
        mapInstanceRef.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) mapInstanceRef.current.removeLayer(layer);
        });

        const bounds = [];
        valid.forEach(({ gps, tipo, direccion }) => {
            const icon = tipo === 'entrada' ? entradaIcon : salidaIcon;
            const label = tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida';
            L.marker([gps.lat, gps.lng], { icon })
                .addTo(mapInstanceRef.current)
                .bindPopup(`<strong>${label}</strong><br/>${direccion || ''}<br/><small>${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}</small>`);
            bounds.push([gps.lat, gps.lng]);
        });

        if (bounds.length > 1) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
        } else {
            mapInstanceRef.current.setView(bounds[0], 15);
        }
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
    }, [markers]);

    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    if (!markers || markers.filter((m) => m.gps?.lat).length === 0) return null;
    return (
        <div className="gps-map-container">
            <div ref={mapRef} className="gps-map" />
        </div>
    );
};

/* ─── Agrupar entries por fecha + empleado + OT ─── */
function groupEntries(entries) {
    const groups = {};
    entries.forEach((e) => {
        const eid = e.employeeId || e.employee_id;
        const pid = e.projectId || e.project_id || 'sin';
        const key = `${e.date}__${eid}__${pid}`;
        if (!groups[key]) {
            groups[key] = {
                key, date: e.date,
                employeeId: eid,
                employeeName: e.employeeName || e.employee_name,
                projectId: e.projectId || e.project_id,
                projectCode: e.projectCode || e.project_code || '',
                projectName: e.projectName || e.project_name || '',
                tipoActividad: e.tipoActividad || e.tipo_actividad || '',
                entrada: null, salida: null,
                status: e.status,
            };
        }
        const tipo = e.tipoMarcacion || e.tipo;
        if (tipo === 'entrada') {
            groups[key].entrada = e;
            if (!groups[key].projectCode && (e.projectCode || e.project_code)) {
                groups[key].projectCode = e.projectCode || e.project_code;
                groups[key].projectName = e.projectName || e.project_name || '';
            }
        } else if (tipo === 'salida') {
            groups[key].salida = e;
        }
        if (e.status === 'pendiente_aprobacion') groups[key].status = 'pendiente_aprobacion';
    });
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
}

/* ════════════════════════════════════════════════════════════════ */
const SupervisorPanel = () => {
    const [pendientes, setPendientes] = useState([]);
    const [todas, setTodas] = useState([]);
    const [novedades, setNovedades] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tab, setTab] = useState('pendientes');
    const [expandedId, setExpandedId] = useState(null);
    const [attachments, setAttachments] = useState({});
    const [accionForm, setAccionForm] = useState({ id: null, justificacion: '', horasAjustadas: '' });
    const [mensaje, setMensaje] = useState(null);
    const [supervisorName] = useState('Jordan Orozco');

    // Filtros
    const [filtroOT, setFiltroOT] = useState('');
    const [filtroDesde, setFiltroDesde] = useState('');
    const [filtroHasta, setFiltroHasta] = useState('');
    const [filtroPais, setFiltroPais] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [pend, all, novs, emps, projs] = await Promise.all([
            getTimeEntriesByStatus('pendiente_aprobacion'),
            getTimeEntries(),
            getNovelties(),
            getEmployees(),
            getAllProjects(),
        ]);
        setPendientes(pend);
        setTodas(all);
        setNovedades(novs);
        setEmployees(emps);
        setProjects(projs);
    };

    // Mapa employeeId → datos
    const empMap = useMemo(() => {
        const m = {};
        employees.forEach((e) => { m[e.id] = e; });
        return m;
    }, [employees]);

    const paisesUnicos = useMemo(() => {
        const s = new Set(employees.map((e) => e.pais).filter(Boolean));
        return Array.from(s).sort();
    }, [employees]);

    // Filtrar entries
    const applyFilters = useCallback((entries) => {
        let r = entries;
        if (filtroOT) r = r.filter((e) => String(e.projectId || e.project_id) === String(filtroOT));
        if (filtroDesde) r = r.filter((e) => e.date >= filtroDesde);
        if (filtroHasta) r = r.filter((e) => e.date <= filtroHasta);
        if (filtroPais) r = r.filter((e) => {
            const emp = empMap[e.employeeId || e.employee_id];
            return emp && emp.pais === filtroPais;
        });
        return r;
    }, [filtroOT, filtroDesde, filtroHasta, filtroPais, empMap]);

    const groupedPend = useMemo(() => groupEntries(applyFilters(pendientes)), [pendientes, applyFilters]);
    const groupedAll = useMemo(() => groupEntries(applyFilters(todas)), [todas, applyFilters]);
    const filtNov = useMemo(() => applyFilters(novedades), [novedades, applyFilters]);

    const toggleExpand = useCallback(async (key, group) => {
        if (expandedId === key) { setExpandedId(null); return; }
        setExpandedId(key);
        // cargar adjuntos
        if (group?.entrada?.id && !attachments[group.entrada.id]) {
            getAttachmentsByReference(group.entrada.id).then((a) => setAttachments((p) => ({ ...p, [group.entrada.id]: a })));
        }
        if (group?.salida?.id && !attachments[group.salida.id]) {
            getAttachmentsByReference(group.salida.id).then((a) => setAttachments((p) => ({ ...p, [group.salida.id]: a })));
        }
    }, [expandedId, attachments]);

    const handleAction = async (entry, action) => {
        if (action === 'ajustada' && !accionForm.horasAjustadas) {
            setMensaje({ tipo: 'error', texto: 'Indique las horas ajustadas.' }); return;
        }
        if (!accionForm.justificacion && action !== 'aprobada') {
            setMensaje({ tipo: 'error', texto: 'Indique una justificación.' }); return;
        }
        try {
            const updated = { ...entry, status: action };
            if (action === 'ajustada') updated.horaLocal = accionForm.horasAjustadas;
            await updateTimeEntry(updated);
            await addApproval({
                entryId: entry.id, action, approvedBy: supervisorName,
                justificacion: accionForm.justificacion || 'Aprobado sin observaciones',
                horasAjustadas: accionForm.horasAjustadas || null,
            });
            setMensaje({ tipo: 'ok', texto: `✅ Marcación ${STATUS_LABELS[action]} correctamente.` });
            setAccionForm({ id: null, justificacion: '', horasAjustadas: '' });
            await loadData();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: '❌ Error: ' + err });
        }
        setTimeout(() => setMensaje(null), 4000);
    };

    /* ─── Render de entry-section (entrada o salida) ─── */
    const renderEntrySection = (entry, tipo) => {
        if (!entry) return null;
        const label = tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida';
        const stLabel = STATUS_LABELS[entry.status] || entry.status;
        const stBadge = entry.status === 'aprobada' ? 'success' : entry.status === 'pendiente_aprobacion' ? 'warning' : 'error';
        return (
            <div className={`marcacion-section marcacion-${tipo}`}>
                <h4>{label}</h4>
                <div className="detail-grid">
                    <div><strong>Hora:</strong> {entry.horaLocal || '—'}</div>
                    <div><strong>Estado:</strong> <span className={`badge badge-${stBadge}`}>{stLabel}</span></div>
                    {entry.esTardia && (
                        <>
                            <div><strong>Hora declarada:</strong> {entry.horaDeclared || entry.horaDeclarada || '—'}</div>
                            <div><strong>Motivo tardía:</strong> {entry.motivoTardia || '—'}</div>
                            <div className="detail-full"><strong>Justificación:</strong> {entry.descripcionTardia || entry.observaciones || '—'}</div>
                        </>
                    )}
                    <div className="detail-full"><strong>Observaciones:</strong> {entry.observaciones || '—'}</div>
                    {entry.gps && (
                        <div className="detail-full">
                            <strong>📍</strong> {entry.direccionLegible || entry.gpsAddress || '—'}
                            <small style={{ marginLeft: 8 }}>({entry.gps.lat?.toFixed(5)}, {entry.gps.lng?.toFixed(5)})</small>
                        </div>
                    )}
                </div>
                {attachments[entry.id] && attachments[entry.id].length > 0 && (
                    <div className="attachments-box">
                        <strong>📎 Evidencias:</strong>
                        <ul className="file-list">
                            {attachments[entry.id].map((att, i) => (
                                <li key={i}>
                                    {att.mimeType?.startsWith('image/') ? (
                                        <img src={att.dataBase64} alt={att.fileName} className="attachment-thumb" />
                                    ) : (<span>📄 {att.fileName}</span>)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    /* ─── Render de grupo (card agrupado) ─── */
    const renderGroupCard = (group) => {
        const isExp = expandedId === group.key;
        const emp = empMap[group.employeeId] || {};
        const stClass = group.status === 'pendiente_aprobacion' ? 'status-pending' :
            group.status === 'aprobada' ? 'status-approved' :
            group.status === 'rechazada' ? 'status-rejected' : 'status-default';

        const gpsMarkers = [];
        if (group.entrada?.gps) gpsMarkers.push({ gps: group.entrada.gps, tipo: 'entrada', direccion: group.entrada.direccionLegible || '' });
        if (group.salida?.gps) gpsMarkers.push({ gps: group.salida.gps, tipo: 'salida', direccion: group.salida.direccionLegible || '' });

        return (
            <div key={group.key} className={`entry-card ${stClass}`}>
                <div className="entry-header" onClick={() => toggleExpand(group.key, group)}>
                    <div className="entry-header-left">
                        <strong>{group.employeeName}</strong>
                        <span className="entry-meta">
                            📅 {group.date} {group.projectCode ? ` — 🔧 ${group.projectCode}` : ''}
                        </span>
                        <span className="entry-meta-sub">
                            🪪 {emp.cedula || '—'} {emp.pais ? ` · 🌎 ${emp.pais}` : ''}
                        </span>
                    </div>
                    <div className="entry-header-right">
                        <div className="entry-badges">
                            {group.entrada && <span className="badge badge-sm badge-success">🟢 {group.entrada.horaLocal || 'Ent.'}</span>}
                            {group.salida && <span className="badge badge-sm badge-error">🔴 {group.salida.horaLocal || 'Sal.'}</span>}
                            {!group.entrada && <span className="badge badge-sm badge-warning">⚠ Sin entrada</span>}
                            {!group.salida && <span className="badge badge-sm badge-warning">⚠ Sin salida</span>}
                        </div>
                        <span className="expand-icon">{isExp ? '▲' : '▼'}</span>
                    </div>
                </div>

                {isExp && (
                    <div className="entry-detail">
                        {/* Info general */}
                        <div className="detail-grid">
                            <div><strong>Cédula:</strong> {emp.cedula || '—'}</div>
                            <div><strong>País:</strong> {emp.pais || '—'}</div>
                            <div><strong>OT:</strong> {group.projectCode ? `${group.projectCode} — ${group.projectName}` : '—'}</div>
                            <div><strong>Actividad:</strong> {TIPO_ACTIVIDAD_LABELS[group.tipoActividad] || group.tipoActividad || '—'}</div>
                        </div>

                        {/* Secciones entrada / salida */}
                        {renderEntrySection(group.entrada, 'entrada')}
                        {renderEntrySection(group.salida, 'salida')}

                        {/* Viaje */}
                        {(group.entrada?.esViaje || group.salida?.esViaje) && (() => {
                            const v = group.entrada?.esViaje ? group.entrada : group.salida;
                            return (
                                <div className="detail-full" style={{ marginTop: 8 }}>
                                    <strong>✈️ Viaje {v.vueloTipo || v.viajeTipo}:</strong> {v.vueloHoraSalida || v.viajeHoraSalida} → {v.vueloHoraLlegada || v.viajeHoraLlegada} — {v.horasViajeReconocidas || v.viajeHorasExtra || 0}h
                                </div>
                            );
                        })()}

                        {/* Mapa con ambas marcas */}
                        {gpsMarkers.length > 0 && (
                            <div className="location-box">
                                <strong>📍 Ubicaciones:</strong>
                                <GPSMapMulti markers={gpsMarkers} />
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                                    {gpsMarkers.map((m, i) => (
                                        <a key={i} href={`https://www.google.com/maps?q=${m.gps.lat},${m.gps.lng}`}
                                            target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                            🗺️ {m.tipo === 'entrada' ? 'Entrada' : 'Salida'} en Maps
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Acciones del supervisor */}
                        {(group.entrada?.status === 'pendiente_aprobacion' || group.salida?.status === 'pendiente_aprobacion') && (
                            <div className="approval-actions">
                                <h4>Acciones del supervisor</h4>
                                <div className="form-group">
                                    <label>Justificación</label>
                                    <textarea
                                        value={accionForm.id === group.key ? accionForm.justificacion : ''}
                                        onChange={(e) => setAccionForm({ ...accionForm, id: group.key, justificacion: e.target.value })}
                                        placeholder="Observaciones del supervisor…" className="input textarea" rows={2}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Ajustar hora (opcional)</label>
                                    <input type="time"
                                        value={accionForm.id === group.key ? accionForm.horasAjustadas : ''}
                                        onChange={(e) => setAccionForm({ ...accionForm, id: group.key, horasAjustadas: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div className="action-buttons">
                                    <button className="btn btn-success" onClick={async () => {
                                        if (group.entrada?.status === 'pendiente_aprobacion') await handleAction(group.entrada, 'aprobada');
                                        if (group.salida?.status === 'pendiente_aprobacion') await handleAction(group.salida, 'aprobada');
                                    }}>✅ Aprobar</button>
                                    <button className="btn btn-warning" onClick={async () => {
                                        const t = group.entrada?.status === 'pendiente_aprobacion' ? group.entrada : group.salida;
                                        if (t) await handleAction(t, 'ajustada');
                                    }}>✏️ Ajustar</button>
                                    <button className="btn btn-danger" onClick={async () => {
                                        if (group.entrada?.status === 'pendiente_aprobacion') await handleAction(group.entrada, 'rechazada');
                                        if (group.salida?.status === 'pendiente_aprobacion') await handleAction(group.salida, 'rechazada');
                                    }}>❌ Rechazar</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const clearFilters = () => { setFiltroOT(''); setFiltroDesde(''); setFiltroHasta(''); setFiltroPais(''); };
    const hasFilters = filtroOT || filtroDesde || filtroHasta || filtroPais;
    const currentGroups = tab === 'pendientes' ? groupedPend : tab === 'todas' ? groupedAll : [];

    return (
        <div className="card">
            <h2>🔍 Panel de Supervisor</h2>
            <p className="card-subtitle">Revise y apruebe marcaciones — Supervisor: <strong>{supervisorName}</strong></p>

            {mensaje && (
                <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`}>{mensaje.texto}</div>
            )}

            {/* ─── Filtros ─── */}
            <div className="supervisor-filters">
                <div className="filters-bar">
                    <div className="form-group filter-group">
                        <label>🔧 OT</label>
                        <select value={filtroOT} onChange={(e) => setFiltroOT(e.target.value)} className="input input-sm">
                            <option value="">Todas</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group filter-group">
                        <label>📅 Desde</label>
                        <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="input input-sm" />
                    </div>
                    <div className="form-group filter-group">
                        <label>📅 Hasta</label>
                        <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="input input-sm" />
                    </div>
                    <div className="form-group filter-group">
                        <label>🌎 País</label>
                        <select value={filtroPais} onChange={(e) => setFiltroPais(e.target.value)} className="input input-sm">
                            <option value="">Todos</option>
                            {paisesUnicos.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    {hasFilters && (
                        <button className="btn btn-outline btn-sm filter-clear-btn" onClick={clearFilters}>🗑️ Limpiar</button>
                    )}
                </div>
            </div>

            {/* ─── Tabs ─── */}
            <div className="tab-group">
                <button className={`tab-btn ${tab === 'pendientes' ? 'tab-active' : ''}`} onClick={() => setTab('pendientes')}>
                    ⏳ Pendientes ({groupedPend.length})
                </button>
                <button className={`tab-btn ${tab === 'todas' ? 'tab-active' : ''}`} onClick={() => setTab('todas')}>
                    📋 Todas ({groupedAll.length})
                </button>
                <button className={`tab-btn ${tab === 'novedades' ? 'tab-active' : ''}`} onClick={() => setTab('novedades')}>
                    📌 Novedades ({filtNov.length})
                </button>
            </div>

            {/* ─── Lista ─── */}
            <div className="entries-list">
                {tab === 'novedades' ? (
                    filtNov.length === 0 ? (
                        <p className="empty-state">No hay novedades registradas.{hasFilters && ' (filtros activos)'}</p>
                    ) : (
                        filtNov.map((nov) => (
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
                ) : currentGroups.length === 0 ? (
                    <p className="empty-state">
                        {tab === 'pendientes' ? '✅ No hay marcaciones pendientes.' : 'No hay registros.'}
                        {hasFilters && ' (filtros activos)'}
                    </p>
                ) : (
                    currentGroups.map(renderGroupCard)
                )}
            </div>
        </div>
    );
};

export default SupervisorPanel;

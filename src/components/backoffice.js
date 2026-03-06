// backoffice.js — Panel de administración (roles, empleados, proyectos)
import React, { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';
import {
    getAllEmployees,
    updateEmployeeRole,
    updateEmployeeField,
    deleteEmployee,
    getAllProjects,
    addProject,
    updateProject,
    deactivateProject,
    reactivateProject,
    getDistinctCountries,
} from '../services/supabase-db.js';
import { getAllPresence, isReallyOnline, timeAgo } from '../services/presence-service.js';

// Fix Leaflet default icon (webpack)
delete L.Icon.Default.prototype._getIconUrl;
const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// ── Modal de mapa GPS de presencia ───────────────────────
const PresenceMapModal = ({ employee, presence, onClose }) => {
    const mapRef = React.useRef(null);
    const mapInstance = React.useRef(null);

    React.useEffect(() => {
        if (!mapRef.current || !presence?.gps_lat || !presence?.gps_lng) return;
        const lat = Number(presence.gps_lat);
        const lng = Number(presence.gps_lng);
        const map = L.map(mapRef.current).setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);
        L.marker([lat, lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(`<strong>${employee.nombre}</strong><br>${timeAgo(presence.last_seen)}`)
            .openPopup();
        mapInstance.current = map;
        return () => { map.remove(); };
    }, [presence, employee]);

    if (!presence?.gps_lat || !presence?.gps_lng) return null;
    const lat = Number(presence.gps_lat);
    const lng = Number(presence.gps_lng);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content gps-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📍 Ubicación de {employee.nombre}</h3>
                    <button className="btn btn-xs btn-outline" onClick={onClose}>✖</button>
                </div>
                <div className="presence-map-info">
                    <span className={`presence-dot ${isReallyOnline(presence) ? 'online' : 'offline'}`}></span>
                    <span>{isReallyOnline(presence) ? 'En línea' : 'Desconectado'}</span>
                    <span className="presence-time">{timeAgo(presence.last_seen)}</span>
                    {presence.device_info && <span className="presence-device">📱 {presence.device_info}</span>}
                    {presence.app_version && <span className="presence-version">v{presence.app_version}</span>}
                </div>
                <div ref={mapRef} style={{ height: 350, borderRadius: 8, marginTop: 8 }}></div>
                <div className="gps-coords">
                    <code>{lat.toFixed(6)}, {lng.toFixed(6)}</code>
                    <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-xs btn-outline"
                    >
                        🗺️ Google Maps
                    </a>
                </div>
            </div>
        </div>
    );
};

const ROLES = [
    { value: 'tecnico', label: 'Técnico', color: '#2563eb' },
    { value: 'supervisor', label: 'Supervisor', color: '#d97706' },
    { value: 'admin', label: 'Admin', color: '#dc2626' },
];

// ── Sub-componente: fila de empleado editable ────────────
const EmployeeRow = ({ emp, paises, presence, onRoleChange, onFieldUpdate, onDeactivate, onShowMap }) => {
    const [editing, setEditing] = useState(false);
    const [nombre, setNombre] = useState(emp.nombre || '');
    const [cargo, setCargo] = useState(emp.cargo || '');
    const [pais, setPais] = useState(emp.pais || 'Colombia');
    const [telefono, setTelefono] = useState(emp.telefono || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onFieldUpdate(emp.id, { nombre, cargo, pais, telefono });
        setSaving(false);
        setEditing(false);
    };

    const handleCancel = () => {
        setNombre(emp.nombre || '');
        setCargo(emp.cargo || '');
        setPais(emp.pais || 'Colombia');
        setTelefono(emp.telefono || '');
        setEditing(false);
    };

    const rolObj = ROLES.find((r) => r.value === emp.rol) || ROLES[0];
    const online = isReallyOnline(presence);
    const hasGps = presence?.gps_lat && presence?.gps_lng;

    return (
        <tr className={!emp.activo ? 'row-inactive' : ''}>
            <td>
                <div className="employee-name-cell">
                    <span className={`presence-dot ${online ? 'online' : presence ? 'offline' : 'unknown'}`}
                          title={online ? 'En línea' : presence ? `Desconectado · ${timeAgo(presence.last_seen)}` : 'Sin datos'}></span>
                    {editing ? (
                        <input className="input input-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                    ) : (
                        <span>{emp.nombre}</span>
                    )}
                </div>
            </td>
            <td className="td-mono">{emp.cedula}</td>
            <td className="td-email">{emp.email || '—'}</td>
            <td>
                {editing ? (
                    <input className="input input-sm" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: +57 300 123 4567" />
                ) : (
                    emp.telefono || '—'
                )}
            </td>
            <td>
                {editing ? (
                    <input className="input input-sm" value={cargo} onChange={(e) => setCargo(e.target.value)} />
                ) : (
                    emp.cargo || '—'
                )}
            </td>
            <td>
                {editing ? (
                    <select className="input input-sm" value={pais} onChange={(e) => setPais(e.target.value)}>
                        {paises.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                ) : (
                    emp.pais || '—'
                )}
            </td>
            <td>
                <select
                    className="input input-sm role-select"
                    value={emp.rol || 'tecnico'}
                    onChange={(e) => onRoleChange(emp.id, e.target.value)}
                    style={{ borderColor: rolObj.color }}
                >
                    {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            </td>
            <td>
                <span className={`badge ${emp.activo ? 'badge-success' : 'badge-warning'}`}>
                    {emp.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td className="td-presence">
                {presence ? (
                    <div className="presence-info">
                        <span className={`presence-status-text ${online ? 'text-online' : 'text-offline'}`}>
                            {online ? '🟢 En línea' : '⚫ Desconectado'}
                        </span>
                        <span className="presence-last-seen">{timeAgo(presence.last_seen)}</span>
                        {hasGps && (
                            <button className="btn btn-xs btn-icon" onClick={() => onShowMap(emp, presence)} title="Ver ubicación">
                                📍
                            </button>
                        )}
                    </div>
                ) : (
                    <span className="presence-none">Sin conexión registrada</span>
                )}
            </td>
            <td className="td-actions">
                {editing ? (
                    <>
                        <button className="btn btn-xs btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? '…' : '💾'}
                        </button>
                        <button className="btn btn-xs btn-outline" onClick={handleCancel}>✖</button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-xs btn-outline" onClick={() => setEditing(true)} title="Editar">✏️</button>
                        {emp.activo && (
                            <button className="btn btn-xs btn-danger" onClick={() => onDeactivate(emp.id)} title="Desactivar">🚫</button>
                        )}
                    </>
                )}
            </td>
        </tr>
    );
};

// ── Sub-componente: formulario nuevo proyecto ────────────
const ProjectForm = ({ paises, onCreated }) => {
    const [codigo, setCodigo] = useState('');
    const [nombre, setNombre] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [pais, setPais] = useState(paises[0] || 'Colombia');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!codigo.trim() || !nombre.trim()) return;
        setSaving(true);
        try {
            await addProject({ codigo: codigo.trim(), nombre: nombre.trim(), ubicacion, pais, activo: true });
            setMsg({ tipo: 'ok', texto: `✅ Proyecto ${codigo} creado` });
            setCodigo('');
            setNombre('');
            setUbicacion('');
            if (onCreated) onCreated();
        } catch (err) {
            setMsg({ tipo: 'error', texto: '❌ ' + err.message });
        }
        setSaving(false);
        setTimeout(() => setMsg(null), 4000);
    };

    return (
        <form onSubmit={handleSubmit} className="bo-project-form">
            <div className="form-row">
                <input className="input" placeholder="Código (TXXXX)" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
                <input className="input" placeholder="Nombre del proyecto" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                <input className="input" placeholder="Ubicación" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
                <select className="input" value={pais} onChange={(e) => setPais(e.target.value)}>
                    {paises.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? '…' : '➕ Crear'}
                </button>
            </div>
            {msg && <div className={`alert alert-${msg.tipo === 'ok' ? 'success' : 'error'}`}>{msg.texto}</div>}
        </form>
    );
};

// ── Sub-componente: fila de proyecto editable ────────────
const ProjectRow = ({ proj, paises, onUpdate, onDeactivate, onReactivate }) => {
    const [editing, setEditing] = useState(false);
    const [codigo, setCodigo] = useState(proj.codigo || '');
    const [nombre, setNombre] = useState(proj.nombre || '');
    const [ubicacion, setUbicacion] = useState(proj.ubicacion || '');
    const [pais, setPais] = useState(proj.pais || 'Colombia');
    const [activo, setActivo] = useState(proj.activo !== false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!codigo.trim() || !nombre.trim()) return;
        setSaving(true);
        await onUpdate(proj.id, { codigo: codigo.trim(), nombre: nombre.trim(), ubicacion, pais, activo });
        setSaving(false);
        setEditing(false);
    };

    const handleCancel = () => {
        setCodigo(proj.codigo || '');
        setNombre(proj.nombre || '');
        setUbicacion(proj.ubicacion || '');
        setPais(proj.pais || 'Colombia');
        setActivo(proj.activo !== false);
        setEditing(false);
    };

    return (
        <tr className={!proj.activo ? 'row-inactive' : ''}>
            <td className="td-mono">
                {editing ? (
                    <input className="input input-sm" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                ) : (
                    proj.codigo
                )}
            </td>
            <td>
                {editing ? (
                    <input className="input input-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                ) : (
                    proj.nombre
                )}
            </td>
            <td>
                {editing ? (
                    <input className="input input-sm" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
                ) : (
                    proj.ubicacion || '—'
                )}
            </td>
            <td>
                {editing ? (
                    <select className="input input-sm" value={pais} onChange={(e) => setPais(e.target.value)}>
                        {paises.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                ) : (
                    proj.pais || '—'
                )}
            </td>
            <td>
                {editing ? (
                    <select
                        className="input input-sm"
                        value={activo ? 'true' : 'false'}
                        onChange={(e) => setActivo(e.target.value === 'true')}
                    >
                        <option value="true">✅ Activo</option>
                        <option value="false">⛔ Inactivo</option>
                    </select>
                ) : (
                    <span className={`badge ${proj.activo ? 'badge-success' : 'badge-warning'}`}>
                        {proj.activo ? 'Activo' : 'Inactivo'}
                    </span>
                )}
            </td>
            <td className="td-actions">
                {editing ? (
                    <>
                        <button className="btn btn-xs btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? '…' : '💾'}
                        </button>
                        <button className="btn btn-xs btn-outline" onClick={handleCancel}>✖</button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-xs btn-outline" onClick={() => setEditing(true)} title="Editar">✏️</button>
                        {proj.activo ? (
                            <button className="btn btn-xs btn-danger" onClick={() => onDeactivate(proj.id)} title="Desactivar">🚫</button>
                        ) : (
                            <button className="btn btn-xs btn-success" onClick={() => onReactivate(proj.id)} title="Reactivar">♻️</button>
                        )}
                    </>
                )}
            </td>
        </tr>
    );
};

// ── Componente principal BackOffice ──────────────────────
const BackOffice = () => {
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [paises, setPaises] = useState(['Colombia', 'México']);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('employees');
    const [searchTerm, setSearchTerm] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [showInactiveProjects, setShowInactiveProjects] = useState(false);
    const [presenceMap, setPresenceMap] = useState({}); // { employee_id: presenceRow }
    const [selectedMapEmp, setSelectedMapEmp] = useState(null); // { emp, presence }

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [emps, projs, countries] = await Promise.all([getAllEmployees(), getAllProjects(), getDistinctCountries()]);
            setEmployees(emps || []);
            setProjects(projs || []);
            setPaises(countries);
        } catch (err) {
            console.error('BackOffice loadData error:', err);
        }
        setLoading(false);
    }, []);

    // Cargar presencia aparte (no bloquea loadData)
    const loadPresence = useCallback(async () => {
        try {
            const rows = await getAllPresence();
            const map = {};
            for (const r of rows) {
                map[r.employee_id] = r;
            }
            setPresenceMap(map);
        } catch (err) {
            console.warn('Error loading presence:', err.message);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-refresh presencia cada 30 segundos cuando la sección de empleados está activa
    useEffect(() => {
        loadPresence();
        if (activeSection === 'employees') {
            const timer = setInterval(loadPresence, 30000);
            return () => clearInterval(timer);
        }
    }, [loadPresence, activeSection]);

    // ── Handlers ────────────────────────────
    const handleRoleChange = async (empId, newRole) => {
        try {
            await updateEmployeeRole(empId, newRole);
            setEmployees((prev) => prev.map((e) => e.id === empId ? { ...e, rol: newRole } : e));
        } catch (err) {
            alert('Error al cambiar rol: ' + err.message);
        }
    };

    const handleFieldUpdate = async (empId, fields) => {
        try {
            await updateEmployeeField(empId, fields);
            setEmployees((prev) => prev.map((e) => e.id === empId ? { ...e, ...fields } : e));
        } catch (err) {
            alert('Error al actualizar: ' + err.message);
        }
    };

    const handleDeactivate = async (empId) => {
        if (!confirm('¿Desactivar este empleado?')) return;
        try {
            await deleteEmployee(empId);
            setEmployees((prev) => prev.map((e) => e.id === empId ? { ...e, activo: false } : e));
        } catch (err) {
            alert('Error al desactivar: ' + err.message);
        }
    };

    // ── Handlers Proyectos ──────────────────
    const handleProjectUpdate = async (projectId, fields) => {
        try {
            await updateProject(projectId, fields);
            setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, ...fields } : p));
        } catch (err) {
            alert('Error al actualizar proyecto: ' + err.message);
        }
    };

    const handleProjectDeactivate = async (projectId) => {
        if (!confirm('¿Desactivar este proyecto?')) return;
        try {
            await deactivateProject(projectId);
            setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, activo: false } : p));
        } catch (err) {
            alert('Error al desactivar proyecto: ' + err.message);
        }
    };

    const handleProjectReactivate = async (projectId) => {
        try {
            await reactivateProject(projectId);
            setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, activo: true } : p));
        } catch (err) {
            alert('Error al reactivar proyecto: ' + err.message);
        }
    };

    // ── Filtro empleados ─────────────────────
    const filteredEmployees = employees.filter((e) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (e.nombre || '').toLowerCase().includes(term) ||
            (e.cedula || '').toLowerCase().includes(term) ||
            (e.email || '').toLowerCase().includes(term) ||
            (e.rol || '').toLowerCase().includes(term)
        );
    });

    // ── Filtro proyectos ────────────────────
    const filteredProjects = projects.filter((p) => {
        if (!showInactiveProjects && !p.activo) return false;
        if (!projectSearch) return true;
        const term = projectSearch.toLowerCase();
        return (
            (p.codigo || '').toLowerCase().includes(term) ||
            (p.nombre || '').toLowerCase().includes(term) ||
            (p.ubicacion || '').toLowerCase().includes(term) ||
            (p.pais || '').toLowerCase().includes(term)
        );
    });

    // ── Contadores resumen ──────────────────
    const totalActive = employees.filter((e) => e.activo).length;
    const onlineNow = employees.filter((e) => e.activo && isReallyOnline(presenceMap[e.id])).length;
    const countByRole = ROLES.map((r) => ({
        ...r,
        count: employees.filter((e) => e.rol === r.value && e.activo).length,
    }));
    const activeProjects = projects.filter((p) => p.activo).length;
    const inactiveProjects = projects.length - activeProjects;

    const handleShowMap = (emp, presence) => setSelectedMapEmp({ emp, presence });
    const handleCloseMap = () => setSelectedMapEmp(null);

    if (loading) {
        return (
            <div className="card">
                <div className="spinner"></div>
                <p style={{ textAlign: 'center', marginTop: 12 }}>Cargando BackOffice…</p>
            </div>
        );
    }

    return (
        <div className="backoffice">
            <div className="card">
                <h2>⚙️ BackOffice — Administración</h2>
                <p className="card-subtitle">Gestión de empleados, roles y proyectos</p>

                {/* Resumen */}
                <div className="bo-summary">
                    <div className="bo-stat">
                        <span className="bo-stat-number">{totalActive}</span>
                        <span className="bo-stat-label">Empleados activos</span>
                    </div>
                    <div className="bo-stat">
                        <span className="bo-stat-number" style={{ color: '#22c55e' }}>{onlineNow}</span>
                        <span className="bo-stat-label">🟢 En línea ahora</span>
                    </div>
                    {countByRole.map((r) => (
                        <div className="bo-stat" key={r.value}>
                            <span className="bo-stat-number" style={{ color: r.color }}>{r.count}</span>
                            <span className="bo-stat-label">{r.label}s</span>
                        </div>
                    ))}
                    <div className="bo-stat">
                        <span className="bo-stat-number">{activeProjects}</span>
                        <span className="bo-stat-label">Proyectos activos</span>
                    </div>
                    {inactiveProjects > 0 && (
                        <div className="bo-stat">
                            <span className="bo-stat-number" style={{ color: '#9ca3af' }}>{inactiveProjects}</span>
                            <span className="bo-stat-label">Proyectos inactivos</span>
                        </div>
                    )}
                </div>

                {/* Tabs de sección */}
                <div className="bo-section-tabs">
                    <button
                        className={`bo-tab ${activeSection === 'employees' ? 'bo-tab-active' : ''}`}
                        onClick={() => setActiveSection('employees')}
                    >
                        👥 Empleados
                    </button>
                    <button
                        className={`bo-tab ${activeSection === 'projects' ? 'bo-tab-active' : ''}`}
                        onClick={() => setActiveSection('projects')}
                    >
                        📁 Proyectos
                    </button>
                </div>
            </div>

            {/* ── Sección Empleados ─────────── */}
            {activeSection === 'employees' && (
                <div className="card">
                    <div className="bo-toolbar">
                        <input
                            className="input"
                            placeholder="🔍 Buscar por nombre, cédula, email o rol…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ maxWidth: 400 }}
                        />
                        <button className="btn btn-outline" onClick={() => { loadData(); loadPresence(); }}>🔄 Refrescar</button>
                    </div>

                    <div className="bo-table-wrapper">
                        <table className="bo-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Cédula</th>
                                    <th>Email</th>
                                    <th>Teléfono</th>
                                    <th>Cargo</th>
                                    <th>País</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Presencia / Ubicación</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 ? (
                                    <tr><td colSpan={10} className="td-empty">No se encontraron empleados</td></tr>
                                ) : (
                                    filteredEmployees.map((emp) => (
                                        <EmployeeRow
                                            key={emp.id}
                                            emp={emp}
                                            paises={paises}
                                            presence={presenceMap[emp.id] || null}
                                            onRoleChange={handleRoleChange}
                                            onFieldUpdate={handleFieldUpdate}
                                            onDeactivate={handleDeactivate}
                                            onShowMap={handleShowMap}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Sección Proyectos ─────────── */}
            {activeSection === 'projects' && (
                <div className="card">
                    <h3>➕ Crear nuevo proyecto / OT</h3>
                    <ProjectForm paises={paises} onCreated={loadData} />

                    <h3 style={{ marginTop: 24 }}>📋 Proyectos existentes</h3>

                    <div className="bo-toolbar">
                        <input
                            className="input"
                            placeholder="🔍 Buscar por código, nombre, ubicación o país…"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            style={{ maxWidth: 400 }}
                        />
                        <label className="bo-checkbox-label">
                            <input
                                type="checkbox"
                                checked={showInactiveProjects}
                                onChange={(e) => setShowInactiveProjects(e.target.checked)}
                            />
                            Mostrar inactivos
                        </label>
                        <button className="btn btn-outline" onClick={loadData}>🔄 Refrescar</button>
                    </div>

                    <div className="bo-table-wrapper">
                        <table className="bo-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th>Ubicación</th>
                                    <th>País</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.length === 0 ? (
                                    <tr><td colSpan={6} className="td-empty">No se encontraron proyectos</td></tr>
                                ) : (
                                    filteredProjects.map((p) => (
                                        <ProjectRow
                                            key={p.id}
                                            proj={p}
                                            paises={paises}
                                            onUpdate={handleProjectUpdate}
                                            onDeactivate={handleProjectDeactivate}
                                            onReactivate={handleProjectReactivate}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bo-project-footer">
                        <span className="bo-project-count">
                            Mostrando {filteredProjects.length} de {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            )}

            {/* Modal de mapa de presencia */}
            {selectedMapEmp && (
                <PresenceMapModal
                    employee={selectedMapEmp.emp}
                    presence={selectedMapEmp.presence}
                    onClose={handleCloseMap}
                />
            )}
        </div>
    );
};

export default BackOffice;

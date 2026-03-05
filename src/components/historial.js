// historial.js — Historial de marcaciones y detección de patrones
import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STATUS_LABELS, TIPO_ACTIVIDAD_LABELS } from '../utils/helpers.js';
import { getTimeEntries, getEmployees } from '../js/db.js';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* ─── Mini mapa modal ─── */
const GPSMapModal = ({ gps, tipoMarcacion, date, onClose }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!gps || !gps.lat || !gps.lng || !mapRef.current) return;
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
                zoomControl: true,
                scrollWheelZoom: true,
            }).setView([gps.lat, gps.lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(mapInstanceRef.current);
        }
        L.marker([gps.lat, gps.lng], { icon: markerIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<strong>${tipoMarcacion === 'entrada' ? '🟢 Entrada' : '🔴 Salida'}</strong><br/>${date}<br/><small>${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}</small>`)
            .openPopup();
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
        return () => {};
    }, [gps]);

    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content gps-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📍 Ubicación — {date}</h3>
                    <button className="btn btn-sm btn-outline" onClick={onClose}>✕</button>
                </div>
                <div ref={mapRef} style={{ height: 350, width: '100%', borderRadius: 8 }} />
                <div className="gps-coords">
                    <small>{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</small>
                    <a
                        href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline"
                        style={{ marginLeft: 8 }}
                    >
                        Abrir en Google Maps ↗
                    </a>
                </div>
            </div>
        </div>
    );
};

const Historial = ({ currentEmployee, rol }) => {
    const [entries, setEntries] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filtroEmpleado, setFiltroEmpleado] = useState('');
    const [selectedGps, setSelectedGps] = useState(null);
    const isTecnico = rol === 'tecnico';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [ents, emps] = await Promise.all([getTimeEntries(), getEmployees()]);
        // Si es técnico, solo mostrar sus propias marcaciones
        if (isTecnico && currentEmployee) {
            setEntries(ents.filter(e => e.employeeId === currentEmployee.id));
        } else {
            setEntries(ents);
        }
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
            <h2>📈 {isTecnico ? 'Mi Historial' : 'Historial y Patrones'}</h2>
            <p className="card-subtitle">
                {isTecnico
                    ? 'Resumen de tus marcaciones'
                    : 'Análisis de marcaciones tardías y patrones por empleado'}
            </p>

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

            {/* Tabla de empleados — solo supervisores y admin */}
            {!isTecnico && (
            <>
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
            </>
            )}

            {/* Vista directa de marcaciones para técnicos */}
            {isTecnico && (
                <div className="detalle-empleado">
                    <h3>Mis marcaciones</h3>
                    {entries.length === 0 ? (
                        <p className="empty-state">No tienes marcaciones registradas aún.</p>
                    ) : (
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
                                {entries
                                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
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
                                        <td>
                                            {m.gps && m.gps.lat ? (
                                                <button
                                                    className="btn-icon"
                                                    title="Ver ubicación en mapa"
                                                    onClick={() => setSelectedGps({ gps: m.gps, tipoMarcacion: m.tipoMarcacion, date: m.date })}
                                                >📍</button>
                                            ) : '❌'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>
            )}

            {/* Detalle del empleado seleccionado — supervisores/admin */}
            {!isTecnico && empleadoSeleccionado && (
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
                                        <td>
                                            {m.gps && m.gps.lat ? (
                                                <button
                                                    className="btn-icon"
                                                    title="Ver ubicación en mapa"
                                                    onClick={() => setSelectedGps({ gps: m.gps, tipoMarcacion: m.tipoMarcacion, date: m.date })}
                                                >📍</button>
                                            ) : '❌'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal del mapa GPS */}
            {selectedGps && (
                <GPSMapModal
                    gps={selectedGps.gps}
                    tipoMarcacion={selectedGps.tipoMarcacion}
                    date={selectedGps.date}
                    onClose={() => setSelectedGps(null)}
                />
            )}
        </div>
    );
};

export default Historial;

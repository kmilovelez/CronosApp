// novedades-form.js — Registro de novedades (incapacidad, vacaciones, calamidad, etc.)
import React, { useState, useEffect, useCallback } from 'react';
import { TIPO_NOVEDAD_LABELS, fileToBase64, formatDateISO } from '../utils/helpers.js';
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

    const esParcial = tipo === 'cita_medica' || tipo === 'permiso_remunerado';

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) { setMensaje({ tipo: 'error', texto: 'Cédula no encontrada.' }); return; }

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
            <p className="card-subtitle">Incapacidades, vacaciones, calamidades, compensatorios, permisos</p>

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
                    <label>Proyecto / OT (opcional)</label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input">
                        <option value="">— Ninguno —</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Descripción</label>
                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalle de la novedad…" className="input textarea" rows={3} required />
                </div>

                <div className="form-group">
                    <label>📎 Adjuntar evidencia (incapacidad, comprobante cita, etc.)</label>
                    <input type="file" multiple onChange={handleFileChange} className="input-file" accept="image/*,.pdf,.doc,.docx" />
                    {archivos.length > 0 && (
                        <ul className="file-list">
                            {archivos.map((f, i) => <li key={i}>📄 {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                        </ul>
                    )}
                </div>

                {mensaje && (
                    <div className={`alert alert-${mensaje.tipo === 'ok' ? 'success' : 'error'}`}>{mensaje.texto}</div>
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={loading || !selectedEmployee}>
                    {loading ? '⏳ Registrando…' : '📋 Registrar novedad'}
                </button>
            </form>
        </div>
    );
};

export default NovedadesForm;

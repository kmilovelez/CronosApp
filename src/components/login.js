// login.js — Componente de Login / Registro para CronosApp
import React, { useState } from 'react';
import { signInSmart, signUp } from '../services/auth-service.js';

const Login = ({ onLogin, onSkip }) => {
    const [mode, setMode] = useState('login'); // login | register
    const [identifier, setIdentifier] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [cedula, setCedula] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (mode === 'login') {
                const data = await signInSmart(identifier, password);
                onLogin(data.session, data.user);
            } else {
                const data = await signUp(email, password, {
                    nombre,
                    cedula,
                });
                if (data.session) {
                    onLogin(data.session, data.user);
                } else {
                    setSuccess('✅ Cuenta creada. Revisa tu correo para confirmar, o inicia sesión.');
                    setMode('login');
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>⏱ CronosApp</h1>
                    <p>Control de marcaciones · Equipos técnicos multisede</p>
                </div>

                <div className="login-tabs">
                    <button
                        className={`login-tab ${mode === 'login' ? 'login-tab-active' : ''}`}
                        onClick={() => { setMode('login'); setError(null); }}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        className={`login-tab ${mode === 'register' ? 'login-tab-active' : ''}`}
                        onClick={() => { setMode('register'); setError(null); }}
                    >
                        Registrarse
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {mode === 'register' && (
                        <>
                            <div className="form-group">
                                <label>Nombre completo</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej: Harold Pérez"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Cédula / ID</label>
                                <input
                                    type="text"
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    placeholder="Ej: 1001234567"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {mode === 'login' ? (
                        <div className="form-group">
                            <label>Correo, cédula o celular</label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="usuario@empresa.com / 1001234567 / +57 300..."
                                required
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Correo electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@empresa.com"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                            required
                        />
                    </div>

                    {error && <div className="alert alert-error">❌ {error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
                        {loading ? '⏳ Procesando...' : mode === 'login' ? '🔐 Iniciar Sesión' : '📝 Crear Cuenta'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;

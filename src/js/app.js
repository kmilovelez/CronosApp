import React, { useState, useEffect, Component } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/styles.css';
import { initDB, seedDemoData, isOnline } from './db.js';
import { getSession, signOut, onAuthStateChange } from '../services/auth-service.js';
import { upsertEmployeeFromAuth } from '../services/supabase-db.js';
import Login from '../components/login.js';
import MarcacionForm from '../components/marcacion-form.js';
import MarcacionTardia from '../components/marcacion-tardia.js';
import NovedadesForm from '../components/novedades-form.js';
import SupervisorPanel from '../components/supervisor-panel.js';
import ReporteNomina from '../components/reporte-nomina.js';
import Historial from '../components/historial.js';
import BackOffice from '../components/backoffice.js';

// ── Error Boundary para capturar crashes de React ────────
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('🔴 ErrorBoundary caught:', error, info);
        this.setState({ info });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 32, fontFamily: 'monospace', color: '#dc2626' }}>
                    <h2>❌ CronosApp — Error de renderizado</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', background: '#fef2f2', padding: 16, borderRadius: 8 }}>
                        {this.state.error?.toString()}
                    </pre>
                    <details style={{ marginTop: 12 }}>
                        <summary>Stack trace</summary>
                        <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                            {this.state.info?.componentStack}
                        </pre>
                    </details>
                    <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
                        🔄 Recargar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const TABS = [
    { id: 'marcacion', label: 'Marcar', icon: '\u{1F4CD}', component: MarcacionForm, role: 'tecnico' },
    { id: 'tardia', label: 'Pendientes', icon: '\u{1F4CB}', component: MarcacionTardia, role: 'tecnico' },
    { id: 'novedades', label: 'Novedades', icon: '\u{1F4CB}', component: NovedadesForm, role: 'tecnico' },
    { id: 'supervisor', label: 'Aprobar', icon: '\u{1F50D}', component: SupervisorPanel, role: 'supervisor' },
    { id: 'nomina', label: 'Nomina', icon: '\u{1F4CA}', component: ReporteNomina, role: 'supervisor' },
    { id: 'historial', label: 'Historial', icon: '\u{1F4C8}', component: Historial, role: 'supervisor' },
    { id: 'admin', label: 'Admin', icon: '\u2699\uFE0F', component: BackOffice, role: 'admin' },
];

const App = () => {
    const [activeTab, setActiveTab] = useState('marcacion');
    const [rol, setRol] = useState('tecnico');
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [dbReady, setDbReady] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [authState, setAuthState] = useState('loading');
    const [session, setSession] = useState(null);
    const [connectionMode, setConnectionMode] = useState('offline');

    useEffect(() => {
        checkAuth();
        const sub = onAuthStateChange((event, sess) => {
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setCurrentEmployee(null);
                setRol('tecnico');
                setAuthState('login');
            }
        });
        return () => {
            if (sub && sub.unsubscribe) sub.unsubscribe();
        };
    }, []);

    // Obtener o crear el perfil de employee desde Supabase
    const resolveEmployee = async (user) => {
        if (!user) return null;
        try {
            const emp = await upsertEmployeeFromAuth(user);
            if (emp) {
                setCurrentEmployee(emp);
                setRol(emp.rol || 'tecnico');
                return emp;
            }
        } catch (err) {
            console.warn('resolveEmployee error:', err);
        }
        return null;
    };

    const checkAuth = async () => {
        try {
            const sess = await getSession();
            if (sess) {
                setSession(sess);
                await resolveEmployee(sess.user);
                await startApp(true);
            } else {
                setAuthState('login');
            }
        } catch (e) {
            console.warn('Auth check failed:', e);
            setAuthState('login');
        }
    };

    const startApp = async (online) => {
        try {
            const connected = await initDB();
            await seedDemoData();
            setConnectionMode(connected ? 'online' : 'offline');
            setDbReady(true);
            setAuthState('app');
        } catch (err) {
            console.error('Error al inicializar:', err);
            setAuthState('login');
        }
    };

    const handleLogin = async (sess, user) => {
        setSession(sess);
        await resolveEmployee(user);
        await startApp(true);
    };

    const handleSkipLogin = async () => {
        setSession(null);
        setCurrentEmployee(null);
        setRol('tecnico');
        await startApp(false);
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (e) {
            console.warn('Logout error:', e);
        }
        setSession(null);
        setCurrentEmployee(null);
        setRol('tecnico');
        setDbReady(false);
        setAuthState('login');
    };

    const handleSuccess = () => {
        setRefreshKey((k) => k + 1);
    };

    const visibleTabs = TABS.filter((t) => {
        if (rol === 'admin') return true;                     // admin ve todo
        if (rol === 'supervisor') return t.role !== 'admin';  // supervisor ve tecnico + supervisor
        return t.role === 'tecnico';                          // tecnico solo sus tabs
    });

    // Si el tab activo no está entre los visibles, resetear al primero
    const safeActiveTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id || 'marcacion';
    const ActiveComponent = visibleTabs.find((t) => t.id === safeActiveTab)?.component;

    if (authState === 'loading') {
        return (
            <div className="app-loading">
                <div className="spinner"></div>
                <p>Cargando CronosApp...</p>
            </div>
        );
    }

    if (authState === 'login' || !dbReady) {
        return <Login onLogin={handleLogin} onSkip={handleSkipLogin} />;
    }

    const connLabel = connectionMode === 'online' ? 'Supabase' : 'Offline';
    const connClass = connectionMode === 'online' ? 'badge-success' : 'badge-warning';
    const isOnlineConn = connectionMode === 'online';
    const rolLabel = rol === 'admin' ? '⚙️ Admin' : rol === 'supervisor' ? '🔍 Supervisor' : '🔧 Técnico';
    const userName = currentEmployee?.nombre || session?.user?.email || '';
    const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

    // Divide tabs into groups for sidebar sections
    const tecnicoTabs = visibleTabs.filter(t => t.role === 'tecnico');
    const supervisorTabs = visibleTabs.filter(t => t.role === 'supervisor');
    const adminTabs = visibleTabs.filter(t => t.role === 'admin');

    return (
        <div className="app-container">
            {/* ── SIDEBAR ────────────────────────── */}
            <aside className="app-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <div className="sidebar-logo">C</div>
                        <div>
                            <h1>CronosApp</h1>
                            <span className="subtitle">Control de marcaciones</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {tecnicoTabs.length > 0 && (
                        <>
                            <div className="sidebar-section-label">Operación</div>
                            {tecnicoTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={'nav-item' + (safeActiveTab === tab.id ? ' nav-item-active' : '')}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span className="nav-item-icon">{tab.icon}</span>
                                    <span className="nav-item-label">{tab.label}</span>
                                </button>
                            ))}
                        </>
                    )}
                    {supervisorTabs.length > 0 && (
                        <>
                            <div className="sidebar-section-label">Supervisión</div>
                            {supervisorTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={'nav-item' + (safeActiveTab === tab.id ? ' nav-item-active' : '')}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span className="nav-item-icon">{tab.icon}</span>
                                    <span className="nav-item-label">{tab.label}</span>
                                </button>
                            ))}
                        </>
                    )}
                    {adminTabs.length > 0 && (
                        <>
                            <div className="sidebar-section-label">Administración</div>
                            {adminTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={'nav-item' + (safeActiveTab === tab.id ? ' nav-item-active' : '')}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span className="nav-item-icon">{tab.icon}</span>
                                    <span className="nav-item-label">{tab.label}</span>
                                </button>
                            ))}
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-connection">
                        <span className={'conn-dot ' + (isOnlineConn ? 'conn-dot-online' : 'conn-dot-offline')}></span>
                        {connLabel}
                    </div>
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{userInitial}</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{userName}</div>
                            <div className="sidebar-user-role">
                                <span className={'role-badge role-badge-' + rol}>{rolLabel}</span>
                            </div>
                        </div>
                    </div>
                    {session && (
                        <button className="btn-logout" onClick={handleLogout}>
                            Cerrar sesión
                        </button>
                    )}
                </div>
            </aside>

            {/* ── MAIN BODY ──────────────────────── */}
            <div className="app-body">
                {/* Mobile header (hidden on desktop via CSS) */}
                <header className="app-header">
                    <div className="header-content">
                        <h1>CronosApp</h1>
                        <p className="subtitle">
                            Control de marcaciones
                            <span className={'connection-badge ' + connClass}>{connLabel}</span>
                        </p>
                    </div>
                    <div className="header-actions">
                        <span className={'role-badge role-badge-' + rol}>{rolLabel}</span>
                        {session && (
                            <button className="btn btn-sm btn-logout" onClick={handleLogout}>
                                Salir
                            </button>
                        )}
                    </div>
                </header>

                <main className="app-main" key={refreshKey}>
                    {ActiveComponent && <ActiveComponent onSuccess={handleSuccess} currentEmployee={currentEmployee} />}
                </main>

                <footer className="app-footer">
                    <p>CronosApp v2.0</p>
                    <p className="footer-note">
                        {connectionMode === 'online' ? 'Conectado a Supabase' : 'Modo offline (IndexedDB)'}
                        {session ? ' · ' + session.user.email : ''}
                    </p>
                </footer>
            </div>
        </div>
    );
};

async function bootstrap() {
    // Registrar SW solo en producción; en desarrollo desregistrar para evitar cache
    if ('serviceWorker' in navigator) {
        if (process.env.NODE_ENV === 'production') {
            try {
                await navigator.serviceWorker.register('/service-worker.js');
            } catch (err) {
                console.log('SW no registrado:', err);
            }
        } else {
            // Desregistrar cualquier SW activo en desarrollo
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                await reg.unregister();
                console.log('SW desregistrado (modo desarrollo)');
            }
        }
    }
    const container = document.getElementById('app');
    const root = createRoot(container);
    root.render(<ErrorBoundary><App /></ErrorBoundary>);
}

bootstrap();

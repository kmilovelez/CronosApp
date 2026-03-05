// presence-service.js — Servicio de presencia en tiempo real
// Registra heartbeat con ubicación GPS cada 2 minutos
import { supabase } from './supabase.js';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutos
const OFFLINE_THRESHOLD = 5 * 60 * 1000;  // 5 min sin heartbeat = offline

let heartbeatTimer = null;
let currentEmployeeId = null;

// ── Obtener ubicación GPS actual ─────────────────────────
function getCurrentPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
            }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });
}

// ── Obtener info del dispositivo ─────────────────────────
function getDeviceInfo() {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const platform = navigator.platform || 'Unknown';
    return `${isMobile ? 'Mobile' : 'Desktop'} · ${platform}`;
}

// ── Enviar heartbeat de presencia ────────────────────────
async function sendHeartbeat() {
    if (!currentEmployeeId) return;
    try {
        const gps = await getCurrentPosition();
        const payload = {
            employee_id: currentEmployeeId,
            is_online: true,
            last_seen: new Date().toISOString(),
            gps_lat: gps?.lat || null,
            gps_lng: gps?.lng || null,
            device_info: getDeviceInfo(),
            app_version: process.env.APP_VERSION || '?.?.?',
        };

        await supabase
            .from('user_presence')
            .upsert(payload, { onConflict: 'employee_id' });
    } catch (err) {
        console.warn('Presence heartbeat error:', err.message);
    }
}

// ── Marcar como offline ──────────────────────────────────
async function markOffline() {
    if (!currentEmployeeId) return;
    try {
        await supabase
            .from('user_presence')
            .upsert({
                employee_id: currentEmployeeId,
                is_online: false,
                last_seen: new Date().toISOString(),
            }, { onConflict: 'employee_id' });
    } catch (err) {
        console.warn('Presence markOffline error:', err.message);
    }
}

// ── Iniciar servicio de presencia ────────────────────────
export function startPresence(employeeId) {
    if (!employeeId) return;
    currentEmployeeId = employeeId;

    // Enviar heartbeat inmediato
    sendHeartbeat();

    // Programar heartbeat periódico
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Detectar cuando el usuario cierra la pestaña o sale
    window.addEventListener('beforeunload', handleUnload);
    // Detectar visibilidad (tab background)
    document.addEventListener('visibilitychange', handleVisibility);
}

// ── Detener servicio de presencia ────────────────────────
export function stopPresence() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    markOffline();
    window.removeEventListener('beforeunload', handleUnload);
    document.removeEventListener('visibilitychange', handleVisibility);
    currentEmployeeId = null;
}

// ── Handlers de eventos ──────────────────────────────────
function handleUnload() {
    // Intentar marcar offline al cerrar (no es 100% fiable pero ayuda)
    if (currentEmployeeId && navigator.sendBeacon) {
        // sendBeacon es más fiable en beforeunload
        const url = `${supabase.supabaseUrl}/rest/v1/user_presence?employee_id=eq.${currentEmployeeId}`;
        const body = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    }
}

function handleVisibility() {
    if (document.visibilityState === 'visible') {
        // Volvió a la tab: enviar heartbeat
        sendHeartbeat();
    }
}

// ── Obtener presencia de todos los empleados ─────────────
export async function getAllPresence() {
    const res = await supabase
        .from('user_presence')
        .select('employee_id, is_online, last_seen, gps_lat, gps_lng, gps_address, device_info, app_version');
    if (res.error) throw new Error(res.error.message);
    return res.data || [];
}

// ── Determinar si un usuario está realmente online ───────
// (basado en threshold de 5 minutos)
export function isReallyOnline(presenceRow) {
    if (!presenceRow || !presenceRow.is_online) return false;
    const lastSeen = new Date(presenceRow.last_seen).getTime();
    const now = Date.now();
    return (now - lastSeen) < OFFLINE_THRESHOLD;
}

// ── Formatear "hace X minutos" ───────────────────────────
export function timeAgo(dateStr) {
    if (!dateStr) return 'Nunca';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
}

// helpers.js - Utilidades CronosApp

// ── Formato de tiempo ───────────────────────────────────
export function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatHHMM(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateISO(date) {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
}

export function getCurrentTimeString() {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function getTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// ── Cálculo horas de viaje ──────────────────────────────
export function calcularHorasViaje(horaSalida, horaLlegada, tipoVuelo) {
    // horaSalida, horaLlegada en formato "HH:MM"
    // tipoVuelo: "nacional" | "internacional"
    // Política: Nacional => +2h antes, +1h después
    //           Internacional => +3h antes, +1h después
    if (!horaSalida || !horaLlegada) return { inicio: null, fin: null, totalHoras: 0 };

    const [hs, ms] = horaSalida.split(':').map(Number);
    const [hl, ml] = horaLlegada.split(':').map(Number);

    const horasAntes = tipoVuelo === 'internacional' ? 3 : 2;
    const horasDespues = 1;

    let inicioMin = hs * 60 + ms - horasAntes * 60;
    let finMin = hl * 60 + ml + horasDespues * 60;

    if (inicioMin < 0) inicioMin = 0;
    if (finMin > 24 * 60) finMin = 24 * 60;

    const totalHoras = (finMin - inicioMin) / 60;

    const formatMin = (min) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
        inicio: formatMin(inicioMin),
        fin: formatMin(finMin),
        totalHoras: Math.round(totalHoras * 100) / 100,
    };
}

// ── Cálculo duración entre entrada y salida ─────────────
export function calcularDuracion(horaEntrada, horaSalida, descontarAlmuerzo = false) {
    if (!horaEntrada || !horaSalida) return 0;
    const [he, me] = horaEntrada.split(':').map(Number);
    const [hs, ms] = horaSalida.split(':').map(Number);

    let minEntrada = he * 60 + me;
    let minSalida = hs * 60 + ms;

    // Si salida < entrada, cruzó medianoche
    if (minSalida < minEntrada) minSalida += 24 * 60;

    let totalMin = minSalida - minEntrada;
    if (descontarAlmuerzo) totalMin -= 60; // 1h almuerzo
    if (totalMin < 0) totalMin = 0;

    return totalMin / 60; // horas decimales
}

// ── Geolocalización ─────────────────────────────────────
export function obtenerUbicacion() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalización no soportada'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    precision: pos.coords.accuracy,
                });
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

export async function reverseGeocode(lat, lng) {
    // Usa API gratuita de Nominatim (OpenStreetMap)
    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
        );
        const data = await resp.json();
        return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch (e) {
        console.warn('Reverse geocode falló:', e);
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}

// ── Archivos a Base64 ───────────────────────────────────
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ── Exportar a CSV ──────────────────────────────────────
export function exportToCSV(rows, filename) {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
            headers.map((h) => {
                const val = row[h] != null ? String(row[h]) : '';
                return `"${val.replace(/"/g, '""')}"`;
            }).join(',')
        ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'reporte.csv';
    link.click();
    URL.revokeObjectURL(url);
}

// ── Misc ────────────────────────────────────────────────
export function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

export function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Labels legibles
export const TIPO_ACTIVIDAD_LABELS = {
    montaje_sitio: 'Montaje en sitio',
    planta: 'Trabajo en planta',
};

export const TIPO_NOVEDAD_LABELS = {
    incapacidad: 'Incapacidad',
    vacaciones: 'Vacaciones',
    calamidad: 'Calamidad doméstica',
    compensatorio: 'Compensatorio',
    permiso_remunerado: 'Permiso remunerado',
    permiso_no_remunerado: 'Permiso no remunerado',
    cita_medica: 'Cita médica',
    capacitacion: 'Capacitación',
    entrenamiento: 'Entrenamiento',
    viaje_vuelo: 'Viaje / Vuelo',
    licencia_paternidad: 'Licencia de paternidad',
    licencia_luto: 'Licencia por luto',
};

export const STATUS_LABELS = {
    registrada: 'Registrada',
    pendiente_aprobacion: 'Pendiente aprobación',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    ajustada: 'Ajustada',
};
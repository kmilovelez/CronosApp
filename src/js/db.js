// db.js — Capa híbrida: Supabase (online) + IndexedDB (offline)
// Exporta la misma API que antes — los componentes no necesitan cambiar.

import * as supa from '../services/supabase-db.js';

// ── Estado de conexión ──────────────────────────────────
let _online = false;
let _idbReady = false;

export function isOnline() {
    return _online;
}

// ── INIT ────────────────────────────────────────────────
export async function initDB() {
    // 1. Intentar conectar Supabase
    try {
        _online = await supa.initSupabase();
    } catch {
        _online = false;
    }
    // 2. Siempre inicializar IndexedDB como fallback
    await initIndexedDB();
    _idbReady = true;

    console.log(_online ? '✅ Modo: Supabase (online)' : '⚠️ Modo: IndexedDB (offline)');
    return _online;
}

// ── Proxy: ejecuta contra Supabase; si falla, usa IndexedDB ──
async function withFallback(supaFn, idbFn) {
    if (_online) {
        try {
            return await supaFn();
        } catch (err) {
            console.warn('Supabase falló, usando IndexedDB:', err.message);
        }
    }
    return await idbFn();
}

// ════════════════════════════════════════════════════════
//  API PÚBLICA — misma interfaz para todos los componentes
// ════════════════════════════════════════════════════════

// ── EMPLOYEES ───────────────────────────────────────────
export function addEmployee(emp) {
    return withFallback(() => supa.addEmployee(emp), () => idb_addEmployee(emp));
}
export function getEmployees() {
    return withFallback(() => supa.getEmployees(), () => idb_getEmployees());
}
export function getEmployeeByCedula(cedula) {
    return withFallback(() => supa.getEmployeeByCedula(cedula), () => idb_getEmployeeByCedula(cedula));
}

// ── PROJECTS ────────────────────────────────────────────
export function addProject(proj) {
    return withFallback(() => supa.addProject(proj), () => idb_addProject(proj));
}
export function getProjects() {
    return withFallback(() => supa.getProjects(), () => idb_getProjects());
}
export function getAllProjects() {
    return withFallback(() => supa.getAllProjects(), () => idb_getProjects());
}

// ── TIME ENTRIES ────────────────────────────────────────
export function addTimeEntry(entry) {
    return withFallback(() => supa.addTimeEntry(entry), () => idb_addTimeEntry(entry));
}
export function getTimeEntries() {
    return withFallback(() => supa.getTimeEntries(), () => idb_getTimeEntries());
}
export function getTimeEntriesByEmployee(employeeId) {
    return withFallback(() => supa.getTimeEntriesByEmployee(employeeId), () => idb_getTimeEntriesByEmployee(employeeId));
}
export function getTimeEntriesByDate(date) {
    return withFallback(() => supa.getTimeEntriesByDate(date), () => idb_getTimeEntriesByDate(date));
}
export function getTimeEntriesByStatus(status) {
    return withFallback(() => supa.getTimeEntriesByStatus(status), () => idb_getTimeEntriesByStatus(status));
}
export function updateTimeEntry(entry) {
    return withFallback(() => supa.updateTimeEntry(entry), () => idb_updateTimeEntry(entry));
}

// ── NOVELTIES ───────────────────────────────────────────
export function addNovelty(nov) {
    return withFallback(() => supa.addNovelty(nov), () => idb_addNovelty(nov));
}
export function getNovelties() {
    return withFallback(() => supa.getNovelties(), () => idb_getNovelties());
}
export function getNoveltiesByEmployee(employeeId) {
    return withFallback(() => supa.getNoveltiesByEmployee(employeeId), () => idb_getNoveltiesByEmployee(employeeId));
}

// ── APPROVALS ───────────────────────────────────────────
export function addApproval(approval) {
    return withFallback(() => supa.addApproval(approval), () => idb_addApproval(approval));
}
export function getApprovals() {
    return withFallback(() => supa.getApprovals(), () => idb_getApprovals());
}
export function getApprovalsByEntry(entryId) {
    return withFallback(() => supa.getApprovalsByEntry(entryId), () => idb_getApprovalsByEntry(entryId));
}

// ── ATTACHMENTS ─────────────────────────────────────────
export function addAttachment(att) {
    return withFallback(() => supa.addAttachment(att), () => idb_addAttachment(att));
}
export function getAttachmentsByReference(referenceId) {
    return withFallback(() => supa.getAttachmentsByReference(referenceId), () => idb_getAttachmentsByReference(referenceId));
}
export function getAttachment(id) {
    return withFallback(() => supa.getAttachment(id), () => idb_getAttachment(id));
}

// ── SEED DATA ───────────────────────────────────────────
export async function seedDemoData() {
    if (_online) {
        try {
            await supa.seedDemoData();
            return;
        } catch (err) {
            console.warn('Seed Supabase falló:', err.message);
        }
    }
    await idb_seedDemoData();
}


// ════════════════════════════════════════════════════════
//  IndexedDB — implementación offline (exacta a la anterior)
// ════════════════════════════════════════════════════════

const DB_NAME = 'CronosAppDB';
const DB_VERSION = 4;
let idb = null;

function ensureIndex(store, name, keyPath, options) {
    if (!store.indexNames.contains(name)) {
        store.createIndex(name, keyPath, options);
    }
}

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const tx = event.target.transaction;

            let empStore = database.objectStoreNames.contains('employees')
                ? tx.objectStore('employees')
                : database.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
            ensureIndex(empStore, 'cedula', 'cedula', { unique: true });
            ensureIndex(empStore, 'nombre', 'nombre', { unique: false });

            let projStore = database.objectStoreNames.contains('projects')
                ? tx.objectStore('projects')
                : database.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
            ensureIndex(projStore, 'codigo', 'codigo', { unique: true });

            let teStore = database.objectStoreNames.contains('timeEntries')
                ? tx.objectStore('timeEntries')
                : database.createObjectStore('timeEntries', { keyPath: 'id', autoIncrement: true });
            ensureIndex(teStore, 'employeeId', 'employeeId', { unique: false });
            ensureIndex(teStore, 'date', 'date', { unique: false });
            ensureIndex(teStore, 'status', 'status', { unique: false });
            ensureIndex(teStore, 'employeeDate', ['employeeId', 'date'], { unique: false });

            let novStore = database.objectStoreNames.contains('novelties')
                ? tx.objectStore('novelties')
                : database.createObjectStore('novelties', { keyPath: 'id', autoIncrement: true });
            ensureIndex(novStore, 'employeeId', 'employeeId', { unique: false });
            ensureIndex(novStore, 'date', 'date', { unique: false });

            let apStore = database.objectStoreNames.contains('approvals')
                ? tx.objectStore('approvals')
                : database.createObjectStore('approvals', { keyPath: 'id', autoIncrement: true });
            ensureIndex(apStore, 'entryId', 'entryId', { unique: false });
            ensureIndex(apStore, 'approvedBy', 'approvedBy', { unique: false });

            let attStore = database.objectStoreNames.contains('attachments')
                ? tx.objectStore('attachments')
                : database.createObjectStore('attachments', { keyPath: 'id', autoIncrement: true });
            ensureIndex(attStore, 'referenceId', 'referenceId', { unique: false });
            ensureIndex(attStore, 'type', 'type', { unique: false });
        };

        request.onsuccess = (event) => {
            idb = event.target.result;
            resolve(idb);
        };
        request.onerror = (event) => {
            console.error('Error IndexedDB:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function getStore(storeName, mode = 'readonly') {
    const tx = idb.transaction([storeName], mode);
    return tx.objectStore(storeName);
}
function promisifyRequest(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// IDB: Employees
function idb_addEmployee(emp) { return promisifyRequest(getStore('employees', 'readwrite').add(emp)); }
function idb_getEmployees() { return promisifyRequest(getStore('employees').getAll()); }
function idb_getEmployeeByCedula(cedula) { return promisifyRequest(getStore('employees').index('cedula').get(cedula)); }

// IDB: Projects
function idb_addProject(proj) { return promisifyRequest(getStore('projects', 'readwrite').add(proj)); }
function idb_getProjects() { return promisifyRequest(getStore('projects').getAll()); }

// IDB: Time Entries
function idb_addTimeEntry(entry) {
    const record = { ...entry, timestampUTC: entry.timestampUTC || Date.now(), status: entry.esTardia ? 'pendiente_aprobacion' : 'registrada', attachmentIds: entry.attachmentIds || [] };
    return promisifyRequest(getStore('timeEntries', 'readwrite').add(record));
}
function idb_getTimeEntries() { return promisifyRequest(getStore('timeEntries').getAll()); }
function idb_getTimeEntriesByEmployee(eid) { return promisifyRequest(getStore('timeEntries').index('employeeId').getAll(eid)); }
function idb_getTimeEntriesByDate(d) { return promisifyRequest(getStore('timeEntries').index('date').getAll(d)); }
async function idb_getTimeEntriesByStatus(status) {
    try {
        const store = getStore('timeEntries');
        if (store.indexNames.contains('status')) return await promisifyRequest(store.index('status').getAll(status));
        const all = await promisifyRequest(store.getAll());
        return all.filter((e) => e.status === status);
    } catch { const all = await idb_getTimeEntries(); return all.filter((e) => e.status === status); }
}
function idb_updateTimeEntry(entry) { return promisifyRequest(getStore('timeEntries', 'readwrite').put(entry)); }

// IDB: Novelties
function idb_addNovelty(n) { return promisifyRequest(getStore('novelties', 'readwrite').add(n)); }
function idb_getNovelties() { return promisifyRequest(getStore('novelties').getAll()); }
function idb_getNoveltiesByEmployee(eid) { return promisifyRequest(getStore('novelties').index('employeeId').getAll(eid)); }

// IDB: Approvals
function idb_addApproval(a) { return promisifyRequest(getStore('approvals', 'readwrite').add({ ...a, timestamp: Date.now() })); }
function idb_getApprovals() { return promisifyRequest(getStore('approvals').getAll()); }
function idb_getApprovalsByEntry(eid) { return promisifyRequest(getStore('approvals').index('entryId').getAll(eid)); }

// IDB: Attachments
function idb_addAttachment(att) { return promisifyRequest(getStore('attachments', 'readwrite').add(att)); }
function idb_getAttachmentsByReference(rid) { return promisifyRequest(getStore('attachments').index('referenceId').getAll(rid)); }
function idb_getAttachment(id) { return promisifyRequest(getStore('attachments').get(id)); }

// IDB: Seed
async function idb_seedDemoData() {
    const employees = await idb_getEmployees();
    if (employees.length > 0) return;
    const emps = [
        { cedula: '1001234567', nombre: 'Harold Pérez', cargo: 'Técnico', pais: 'Colombia', zonaHoraria: 'America/Bogota' },
        { cedula: '1009876543', nombre: 'Carlos Ruiz', cargo: 'Técnico', pais: 'Colombia', zonaHoraria: 'America/Bogota' },
        { cedula: 'MX12345678', nombre: 'José García', cargo: 'Técnico', pais: 'México', zonaHoraria: 'America/Mexico_City' },
        { cedula: 'MX87654321', nombre: 'Luis Hernández', cargo: 'Técnico', pais: 'México', zonaHoraria: 'America/Mexico_City' },
        { cedula: '1005551234', nombre: 'Andrés Mejía', cargo: 'Técnico', pais: 'Colombia', zonaHoraria: 'America/Bogota' },
    ];
    for (const e of emps) { try { await idb_addEmployee(e); } catch (_) {} }
    const projs = [
        { codigo: 'OT-154000', nombre: 'Montaje Planta Monterrey', ubicacion: 'Monterrey, MX', pais: 'México' },
        { codigo: 'OT-155000', nombre: 'Instalación Bogotá Norte', ubicacion: 'Bogotá, CO', pais: 'Colombia' },
        { codigo: 'OT-156000', nombre: 'Mantenimiento CDMX', ubicacion: 'Ciudad de México, MX', pais: 'México' },
        { codigo: 'OT-157000', nombre: 'Proyecto Medellín Sur', ubicacion: 'Medellín, CO', pais: 'Colombia' },
    ];
    for (const p of projs) { try { await idb_addProject(p); } catch (_) {} }
    console.log('Datos demo cargados (IndexedDB).');
}
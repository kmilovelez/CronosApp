// supabase-db.js — Capa de datos contra Supabase (replica la API de db.js)
import { supabase } from './supabase.js';

// ── Helpers ─────────────────────────────────────────────
function throwIfError({ data, error }) {
    if (error) throw new Error(error.message);
    return data;
}

// Convierte camelCase (JS) → snake_case (Postgres)
function toSnake(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const sk = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        out[sk] = v;
    }
    return out;
}

// Convierte snake_case (Postgres) → camelCase (JS)
function toCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamel);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        out[ck] = v;
    }
    return out;
}

function toCamelArray(data) {
    return (data || []).map(toCamel);
}

// Normaliza un time_entry de DB → los nombres que esperan los componentes
function normalizeTimeEntry(row) {
    const e = toCamel(row);
    return {
        ...e,
        // Aliases que esperan los componentes
        tipoMarcacion:          e.tipo || e.tipoMarcacion,
        zonaHoraria:            e.timezone || e.zonaHoraria,
        direccionLegible:       e.gpsAddress || e.direccionLegible || '',
        horaDeclared:           e.horaDeclarada || e.horaDeclared,
        fechaDeclared:          e.fechaDeclarada || e.fechaDeclared,
        descripcionTardia:      e.motivoTardia || e.descripcionTardia,
        vueloTipo:              e.viajeTipo || e.vueloTipo,
        vueloHoraSalida:        e.viajeHoraSalida || e.vueloHoraSalida,
        vueloHoraLlegada:       e.viajeHoraLlegada || e.vueloHoraLlegada,
        horasViajeReconocidas:  e.viajeHorasExtra || e.horasViajeReconocidas || 0,
        esViaje:                !!(e.viajeTipo || e.vueloTipo),
        // Reconstruir objeto gps para los componentes que usan entry.gps.lat / .lng
        gps:                    (e.gpsLat && e.gpsLng) ? { lat: Number(e.gpsLat), lng: Number(e.gpsLng), precision: e.gpsPrecision || 0 } : e.gps || null,
    };
}

function normalizeTimeEntryArray(data) {
    return (data || []).map(normalizeTimeEntry);
}

// ── EMPLOYEES ───────────────────────────────────────────
export async function addEmployee(emp) {
    const row = toSnake(emp);
    delete row.id; // autoincrement
    const res = await supabase.from('employees').insert(row).select().single();
    return toCamel(throwIfError(res));
}

export async function getEmployees() {
    const res = await supabase.from('employees').select('*').eq('activo', true).order('nombre');
    return toCamelArray(throwIfError(res));
}

export async function getEmployeeByCedula(cedula) {
    const res = await supabase.from('employees').select('*').eq('cedula', cedula).single();
    if (res.error && res.error.code === 'PGRST116') return null; // not found
    return toCamel(throwIfError(res));
}

export async function getEmployeeByTelefono(telefono) {
    const res = await supabase.from('employees').select('*').eq('telefono', telefono).single();
    if (res.error && res.error.code === 'PGRST116') return null;
    return toCamel(throwIfError(res));
}

export async function getEmployeeByAuthId(authUserId) {
    const res = await supabase.from('employees').select('*').eq('auth_user_id', authUserId).single();
    if (res.error && res.error.code === 'PGRST116') return null;
    return toCamel(throwIfError(res));
}

export async function updateEmployee(emp) {
    const row = toSnake(emp);
    const res = await supabase.from('employees').update(row).eq('id', emp.id).select().single();
    return toCamel(throwIfError(res));
}

// Vincular o crear employee a partir de un auth.user (al hacer login)
export async function upsertEmployeeFromAuth(authUser) {
    const meta = authUser.user_metadata || {};
    const cedula = meta.cedula || authUser.id.substring(0, 8);
    const nombre = meta.nombre || meta.full_name || authUser.email.split('@')[0];
    const email = authUser.email;

    // Buscar si ya existe por auth_user_id
    let emp = await getEmployeeByAuthId(authUser.id);
    if (emp) return emp;

    // Buscar por cédula
    emp = await getEmployeeByCedula(cedula);
    if (emp) {
        // Vincular el auth_user_id si no lo tiene
        if (!emp.authUserId) {
            const res = await supabase.from('employees')
                .update({ auth_user_id: authUser.id, email })
                .eq('id', emp.id).select().single();
            return toCamel(throwIfError(res));
        }
        return emp;
    }

    // No existe: crear nuevo employee
    const row = {
        cedula,
        nombre,
        email,
        telefono: meta.telefono || null,
        cargo: 'Técnico',
        pais: 'Colombia',
        zona_horaria: 'America/Bogota',
        auth_user_id: authUser.id,
        rol: 'tecnico',
        activo: true,
    };
    const res = await supabase.from('employees').insert(row).select().single();
    return toCamel(throwIfError(res));
}

// ── ADMIN: obtener todos los usuarios con su perfil ─────
export async function getAllEmployees() {
    const res = await supabase.from('employees').select('*').order('nombre');
    return toCamelArray(throwIfError(res));
}

export async function updateEmployeeRole(employeeId, newRole) {
    const res = await supabase.from('employees')
        .update({ rol: newRole })
        .eq('id', employeeId).select().single();
    return toCamel(throwIfError(res));
}

export async function updateEmployeeField(employeeId, fields) {
    const row = toSnake(fields);
    const res = await supabase.from('employees')
        .update(row)
        .eq('id', employeeId).select().single();
    return toCamel(throwIfError(res));
}

export async function deleteEmployee(employeeId) {
    const res = await supabase.from('employees')
        .update({ activo: false })
        .eq('id', employeeId).select().single();
    return toCamel(throwIfError(res));
}

// ── PROJECTS / OTs ──────────────────────────────────────
export async function addProject(proj) {
    const row = toSnake(proj);
    delete row.id;
    const res = await supabase.from('projects').insert(row).select().single();
    return toCamel(throwIfError(res));
}

export async function getProjects() {
    const res = await supabase.from('projects').select('*').eq('activo', true).order('codigo');
    return toCamelArray(throwIfError(res));
}

/** Todos los proyectos (incluye inactivos) – para BackOffice */
export async function getAllProjects() {
    const res = await supabase.from('projects').select('*').order('codigo');
    return toCamelArray(throwIfError(res));
}

/** Actualizar campos de un proyecto */
export async function updateProject(projectId, fields) {
    const row = toSnake(fields);
    delete row.id;
    const res = await supabase.from('projects')
        .update(row)
        .eq('id', projectId)
        .select()
        .single();
    return toCamel(throwIfError(res));
}

/** Soft-delete: marca activo = false */
export async function deactivateProject(projectId) {
    const res = await supabase.from('projects')
        .update({ activo: false })
        .eq('id', projectId)
        .select()
        .single();
    return toCamel(throwIfError(res));
}

/** Reactivar proyecto */
export async function reactivateProject(projectId) {
    const res = await supabase.from('projects')
        .update({ activo: true })
        .eq('id', projectId)
        .select()
        .single();
    return toCamel(throwIfError(res));
}

/** Obtener lista de países distintos registrados en employees */
export async function getDistinctCountries() {
    const res = await supabase.from('employees').select('pais');
    const rows = throwIfError(res);
    const unique = [...new Set(rows.map((r) => r.pais).filter(Boolean))].sort();
    return unique.length > 0 ? unique : ['Colombia', 'México'];
}

// ── TIME ENTRIES (Marcaciones) ──────────────────────────
// Mapeo explícito JS → columnas reales de time_entries
function mapTimeEntryToRow(entry) {
    return {
        employee_id:      entry.employeeId,
        employee_name:    entry.employeeName || null,
        tipo:             entry.tipoMarcacion || entry.tipo,       // 'entrada' | 'salida'
        date:             entry.date,
        hora_local:       entry.horaLocal || null,
        timestamp_utc:    entry.timestampUTC || Date.now(),
        timezone:         entry.zonaHoraria || entry.timezone || null,
        project_id:       entry.projectId || null,
        project_code:     entry.projectCode || null,
        project_name:     entry.projectName || null,
        tipo_actividad:   entry.tipoActividad || null,
        es_tardia:        entry.esTardia || false,
        fecha_declarada:  entry.fechaDeclared || entry.fechaDeclarada || null,
        hora_declarada:   entry.horaDeclared || entry.horaDeclarada || null,
        motivo_tardia:    entry.motivoTardia || null,
        viaje_tipo:       entry.vueloTipo || entry.viajeTipo || null,
        viaje_hora_salida:  entry.vueloHoraSalida || entry.viajeHoraSalida || null,
        viaje_hora_llegada: entry.vueloHoraLlegada || entry.viajeHoraLlegada || null,
        viaje_horas_extra:  entry.horasViajeReconocidas || entry.viajeHorasExtra || 0,
        gps_lat:          entry.gps?.lat ? Number(entry.gps.lat) : null,
        gps_lng:          entry.gps?.lng ? Number(entry.gps.lng) : null,
        gps_address:      entry.direccionLegible || entry.gpsAddress || null,
        observaciones:    entry.observaciones || null,
        status:           entry.esTardia ? 'pendiente_aprobacion' : (entry.status || 'registrada'),
        attachment_ids:   entry.attachmentIds || [],
    };
}

export async function addTimeEntry(entry) {
    const row = mapTimeEntryToRow(entry);
    const res = await supabase.from('time_entries').insert(row).select().single();
    return normalizeTimeEntry(throwIfError(res));
}

export async function getTimeEntries() {
    const res = await supabase.from('time_entries').select('*').order('created_at', { ascending: false });
    return normalizeTimeEntryArray(throwIfError(res));
}

export async function getTimeEntriesByEmployee(employeeId) {
    const res = await supabase.from('time_entries').select('*').eq('employee_id', employeeId).order('date', { ascending: false });
    return normalizeTimeEntryArray(throwIfError(res));
}

export async function getTimeEntriesByDate(date) {
    const res = await supabase.from('time_entries').select('*').eq('date', date).order('created_at');
    return normalizeTimeEntryArray(throwIfError(res));
}

export async function getTimeEntriesByStatus(status) {
    const res = await supabase.from('time_entries').select('*').eq('status', status).order('created_at', { ascending: false });
    return normalizeTimeEntryArray(throwIfError(res));
}

export async function updateTimeEntry(entry) {
    // Construir solo los campos que vienen en el update
    const row = {};
    const fieldMap = {
        employeeId: 'employee_id', employeeName: 'employee_name',
        tipoMarcacion: 'tipo', tipo: 'tipo',
        date: 'date', horaLocal: 'hora_local', timestampUTC: 'timestamp_utc',
        zonaHoraria: 'timezone', timezone: 'timezone',
        projectId: 'project_id', projectCode: 'project_code', projectName: 'project_name',
        tipoActividad: 'tipo_actividad', esTardia: 'es_tardia',
        fechaDeclared: 'fecha_declarada', fechaDeclarada: 'fecha_declarada',
        horaDeclared: 'hora_declarada', horaDeclarada: 'hora_declarada',
        motivoTardia: 'motivo_tardia',
        vueloTipo: 'viaje_tipo', viajeTipo: 'viaje_tipo',
        vueloHoraSalida: 'viaje_hora_salida', vueloHoraLlegada: 'viaje_hora_llegada',
        horasViajeReconocidas: 'viaje_horas_extra', viajeHorasExtra: 'viaje_horas_extra',
        direccionLegible: 'gps_address', gpsAddress: 'gps_address',
        observaciones: 'observaciones', status: 'status',
        attachmentIds: 'attachment_ids',
    };
    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if (entry[jsKey] !== undefined) row[dbCol] = entry[jsKey];
    }
    // GPS especial
    if (entry.gps) {
        row.gps_lat = entry.gps.lat ? Number(entry.gps.lat) : null;
        row.gps_lng = entry.gps.lng ? Number(entry.gps.lng) : null;
    }
    if (entry.gpsLat !== undefined) row.gps_lat = Number(entry.gpsLat);
    if (entry.gpsLng !== undefined) row.gps_lng = Number(entry.gpsLng);

    const res = await supabase.from('time_entries').update(row).eq('id', entry.id).select().single();
    return toCamel(throwIfError(res));
}

// ── NOVELTIES (Novedades) ───────────────────────────────
export async function addNovelty(nov) {
    const row = toSnake(nov);
    delete row.id;
    delete row.cedula;
    delete row.project_code;
    const res = await supabase.from('novelties').insert(row).select().single();
    return toCamel(throwIfError(res));
}

export async function getNovelties() {
    const res = await supabase.from('novelties').select('*').order('created_at', { ascending: false });
    return toCamelArray(throwIfError(res));
}

export async function getNoveltiesByEmployee(employeeId) {
    const res = await supabase.from('novelties').select('*').eq('employee_id', employeeId).order('date', { ascending: false });
    return toCamelArray(throwIfError(res));
}

export async function updateNovelty(nov) {
    const id = nov.id;
    const row = toSnake(nov);
    delete row.id;
    delete row.cedula;
    delete row.project_code;
    const res = await supabase.from('novelties').update(row).eq('id', id).select().single();
    return toCamel(throwIfError(res));
}

export async function deleteNovelty(id) {
    const res = await supabase.from('novelties').delete().eq('id', id);
    throwIfError(res);
    return true;
}

// ── APPROVALS ───────────────────────────────────────────
export async function addApproval(approval) {
    const row = toSnake({
        ...approval,
        timestamp: Date.now(),
    });
    delete row.id;
    const res = await supabase.from('approvals').insert(row).select().single();
    return toCamel(throwIfError(res));
}

export async function getApprovals() {
    const res = await supabase.from('approvals').select('*').order('created_at', { ascending: false });
    return toCamelArray(throwIfError(res));
}

export async function getApprovalsByEntry(entryId) {
    const res = await supabase.from('approvals').select('*').eq('entry_id', entryId).order('created_at');
    return toCamelArray(throwIfError(res));
}

// ── ATTACHMENTS ─────────────────────────────────────────
export async function addAttachment(att) {
    // Si hay un archivo base64 grande, subir a storage
    if (att.base64Data && att.fileName) {
        try {
            const path = `${Date.now()}_${att.fileName}`;
            const base64 = att.base64Data.split(',')[1] || att.base64Data;
            const byteChars = atob(base64);
            const byteArray = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
                byteArray[i] = byteChars.charCodeAt(i);
            }
            const blob = new Blob([byteArray], { type: att.fileType || 'application/octet-stream' });

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(path, blob);

            if (!uploadError) {
                att.storagePath = path;
                // No guardar base64 en la tabla si se subió al storage
                delete att.base64Data;
            }
        } catch (err) {
            console.warn('No se pudo subir a storage, guardando base64 en tabla:', err);
        }
    }

    const row = toSnake(att);
    delete row.id;
    const res = await supabase.from('attachments').insert(row).select().single();
    return toCamel(throwIfError(res));
}

export async function getAttachmentsByReference(referenceId) {
    const res = await supabase.from('attachments').select('*').eq('reference_id', referenceId);
    const atts = toCamelArray(throwIfError(res));

    // Si tiene storage_path, generar URL temporal
    for (const att of atts) {
        if (att.storagePath && !att.base64Data) {
            const { data } = supabase.storage
                .from('attachments')
                .getPublicUrl(att.storagePath);
            att.downloadUrl = data?.publicUrl;
        }
    }
    return atts;
}

export async function getAttachment(id) {
    const res = await supabase.from('attachments').select('*').eq('id', id).single();
    if (res.error) return null;
    const att = toCamel(res.data);
    if (att.storagePath && !att.base64Data) {
        const { data } = supabase.storage
            .from('attachments')
            .getPublicUrl(att.storagePath);
        att.downloadUrl = data?.publicUrl;
    }
    return att;
}

// ── SEED DATA ───────────────────────────────────────────
export async function seedDemoData() {
    // Verificar si ya hay empleados
    const { data: emps } = await supabase.from('employees').select('id').limit(1);
    if (emps && emps.length > 0) return;

    // Si no hay datos, insertar semilla
    await supabase.from('employees').insert([
        { cedula: '1001234567', nombre: 'Harold Pérez', cargo: 'Técnico', pais: 'Colombia', zona_horaria: 'America/Bogota', rol: 'tecnico' },
        { cedula: '1009876543', nombre: 'Carlos Ruiz', cargo: 'Técnico', pais: 'Colombia', zona_horaria: 'America/Bogota', rol: 'tecnico' },
        { cedula: 'MX12345678', nombre: 'José García', cargo: 'Técnico', pais: 'México', zona_horaria: 'America/Mexico_City', rol: 'tecnico' },
        { cedula: 'MX87654321', nombre: 'Luis Hernández', cargo: 'Técnico', pais: 'México', zona_horaria: 'America/Mexico_City', rol: 'tecnico' },
        { cedula: '1005551234', nombre: 'Andrés Mejía', cargo: 'Técnico', pais: 'Colombia', zona_horaria: 'America/Bogota', rol: 'tecnico' },
    ]);

    await supabase.from('projects').insert([
        { codigo: 'OT-154000', nombre: 'Montaje Planta Monterrey', ubicacion: 'Monterrey, MX', pais: 'México' },
        { codigo: 'OT-155000', nombre: 'Instalación Bogotá Norte', ubicacion: 'Bogotá, CO', pais: 'Colombia' },
        { codigo: 'OT-156000', nombre: 'Mantenimiento CDMX', ubicacion: 'Ciudad de México, MX', pais: 'México' },
        { codigo: 'OT-157000', nombre: 'Proyecto Medellín Sur', ubicacion: 'Medellín, CO', pais: 'Colombia' },
    ]);

    console.log('Datos demo cargados en Supabase.');
}

// ── INIT (verificar conexión) ───────────────────────────
export async function initSupabase() {
    try {
        const { data, error } = await supabase.from('employees').select('id').limit(1);
        if (error) throw error;
        console.log('✅ Supabase conectado correctamente');
        return true;
    } catch (err) {
        console.warn('⚠️ Supabase no disponible:', err.message);
        return false;
    }
}

// auth-service.js — Servicio de autenticación con Supabase Auth
import { supabase } from './supabase.js';
import { getEmployeeByAuthId } from './supabase-db.js';

// ── Login con email y password ──────────────────────────
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw new Error(error.message);
    return data;
}

// ── Registro con email y password ───────────────────────
export async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata, // { nombre, cedula, rol, pais }
        },
    });
    if (error) throw new Error(error.message);
    return data;
}

// ── Logout ──────────────────────────────────────────────
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
}

// ── Sesión actual ───────────────────────────────────────
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return session;
}

// ── Usuario actual ──────────────────────────────────────
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
}

// ── Obtener perfil del empleado vinculado al auth user ──
export async function getCurrentEmployee() {
    const user = await getCurrentUser();
    if (!user) return null;
    const employee = await getEmployeeByAuthId(user.id);
    return employee;
}

// ── Escuchar cambios de auth (login/logout) ─────────────
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
            callback(event, session);
        }
    );
    return subscription;
}

// ── Resetear password ───────────────────────────────────
export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
}

// ── Cambiar password (usuario autenticado) ──────────────
export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return data;
}

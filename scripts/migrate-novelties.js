// migrate-novelties.js — Agregar columna project_code a la tabla novelties
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const base = 'https://supabase.valparaiso.cafe:8443';
const key = process.env.SUPABASE_ANON_KEY;

async function tryPgMeta() {
    // Intentar vía pg-meta (puerto 8443)
    const endpoints = ['/query', '/pg/query', '/pg'];
    for (const ep of endpoints) {
        try {
            const res = await fetch(base + ep, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': key,
                    'Authorization': 'Bearer ' + key,
                },
                body: JSON.stringify({ query: 'ALTER TABLE public.novelties ADD COLUMN IF NOT EXISTS project_code TEXT DEFAULT NULL' }),
            });
            const text = await res.text();
            console.log(`${ep} -> ${res.status}: ${text.substring(0, 300)}`);
            if (res.ok) {
                console.log('✅ Columna project_code agregada exitosamente');
                return true;
            }
        } catch (e) {
            console.log(`${ep} -> error: ${e.message}`);
        }
    }
    return false;
}

async function trySupabaseRpc() {
    const s = createClient(process.env.SUPABASE_URL, key);
    // Verificar si la columna ya existe
    const { data } = await s.from('novelties').insert({
        employee_id: 1, tipo: 'incapacidad', date: '2026-01-01', project_code: 'TEST'
    }).select();
    if (data) {
        console.log('✅ Columna project_code ya existe!');
        await s.from('novelties').delete().eq('id', data[0].id);
        return true;
    }
    return false;
}

async function main() {
    console.log('Intentando agregar columna project_code a novelties...\n');
    
    const ok = await tryPgMeta();
    if (ok) return;
    
    const exists = await trySupabaseRpc();
    if (exists) return;

    console.log('\n⚠️  No se pudo agregar la columna automáticamente.');
    console.log('Por favor ejecuta este SQL en Supabase Studio (SQL Editor):\n');
    console.log('  ALTER TABLE public.novelties ADD COLUMN IF NOT EXISTS project_code TEXT DEFAULT NULL;\n');
    console.log('URL del Studio: https://supabase.valparaiso.cafe');
}

main().catch(console.error);

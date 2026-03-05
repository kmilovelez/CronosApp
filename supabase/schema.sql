-- ============================================================
-- CronosApp — Esquema SQL para Supabase
-- Ejecutar en: SQL Editor de Supabase Dashboard
-- ============================================================

-- ── 1. TABLA: employees ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
    id          BIGSERIAL PRIMARY KEY,
    cedula      TEXT UNIQUE NOT NULL,
    nombre      TEXT NOT NULL,
    cargo       TEXT DEFAULT 'Técnico',
    pais        TEXT NOT NULL DEFAULT 'Colombia',
    zona_horaria TEXT DEFAULT 'America/Bogota',
    email       TEXT,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rol         TEXT DEFAULT 'tecnico' CHECK (rol IN ('tecnico', 'supervisor', 'admin')),
    activo      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_cedula ON public.employees(cedula);
CREATE INDEX IF NOT EXISTS idx_employees_auth ON public.employees(auth_user_id);

-- ── 2. TABLA: projects ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id          BIGSERIAL PRIMARY KEY,
    codigo      TEXT UNIQUE NOT NULL,
    nombre      TEXT NOT NULL,
    ubicacion   TEXT,
    pais        TEXT DEFAULT 'Colombia',
    activo      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_codigo ON public.projects(codigo);

-- ── 3. TABLA: time_entries (Marcaciones) ─────────────────
CREATE TABLE IF NOT EXISTS public.time_entries (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name       TEXT,
    tipo                TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    date                DATE NOT NULL,
    hora_local          TEXT,
    timestamp_utc       BIGINT,
    timezone            TEXT,
    project_id          BIGINT REFERENCES public.projects(id) ON DELETE SET NULL,
    project_code        TEXT,
    project_name        TEXT,
    tipo_actividad      TEXT CHECK (tipo_actividad IN ('montaje_sitio', 'remoto', 'viaje', 'planta')),
    es_tardia           BOOLEAN DEFAULT FALSE,
    fecha_declarada     TEXT,
    hora_declarada      TEXT,
    motivo_tardia       TEXT,
    viaje_tipo          TEXT CHECK (viaje_tipo IN ('nacional', 'internacional')),
    viaje_hora_salida   TEXT,
    viaje_hora_llegada  TEXT,
    viaje_horas_extra   NUMERIC(5,2),
    gps_lat             NUMERIC(10,7),
    gps_lng             NUMERIC(10,7),
    gps_address         TEXT,
    observaciones       TEXT,
    status              TEXT DEFAULT 'registrada'
                        CHECK (status IN ('registrada', 'pendiente_aprobacion', 'aprobada', 'rechazada', 'ajustada')),
    attachment_ids      BIGINT[] DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_te_employee ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_te_date ON public.time_entries(date);
CREATE INDEX IF NOT EXISTS idx_te_status ON public.time_entries(status);
CREATE INDEX IF NOT EXISTS idx_te_emp_date ON public.time_entries(employee_id, date);

-- ── 4. TABLA: novelties (Novedades) ─────────────────────
CREATE TABLE IF NOT EXISTS public.novelties (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name   TEXT,
    tipo            TEXT NOT NULL CHECK (tipo IN ('incapacidad', 'vacaciones', 'calamidad', 'compensatorio', 'permiso_remunerado', 'cita_medica')),
    date            DATE NOT NULL,
    fecha_inicio    DATE,
    fecha_fin       DATE,
    hora_inicio     TEXT,
    hora_fin        TEXT,
    descripcion     TEXT,
    attachment_ids  BIGINT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nov_employee ON public.novelties(employee_id);
CREATE INDEX IF NOT EXISTS idx_nov_date ON public.novelties(date);

-- ── 5. TABLA: approvals ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approvals (
    id              BIGSERIAL PRIMARY KEY,
    entry_id        BIGINT REFERENCES public.time_entries(id) ON DELETE CASCADE,
    action          TEXT NOT NULL CHECK (action IN ('aprobada', 'rechazada', 'ajustada')),
    approved_by     TEXT,
    justificacion   TEXT,
    horas_ajustadas TEXT,
    timestamp       BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_entry ON public.approvals(entry_id);

-- ── 6. TABLA: attachments ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attachments (
    id              BIGSERIAL PRIMARY KEY,
    reference_id    BIGINT,
    reference_type  TEXT DEFAULT 'time_entry',
    file_name       TEXT,
    file_type       TEXT,
    file_size       BIGINT,
    storage_path    TEXT,
    base64_data     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_ref ON public.attachments(reference_id);

-- ── 7. FUNCIÓN: auto-update updated_at ───────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_employees ON public.employees;
CREATE TRIGGER set_updated_at_employees
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_time_entries ON public.time_entries;
CREATE TRIGGER set_updated_at_time_entries
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 8. ROW LEVEL SECURITY ────────────────────────────────
-- Habilitamos RLS pero permitimos acceso abierto por ahora
-- (después se pueden restringir las políticas por rol/auth_user_id)

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novelties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para anon y authenticated
-- Employees
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT USING (true);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "employees_delete" ON public.employees FOR DELETE USING (true);

-- Projects
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (true);

-- Time Entries
DROP POLICY IF EXISTS "te_select" ON public.time_entries;
DROP POLICY IF EXISTS "te_insert" ON public.time_entries;
DROP POLICY IF EXISTS "te_update" ON public.time_entries;
DROP POLICY IF EXISTS "te_delete" ON public.time_entries;
CREATE POLICY "te_select" ON public.time_entries FOR SELECT USING (true);
CREATE POLICY "te_insert" ON public.time_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "te_update" ON public.time_entries FOR UPDATE USING (true);
CREATE POLICY "te_delete" ON public.time_entries FOR DELETE USING (true);

-- Novelties
DROP POLICY IF EXISTS "nov_select" ON public.novelties;
DROP POLICY IF EXISTS "nov_insert" ON public.novelties;
DROP POLICY IF EXISTS "nov_update" ON public.novelties;
DROP POLICY IF EXISTS "nov_delete" ON public.novelties;
CREATE POLICY "nov_select" ON public.novelties FOR SELECT USING (true);
CREATE POLICY "nov_insert" ON public.novelties FOR INSERT WITH CHECK (true);
CREATE POLICY "nov_update" ON public.novelties FOR UPDATE USING (true);
CREATE POLICY "nov_delete" ON public.novelties FOR DELETE USING (true);

-- Approvals
DROP POLICY IF EXISTS "app_select" ON public.approvals;
DROP POLICY IF EXISTS "app_insert" ON public.approvals;
DROP POLICY IF EXISTS "app_update" ON public.approvals;
DROP POLICY IF EXISTS "app_delete" ON public.approvals;
CREATE POLICY "app_select" ON public.approvals FOR SELECT USING (true);
CREATE POLICY "app_insert" ON public.approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "app_update" ON public.approvals FOR UPDATE USING (true);
CREATE POLICY "app_delete" ON public.approvals FOR DELETE USING (true);

-- Attachments
DROP POLICY IF EXISTS "att_select" ON public.attachments;
DROP POLICY IF EXISTS "att_insert" ON public.attachments;
DROP POLICY IF EXISTS "att_update" ON public.attachments;
DROP POLICY IF EXISTS "att_delete" ON public.attachments;
CREATE POLICY "att_select" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "att_insert" ON public.attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "att_update" ON public.attachments FOR UPDATE USING (true);
CREATE POLICY "att_delete" ON public.attachments FOR DELETE USING (true);

-- ── 9. DATOS SEMILLA ─────────────────────────────────────

-- ── 9a. TABLA: user_presence (Presencia en tiempo real) ──
CREATE TABLE IF NOT EXISTS public.user_presence (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    is_online       BOOLEAN DEFAULT FALSE,
    last_seen       TIMESTAMPTZ DEFAULT NOW(),
    gps_lat         NUMERIC(10,7),
    gps_lng         NUMERIC(10,7),
    gps_address     TEXT,
    device_info     TEXT,
    app_version     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_employee ON public.user_presence(employee_id);
CREATE INDEX IF NOT EXISTS idx_presence_online ON public.user_presence(is_online);

DROP TRIGGER IF EXISTS set_updated_at_presence ON public.user_presence;
CREATE TRIGGER set_updated_at_presence
    BEFORE UPDATE ON public.user_presence
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS para user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presence_select" ON public.user_presence;
DROP POLICY IF EXISTS "presence_insert" ON public.user_presence;
DROP POLICY IF EXISTS "presence_update" ON public.user_presence;
DROP POLICY IF EXISTS "presence_delete" ON public.user_presence;
CREATE POLICY "presence_select" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "presence_insert" ON public.user_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "presence_update" ON public.user_presence FOR UPDATE USING (true);
CREATE POLICY "presence_delete" ON public.user_presence FOR DELETE USING (true);

-- ── 9b. DATOS SEMILLA ────────────────────────────────────
INSERT INTO public.employees (cedula, nombre, cargo, pais, zona_horaria, rol) VALUES
    ('1001234567', 'Harold Pérez', 'Técnico', 'Colombia', 'America/Bogota', 'tecnico'),
    ('1009876543', 'Carlos Ruiz', 'Técnico', 'Colombia', 'America/Bogota', 'tecnico'),
    ('MX12345678', 'José García', 'Técnico', 'México', 'America/Mexico_City', 'tecnico'),
    ('MX87654321', 'Luis Hernández', 'Técnico', 'México', 'America/Mexico_City', 'tecnico'),
    ('1005551234', 'Andrés Mejía', 'Técnico', 'Colombia', 'America/Bogota', 'tecnico')
ON CONFLICT (cedula) DO NOTHING;

INSERT INTO public.projects (codigo, nombre, ubicacion, pais) VALUES
    ('OT-154000', 'Montaje Planta Monterrey', 'Monterrey, MX', 'México'),
    ('OT-155000', 'Instalación Bogotá Norte', 'Bogotá, CO', 'Colombia'),
    ('OT-156000', 'Mantenimiento CDMX', 'Ciudad de México, MX', 'México'),
    ('OT-157000', 'Proyecto Medellín Sur', 'Medellín, CO', 'Colombia')
ON CONFLICT (codigo) DO NOTHING;

-- ── 10. STORAGE BUCKET (para adjuntos) ───────────────────
-- Ejecutar manualmente en Storage de Supabase Dashboard:
-- Crear bucket: "attachments" (público: false)
-- O usar esta query:
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Política de storage
DROP POLICY IF EXISTS "attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "attachments_delete" ON storage.objects;
CREATE POLICY "attachments_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "attachments_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "attachments_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'attachments');

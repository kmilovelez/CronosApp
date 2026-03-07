# 📋 CronosApp — Documentación Completa

> **Última actualización:** Marzo 2026
> **Versión:** 2.0.0
> **Repositorio:** [github.com/kmilovelez/CronosApp](https://github.com/kmilovelez/CronosApp)
> **Producción:** [cronos.event2flow.com](https://cronos.event2flow.com/)

---

## 1. Visión General

**CronosApp** es una **Progressive Web App (PWA)** para el **control de marcaciones y asistencia** de equipos técnicos multisede, diseñada para operaciones en **Colombia y México**. Permite registrar entradas/salidas con validación GPS, gestionar novedades laborales, aprobar marcaciones tardías, generar reportes de nómina y administrar empleados y proyectos.

### Características principales

| Funcionalidad | Descripción |
|---|---|
| **Marcación GPS** | Entrada/salida con captura obligatoria de ubicación GPS y reverse geocoding |
| **Marcaciones tardías** | Registro retroactivo de días incompletos, con evidencias adjuntas y aprobación de supervisor |
| **Novedades** | Incapacidades, vacaciones, calamidad, compensatorios, permisos, citas médicas |
| **Panel Supervisor** | Aprobación/rechazo/ajuste de marcaciones, filtros por OT/fecha/país, mapas GPS |
| **Nómina** | Consolidado quincenal tipo Excel, cálculo automático de horas netas, export CSV |
| **Historial** | Análisis de patrones (% tardías, alertas), vista técnico y supervisor |
| **BackOffice (Admin)** | CRUD empleados, proyectos, roles, presencia en tiempo real con GPS |
| **PWA** | Instalable en iOS/Android, funciona offline con IndexedDB, Service Worker v3 |
| **Presencia** | Heartbeat GPS cada 2 min, estado online/offline por empleado |
| **Login inteligente** | Autenticación por email, cédula o número celular |
| **Cambio de contraseña** | Modal integrado, cierra sesión automáticamente después de cambiar |
| **Multi-zona horaria** | America/Bogota (Colombia) y America/Mexico_City (México) |

---

## 2. Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| **React** | 18.3.1 | UI con componentes funcionales y hooks |
| **Webpack** | 5.105.4 | Bundler, dev-server, HtmlWebpackPlugin, CopyWebpackPlugin |
| **Babel** | 7.24+ | Transpilación JSX/ES2020+ (`@babel/preset-env`, `@babel/preset-react`) |
| **Leaflet** | 1.9.4 | Mapas GPS interactivos (OpenStreetMap) |
| **CSS puro** | — | Dark theme con variables CSS, responsive, safe-area-inset |
| **Inter** | Google Fonts | Tipografía del sistema |

### Backend / BaaS
| Tecnología | Uso |
|---|---|
| **Supabase** | Auth, PostgreSQL, Storage, Row Level Security |
| **URL Supabase** | `https://supabase.valparaiso.cafe` |
| **IndexedDB** | Fallback offline (`CronosAppDB` v4) |

### Infraestructura
| Servicio | Uso |
|---|---|
| **GitHub** | Repositorio, CI/CD implícito |
| **Cloudflare Tunnel** | Expose a producción en `cronos.event2flow.com` |
| **Git branches** | `main` (producción, auto-deploy), `dev` (desarrollo) |

---

## 3. Estructura del Proyecto

```
CronosApp/
├── package.json                  # Dependencias y scripts
├── webpack.config.js             # Config Webpack 5 (dev/prod)
├── .env                          # Variables Supabase (no versionado)
├── serve-dist.js                 # Servidor estático para dist/
├── DOCS.md                       # ← Este archivo
├── README.md
│
├── public/                       # Assets estáticos copiados a dist/
│   ├── manifest.json             # PWA manifest
│   ├── service-worker.js         # SW v3 (network-first + cache fallback)
│   └── icons/                    # SVG icons (72-512px + maskable)
│
├── src/
│   ├── index.html                # SPA template (viewport-fit=cover, apple-mobile-web-app)
│   │
│   ├── js/
│   │   ├── app.js                # ★ Entry point React — App, TABS, Auth, Layout, Sidebar
│   │   ├── db.js                 # Capa híbrida Supabase + IndexedDB (withFallback)
│   │   └── ui.js                 # Helpers de UI (toast, spinner) — legacy, poco usado
│   │
│   ├── services/
│   │   ├── supabase.js           # Cliente Supabase (createClient)
│   │   ├── supabase-db.js        # Capa de datos Supabase (CRUD completo)
│   │   ├── auth-service.js       # Auth: signIn, signInSmart, signUp, signOut, updatePassword
│   │   ├── presence-service.js   # Heartbeat GPS cada 2 min, online/offline tracking
│   │   ├── sync-service.js       # (Placeholder — no usado activamente)
│   │   ├── time-tracking.js      # (Placeholder — funciones in-memory, no usado)
│   │   └── notification-service.js # Notificaciones nativas del navegador
│   │
│   ├── components/
│   │   ├── login.js              # Login/Registro (signInSmart: email/cédula/celular)
│   │   ├── marcacion-form.js     # Formulario marcación entrada/salida con GPS
│   │   ├── marcacion-tardia.js   # Pendientes: días incompletos + CompletarModal
│   │   ├── novedades-form.js     # Registro novedades (incapacidad, vacaciones, etc.)
│   │   ├── supervisor-panel.js   # Panel aprobación: grupos, filtros, mapa multi-marker
│   │   ├── reporte-nomina.js     # Consolidado quincenal para nómina + export CSV
│   │   ├── historial.js          # Historial + análisis patrones + mapa GPS modal
│   │   ├── backoffice.js         # Admin: CRUD empleados, proyectos, presencia, mapas
│   │   ├── report-view.js        # (Legacy — tabla simple de reportes)
│   │   ├── team-list.js          # (Legacy — lista de equipos)
│   │   ├── timer.js              # (Legacy — temporizador)
│   │   └── site-selector.js      # (Legacy — selector de sedes)
│   │
│   ├── utils/
│   │   └── helpers.js            # Utilidades: formateo, cálculos, GPS, CSV, labels
│   │
│   └── css/
│       └── styles.css            # ~755 líneas — Dark theme, responsive, safe-area
│
└── supabase/
    └── schema.sql                # Esquema completo: tablas, índices, RLS, seed data
```

---

## 4. Configuración y Variables de Entorno

### `.env` (requerido, no versionado)
```env
SUPABASE_URL=https://supabase.valparaiso.cafe
SUPABASE_ANON_KEY=eyJhbGci...OcmZFU4
```

### `webpack.config.js`
- **Entry:** `./src/js/app.js`
- **Output:** `dist/js/bundle.[contenthash].js` (prod) o `dist/js/bundle.js` (dev)
- **Plugins:** `DefinePlugin` (APP_VERSION), `Dotenv`, `HtmlWebpackPlugin`, `CopyWebpackPlugin`
- **Dev Server:** Puerto 3000, hot reload, historyApiFallback
- **Inyecta:** `process.env.APP_VERSION` desde `package.json`

### Scripts npm
```bash
npm start         # webpack-dev-server en modo development (puerto 3000)
npm run build     # webpack --mode production → dist/
```

---

## 5. Base de Datos (Supabase/PostgreSQL)

### 5.1 Esquema de Tablas

#### `employees`
| Columna | Tipo | Descripción |
|---|---|---|
| id | BIGSERIAL PK | Auto-incremento |
| cedula | TEXT UNIQUE NOT NULL | Identificación (Colombia: numérica, México: alfanumérica) |
| nombre | TEXT NOT NULL | Nombre completo |
| cargo | TEXT | Default: 'Técnico' |
| pais | TEXT | 'Colombia' o 'México' |
| zona_horaria | TEXT | 'America/Bogota' o 'America/Mexico_City' |
| email | TEXT | Correo vinculado a Supabase Auth |
| telefono | TEXT | Número de celular para login inteligente |
| auth_user_id | UUID FK → auth.users | Vinculación con Supabase Auth |
| rol | TEXT | 'tecnico', 'supervisor', 'admin' |
| activo | BOOLEAN | Soft delete |
| created_at / updated_at | TIMESTAMPTZ | Timestamps automáticos |

#### `projects`
| Columna | Tipo | Descripción |
|---|---|---|
| id | BIGSERIAL PK | |
| codigo | TEXT UNIQUE | Código OT (ej: 'OT-154000') |
| nombre | TEXT | Nombre del proyecto |
| ubicacion | TEXT | Ciudad/sitio |
| pais | TEXT | País del proyecto |
| activo | BOOLEAN | Soft delete |

#### `time_entries` (Marcaciones)
| Columna | Tipo | Descripción |
|---|---|---|
| id | BIGSERIAL PK | |
| employee_id | BIGINT FK | Referencia a employees |
| employee_name | TEXT | Nombre desnormalizado para queries rápidos |
| tipo | TEXT | 'entrada' o 'salida' |
| date | DATE | Fecha de la marcación |
| hora_local | TEXT | Hora en formato HH:MM:SS |
| timestamp_utc | BIGINT | Epoch ms |
| timezone | TEXT | Zona horaria del empleado |
| project_id | BIGINT FK | Proyecto/OT asociado |
| project_code / project_name | TEXT | Desnormalizados |
| tipo_actividad | TEXT | 'montaje_sitio', 'remoto', 'viaje', 'planta' |
| es_tardia | BOOLEAN | Si fue registrada como tardía |
| fecha_declarada / hora_declarada | TEXT | Fecha/hora declarada para tardías |
| motivo_tardia | TEXT | Motivo del registro tardío |
| viaje_tipo | TEXT | 'nacional' o 'internacional' |
| viaje_hora_salida / viaje_hora_llegada | TEXT | Horas de viaje |
| viaje_horas_extra | NUMERIC | Horas extra de viaje reconocidas |
| gps_lat / gps_lng | NUMERIC(10,7) | Coordenadas GPS |
| gps_address | TEXT | Dirección obtenida por reverse geocoding |
| observaciones | TEXT | Notas adicionales |
| status | TEXT | 'registrada', 'pendiente_aprobacion', 'aprobada', 'rechazada', 'ajustada' |
| attachment_ids | BIGINT[] | Referencias a adjuntos |

#### `novelties` (Novedades)
| Columna | Tipo | Descripción |
|---|---|---|
| tipo | TEXT | 'incapacidad', 'vacaciones', 'calamidad', 'compensatorio', 'permiso_remunerado', 'cita_medica' |
| fecha_inicio / fecha_fin | DATE | Rango de la novedad |
| hora_inicio / hora_fin | TEXT | Para permisos parciales |
| descripcion | TEXT | Detalle |

#### `approvals` (Aprobaciones)
| Columna | Tipo | Descripción |
|---|---|---|
| entry_id | BIGINT FK | Marcación aprobada/rechazada |
| action | TEXT | 'aprobada', 'rechazada', 'ajustada' |
| approved_by | TEXT | Nombre del supervisor |
| justificacion | TEXT | Observaciones del supervisor |
| horas_ajustadas | TEXT | Si se ajustó la hora |

#### `attachments` (Adjuntos)
- Sube archivos a Supabase Storage bucket `attachments`
- Si falla, almacena base64 en la tabla directamente
- Tipos: imágenes, PDF, documentos

#### `user_presence` (Presencia)
| Columna | Tipo | Descripción |
|---|---|---|
| employee_id | BIGINT UNIQUE FK | Un registro por empleado |
| is_online | BOOLEAN | Estado actual |
| last_seen | TIMESTAMPTZ | Último heartbeat |
| gps_lat / gps_lng | NUMERIC | Última ubicación conocida |
| device_info | TEXT | Desktop/Mobile + plataforma |
| app_version | TEXT | Versión de CronosApp |

### 5.2 Row Level Security (RLS)
- **Habilitado** en todas las tablas
- **Políticas actuales:** Permisivas (USING true) para `anon` y `authenticated`
- **Futuro:** Restringir por `auth_user_id` y rol

### 5.3 Índices
- `idx_employees_cedula`, `idx_employees_auth`
- `idx_te_employee`, `idx_te_date`, `idx_te_status`, `idx_te_emp_date`
- `idx_nov_employee`, `idx_nov_date`
- `idx_app_entry`, `idx_att_ref`
- `idx_presence_employee`, `idx_presence_online`

### 5.4 Triggers
- `set_updated_at_employees` → auto-update `updated_at`
- `set_updated_at_time_entries` → auto-update `updated_at`
- `set_updated_at_presence` → auto-update `updated_at`

---

## 6. Arquitectura de la Aplicación

### 6.1 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│  COMPONENTES REACT (app.js, marcacion-form.js, etc.)        │
│  Llaman a funciones de db.js                                │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────▼───────┐
        │    db.js       │  ← Capa híbrida (API unificada)
        │  withFallback  │
        └───┬───────┬───┘
            │       │
     ┌──────▼──┐  ┌─▼──────────┐
     │ Supabase │  │ IndexedDB  │
     │ (online) │  │ (offline)  │
     └─────────┘  └────────────┘
```

### 6.2 Patrón withFallback
`db.js` exporta la misma API para todos los componentes. Internamente:
1. Si `_online === true`: ejecuta contra Supabase (`supabase-db.js`)
2. Si Supabase falla o está offline: ejecuta contra IndexedDB
3. Los componentes **no necesitan saber** qué backend se usa

### 6.3 Conversión de Nombres
- **JS → PostgreSQL:** `camelCase` → `snake_case` (función `toSnake()`)
- **PostgreSQL → JS:** `snake_case` → `camelCase` (función `toCamel()`)
- **Time entries:** `normalizeTimeEntry()` crea aliases para compatibilidad con componentes legacy (ej: `tipoMarcacion ← tipo`, `direccionLegible ← gps_address`)

---

## 7. Sistema de Autenticación

### 7.1 Flujo de Login
```
Usuario ingresa identificador + password
           │
     ┌─────▼─────────────────────┐
     │   signInSmart(id, pwd)    │
     │                           │
     │  ¿contiene '@'?           │
     │  SÍ → signIn(email, pwd) │
     │  NO → buscar por cédula   │
     │  NO → buscar por teléfono │
     │  → resolver email         │
     │  → signIn(email, pwd)     │
     └─────┬─────────────────────┘
           │
     ┌─────▼─────────────────┐
     │ resolveEmployee(user) │
     │ upsertEmployeeFromAuth│
     │ → vincular/crear emp  │
     │ → startPresence(id)   │
     └───────────────────────┘
```

### 7.2 Funciones Disponibles
| Función | Archivo | Descripción |
|---|---|---|
| `signIn(email, pwd)` | auth-service.js | Login directo con email |
| `signInSmart(id, pwd)` | auth-service.js | Login con email, cédula o celular |
| `signUp(email, pwd, meta)` | auth-service.js | Registro con metadata (nombre, cédula) |
| `signOut()` | auth-service.js | Logout |
| `updatePassword(newPwd)` | auth-service.js | Cambiar contraseña (usuario autenticado) |
| `resetPassword(email)` | auth-service.js | Email de reset |
| `getSession()` | auth-service.js | Obtener sesión actual |
| `getCurrentUser()` | auth-service.js | Obtener usuario de Supabase Auth |
| `getCurrentEmployee()` | auth-service.js | Obtener perfil employee vinculado |
| `onAuthStateChange(cb)` | auth-service.js | Listener de cambios de auth |

### 7.3 Roles y Permisos (Frontend)
| Rol | Tabs visibles |
|---|---|
| `tecnico` | Marcar, Pendientes, Novedades, Historial |
| `supervisor` | Todos los de técnico + Aprobar, Nómina |
| `admin` | Todos + Admin (BackOffice) |

---

## 8. Componentes React

### 8.1 app.js — Componente Principal
**Archivo:** `src/js/app.js` (~503 líneas)
**Es el entry point de React.**

| Elemento | Descripción |
|---|---|
| `App` | Componente raíz: auth flow, sidebar, routing por tabs, footer |
| `ErrorBoundary` | Class component que captura errores de render |
| `ChangePasswordModal` | Modal para cambiar contraseña + cierre de sesión automático |
| `usePWAInstall` | Hook custom para detectar/instalar PWA (Android + guía iOS) |
| `TABS` | Array de definición de tabs con `{id, label, icon, component, role}` |

**Estado principal:**
- `authState`: 'loading' → 'login' → 'app'
- `session`: sesión de Supabase Auth
- `currentEmployee`: perfil del empleado logueado
- `rol`: 'tecnico' | 'supervisor' | 'admin'
- `activeTab`: tab activo actual
- `connectionMode`: 'online' | 'offline'

**Layout:**
- **Desktop:** Sidebar izquierdo (240px) + contenido principal (full width)
- **Móvil (≤640px):** Header superior + tab bar inferior + contenido

### 8.2 login.js — Login / Registro
**Archivo:** `src/components/login.js` (~143 líneas)

- **Login:** Campo genérico "Correo, cédula o celular" → `signInSmart()`
- **Registro:** Nombre, cédula, email, password → `signUp()`
- Tabs Login / Registrarse

### 8.3 marcacion-form.js — Formulario de Marcación
**Archivo:** `src/components/marcacion-form.js` (~300 líneas)

- Reloj en tiempo real (se actualiza cada segundo)
- Auto-fill del empleado si está logueado; manual si está offline
- Tipo: Entrada 🟢 / Salida 🔴
- Selector de Proyecto/OT
- Tipo de actividad: Montaje en sitio, Remoto, Viaje, Planta
- **Captura GPS obligatoria** con reverse geocoding (Nominatim/OSM)
- Observaciones opcionales
- Botón deshabilitado hasta que GPS sea capturado

### 8.4 marcacion-tardia.js — Pendientes
**Archivo:** `src/components/marcacion-tardia.js` (~405 líneas)

- Lista de días con registros incompletos (tiene entrada sin salida o viceversa)
- Agrupados por fecha, muestra OT del registro existente
- **CompletarModal:** hora declarada, motivo, descripción, adjuntos, GPS obligatorio
- Motivos: Olvidó marcar, Problema técnico, En tránsito, Otro
- La OT es heredada del registro existente (no se puede cambiar)
- Registros quedan como `pendiente_aprobacion` → requieren aprobación del supervisor

### 8.5 novedades-form.js — Registro de Novedades
**Archivo:** `src/components/novedades-form.js` (~230 líneas)

- Tipos: Incapacidad, Vacaciones, Calamidad doméstica, Compensatorio, Permiso remunerado, Cita médica
- Rango de fechas (inicio-fin)
- Hora inicio/fin para permisos parciales (cita médica, permiso remunerado)
- Adjuntos (imágenes, PDF, documentos)
- Proyecto/OT opcional

### 8.6 supervisor-panel.js — Panel de Supervisor
**Archivo:** `src/components/supervisor-panel.js` (~497 líneas)

- **3 sub-tabs:** Pendientes, Todas, Novedades
- **Filtros:** OT, fecha desde/hasta, país
- **Agrupación:** Entries agrupadas por fecha + empleado + OT → card unificado con entrada y salida
- **Info del empleado:** Cédula, país, teléfono
- **GPSMapMulti:** Mapa Leaflet con marcadores verde (entrada) y rojo (salida)
- **Acciones:** Aprobar ✅, Ajustar ✏️ (con nueva hora), Rechazar ❌
- **Adjuntos:** Imágenes inline, documentos con nombre

### 8.7 reporte-nomina.js — Consolidado para Nómina
**Archivo:** `src/components/reporte-nomina.js` (~202 líneas)

- **Período:** Auto-detecta quincena actual (1-15 o 16-fin de mes)
- **Filtros:** Empleado, fecha desde/hasta
- **Tabla 14 columnas:** Empleado, Cédula, Fecha, Entrada, Salida, Duración, Almuerzo, Neto, H.Viaje, OT, Actividad, Novedad, Estado, ⚠️
- **Cálculos:** Duración bruta, descuento almuerzo (1h si >5h), duración neta
- **Export CSV:** Genera archivo con BOM UTF-8
- **Resumen:** Total registros + incompletos

### 8.8 historial.js — Historial y Patrones
**Archivo:** `src/components/historial.js` (~370 líneas)

- **Vista técnico:** "Mi Historial" — solo sus marcaciones
- **Vista supervisor/admin:** Resumen por empleado con análisis de patrones
- **Stats:** Total marcaciones, tardías, rechazadas, sin GPS
- **Análisis:** % tardías, nivel de alerta (Normal 🟢, Media 🟡, Alta 🔴)
- **Detalle:** Click en empleado → tabla detallada de marcaciones
- **Mapa GPS:** Modal con mapa Leaflet + link a Google Maps

### 8.9 backoffice.js — Administración
**Archivo:** `src/components/backoffice.js` (~691 líneas)

- **2 secciones:** Empleados, Proyectos
- **Resumen:** Empleados activos, en línea, por rol, proyectos activos/inactivos
- **Empleados:**
  - Tabla editable: Nombre, Cédula, Email, Teléfono, Cargo, País, Rol, Estado, Presencia
  - Cambio de rol inline
  - Edición de campos inline
  - Desactivar empleado (soft delete)
  - Indicador de presencia (online/offline con timestamp)
  - Botón ver ubicación GPS → modal con mapa
  - Auto-refresh presencia cada 30s
- **Proyectos:**
  - Crear nuevo: Código, Nombre, Ubicación, País
  - Tabla editable con todos los campos
  - Activar/Desactivar proyecto
  - Filtro por texto + toggle "Mostrar inactivos"
- **PresenceMapModal:** Mapa GPS de ubicación del empleado + info de dispositivo y versión

### 8.10 Componentes Legacy (no integrados en tabs)
| Componente | Archivo | Estado |
|---|---|---|
| `report-view.js` | Tabla simple de reportes | No usado |
| `team-list.js` | Lista de equipos | No usado |
| `timer.js` | Temporizador start/stop/reset | No usado |
| `site-selector.js` | Selector de sedes | No usado |
| `ui.js` | Toast/spinner helpers | No usado |

---

## 9. Servicios

### 9.1 supabase.js
- Crea cliente Supabase con `createClient(URL, ANON_KEY)`
- Configuración: `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: true`

### 9.2 supabase-db.js (~460 líneas)
Capa de datos completa contra Supabase. Funciones exportadas:

**Employees:**
- `addEmployee`, `getEmployees` (activos), `getAllEmployees` (todos)
- `getEmployeeByCedula`, `getEmployeeByTelefono`, `getEmployeeByAuthId`
- `updateEmployee`, `updateEmployeeRole`, `updateEmployeeField`, `deleteEmployee` (soft)
- `upsertEmployeeFromAuth` — vincula/crea employee desde auth.user

**Projects:**
- `addProject`, `getProjects` (activos), `getAllProjects` (todos)
- `updateProject`, `deactivateProject`, `reactivateProject`
- `getDistinctCountries`

**Time Entries:**
- `addTimeEntry`, `getTimeEntries`, `getTimeEntriesByEmployee`
- `getTimeEntriesByDate`, `getTimeEntriesByStatus`, `updateTimeEntry`
- Usa `mapTimeEntryToRow()` para mapear JS → columnas DB
- Usa `normalizeTimeEntry()` para normalizar DB → aliases JS

**Novelties, Approvals, Attachments:**
- CRUD completo con conversión camelCase ↔ snake_case

**Utilidades:**
- `toSnake()`, `toCamel()`, `throwIfError()`
- `seedDemoData()`, `initSupabase()`

### 9.3 db.js — Capa Híbrida (~280 líneas)
- **API pública idéntica** a supabase-db.js
- `withFallback(supaFn, idbFn)`: ejecuta contra Supabase; si falla, usa IndexedDB
- **IndexedDB:** `CronosAppDB` v4, stores: employees, projects, timeEntries, novelties, approvals, attachments
- **Seed data:** 5 empleados demo + 4 proyectos demo

### 9.4 presence-service.js (~154 líneas)
- `startPresence(employeeId)` — envía heartbeat inmediato + cada 2 min
- `stopPresence()` — marca offline + limpia timer
- `sendHeartbeat()` — upsert en `user_presence` con GPS + device_info + app_version
- `markOffline()` — upsert `is_online: false`
- `getAllPresence()` — obtener presencia de todos
- `isReallyOnline(row)` — verifica que `last_seen` sea < 5 min
- `timeAgo(date)` — formatea "Hace X min/h"
- Usa `sendBeacon` en `beforeunload` para marcar offline al cerrar tab

### 9.5 auth-service.js (~102 líneas)
Ver sección 7 (Sistema de Autenticación).

### 9.6 notification-service.js
- `requestPermission()` — solicita permiso de notificaciones nativas
- `showNotification(title, options)` — muestra notificación del navegador
- Singleton exportado

### 9.7 sync-service.js / time-tracking.js
- **Placeholders** — no integrados activamente. La sincronización real la maneja `db.js` + Supabase.

---

## 10. Utilidades (helpers.js)

| Función | Descripción |
|---|---|
| `formatTime(seconds)` | Formatea segundos → `H:MM:SS` |
| `formatHHMM(date)` | Formatea Date → `HH:MM` |
| `formatDate(date)` | Formatea Date → `DD/MM/YYYY` (es-CO) |
| `formatDateISO(date)` | Formatea Date → `YYYY-MM-DD` |
| `getCurrentTimeString()` | Hora actual `HH:MM:SS` |
| `getTimezone()` | Zona horaria del navegador |
| `calcularHorasViaje(salida, llegada, tipo)` | Calcula horas viaje con margen (nacional: +2h/-1h, internacional: +3h/-1h) |
| `calcularDuracion(entrada, salida, almuerzo)` | Duración en horas decimales, soporte cruce medianoche |
| `obtenerUbicacion()` | Promise → `{lat, lng, precision}` |
| `reverseGeocode(lat, lng)` | Nominatim → dirección legible |
| `fileToBase64(file)` | FileReader → data URL base64 |
| `exportToCSV(rows, filename)` | Genera y descarga CSV con BOM UTF-8 |
| `generateUniqueId()` | ID aleatorio `_xxxxxxxxx` |
| `debounce(func, delay)` | Debounce estándar |

**Constantes de labels:**
- `TIPO_ACTIVIDAD_LABELS` — montaje_sitio, remoto, viaje, planta
- `TIPO_NOVEDAD_LABELS` — incapacidad, vacaciones, calamidad, compensatorio, permiso_remunerado, cita_medica
- `STATUS_LABELS` — registrada, pendiente_aprobacion, aprobada, rechazada, ajustada

---

## 11. PWA y Service Worker

### 11.1 Configuración PWA
- **`manifest.json`:** name, short_name, start_url, display: standalone, theme_color: #f02e65, background_color: #19191d
- **`index.html`:** viewport-fit=cover, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style: black-translucent
- **Iconos:** SVG en múltiples tamaños (72-512px) + maskable variants

### 11.2 Service Worker v3
**Archivo:** `public/service-worker.js` (~169 líneas)

- **Estrategia:** Network-first con cache fallback
- **App Shell:** `/, /index.html, /manifest.json, iconos` → cacheados en install
- **Navegación:** Network-first, fallback a `/index.html` cacheado
- **Assets estáticos (JS/CSS/SVG):** Network-first con cache-aside
- **Google Fonts:** Cache-first (raramente cambian)
- **Supabase/APIs externas:** No se cachean (pass-through)
- **Limpieza:** Elimina caches de versiones anteriores en activate

### 11.3 Instalación PWA
- **Android/Chrome/Edge:** Detección de `beforeinstallprompt` → botón "Instalar App" en sidebar
- **iOS/Safari:** Guía manual "Toca Compartir → Agregar a inicio"
- **Detección de instalación:** `window.matchMedia('(display-mode: standalone)')`

---

## 12. Estilos y Tema Visual

### 12.1 Dark Theme
**Archivo:** `src/css/styles.css` (~755 líneas)

Variables CSS principales:
```css
--bg-body:       #19191d    /* Fondo principal */
--bg-sidebar:    #16161a    /* Fondo sidebar */
--bg-card:       #1e1e23    /* Fondo tarjetas */
--text-primary:  #e4e4e7    /* Texto principal */
--text-secondary:#a0a0ab    /* Texto secundario */
--accent:        #f02e65    /* Color acento (rosa/rojo) */
--success:       #22c55e    /* Verde éxito */
--warning:       #f5a623    /* Amarillo advertencia */
--error:         #ef4444    /* Rojo error */
--border:        rgba(255,255,255,0.08)
--radius:        8px
--radius-lg:     12px
--sidebar-width: 240px
```

### 12.2 Responsive Breakpoints
- **Desktop (>640px):** Sidebar lateral 240px, contenido full-width
- **Móvil (≤640px):**
  - Sidebar → tab bar fijo en la parte inferior
  - Header visible con safe-area-inset-top para iPhone
  - Sidebar bottom con safe-area-inset-bottom para home indicator
  - Tablas con font-size reducido, padding ajustado
  - Filtros en columna, botones full-width

### 12.3 Safe Area (iPhone)
- `.app-header`: `padding-top: calc(12px + env(safe-area-inset-top, 0px))`
- `.app-sidebar`: `padding-bottom: env(safe-area-inset-bottom, 0px)`

---

## 13. Datos de Producción

### 13.1 Empleados Registrados (10)
| País | Cantidad |
|---|---|
| Colombia | 8 |
| México | 2 |

### 13.2 Proyectos Semilla
| Código | Nombre | País |
|---|---|---|
| OT-154000 | Montaje Planta Monterrey | México |
| OT-155000 | Instalación Bogotá Norte | Colombia |
| OT-156000 | Mantenimiento CDMX | México |
| OT-157000 | Proyecto Medellín Sur | Colombia |

---

## 14. Flujos de Trabajo del Usuario

### 14.1 Técnico — Día Normal
1. Abre CronosApp → login con email, cédula o celular
2. Tab **Marcar** → selecciona Entrada, OT, tipo actividad
3. Captura GPS → registra entrada
4. Al final del día → selecciona Salida → captura GPS → registra salida
5. Tab **Historial** → revisa sus marcaciones

### 14.2 Técnico — Olvidó Marcar
1. Tab **Pendientes** → ve día incompleto
2. Click "Completar" → hora declarada, motivo, GPS, evidencia (foto/PDF)
3. Queda como `pendiente_aprobacion`

### 14.3 Supervisor — Aprobación
1. Tab **Aprobar** → ve pendientes agrupados por empleado/OT
2. Expande un grupo → ve entrada y salida, mapa GPS, adjuntos
3. Aprueba ✅, Ajusta ✏️ (nueva hora) o Rechaza ❌

### 14.4 Supervisor — Nómina
1. Tab **Nómina** → período quincenal auto-detectado
2. Filtra por empleado/fechas
3. Exporta CSV

### 14.5 Admin — Gestión
1. Tab **Admin** → sección Empleados o Proyectos
2. Edita campos inline, cambia roles, desactiva/activa
3. Ve presencia en tiempo real con GPS

---

## 15. Despliegue

### 15.1 Build
```bash
cd CronosApp
npm install
npm run build        # → dist/
```

### 15.2 Producción
- **Servido por** Cloudflare Tunnel desde la máquina local
- **URL:** https://cronos.event2flow.com/
- **Auto-deploy:** Push a `main` → se refleja automáticamente

### 15.3 Ramas Git
| Rama | Propósito |
|---|---|
| `main` | Producción (auto-deploy) |
| `dev` | Desarrollo y pruebas |

### 15.4 Workflow de Deploy
```bash
# Desarrollo en dev
git checkout dev
# ... hacer cambios ...
npx webpack --mode development    # verificar build
git add -A && git commit -m "feat: ..."
git push origin dev

# Cuando está listo para producción
git checkout main
git merge dev
git push origin main              # ← auto-deploy
```

---

## 16. Comandos Útiles

```bash
# Desarrollo
npm start                          # Dev server en puerto 3000
npx webpack --mode development     # Build rápido sin minificar

# Producción
npm run build                      # Build optimizado → dist/

# Git
git checkout dev                   # Cambiar a desarrollo
git checkout main                  # Cambiar a producción
git log --oneline dev..main        # Ver diferencias entre ramas
git merge main                     # Traer cambios de main a dev
git merge dev                      # Traer cambios de dev a main

# Servir dist localmente
node serve-dist.js                 # Si existe
```

---

## 17. Consideraciones para Nuevos Agentes / Contextos

### Lo que DEBE saber un nuevo agente:
1. **Es una SPA React 18** con JSX, no TypeScript
2. **Entry point:** `src/js/app.js`
3. **Estilos:** CSS puro en `src/css/styles.css` (NO Tailwind, NO CSS modules)
4. **Datos:** `db.js` es la interfaz → todo CRUD pasa por ahí
5. **Auth:** Supabase Auth, con `signInSmart` que acepta email/cédula/celular
6. **GPS obligatorio** en marcaciones — sin GPS no se puede registrar
7. **Roles:** tecnico < supervisor < admin — controlan visibilidad de tabs
8. **PWA:** Service Worker v3, viewport-fit=cover, safe-area-inset para iPhone
9. **Dark theme:** Variables CSS en `:root`, fuente Inter
10. **Dos ramas:** `dev` para desarrollo, `main` para producción
11. **Deploy:** Cloudflare Tunnel a `cronos.event2flow.com` desde push a main
12. **Supabase:** URL `https://supabase.valparaiso.cafe`, esquema en `supabase/schema.sql`
13. **Componentes legacy** (report-view, team-list, timer, site-selector, ui.js) NO se usan activamente
14. **Layout desktop:** Sidebar 240px + `.app-main` full-width (sin max-width)
15. **Layout móvil:** Header top con safe-area + tab bar bottom + contenido scroll

### Archivos críticos por orden de importancia:
1. `src/js/app.js` — Entry point, auth flow, layout, tabs
2. `src/css/styles.css` — Todos los estilos
3. `src/js/db.js` — Capa de datos híbrida
4. `src/services/supabase-db.js` — CRUD Supabase completo
5. `src/services/auth-service.js` — Autenticación
6. `src/utils/helpers.js` — Utilidades compartidas
7. `supabase/schema.sql` — Esquema de base de datos
8. `webpack.config.js` — Configuración del bundler
9. `package.json` — Dependencias y scripts
10. `src/components/*.js` — Componentes de UI

---

## 18. Historial de Commits Relevantes

| Commit | Descripción |
|---|---|
| `b823b7f` | fix(mobile): safe-area padding iPhone header/sidebar + nomina responsiva |
| `87649b4` | feat(login): login inteligente email/cédula/celular |
| `a53d061` | fix: cerrar sesión después de cambiar contraseña |
| `05c98b5` | feat: modal cambiar contraseña |
| `e9563f1` | feat: campo teléfono en empleados |
| `a554873` | feat: supervisor panel — grupos, filtros, mapa multi-marker |
| `99327fb` | fix: bug pendientes (getAllProjects, projectId conversion) |
| `6c7e874` | feat(layout): cards y contenido usan ancho completo del monitor en desktop |

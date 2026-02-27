-- ============================================================
-- ASHIRA SOFTWARE — UPSERT DE PLANES CON PRECIOS ACTUALIZADOS
-- Moneda: USD | Versión: 2.1 | Fecha: Feb 2026
-- Estructura de descuentos: Trimestral -10% | Anual -30%
-- Lógica Clínica: Precio base de administrador + tarifa por
-- especialista invitado (reflejado en monthlyPrice por esp.)
-- ============================================================

INSERT INTO "public"."plan" (
    "id", "slug", "name", "minSpecialists", "maxSpecialists",
    "monthlyPrice", "quarterlyPrice", "annualPrice",
    "description", "createdAt", "updatedAt"
) VALUES

-- ============================================================
-- PLAN GRATUITO (PACIENTE)
-- ============================================================
(
    'f9a7b9c1-1e2a-43d2-8a90-123456789abc',
    'paciente-gratis',
    'Plan Gratuito',
    '0', '0',
    '0',   -- Mensual
    '0',   -- Trimestral
    '0',   -- Anual
    'Plan individual gratuito para llevar el control de tu salud personal. Acceso a tu historial médico, citas, recetas y resultados de laboratorio desde cualquier dispositivo. Sin costo. Sin compromisos.',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

-- ============================================================
-- PLANES DE PACIENTE
-- ============================================================
(
    '6640ea96-e022-42da-9ccd-1ccc90bedc88',
    'paciente-individual',
    'Paciente — Individual',
    '0', '0',
    '1.08',    -- Mensual: $1.08
    '2.92',    -- Trimestral: $1.08 x 3 x 0.90 = $2.92 (Ahorro 10%)
    '9.07',    -- Anual: $1.08 x 12 x 0.70 = $9.07 (Ahorro 30%)
    'Portal individual para llevar el control total de tu salud.
▸ Mensual ($1.08/mes): Historial Médico Completo, agenda de citas online, acceso a recetas y resultados de laboratorio. Respaldo mensual en la nube.
▸ Trimestral ($2.92 — Ahorro 10%): Todo lo anterior + Soporte Prioritario.
▸ Anual ($9.07 — Ahorro 30%): Todo lo anterior + Auditoría Anual de Datos.

Funcionalidades de Paciente incluidas:
- Visualización de Historial Médico (Conclusiones de la consulta).
- Agenda interactiva de Citas Online y reprogramación.
- Acceso inmediato a descarga de recetas (PDF) e indicaciones pasadas.
- Integración para subir o revisar resultados de laboratorio e imágenes médicas.',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

(
    '156c1221-576b-46de-90be-ab3022fbdecc',
    'paciente-family',
    'Paciente — Plan Familiar (hasta 5)',
    '0', '5',
    '2.50',    -- Mensual: $2.50
    '6.75',    -- Trimestral: $2.50 x 3 x 0.90 = $6.75 (Ahorro 10%)
    '21.00',   -- Anual: $2.50 x 12 x 0.70 = $21.00 (Ahorro 30%)
    'Administra la salud de hasta 5 miembros de tu familia desde un solo perfil (Administrador Maestro).
▸ Mensual ($2.50/mes): Historial individual por miembro, agenda, recetas y resultados.
▸ Trimestral ($6.75 — Ahorro 10%): Todo lo anterior + Soporte Prioritario.
▸ Anual ($21.00 — Ahorro 30%): Todo lo anterior + Auditoría Anual de Datos.

Funcionalidades del Plan Familiar:
- Perfil Maestro con control sobre 5 historiales clínicos distintos.
- Gestión consolidada de múltiples agendas familiares y visualización de diagnósticos separados.',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

-- ============================================================
-- PLAN ENFERMERÍA INDEPENDIENTE
-- Rango recomendado: $20-$25/mes → Precio elegido: $20/mes
-- ============================================================
(
    'd0479d0f-6dff-402a-8c2b-a999a2888b7d',
    'enfermero-independiente',
    'Plan Enfermería — Independiente',
    '0', '1',
    '20',      -- Mensual: $20
    '54.00',   -- Trimestral: $20 x 3 x 0.90 = $54.00 (Ahorro 10%)
    '168.00',  -- Anual: $20 x 12 x 0.70 = $168.00 (Ahorro 30%, ahorras $72/año)
    'Sistema clínico para profesionales de enfermería en ejercicio independiente o domiciliario.
▸ Mensual ($20/mes): Funcionalidades operativas core.
▸ Trimestral ($54 — Ahorro 10%): Todo lo anterior + Migración de Datos Gratis y Soporte VIP.
▸ Anual ($168 — Ahorro 30%): Todo lo anterior + Configuración Asistida y Prioridad en funciones.

Funcionalidades de Enfermería incluidas:
- Notas de Enfermería Digitales estructuradas y control clínico offline.
- Signos Vitales interactivos con gráficas (peso, tensión, glicemia, SpO2).
- Cuidado Domiciliario: Formularios de Procedencia y Tratamientos previos.
- MAR (Medication Administration Record) en línea de tiempo/Kardex para control de medicamentos.
- Reportes PDF de Fin de Turno automatizados. Dashboard de guardias y tareas.
- Módulo Híbrido "Mis Pacientes" (incluye toma y registro rápido de pacientes no registrados).',
    '2026-02-26 02:54:51.097803+00',
    '2026-02-27 00:00:00.000000+00'
),

-- ============================================================
-- PLAN MÉDICO — CONSULTORIO PRIVADO (ESPECIALISTA + EQUIPO)
-- Rango recomendado: $45-$60/mes → Precio elegido: $49/mes
-- Perfil: 1 especialista + hasta 2 usuarios de staff
-- ============================================================
(
    '52528793-ec01-4869-a5a9-6e72e23c738e',
    'medico',
    'Plan Médico — Consultorio Privado',
    '1', '1',
    '49',       -- Mensual: $49
    '132.30',   -- Trimestral: $49 x 3 x 0.90 = $132.30 (Ahorro 10%)
    '411.60',   -- Anual: $49 x 12 x 0.70 = $411.60 (Ahorro 30%, ahorras $176.40/año)
    'Optimizado para el especialista que gestiona su propia marca y delega tareas operativas (hasta 2 usuarios de staff).
▸ Mensual ($49/mes): Uso total de HCE, Agenda y Finanzas.
▸ Trimestral ($132.30 — Ahorro 10%): Todo lo mensual + Migración Gratis y Soporte VIP.
▸ Anual ($411.60 — Ahorro 30%): Todo lo trimestral + Configuración (Zoom), Capacitación y Auditoría.

Módulos y Roles Permitidos:
- ROL MÉDICO ESPECIALISTA: Creación y consulta HCE, registro SOAP, recetas electrónicas PDF/DOCX personalizadas, consulta sucesiva optimizada, órdenes de laboratorio, facturación multi-moneda básica, estadísticas financieras.
- ROL ASISTENTE DE CITAS: Agendamiento total y control de flujos de sala. Triaje clínico inicial (signos vitales básicos o síntomas). Restricción estricta de modificación de HCE o emisión de récipes.
- ROL RECEPCIÓN (FLUJO Y PAGO): Control de llegadas, verificación y registro de pagos, "Caja Chica". Generación de facturas simples. Oclusión total del historial clínico (Cero acceso a HCE por seguridad/HIPAA).',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

-- ============================================================
-- PLANES DE CLÍNICA
-- Modelo de precio: Base admin $130/mes (fija) + tarifa mensual
-- por especialista invitado según tramo de escala.
-- El monthlyPrice refleja la tarifa POR especialista.
-- La descripción detalla la base + tarifa por médico invitado.
-- ============================================================

-- PLAN CLÍNICA STARTER (2-10 especialistas)
-- Base admin: $130/mes + $20/especialista/mes
(
    '018a1323-3460-4e3b-9c6d-7e791037e636',
    'clinic-starter',
    'Clínica Starter (2–10 esp.)',
    '2', '10',
    '20',      -- $20/mes por especialista invitado
    '54.00',   -- Trimestral por especialista: $20 x 3 x 0.90 (Ahorro 10%)
    '168.00',  -- Anual por especialista: $20 x 12 x 0.70 (Ahorro 30%)
    'Para consultorios grupales y centros pequeños. Precio: $130/mes (acceso admin) + $20/mes por especialista invitado.
▸ Mensual: Multi-Sede centralizada, Verificación de Pagos, roles múltiples.
▸ Trimestral (10% dto./esp): Todo lo anterior + Soporte Prioritario VIP.
▸ Anual (30% dto./esp): Todo lo anterior + Configuración (Zoom), Capacitación.

Funcionalidades de Clínica integradas:
- ROL ADMINISTRADOR MAESTRO: Gestión multi-sede simultánea, panel de especialistas invitados, Sugerencia Inteligente de Sede, Inventario e insumos por sede, Verificación y auditoría central de pagos contra fraudes. Asignación granular de permisos a todos.
- ROL MÉDICO INVITADO: Solo visualiza pacientes asignados a él en las sedes donde labora, control propio de HCE y agenda individual.
- ROL FACTURACIÓN / GERENCIA: Back-office financiero, panel completo de transacciones, cuentas por cobrar, estados bancarios y reportes de rentabilidad bruta de turnos. Sin capacidades clínicas.
- ROLES DE STAFF INCLUIDOS: Asistente de Citas y Recepción de Pagos (flujo estricto sin violar privacidad de pacientes).',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

-- PLAN CLÍNICA MEDIUM (11-30 especialistas)
-- Base admin: $130/mes + $18/especialista/mes
(
    '03544f06-80b9-4edb-ac8b-e970be4e81a7',
    'clinic-medium',
    'Clínica (11–30 esp.)',
    '11', '30',
    '18',      -- $18/mes por especialista invitado
    '48.60',   -- Trimestral: $18 x 3 x 0.90 (Ahorro 10%)
    '151.20',  -- Anual: $18 x 12 x 0.70 (Ahorro 30%)
    'Para centros ambulatorios y de diagnóstico. Precio: $130/mes (acceso admin) + $18/mes por especialista invitado.
▸ Mensual: Multi-Sede centralizada, Verificación de Pagos, roles múltiples.
▸ Trimestral (10% dto./esp): Todo lo anterior + Soporte Prioritario VIP.
▸ Anual (30% dto./esp): Todo lo anterior + Configuración (Zoom), Capacitación.

Funcionalidades de Clínica integradas:
- ROL ADMINISTRADOR MAESTRO: Gestión multi-sede simultánea, panel de especialistas invitados, Sugerencia Inteligente de Sede, Inventario e insumos por sede, Analytics Empresarial, Auditoría central de pagos contra fraudes y asigación granular.
- ROL MÉDICO INVITADO: Visualiza pacientes asignados, control propio de su HCE y agenda individual.
- ROL FACTURACIÓN / GERENCIA: Funciones de Back-office, panel de transacciones, cuentas por cobrar y reportes de rentabilidad bruta (Sin capacidades clínicas).
- ROL ENFERMERÍA CLÍNICA: Integrado para salas (Signos Vitales y control).
- ROLES DE STAFF INCLUIDOS: Asistente Clásico y Recepción Logística.',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

-- PLAN CLÍNICA PRO (31-80 especialistas)
-- Base admin: $130/mes + $16/especialista/mes
(
    'b612e452-8384-42a3-96d5-5a2421f93cb0',
    'clinic-pro',
    'Clínica Pro (31–80 esp.)',
    '31', '80',
    '16',      -- $16/mes por especialista invitado
    '43.20',   -- Trimestral: $16 x 3 x 0.90 (Ahorro 10%)
    '134.40',  -- Anual: $16 x 12 x 0.70 (Ahorro 30%)
    'Para clínicas medianas con urgencias y especialidades. Precio: $130/mes (acceso admin) + $16/mes por especialista invitado.
▸ Trimestral (10% dto./esp) y Anual (30% dto./esp) disponibles.

Funcionalidades Nivel Pro:
- Mapa de Camas y Observación: Integración directa al panel de enfermería clínico para seguimiento de internos. Alertas en tiempo real.
- ROL ADMINISTRADOR MAESTRO: Multi-Sede, Sugerencia Inteligente, Analytics Empresarial, Auditoría integral.
- ROL FACTURACIÓN / GERENCIA: Cierre de caja complejo multisucursal, estadísticas de rentabilidad, cuentas por cobrar. 
- Todos los roles de línea incluidos: Médicos Invitados, Enfermeros de piso, Asistentes de triaje y Recepcionistas de pago (100% oclusión de HCE a recepcionistas).',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

-- PLAN CLÍNICA ENTERPRISE (81-200 especialistas)
-- Base admin: $130/mes + $14/especialista/mes
(
    '1dfb901c-9e52-4afa-8d36-e0fa2bc34670',
    'clinic-enterprise',
    'Clínica Enterprise (81–200 esp.)',
    '81', '200',
    '14',      -- $14/mes por especialista invitado
    '37.80',   -- Trimestral: $14 x 3 x 0.90 (Ahorro 10%)
    '117.60',  -- Anual: $14 x 12 x 0.70 (Ahorro 30%)
    'Para grandes clínicas privadas con múltiples sedes y alta carga operativa. Precio: $130/mes (acceso admin) + $14/mes por especialista invitado.
▸ Trimestral (10% dto./esp) y Anual (30% dto./esp) disponibles.

Funcionalidades Nivel Enterprise:
- Operaciones a Gran Escala: Gestión de hasta 200 especialistas con delegación jerárquica ilimitada. Analytics Empresarial avanzado.
- Mapa de Camas y Observación interactivo con notificaciones Push para el cuerpo médico.
- Roles Clínicos Seguros: Administrador (Maestro general), Gerencia Financiera, Médicos (Dueños de su HC asignada), Enfermería de piso (Reportes MAR), Asistentes y Recepción (Verificación aislada de pagos sin tocar historial clínico de pacientes).
- Auditoría Anual de Datos y Soporte Dedicado.',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
),

-- PLAN CLÍNICA PERSONALIZADO (200+ especialistas)
(
    '28bc2b34-8820-4035-af3b-ea6501e4f2b4',
    'clinic-custom',
    'Personalizado (200+ esp.)',
    '201', '99999',
    '0',   -- Cotización personalizada
    '0',
    '0',
    'Plan a medida para instituciones, hospitales y grandes policlínicas con más de 200 especialistas. Incluye todas las funcionalidades corporativas, servidores dedicados, Account Manager local y Auditorías Anuales de Base de Datos. Precio por cotización personalizada según volumen y requerimientos.',
    '2025-11-07 15:20:17.724421+00',
    '2026-02-27 00:00:00.000000+00'
)

ON CONFLICT ("id") DO UPDATE SET
    "slug"            = EXCLUDED."slug",
    "name"            = EXCLUDED."name",
    "minSpecialists"  = EXCLUDED."minSpecialists",
    "maxSpecialists"  = EXCLUDED."maxSpecialists",
    "monthlyPrice"    = EXCLUDED."monthlyPrice",
    "quarterlyPrice"  = EXCLUDED."quarterlyPrice",
    "annualPrice"     = EXCLUDED."annualPrice",
    "description"     = EXCLUDED."description",
    "updatedAt"       = EXCLUDED."updatedAt";

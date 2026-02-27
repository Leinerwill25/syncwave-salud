-- Script para actualizar (hacer UPSERT) de todos los planes con sus nuevos precios y descripciones EXPLÍCITAS

-- 1. CONSULTORIO PRIVADO (Plan Médico)
-- Optimizado para el médico independiente y su equipo.
INSERT INTO "public"."plan" (
    "id", "slug", "name", "minSpecialists", "maxSpecialists", 
    "monthlyPrice", "quarterlyPrice", "annualPrice", 
    "description", "createdAt", "updatedAt"
) VALUES 
('52528793-ec01-4869-a5a9-6e72e23c738e', 'medico', 'Plan Médico — Usuario individual', '1', '1', '70', '189', '588', 'Plan optimizado para médicos independientes y consultorios privados. Incluye: Historia Clínica Electrónica (HCE) 24/7 segura e interoperable, Agenda Inteligente con confirmación y recordatorios automáticos por WhatsApp, Receta Electrónica descargable en PDF, Módulo de Consulta Sucesiva para control y seguimiento de pacientes, Facturación Básica multi-moneda (USD/Bs) con control de caja y estadísticas financieras.
Roles habilitados: 
- 1 Médico Especialista (Acceso completo a HCE, recetas, finanzas y reportes).
- Hasta 2 usuarios de Staff: Asistente (para agendamiento de pacientes, envío de recordatorios, cobros y triaje básico de signos vitales) y Recepción (para control de flujo de sala de espera y manejo de caja chica).
Elimina el uso de papel y centraliza tu información médica.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00')
ON CONFLICT ("id") DO UPDATE SET 
    "slug" = EXCLUDED."slug",
    "name" = EXCLUDED."name",
    "monthlyPrice" = EXCLUDED."monthlyPrice",
    "quarterlyPrice" = EXCLUDED."quarterlyPrice",
    "annualPrice" = EXCLUDED."annualPrice",
    "description" = EXCLUDED."description";


-- 2. CLÍNICAS Y CENTROS MÉDICOS
-- Múltiples especialistas, gestión jerárquica y sedes.
INSERT INTO "public"."plan" (
    "id", "slug", "name", "minSpecialists", "maxSpecialists", 
    "monthlyPrice", "quarterlyPrice", "annualPrice", 
    "description", "createdAt", "updatedAt"
) VALUES 
('018a1323-3460-4e3b-9c6d-7e791037e636', 'clinic-starter', 'Starter (2–10 esp.)', '2', '10', '56', '151.2', '470.4', 'Organización para consultorios grupales y centros pequeños. Solución integral que incluye todo lo del Plan Médico más: Gestión Multi-Sede centralizada, Sugerencia Inteligente de Sede (redirige pacientes si la sede principal está llena), Analytics Empresarial con dashboards en tiempo real, KPIs de productividad por médico/especialidad, y Módulo de Verificación de Pagos central.
Panel de Roles Avanzado:
- Administrador Central: Visión global, control financiero, y analytics. Acceso total a configuraciones y permisos. Ataca el efecto chamán.
- Médicos (Referidos o de Staff): Cada médico accede solo a su HCE y agenda, asegurando la privacidad del paciente (silos de información cerrados).
- Recepcionista: Control de tráfico de pacientes, admisión, derivación multi-sede y manejo de lista de espera global.
- Asistente Administrativo / Facturación: Conciliación de pagos con capturas de pantalla, aprobación de reportes de transferencias y cierres de caja por sede.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 
('03544f06-80b9-4edb-ac8b-e970be4e81a7', 'clinic-medium', 'Clínica (11–30 esp.)', '11', '30', '49', '132.3', '411.6', 'Organización para centros ambulatorios y de diagnóstico. Solución integral que incluye todo lo del Plan Médico más: Gestión Multi-Sede centralizada, Sugerencia Inteligente de Sede (redirige pacientes si la sede principal está llena), Analytics Empresarial con dashboards en tiempo real, KPIs de productividad por médico/especialidad, y Módulo de Verificación de Pagos central.
Panel de Roles Avanzado:
- Administrador Central: Visión global, control financiero, y analytics. Acceso total a configuraciones y permisos. Ataca el efecto chamán.
- Médicos (Referidos o de Staff): Cada médico accede solo a su HCE y agenda, asegurando la privacidad del paciente (silos de información cerrados).
- Recepcionista: Control de tráfico de pacientes, admisión, derivación multi-sede y manejo de lista de espera global.
- Asistente Administrativo / Facturación: Conciliación de pagos con capturas de pantalla, aprobación de reportes de transferencias y cierres de caja por sede.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 
('b612e452-8384-42a3-96d5-5a2421f93cb0', 'clinic-pro', 'Pro (31–80 esp.)', '31', '80', '42', '113.4', '352.8', 'Organización para clínicas medianas con áreas de emergencias. Solución integral que incluye todo lo del Plan Médico más: Gestión Multi-Sede centralizada, Sugerencia Inteligente de Sede (redirige pacientes si la sede principal está llena), Analytics Empresarial con dashboards en tiempo real, KPIs de productividad por médico/especialidad, y Módulo de Verificación de Pagos central.
Panel de Roles Avanzado:
- Administrador Central: Visión global, control financiero, y analytics. Acceso total a configuraciones y permisos. Ataca el efecto chamán.
- Médicos (Referidos o de Staff): Cada médico accede solo a su HCE y agenda, asegurando la privacidad del paciente (silos de información cerrados).
- Recepcionista: Control de tráfico de pacientes, admisión, derivación multi-sede y manejo de lista de espera global.
- Asistente Administrativo / Facturación: Conciliación de pagos con capturas de pantalla, aprobación de reportes de transferencias y cierres de caja por sede.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 
('1dfb901c-9e52-4afa-8d36-e0fa2bc34670', 'clinic-enterprise', 'Enterprise (81–200 esp.)', '81', '200', '35', '94.5', '294', 'Organización para grandes clínicas privadas y redes de salud. Solución integral que incluye todo lo del Plan Médico más: Gestión Multi-Sede centralizada, Sugerencia Inteligente de Sede (redirige pacientes si la sede principal está llena), Analytics Empresarial con dashboards en tiempo real, KPIs de productividad por médico/especialidad, y Módulo de Verificación de Pagos central.
Panel de Roles Avanzado:
- Administrador Central: Visión global, control financiero, y analytics. Acceso total a configuraciones y permisos. Ataca el efecto chamán.
- Médicos (Referidos o de Staff): Cada médico accede solo a su HCE y agenda, asegurando la privacidad del paciente (silos de información cerrados).
- Recepcionista: Control de tráfico de pacientes, admisión, derivación multi-sede y manejo de lista de espera global.
- Asistente Administrativo / Facturación: Conciliación de pagos con capturas de pantalla, aprobación de reportes de transferencias y cierres de caja por sede.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00')
ON CONFLICT ("id") DO UPDATE SET 
    "slug" = EXCLUDED."slug",
    "name" = EXCLUDED."name",
    "monthlyPrice" = EXCLUDED."monthlyPrice",
    "quarterlyPrice" = EXCLUDED."quarterlyPrice",
    "annualPrice" = EXCLUDED."annualPrice",
    "description" = EXCLUDED."description";


-- 3. CLÍNICA CUSTOM (+200)
INSERT INTO "public"."plan" (
    "id", "slug", "name", "minSpecialists", "maxSpecialists", 
    "monthlyPrice", "quarterlyPrice", "annualPrice", 
    "description", "createdAt", "updatedAt"
) VALUES 
('28bc2b34-8820-4035-af3b-ea6501e4f2b4', 'clinic-custom', 'Personalizado (200+ esp.)', '201', '99999', '0', '0', '0', 'Plan a medida para instituciones, hospitales y grandes policlínicas (+200). Incluye todas las funcionalidades corporativas del Plan Clínica Empresarial, con infraestructura de servidores dedicada, soporte técnico VIP, Account Manager dedicado localmente y Auditorías Anuales de Base de Datos.
Configuración especializada del Panel de Roles Avanzado (Múltiples Administradores, Coordinadores Médicos, Red HCE propia, RRHH para control de personal médico y recepcionistas). Acceso a API Privada para desarrollos a medida e integración con sistemas de aseguradoras e inventarios en paralelo.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00')
ON CONFLICT ("id") DO UPDATE SET 
    "slug" = EXCLUDED."slug",
    "name" = EXCLUDED."name",
    "monthlyPrice" = EXCLUDED."monthlyPrice",
    "quarterlyPrice" = EXCLUDED."quarterlyPrice",
    "annualPrice" = EXCLUDED."annualPrice",
    "description" = EXCLUDED."description";


-- 4. ENFERMERÍA INDEPENDIENTE
INSERT INTO "public"."plan" (
    "id", "slug", "name", "minSpecialists", "maxSpecialists", 
    "monthlyPrice", "quarterlyPrice", "annualPrice", 
    "description", "createdAt", "updatedAt"
) VALUES 
('d0479d0f-6dff-402a-8c2b-a999a2888b7d', 'enfermero-independiente', 'Plan Enfermería Independiente', '0', '1', '65', '175.5', '546', 'Sistema clínico diseñado específicamente para profesionales de enfermería en el ejercicio independiente, unidades de cuidados intermedios o servicios a domicilio.
Funcionalidades Clave de la Herramienta:
- Notas de Enfermería Digitales: Evoluciones clínicas estructuradas y legibles, garantizando un historial trazable y eliminando el papel.
- Control Detallado de Signos Vitales: Registro en gráficas de peso, tensión arterial, glucosa en sangre capilar, SpO2, diuresis y mediciones por especialidad.
- MAR y Administración de Medicamentos: Cumplimiento posológico, horarios y alertas de administración de tratamiento intravenoso y oral según 10 correctos, para evitar equivocaciones.
- Gestión de Turnos y Tareas: Calendario y check-list para organizar las rutas de visitas de pacientes.
- Comunicación Directa (Módulo Chat/Interop): Canal en tiempo real con el médico tratante (si el paciente está de alta conjunta en la red) para reportar incidencias críticas, hallazgos o solicitar ajustes en la dosificación terapéutica.', '2026-02-26 02:54:51.097803+00', '2026-02-26 02:54:51.097803+00')
ON CONFLICT ("id") DO UPDATE SET 
    "slug" = EXCLUDED."slug",
    "name" = EXCLUDED."name",
    "monthlyPrice" = EXCLUDED."monthlyPrice",
    "quarterlyPrice" = EXCLUDED."quarterlyPrice",
    "annualPrice" = EXCLUDED."annualPrice",
    "description" = EXCLUDED."description";


-- 5. PACIENTES
INSERT INTO "public"."plan" (
    "id", "slug", "name", "minSpecialists", "maxSpecialists", 
    "monthlyPrice", "quarterlyPrice", "annualPrice", 
    "description", "createdAt", "updatedAt"
) VALUES 
('6640ea96-e022-42da-9ccd-1ccc90bedc88', 'paciente-individual', 'Paciente — Individual', '0', '0', '1.08', '3.09', '12.99', 'Portal individual con acceso al Historial Médico Completo (HCE) y agenda de citas online, garantizando disponibilidad y privacidad estricta. Respaldo mensual de data en la nube.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 
('156c1221-576b-46de-90be-ab3022fbdecc', 'paciente-family', 'Paciente — Plan Familiar (hasta 5)', '0', '5', '2.5', '7.12', '29.99', 'Administra y supervisa unívocamente (Administrador Maestro) un perfil con capacidad de agregar y manejar la salud y las citas médicas de hasta 5 miembros de un núcleo familiar.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'),
('paciente-gratis-UUID-REMPLAZABLE', 'paciente-gratis', 'Plan Gratuito', '0', '0', '0', '0', '0', 'Plan individual para llevar el control de tu salud. Acceso gratuito a tu historial médico, citas, recetas y resultados de laboratorio desde cualquier dispositivo.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00')
ON CONFLICT ("slug") DO UPDATE SET 
    "description" = EXCLUDED."description",
    "monthlyPrice" = EXCLUDED."monthlyPrice",
    "quarterlyPrice" = EXCLUDED."quarterlyPrice",
    "annualPrice" = EXCLUDED."annualPrice";

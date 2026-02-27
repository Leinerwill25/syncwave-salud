-- Script para actualizar (hacer UPSERT) de todos los planes con sus nuevos precios y descripciones EXPLÍCITAS

INSERT INTO "public"."plan" (
    "id", "slug", "name", "minSpecialists", "maxSpecialists", 
    "monthlyPrice", "quarterlyPrice", "annualPrice", 
    "description", "createdAt", "updatedAt"
) VALUES 
('018a1323-3460-4e3b-9c6d-7e791037e636', 'clinic-starter', 'Starter (2–10 esp.)', '2', '10', '56', '151.2', '470.4', 'Plan para consultorios grupales y centros pequeños.
▸ Mensual (€56/mes extra por especialista): Gestión Multi-Sede centralizada, Panel Roles (Administrador, Médicos, Recepcionista, Facturación), Sugerencia Inteligente de Sede, Verificación de Pagos.
▸ Trimestral (€151.2 - Ahorro 10%): Todo lo del plan mensual + Soporte Prioritario VIP y Migración de Datos Gratis.
▸ Anual (€470.4 - Ahorro 30%): Todo lo anterior + Configuración Asistida (Zoom), Capacitación a Personal y Auditoría Anual de Datos.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('03544f06-80b9-4edb-ac8b-e970be4e81a7', 'clinic-medium', 'Clínica (11–30 esp.)', '11', '30', '49', '132.3', '411.6', 'Plan para centros ambulatorios y de diagnóstico.
▸ Mensual (€49/mes extra por especialista): Gestión Multi-Sede centralizada, Panel Roles (Administrador, Médicos, Recepcionista, Facturación), Sugerencia Inteligente de Sede, Analytics Empresarial.
▸ Trimestral (€132.3 - Ahorro 10%): Todo lo del plan mensual + Soporte Prioritario VIP y Migración de Datos Gratis.
▸ Anual (€411.6 - Ahorro 30%): Todo lo anterior + Configuración Asistida (Zoom), Capacitación a Personal y Auditoría Anual de Datos.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('156c1221-576b-46de-90be-ab3022fbdecc', 'paciente-family', 'Paciente — Plan Familiar (hasta 5)', '0', '5', '2.5', '7.12', '29.99', 'Administra y supervisa unívocamente (Administrador Maestro) un perfil con capacidad de agregar y manejar la salud y las citas médicas de hasta 5 miembros de un núcleo familiar.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('1dfb901c-9e52-4afa-8d36-e0fa2bc34670', 'clinic-enterprise', 'Enterprise (81–200 esp.)', '81', '200', '35', '94.5', '294', 'Plan para grandes clínicas privadas.
▸ Mensual (€35/mes extra por especialista): Gestión Multi-Sede centralizada, Panel Roles (Administrador, Médicos, Recepcionista, Facturación), Sugerencia Inteligente de Sede, Analytics Empresarial avanzado.
▸ Trimestral (€94.5 - Ahorro 10%): Todo lo del plan mensual + Soporte Prioritario VIP y Migración de Datos Gratis.
▸ Anual (€294 - Ahorro 30%): Todo lo anterior + Configuración Asistida (Zoom), Capacitación a Personal y Auditoría Anual de Datos.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('28bc2b34-8820-4035-af3b-ea6501e4f2b4', 'clinic-custom', 'Personalizado (200+ esp.)', '201', '99999', '0', '0', '0', 'Plan a medida para instituciones, hospitales y grandes policlínicas (+200 especialistas). Incluye todas las funcionalidades corporativas, servidores dedicados, Account Manager local, y Auditorías Anuales de DB. Cotización personalizada.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('52528793-ec01-4869-a5a9-6e72e23c738e', 'medico', 'Plan Médico — Usuario individual', '1', '1', '70', '189', '588', 'Optimizado para el especialista y su equipo.
▸ Mensual (€70/mes): Historia Clínica Digital 24/7, Agenda con Recordatorios WhatsApp, Recetas en PDF y Consulta Sucesiva, Facturación Básica. Roles incluidos: Asistente (Recepción, Pago, Triaje) y Recepción (Flujo y Caja Chica). App Móvil (Próximamente).
▸ Trimestral (€189 - Ahorro 10%): Todo lo del plan mensual + Migración de Datos Gratis y Soporte Prioritario VIP.
▸ Anual (€588 - Ahorro 30%, te ahorras €252 al año): Todo lo del plan Trimestral + Configuración Asistida (Zoom), Capacitación a Personal, Auditoría Anual de Datos y Prioridad en Funciones.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('6640ea96-e022-42da-9ccd-1ccc90bedc88', 'paciente-individual', 'Paciente — Individual', '0', '0', '1.08', '3.09', '12.99', 'Portal individual con acceso al Historial Médico Completo (HCE) y agenda de citas online, garantizando disponibilidad y privacidad estricta. Respaldo mensual de data en la nube.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('b612e452-8384-42a3-96d5-5a2421f93cb0', 'clinic-pro', 'Pro (31–80 esp.)', '31', '80', '42', '113.4', '352.8', 'Plan para clínicas medianas con emergencias.
▸ Mensual (€42/mes extra por especialista): Gestión Multi-Sede centralizada, Panel Roles (Administrador, Médicos, Recepcionista, Facturación), Sugerencia Inteligente de Sede, Analytics Empresarial.
▸ Trimestral (€113.4 - Ahorro 10%): Todo lo del plan mensual + Soporte Prioritario VIP y Migración de Datos Gratis.
▸ Anual (€352.8 - Ahorro 30%): Todo lo anterior + Configuración Asistida (Zoom), Capacitación a Personal y Auditoría Anual de Datos.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00'), 

('d0479d0f-6dff-402a-8c2b-a999a2888b7d', 'enfermero-independiente', 'Plan Enfermería Independiente', '0', '1', '65', '175.5', '546', 'Sistema clínico para profesionales de enfermería en el ejercicio independiente.
▸ Mensual (€65/mes): Notas de Enfermería Digitales estructuradas, Control de Signos Vitales detallado en gráficas, MAR (Control de medicamentos), Gestión de Turnos/Tareas médicas, y Comunicación Directa (Chat) con médico tratante.
▸ Trimestral (€175.5 - Ahorro 10%): Todo lo del plan mensual + Migración de Datos Gratis y Soporte VIP.
▸ Anual (€546 - Ahorro 30%, te ahorras €234 al año): Todo lo del plan Trimestral + Configuración Asistida (Zoom), Capacitación y Prioridad en Funciones.', '2026-02-26 02:54:51.097803+00', '2026-02-26 02:54:51.097803+00'),

('f9a7b9c1-1e2a-43d2-8a90-123456789abc', 'paciente-gratis', 'Plan Gratuito', '0', '0', '0', '0', '0', 'Plan individual para llevar el control de tu salud. Acceso gratuito a tu historial médico, citas, recetas y resultados de laboratorio desde cualquier dispositivo.', '2025-11-07 15:20:17.724421+00', '2025-11-07 15:20:17.724421+00')

ON CONFLICT ("id") DO UPDATE SET 
    "slug" = EXCLUDED."slug",
    "name" = EXCLUDED."name",
    "minSpecialists" = EXCLUDED."minSpecialists",
    "maxSpecialists" = EXCLUDED."maxSpecialists",
    "monthlyPrice" = EXCLUDED."monthlyPrice",
    "quarterlyPrice" = EXCLUDED."quarterlyPrice",
    "annualPrice" = EXCLUDED."annualPrice",
    "description" = EXCLUDED."description",
    "updatedAt" = EXCLUDED."updatedAt";

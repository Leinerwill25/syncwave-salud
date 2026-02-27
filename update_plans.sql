-- Actualización de descripciones de planes con funcionalidades detalladas y roles
-- Se incluyen los precios corregidos con el descuento de 10% (trimestral) y 30% (anual) incorporado por defecto en la BD.

-- Consultorio Privado (Especialista + Equipo)
UPDATE "public"."plan" 
SET description = 'Plan optimizado para médicos que gestionan su propia marca. Incluye HCE 24/7, Agenda Inteligente con recordatorios por WhatsApp, Receta Electrónica y Facturación Básica. Roles incluidos: Médico Especialista y hasta 2 usuarios de staff (Asistente de Citas/Recepción para agendamiento, cobros y triaje básico; Recepción para control de flujo).',
    "monthlyPrice" = '70', "quarterlyPrice" = '189', "annualPrice" = '588'
WHERE slug = 'medico';

-- Plan Clínica (Starter)
UPDATE "public"."plan" 
SET description = 'Para consultorios grupales y centros pequeños. Diseñado para centros multi-especialistas. Incluye Gestión Multi-Sede, Panel de Roles Avanzado, Analytics Empresarial en tiempo real y Sugerencia Inteligente de Sede. Roles incluidos: Administrador (visión global y financiera), Médicos Referidos, Recepcionista (tráfico y derivación multi-sede), y Asistente/Facturación (conciliación de pagos).',
    "monthlyPrice" = '56', "quarterlyPrice" = '151.2', "annualPrice" = '470.4'
WHERE slug = 'clinic-starter';

-- Plan Clínica (Medium)
UPDATE "public"."plan" 
SET description = 'Para centros ambulatorios y de diagnóstico. Diseñado para centros multi-especialistas. Incluye Gestión Multi-Sede, Panel de Roles Avanzado, Analytics Empresarial en tiempo real y Sugerencia Inteligente de Sede. Roles incluidos: Administrador (visión global y financiera), Médicos Referidos, Recepcionista (tráfico y derivación multi-sede), y Asistente/Facturación (conciliación de pagos).',
    "monthlyPrice" = '49', "quarterlyPrice" = '132.3', "annualPrice" = '411.6'
WHERE slug = 'clinic-medium';

-- Plan Clínica (Pro)
UPDATE "public"."plan" 
SET description = 'Para clínicas medianas con emergencias. Diseñado para centros multi-especialistas. Incluye Gestión Multi-Sede, Panel de Roles Avanzado, Analytics Empresarial en tiempo real y Sugerencia Inteligente de Sede. Roles incluidos: Administrador (visión global y financiera), Médicos Referidos, Recepcionista (tráfico y derivación multi-sede), y Asistente/Facturación (conciliación de pagos).',
    "monthlyPrice" = '42', "quarterlyPrice" = '113.4', "annualPrice" = '352.8'
WHERE slug = 'clinic-pro';

-- Plan Clínica (Enterprise)
UPDATE "public"."plan" 
SET description = 'Para grandes clínicas privadas. Diseñado para centros multi-especialistas. Incluye Gestión Multi-Sede, Panel de Roles Avanzado, Analytics Empresarial en tiempo real y Sugerencia Inteligente de Sede. Roles incluidos: Administrador (visión global y financiera), Médicos Referidos, Recepcionista (tráfico y derivación multi-sede), y Asistente/Facturación (conciliación de pagos).',
    "monthlyPrice" = '35', "quarterlyPrice" = '94.5', "annualPrice" = '294'
WHERE slug = 'clinic-enterprise';

-- Plan Clínica Custom
UPDATE "public"."plan" 
SET description = 'Plan a medida para instituciones y policlínicas. Incluye todas las funcionalidades del Plan Clínica, soporte técnico dedicado, y configuración personalizada del Panel de Roles Avanzado (Administrador, Recepcionista, Asistente, Facturación) para alto volumen de pacientes.',
    "monthlyPrice" = '0', "quarterlyPrice" = '0', "annualPrice" = '0'
WHERE slug = 'clinic-custom';

-- Plan Enfermería
UPDATE "public"."plan" 
SET description = 'Plan exclusivo para profesionales de enfermería en el ejercicio independiente. Eficiencia en cuidado directo y hospitalización/domicilio. Incluye Notas de Enfermería Digitales estructuradas, Control de Signos Vitales detallado, Gestión de Turnos/Tareas médicas, y Comunicación Directa (Chat en tiempo real) con el médico tratante.',
    "monthlyPrice" = '65', "quarterlyPrice" = '175.5', "annualPrice" = '546'
WHERE slug = 'enfermero-independiente';

-- Paciente Individual
UPDATE "public"."plan" 
SET description = 'Plan paciente individual — precio expresado como ANUAL (pago único)',
    "monthlyPrice" = '1.08', "quarterlyPrice" = '3.09', "annualPrice" = '12.99'
WHERE slug = 'paciente-individual';

-- Paciente Familiar
UPDATE "public"."plan" 
SET description = 'Plan familiar — hasta 5 personas. Precio expresado como ANUAL (pago único).',
    "monthlyPrice" = '2.5', "quarterlyPrice" = '7.12', "annualPrice" = '29.99'
WHERE slug = 'paciente-family';

-- Paciente Gratis
UPDATE "public"."plan" 
SET description = 'Plan individual para llevar el control de tu salud. Acceso gratuito a tu historial médico, citas, recetas y resultados de laboratorio desde cualquier dispositivo.',
    "monthlyPrice" = '0', "quarterlyPrice" = '0', "annualPrice" = '0'
WHERE slug = 'paciente-gratis';

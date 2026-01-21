-- ============================================================================
-- Script para corregir citas con unregistered_patient_id que fueron creadas
-- por un doctor o asistente (NO desde la página pública)
-- ============================================================================
-- 
-- Este script te ayuda a identificar y corregir citas que tienen 
-- unregistered_patient_id pero que fueron creadas por un doctor o asistente,
-- no desde la página pública.
--
-- IMPORTANTE: Revisa manualmente cada cita antes de actualizarla.
-- Solo actualiza las citas que SABES que fueron creadas por un doctor o asistente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 1: Ver todas las citas con unregistered_patient_id sin origen asignado
-- ----------------------------------------------------------------------------

SELECT 
    'Citas con unregistered_patient_id sin origen asignado' as descripcion,
    id,
    patient_id,
    doctor_id,
    unregistered_patient_id,
    created_by_role_user_id,
    created_by_doctor_id,
    booked_by_patient_id,
    scheduled_at,
    created_at,
    status,
    reason
FROM public.appointment
WHERE 
    unregistered_patient_id IS NOT NULL
    AND patient_id IS NULL
    AND created_by_role_user_id IS NULL 
    AND created_by_doctor_id IS NULL 
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- PASO 2: Si una cita fue creada por un doctor, ejecuta esto:
-- ----------------------------------------------------------------------------
-- NOTA: Reemplaza 'APPOINTMENT_ID_AQUI' con el ID real de la cita
--       Reemplaza 'DOCTOR_ID_AQUI' con el ID del doctor que la creó

-- UPDATE public.appointment
-- SET 
--     created_by_doctor_id = 'DOCTOR_ID_AQUI',
--     updated_at = NOW()
-- WHERE id = 'APPOINTMENT_ID_AQUI';

-- ----------------------------------------------------------------------------
-- PASO 3: Si una cita fue creada por un asistente, ejecuta esto:
-- ----------------------------------------------------------------------------
-- NOTA: Reemplaza 'APPOINTMENT_ID_AQUI' con el ID real de la cita
--       Reemplaza 'ROLE_USER_ID_AQUI' con el ID del asistente que la creó

-- UPDATE public.appointment
-- SET 
--     created_by_role_user_id = 'ROLE_USER_ID_AQUI',
--     updated_at = NOW()
-- WHERE id = 'APPOINTMENT_ID_AQUI';

-- ----------------------------------------------------------------------------
-- PASO 4: Verificar el resultado después de las actualizaciones
-- ----------------------------------------------------------------------------

SELECT 
    'Resumen después de correcciones' as reporte,
    COUNT(*) FILTER (WHERE created_by_role_user_id IS NOT NULL) as "Asistente Manual",
    COUNT(*) FILTER (WHERE created_by_doctor_id IS NOT NULL) as "Dashboard Doctor",
    COUNT(*) FILTER (WHERE booked_by_patient_id IS NOT NULL AND booked_by_patient_id != '') as "Dashboard Paciente",
    COUNT(*) FILTER (
        WHERE unregistered_patient_id IS NOT NULL 
        AND patient_id IS NULL
        AND created_by_role_user_id IS NULL 
        AND created_by_doctor_id IS NULL 
        AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
    ) as "Página Pública",
    COUNT(*) as "Total"
FROM public.appointment;


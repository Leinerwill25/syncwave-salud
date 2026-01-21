-- ============================================================================
-- Script AGRESIVO para corregir citas con unregistered_patient_id
-- ============================================================================
-- 
-- Este script asume que si una cita tiene:
-- - unregistered_patient_id (paciente no registrado)
-- - doctor_id (tiene doctor asignado)
-- - NO tiene created_by_role_user_id, created_by_doctor_id, ni booked_by_patient_id
-- 
-- Entonces fue creada por el doctor (no desde la página pública).
--
-- IMPORTANTE: Si tienes citas que SÍ fueron creadas desde la página pública,
-- estas NO deben tener doctor_id o deberás actualizarlas manualmente después.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PASO 1: Ver cuántas citas tienen unregistered_patient_id sin origen
-- ----------------------------------------------------------------------------

SELECT 
    'ANTES de corrección' as estado,
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

-- ----------------------------------------------------------------------------
-- PASO 2: Actualizar citas con unregistered_patient_id que tienen doctor_id
-- ----------------------------------------------------------------------------
-- Heurística: Si tiene doctor_id y unregistered_patient_id pero no tiene origen,
-- asumimos que fue creada por el doctor (no desde la página pública)

UPDATE public.appointment
SET 
    created_by_doctor_id = doctor_id,
    updated_at = NOW()
WHERE 
    -- Tiene unregistered_patient_id (paciente no registrado)
    unregistered_patient_id IS NOT NULL
    -- NO tiene patient_id (solo unregistered_patient_id)
    AND patient_id IS NULL
    -- Tiene doctor_id (tiene doctor asignado)
    AND doctor_id IS NOT NULL
    -- NO tiene created_by_role_user_id (no fue creada por asistente)
    AND created_by_role_user_id IS NULL
    -- NO tiene created_by_doctor_id aún (para evitar sobrescribir)
    AND created_by_doctor_id IS NULL
    -- NO tiene booked_by_patient_id (no fue reservada por paciente registrado)
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '');

-- Contar cuántas citas se actualizaron
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Citas actualizadas como "Dashboard Doctor" (con unregistered_patient_id): %', updated_count;
END $$;

-- ----------------------------------------------------------------------------
-- PASO 3: Verificar el resultado después de la corrección
-- ----------------------------------------------------------------------------

SELECT 
    'DESPUÉS de corrección' as estado,
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

-- ----------------------------------------------------------------------------
-- PASO 4: Mostrar las citas que quedan como "Página Pública"
-- ----------------------------------------------------------------------------
-- Estas son las citas que NO tienen doctor_id o que realmente vienen de la página pública

SELECT 
    'Citas que quedan como "Página Pública"' as descripcion,
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

COMMIT;

-- ----------------------------------------------------------------------------
-- NOTA: Si después de ejecutar este script todavía hay más de 1 cita 
-- como "Página Pública", necesitarás revisar manualmente cada una y
-- actualizarlas usando el script fix_unregistered_patient_appointments.sql
-- ----------------------------------------------------------------------------


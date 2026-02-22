-- ============================================================================
-- Script para corregir la cita específica de página pública
-- ============================================================================
-- 
-- Este script:
-- 1. Revierte la cita específica de página pública (quita created_by_doctor_id)
-- 2. Asegura que las demás citas mantengan su created_by_doctor_id
-- 3. Verifica el resultado final
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PASO 1: Ver el estado actual
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
-- PASO 2: Revertir la cita específica de página pública
-- ----------------------------------------------------------------------------
-- Esta es la cita que realmente viene de la página pública
-- Le quitamos el created_by_doctor_id para que sea identificada como "Página Pública"

WITH target_apt AS (
    SELECT 'ec38b55d-56b2-4ed3-b399-8c0bdab9a8bd'::uuid as id
)
UPDATE public.appointment
SET 
    created_by_doctor_id = NULL,
    updated_at = NOW()
FROM target_apt
WHERE public.appointment.id = target_apt.id;

-- Verificar que se actualizó
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE 'Cita de página pública revertida correctamente';
    ELSE
        RAISE WARNING 'No se encontró la cita con ID ec38b55d-56b2-4ed3-b399-8c0bdab9a8bd';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PASO 3: Asegurar que las demás citas con unregistered_patient_id 
--         que tienen doctor_id mantengan su created_by_doctor_id
-- ----------------------------------------------------------------------------
-- Esto asegura que las citas creadas por el doctor no se pierdan

UPDATE public.appointment
SET 
    created_by_doctor_id = doctor_id,
    updated_at = NOW()
WHERE 
    unregistered_patient_id IS NOT NULL
    AND patient_id IS NULL
    AND doctor_id IS NOT NULL
    AND created_by_doctor_id IS NULL
    AND created_by_role_user_id IS NULL
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
    AND id != 'ec38b55d-56b2-4ed3-b399-8c0bdab9a8bd'; -- Excluir la cita de página pública

-- Contar cuántas citas se actualizaron
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Citas del doctor actualizadas: %', updated_count;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- PASO 4: Verificar el resultado final
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
-- PASO 5: Verificar la cita específica de página pública
-- ----------------------------------------------------------------------------

SELECT 
    'Cita de página pública (debe tener created_by_doctor_id = NULL)' as descripcion,
    id,
    patient_id,
    doctor_id,
    unregistered_patient_id,
    created_by_role_user_id,
    created_by_doctor_id,
    booked_by_patient_id,
    scheduled_at,
    created_at
FROM public.appointment
WHERE id = 'ec38b55d-56b2-4ed3-b399-8c0bdab9a8bd';

-- ----------------------------------------------------------------------------
-- PASO 6: Ver todas las citas de página pública (debería ser solo 1)
-- ----------------------------------------------------------------------------

SELECT 
    'Todas las citas de página pública (debería ser solo 1)' as descripcion,
    id,
    patient_id,
    doctor_id,
    unregistered_patient_id,
    created_by_role_user_id,
    created_by_doctor_id,
    booked_by_patient_id,
    scheduled_at,
    created_at
FROM public.appointment
WHERE 
    unregistered_patient_id IS NOT NULL
    AND patient_id IS NULL
    AND created_by_role_user_id IS NULL 
    AND created_by_doctor_id IS NULL 
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
ORDER BY created_at DESC;


-- ============================================================================
-- Script para revertir y corregir citas de página pública
-- ============================================================================
-- 
-- Este script te ayuda a:
-- 1. Ver todas las citas que fueron actualizadas como "Dashboard Doctor"
--    pero que realmente vienen de la página pública
-- 2. Revertir las que NO fueron creadas por el doctor
-- 3. Dejar solo 1 cita como "Página Pública" (la real)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 1: Ver todas las citas que fueron actualizadas como "Dashboard Doctor"
--         pero que tienen unregistered_patient_id
-- ----------------------------------------------------------------------------

SELECT 
    'Citas actualizadas como "Dashboard Doctor" (revisar si son de página pública)' as descripcion,
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
    reason,
    organization_id
FROM public.appointment
WHERE 
    unregistered_patient_id IS NOT NULL
    AND patient_id IS NULL
    AND created_by_doctor_id IS NOT NULL
    AND created_by_role_user_id IS NULL
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- PASO 2: REVERTIR todas las citas que fueron actualizadas incorrectamente
-- ----------------------------------------------------------------------------
-- Este UPDATE quita el created_by_doctor_id de todas las citas con 
-- unregistered_patient_id, dejándolas como "Página Pública" nuevamente
--
-- IMPORTANTE: Después de ejecutar esto, tendrás que actualizar manualmente
-- las que SÍ fueron creadas por el doctor, asignándoles created_by_doctor_id

BEGIN;

-- Revertir todas las citas con unregistered_patient_id que tienen created_by_doctor_id
UPDATE public.appointment
SET 
    created_by_doctor_id = NULL,
    updated_at = NOW()
WHERE 
    unregistered_patient_id IS NOT NULL
    AND patient_id IS NULL
    AND created_by_doctor_id IS NOT NULL
    AND created_by_role_user_id IS NULL
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '');

-- Contar cuántas citas se revirtieron
DO $$
DECLARE
    reverted_count INTEGER;
BEGIN
    GET DIAGNOSTICS reverted_count = ROW_COUNT;
    RAISE NOTICE 'Citas revertidas (ahora son "Página Pública"): %', reverted_count;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- PASO 3: Verificar el resultado después de revertir
-- ----------------------------------------------------------------------------

SELECT 
    'DESPUÉS de revertir' as estado,
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
-- PASO 4: Ver todas las citas que ahora son "Página Pública"
-- ----------------------------------------------------------------------------
-- Revisa esta lista y identifica cuál es la cita REAL de página pública
-- Las demás deberán ser actualizadas como "Dashboard Doctor" si fueron creadas por el doctor

SELECT 
    'Citas que ahora son "Página Pública" (revisar y corregir manualmente)' as descripcion,
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
    reason,
    organization_id
FROM public.appointment
WHERE 
    unregistered_patient_id IS NOT NULL
    AND patient_id IS NULL
    AND created_by_role_user_id IS NULL 
    AND created_by_doctor_id IS NULL 
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- PASO 5: Instrucciones para corregir manualmente
-- ----------------------------------------------------------------------------
-- 
-- Después de revisar la lista del PASO 4:
-- 
-- 1. Identifica la cita REAL de página pública (debería ser solo 1)
-- 2. Para las demás citas que fueron creadas por el doctor, ejecuta:
-- 
--    UPDATE public.appointment
--    SET 
--        created_by_doctor_id = doctor_id,  -- Usa el doctor_id de la cita
--        updated_at = NOW()
--    WHERE id = 'ID_DE_LA_CITA_AQUI';
-- 
-- 3. Verifica el resultado final ejecutando el query del PASO 3 nuevamente
-- 
-- ----------------------------------------------------------------------------


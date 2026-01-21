-- ============================================================================
-- Migración: Agregar campos de origen a la tabla appointment
-- ============================================================================
-- Este script agrega el campo created_by_doctor_id para rastrear citas 
-- creadas directamente por el doctor desde su dashboard, y luego actualiza
-- las citas existentes para asignarles un origen basado en los campos disponibles.
--
-- IMPORTANTE: Ejecutar este script en orden:
-- 1. Primero agregar el campo (si no existe)
-- 2. Luego actualizar las citas existentes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 1: Agregar el campo created_by_doctor_id si no existe
-- ----------------------------------------------------------------------------

DO $$ 
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment' 
        AND column_name = 'created_by_doctor_id'
    ) THEN
        -- Agregar la columna
        ALTER TABLE public.appointment 
        ADD COLUMN created_by_doctor_id uuid;
        
        -- Agregar foreign key constraint
        ALTER TABLE public.appointment
        ADD CONSTRAINT fk_appointment_created_by_doctor 
        FOREIGN KEY (created_by_doctor_id) 
        REFERENCES public."user"(id);
        
        RAISE NOTICE 'Campo created_by_doctor_id agregado exitosamente';
    ELSE
        RAISE NOTICE 'Campo created_by_doctor_id ya existe, omitiendo creación';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PASO 2: Actualizar citas existentes para asignarles un origen
-- ----------------------------------------------------------------------------

-- Lógica de actualización:
-- 1. Si ya tiene created_by_role_user_id → NO tocar (ya está como "Asistente Manual")
-- 2. Si ya tiene booked_by_patient_id → NO tocar (ya está como "Dashboard Paciente")
-- 3. Si tiene unregistered_patient_id y NO tiene otros indicadores → NO tocar (ya está como "Página Pública")
-- 4. Si tiene patient_id y doctor_id pero NO tiene otros indicadores → Asignar created_by_doctor_id = doctor_id (probablemente "Dashboard Doctor")

BEGIN;

-- Actualizar citas que probablemente fueron creadas por el doctor
-- Criterio: Tiene patient_id y doctor_id, pero NO tiene created_by_role_user_id, 
--           booked_by_patient_id, ni created_by_doctor_id
UPDATE public.appointment
SET 
    created_by_doctor_id = doctor_id,
    updated_at = NOW()
WHERE 
    -- Tiene patient_id (paciente registrado)
    patient_id IS NOT NULL
    -- Tiene doctor_id
    AND doctor_id IS NOT NULL
    -- NO tiene created_by_role_user_id (no fue creada por asistente)
    AND created_by_role_user_id IS NULL
    -- NO tiene booked_by_patient_id (no fue creada por paciente)
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
    -- NO tiene created_by_doctor_id aún (para evitar sobrescribir si ya existe)
    AND created_by_doctor_id IS NULL
    -- NO tiene unregistered_patient_id (es paciente registrado)
    AND unregistered_patient_id IS NULL;

-- Contar cuántas citas se actualizaron
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Citas actualizadas como "Dashboard Doctor": %', updated_count;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- PASO 3: Verificación y reporte
-- ----------------------------------------------------------------------------

-- Generar reporte de distribución de orígenes
SELECT 
    'Resumen de orígenes de citas' as reporte,
    COUNT(*) FILTER (WHERE created_by_role_user_id IS NOT NULL) as "Asistente Manual",
    COUNT(*) FILTER (WHERE created_by_doctor_id IS NOT NULL) as "Dashboard Doctor",
    COUNT(*) FILTER (WHERE booked_by_patient_id IS NOT NULL AND booked_by_patient_id != '') as "Dashboard Paciente",
    COUNT(*) FILTER (
        WHERE unregistered_patient_id IS NOT NULL 
        AND created_by_role_user_id IS NULL 
        AND created_by_doctor_id IS NULL 
        AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
    ) as "Página Pública",
    COUNT(*) FILTER (
        WHERE created_by_role_user_id IS NULL 
        AND created_by_doctor_id IS NULL 
        AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
        AND unregistered_patient_id IS NULL
        AND patient_id IS NOT NULL
        AND doctor_id IS NOT NULL
    ) as "Sin origen asignado",
    COUNT(*) as "Total"
FROM public.appointment;

-- Mostrar algunas citas sin origen asignado para revisión manual (si las hay)
SELECT 
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
    created_by_role_user_id IS NULL 
    AND created_by_doctor_id IS NULL 
    AND (booked_by_patient_id IS NULL OR booked_by_patient_id = '')
    AND unregistered_patient_id IS NULL
    AND patient_id IS NOT NULL
    AND doctor_id IS NOT NULL
LIMIT 10;


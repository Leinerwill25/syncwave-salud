-- Migración para sincronizar automáticamente patient_id y unregistered_patient_id
-- desde appointment a consultation cuando se crea o actualiza una consulta

-- 1. Función para sincronizar los IDs de paciente desde appointment
CREATE OR REPLACE FUNCTION sync_consultation_patient_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
    appointment_patient_id uuid;
    appointment_unregistered_patient_id uuid;
    appointment_doctor_id uuid;
    appointment_organization_id uuid;
BEGIN
    -- Si la consulta tiene appointment_id, obtener los datos del appointment
    IF NEW.appointment_id IS NOT NULL THEN
        -- Obtener patient_id y unregistered_patient_id desde el appointment
        SELECT 
            a.patient_id,
            a.unregistered_patient_id,
            a.doctor_id,
            a.organization_id
        INTO 
            appointment_patient_id,
            appointment_unregistered_patient_id,
            appointment_doctor_id,
            appointment_organization_id
        FROM public.appointment a
        WHERE a.id = NEW.appointment_id;
        
        -- Sincronizar patient_id y unregistered_patient_id si no están ya establecidos
        IF NEW.patient_id IS NULL AND appointment_patient_id IS NOT NULL THEN
            NEW.patient_id := appointment_patient_id;
        END IF;
        
        IF NEW.unregistered_patient_id IS NULL AND appointment_unregistered_patient_id IS NOT NULL THEN
            NEW.unregistered_patient_id := appointment_unregistered_patient_id;
        END IF;
        
        -- Solo actualizar doctor_id y organization_id si no están ya establecidos
        IF NEW.doctor_id IS NULL AND appointment_doctor_id IS NOT NULL THEN
            NEW.doctor_id := appointment_doctor_id;
        END IF;
        
        IF NEW.organization_id IS NULL AND appointment_organization_id IS NOT NULL THEN
            NEW.organization_id := appointment_organization_id;
        END IF;
        
        -- Validar que al menos uno de los IDs de paciente esté presente
        IF NEW.patient_id IS NULL AND NEW.unregistered_patient_id IS NULL THEN
            RAISE EXCEPTION 'El appointment % no tiene patient_id ni unregistered_patient_id', NEW.appointment_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger BEFORE INSERT para copiar datos al crear una consulta
DROP TRIGGER IF EXISTS trigger_sync_consultation_patient_on_insert ON public.consultation;
CREATE TRIGGER trigger_sync_consultation_patient_on_insert
    BEFORE INSERT ON public.consultation
    FOR EACH ROW
    EXECUTE FUNCTION sync_consultation_patient_from_appointment();

-- 3. Trigger BEFORE UPDATE para actualizar si cambia el appointment_id
DROP TRIGGER IF EXISTS trigger_sync_consultation_patient_on_update ON public.consultation;
CREATE TRIGGER trigger_sync_consultation_patient_on_update
    BEFORE UPDATE ON public.consultation
    FOR EACH ROW
    WHEN (OLD.appointment_id IS DISTINCT FROM NEW.appointment_id OR 
          (NEW.appointment_id IS NOT NULL AND (NEW.patient_id IS NULL OR NEW.unregistered_patient_id IS NULL)))
    EXECUTE FUNCTION sync_consultation_patient_from_appointment();

-- 4. Actualizar consultas existentes que tienen appointment_id pero no tienen los IDs correctos
UPDATE public.consultation c
SET 
    patient_id = COALESCE(c.patient_id, a.patient_id),
    unregistered_patient_id = COALESCE(c.unregistered_patient_id, a.unregistered_patient_id),
    doctor_id = COALESCE(c.doctor_id, a.doctor_id),
    organization_id = COALESCE(c.organization_id, a.organization_id)
FROM public.appointment a
WHERE c.appointment_id = a.id
  AND (
    -- Caso 1: La consulta no tiene patient_id pero el appointment sí
    (c.patient_id IS NULL AND a.patient_id IS NOT NULL)
    OR
    -- Caso 2: La consulta no tiene unregistered_patient_id pero el appointment sí
    (c.unregistered_patient_id IS NULL AND a.unregistered_patient_id IS NOT NULL)
    OR
    -- Caso 3: La consulta tiene appointment_id pero ninguno de los IDs de paciente
    (c.patient_id IS NULL AND c.unregistered_patient_id IS NULL)
  );

-- 5. Verificar resultados
SELECT 
    c.id as consultation_id,
    c.appointment_id,
    c.patient_id as consultation_patient_id,
    c.unregistered_patient_id as consultation_unregistered_id,
    a.patient_id as appointment_patient_id,
    a.unregistered_patient_id as appointment_unregistered_id,
    CASE 
        WHEN c.patient_id = a.patient_id OR (c.patient_id IS NULL AND a.patient_id IS NULL) THEN 'OK'
        ELSE 'DIFERENTE'
    END as patient_id_status,
    CASE 
        WHEN c.unregistered_patient_id = a.unregistered_patient_id OR (c.unregistered_patient_id IS NULL AND a.unregistered_patient_id IS NULL) THEN 'OK'
        ELSE 'DIFERENTE'
    END as unregistered_id_status
FROM public.consultation c
LEFT JOIN public.appointment a ON c.appointment_id = a.id
WHERE c.appointment_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20;


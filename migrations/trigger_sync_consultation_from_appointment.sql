-- Trigger simplificado para sincronizar automáticamente patient_id y unregistered_patient_id
-- desde appointment a consultation cuando se crea o actualiza una consulta

-- Esta es una versión simplificada del trigger que solo copia los IDs de paciente
-- El trigger más completo está en sync_consultation_patient_from_appointment.sql

-- 1. Función para sincronizar los IDs de paciente desde appointment
CREATE OR REPLACE FUNCTION sync_consultation_patient_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
    appointment_patient_id uuid;
    appointment_unregistered_patient_id uuid;
BEGIN
    -- Si la consulta tiene appointment_id, obtener los datos del appointment
    IF NEW.appointment_id IS NOT NULL THEN
        -- Obtener patient_id y unregistered_patient_id desde el appointment
        SELECT 
            a.patient_id,
            a.unregistered_patient_id
        INTO 
            appointment_patient_id,
            appointment_unregistered_patient_id
        FROM public.appointment a
        WHERE a.id = NEW.appointment_id;
        
        -- Solo actualizar si los valores no están ya establecidos
        IF NEW.patient_id IS NULL AND appointment_patient_id IS NOT NULL THEN
            NEW.patient_id := appointment_patient_id;
        END IF;
        
        IF NEW.unregistered_patient_id IS NULL AND appointment_unregistered_patient_id IS NOT NULL THEN
            NEW.unregistered_patient_id := appointment_unregistered_patient_id;
        END IF;
        
        -- Validar que al menos uno de los IDs de paciente esté presente después de sincronizar
        IF NEW.patient_id IS NULL AND NEW.unregistered_patient_id IS NULL THEN
            RAISE EXCEPTION 'El appointment % no tiene patient_id ni unregistered_patient_id después de sincronizar', NEW.appointment_id;
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
    WHEN (NEW.appointment_id IS NOT NULL)
    EXECUTE FUNCTION sync_consultation_patient_from_appointment();

-- 3. Trigger BEFORE UPDATE para actualizar si cambia el appointment_id o faltan los IDs
DROP TRIGGER IF EXISTS trigger_sync_consultation_patient_on_update ON public.consultation;
CREATE TRIGGER trigger_sync_consultation_patient_on_update
    BEFORE UPDATE ON public.consultation
    FOR EACH ROW
    WHEN (
        OLD.appointment_id IS DISTINCT FROM NEW.appointment_id 
        OR 
        (NEW.appointment_id IS NOT NULL AND NEW.patient_id IS NULL AND NEW.unregistered_patient_id IS NULL)
    )
    EXECUTE FUNCTION sync_consultation_patient_from_appointment();

-- Verificar que los triggers fueron creados
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'consultation'
  AND trigger_name LIKE '%sync_consultation%'
ORDER BY trigger_name;


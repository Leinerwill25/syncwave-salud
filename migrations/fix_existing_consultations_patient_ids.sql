-- Migración para corregir consultas existentes que tienen appointment_id
-- pero no tienen patient_id o unregistered_patient_id sincronizados

-- Actualizar consultas existentes que tienen appointment_id pero no tienen los IDs correctos
UPDATE public.consultation c
SET 
    patient_id = COALESCE(c.patient_id, a.patient_id),
    unregistered_patient_id = COALESCE(c.unregistered_patient_id, a.unregistered_patient_id)
FROM public.appointment a
WHERE c.appointment_id = a.id
  AND (
    -- Caso 1: La consulta no tiene patient_id pero el appointment sí
    (c.patient_id IS NULL AND a.patient_id IS NOT NULL)
    OR
    -- Caso 2: La consulta no tiene unregistered_patient_id pero el appointment sí
    (c.unregistered_patient_id IS NULL AND a.unregistered_patient_id IS NOT NULL)
    OR
    -- Caso 3: La consulta tiene appointment_id pero ninguno de los IDs de paciente coincide
    (c.appointment_id IS NOT NULL AND 
     ((c.patient_id IS DISTINCT FROM a.patient_id) OR (c.unregistered_patient_id IS DISTINCT FROM a.unregistered_patient_id)))
  );

-- Mostrar un resumen de las consultas corregidas
SELECT 
    COUNT(*) as total_consultations,
    COUNT(DISTINCT c.appointment_id) as consultations_with_appointment,
    COUNT(CASE WHEN c.patient_id IS NOT NULL THEN 1 END) as with_patient_id,
    COUNT(CASE WHEN c.unregistered_patient_id IS NOT NULL THEN 1 END) as with_unregistered_patient_id,
    COUNT(CASE WHEN c.patient_id IS NULL AND c.unregistered_patient_id IS NULL THEN 1 END) as without_patient_info
FROM public.consultation c;

-- Verificar algunas consultas específicas para confirmar que están correctas
SELECT 
    c.id as consultation_id,
    c.appointment_id,
    c.patient_id as consultation_patient_id,
    c.unregistered_patient_id as consultation_unregistered_id,
    a.patient_id as appointment_patient_id,
    a.unregistered_patient_id as appointment_unregistered_id,
    CASE 
        WHEN c.patient_id = a.patient_id OR (c.patient_id IS NULL AND a.patient_id IS NULL) THEN 'OK'
        WHEN c.patient_id IS NULL AND a.patient_id IS NOT NULL THEN 'FALTA patient_id'
        WHEN c.patient_id IS NOT NULL AND a.patient_id IS NULL THEN 'EXTRA patient_id'
        ELSE 'DIFERENTE'
    END as patient_id_status,
    CASE 
        WHEN c.unregistered_patient_id = a.unregistered_patient_id OR (c.unregistered_patient_id IS NULL AND a.unregistered_patient_id IS NULL) THEN 'OK'
        WHEN c.unregistered_patient_id IS NULL AND a.unregistered_patient_id IS NOT NULL THEN 'FALTA unregistered_patient_id'
        WHEN c.unregistered_patient_id IS NOT NULL AND a.unregistered_patient_id IS NULL THEN 'EXTRA unregistered_patient_id'
        ELSE 'DIFERENTE'
    END as unregistered_id_status,
    c.created_at
FROM public.consultation c
LEFT JOIN public.appointment a ON c.appointment_id = a.id
WHERE c.appointment_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20;


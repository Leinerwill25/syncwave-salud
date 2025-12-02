-- Migración para actualizar consultas existentes que tienen appointment_id
-- pero no tienen unregistered_patient_id, copiándolo desde el appointment

-- Actualizar consultas que tienen appointment_id pero no unregistered_patient_id
-- y cuyo appointment tiene unregistered_patient_id
UPDATE public.consultation c
SET unregistered_patient_id = a.unregistered_patient_id
FROM public.appointment a
WHERE c.appointment_id = a.id
  AND c.unregistered_patient_id IS NULL
  AND a.unregistered_patient_id IS NOT NULL;

-- Verificar resultados
SELECT 
    c.id as consultation_id,
    c.appointment_id,
    c.patient_id,
    c.unregistered_patient_id as consultation_unregistered_id,
    a.unregistered_patient_id as appointment_unregistered_id,
    CASE 
        WHEN c.unregistered_patient_id = a.unregistered_patient_id THEN 'OK'
        ELSE 'PENDIENTE'
    END as status
FROM public.consultation c
LEFT JOIN public.appointment a ON c.appointment_id = a.id
WHERE a.unregistered_patient_id IS NOT NULL
ORDER BY c.created_at DESC;


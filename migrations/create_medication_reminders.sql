-- Migración: Crear tabla para registro de tomas de medicamentos
-- Esta tabla permite registrar cuando un paciente toma un medicamento prescrito
-- y enviar notificaciones al doctor

-- Tabla para registrar las tomas de medicamentos
CREATE TABLE IF NOT EXISTS public.medication_dose (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_item_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    prescription_id UUID NOT NULL,
    taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Foreign keys
    CONSTRAINT fk_medication_dose_prescription_item 
        FOREIGN KEY (prescription_item_id) 
        REFERENCES public.prescription_item(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_medication_dose_patient 
        FOREIGN KEY (patient_id) 
        REFERENCES public.Patient(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_medication_dose_doctor 
        FOREIGN KEY (doctor_id) 
        REFERENCES public.User(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_medication_dose_prescription 
        FOREIGN KEY (prescription_id) 
        REFERENCES public.prescription(id) 
        ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_medication_dose_prescription_item 
    ON public.medication_dose(prescription_item_id);
CREATE INDEX IF NOT EXISTS idx_medication_dose_patient 
    ON public.medication_dose(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_dose_doctor 
    ON public.medication_dose(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medication_dose_prescription 
    ON public.medication_dose(prescription_id);
CREATE INDEX IF NOT EXISTS idx_medication_dose_taken_at 
    ON public.medication_dose(taken_at);

-- Comentarios para documentación
COMMENT ON TABLE public.medication_dose IS 'Registro de tomas de medicamentos por parte de los pacientes';
COMMENT ON COLUMN public.medication_dose.prescription_item_id IS 'ID del item de prescripción (medicamento específico)';
COMMENT ON COLUMN public.medication_dose.patient_id IS 'ID del paciente que tomó el medicamento';
COMMENT ON COLUMN public.medication_dose.doctor_id IS 'ID del doctor que prescribió el medicamento';
COMMENT ON COLUMN public.medication_dose.prescription_id IS 'ID de la prescripción completa';
COMMENT ON COLUMN public.medication_dose.taken_at IS 'Fecha y hora en que el paciente indicó que tomó el medicamento';


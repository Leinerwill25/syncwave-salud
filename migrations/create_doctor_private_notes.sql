-- Crear tabla para observaciones privadas del doctor
-- Estas observaciones solo son visibles para el doctor que las creó
-- Están relacionadas con una consulta y un paciente (registrado o no registrado)

CREATE TABLE IF NOT EXISTS doctor_private_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultation(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES "Patient"(id) ON DELETE SET NULL,
    unregistered_patient_id UUID REFERENCES unregisteredpatients(id) ON DELETE SET NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Asegurar que al menos uno de los patient_id esté presente
    CONSTRAINT check_patient_exists CHECK (
        (patient_id IS NOT NULL) OR (unregistered_patient_id IS NOT NULL)
    )
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_doctor_private_notes_consultation_id ON doctor_private_notes(consultation_id);
CREATE INDEX IF NOT EXISTS idx_doctor_private_notes_doctor_id ON doctor_private_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_private_notes_patient_id ON doctor_private_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_private_notes_unregistered_patient_id ON doctor_private_notes(unregistered_patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_private_notes_created_at ON doctor_private_notes(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_doctor_private_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_doctor_private_notes_updated_at
    BEFORE UPDATE ON doctor_private_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_doctor_private_notes_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE doctor_private_notes IS 'Observaciones privadas del doctor sobre una consulta. Solo visibles para el doctor que las creó.';
COMMENT ON COLUMN doctor_private_notes.consultation_id IS 'ID de la consulta relacionada';
COMMENT ON COLUMN doctor_private_notes.doctor_id IS 'ID del doctor que creó la observación';
COMMENT ON COLUMN doctor_private_notes.patient_id IS 'ID del paciente registrado (opcional)';
COMMENT ON COLUMN doctor_private_notes.unregistered_patient_id IS 'ID del paciente no registrado (opcional)';
COMMENT ON COLUMN doctor_private_notes.notes IS 'Contenido de las observaciones privadas';
COMMENT ON COLUMN doctor_private_notes.created_at IS 'Fecha y hora de creación';
COMMENT ON COLUMN doctor_private_notes.updated_at IS 'Fecha y hora de última actualización';

-- RLS (Row Level Security) - Solo el doctor que creó la nota puede verla
ALTER TABLE doctor_private_notes ENABLE ROW LEVEL SECURITY;

-- Política: Solo el doctor que creó la nota puede verla y modificarla
CREATE POLICY doctor_private_notes_select_policy ON doctor_private_notes
    FOR SELECT
    USING (doctor_id::text = current_setting('app.current_user_id', true));

CREATE POLICY doctor_private_notes_insert_policy ON doctor_private_notes
    FOR INSERT
    WITH CHECK (doctor_id::text = current_setting('app.current_user_id', true));

CREATE POLICY doctor_private_notes_update_policy ON doctor_private_notes
    FOR UPDATE
    USING (doctor_id::text = current_setting('app.current_user_id', true))
    WITH CHECK (doctor_id::text = current_setting('app.current_user_id', true));

CREATE POLICY doctor_private_notes_delete_policy ON doctor_private_notes
    FOR DELETE
    USING (doctor_id::text = current_setting('app.current_user_id', true));

-- Nota: Las políticas RLS anteriores asumen que se establece 'app.current_user_id' en el contexto de la sesión
-- Si tu aplicación usa Supabase Auth, puedes ajustar las políticas para usar auth.uid() en su lugar:
-- USING (doctor_id = auth.uid())


-- =========================================================================================
-- SCRIPT DE MIGRACIÓN: NOTAS DEL KARDEX DE ENFERMERÍA
-- Agrega soporte para notas privadas, públicas y evolutivas en el Kardex.
-- =========================================================================================

-- ENUM Type for Note Types
DO $$ BEGIN
  CREATE TYPE nurse_note_type_enum AS ENUM ('private', 'public', 'evolution');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Tabla: Notas del Kardex de Enfermería
CREATE TABLE IF NOT EXISTS public.nurse_kardex_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES public.patients_daily_queue(queue_id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patient(id) ON DELETE CASCADE,
    unregistered_patient_id UUID REFERENCES public.unregisteredpatients(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES public.nurse_profiles(nurse_profile_id) ON DELETE CASCADE,
    note_type nurse_note_type_enum NOT NULL DEFAULT 'public',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT chk_nk_patient_xor CHECK (
        (patient_id IS NOT NULL AND unregistered_patient_id IS NULL)
        OR (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.nurse_kardex_notes IS
  'Notas del Kardex registradas por enfermería (privadas, públicas y evolutivas).';

-- Indices
CREATE INDEX idx_nurse_kardex_queue ON public.nurse_kardex_notes(queue_id);
CREATE INDEX idx_nurse_kardex_patient ON public.nurse_kardex_notes(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX idx_nurse_kardex_unreg_patient ON public.nurse_kardex_notes(unregistered_patient_id) WHERE unregistered_patient_id IS NOT NULL;
CREATE INDEX idx_nurse_kardex_nurse ON public.nurse_kardex_notes(nurse_id);
CREATE INDEX idx_nurse_kardex_type ON public.nurse_kardex_notes(note_type);

-- RLS
ALTER TABLE public.nurse_kardex_notes ENABLE ROW LEVEL SECURITY;

-- Enfermeros pueden ver sus propias notas o todas las notas en su organización (depende de afiliación)
CREATE POLICY "Enfermeros pueden ver notas de sus pacientes"
    ON public.nurse_kardex_notes
    FOR SELECT
    USING (
        nurse_id IN (
            SELECT nurse_profile_id FROM public.nurse_profiles 
            WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.nurse_profiles np
            JOIN public.patients_daily_queue q ON q.organization_id = np.organization_id
            WHERE np.user_id = auth.uid() 
              AND np.nurse_type = 'affiliated'
              AND q.queue_id = nurse_kardex_notes.queue_id
        )
    );

-- Médicos pueden ver todas las notas de los pacientes en la cola asignada o en su org
CREATE POLICY "Médicos pueden ver todas las notas del kardex"
    ON public.nurse_kardex_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            LEFT JOIN public.patients_daily_queue q ON q.assigned_doctor_id = u.id OR q.organization_id = u."organizationId"
            WHERE u."authId" = auth.uid()::text 
              AND u.role IN ('MEDICO', 'ADMIN')
              AND q.queue_id = nurse_kardex_notes.queue_id
        )
    );

-- Inserción (enfermeros)
CREATE POLICY "Enfermeros pueden insertar notas"
    ON public.nurse_kardex_notes
    FOR INSERT
    WITH CHECK (
        nurse_id IN (
            SELECT nurse_profile_id FROM public.nurse_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Actualización (enfermeros creadores)
CREATE POLICY "Enfermeros pueden actualizar sus propias notas"
    ON public.nurse_kardex_notes
    FOR UPDATE
    USING (
        nurse_id IN (
            SELECT nurse_profile_id FROM public.nurse_profiles 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        nurse_id IN (
            SELECT nurse_profile_id FROM public.nurse_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Borrado (enfermeros creadores)
CREATE POLICY "Enfermeros pueden borrar sus propias notas"
    ON public.nurse_kardex_notes
    FOR DELETE
    USING (
        nurse_id IN (
            SELECT nurse_profile_id FROM public.nurse_profiles 
            WHERE user_id = auth.uid()
        )
    );

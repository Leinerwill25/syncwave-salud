-- =========================================================================================
-- SCRIPT DE MIGRACIÓN: MÓDULOS DEL ENFERMERO (REGISTRO DOCTORES, HISTORIAL Y PACIENTES)
-- =========================================================================================

-- 1. Tabla: Doctores Referentes de las Enfermeras
-- Registra los médicos externos que no usan ASHIRA, con los que colabora la enfermera.
CREATE TABLE public.nurse_referred_doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nurse_id UUID REFERENCES public.nurse_profiles(nurse_profile_id) ON DELETE CASCADE NOT NULL,
    doctor_name TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para rendimiento
CREATE INDEX idx_nurse_referred_doctors_nurse_id ON public.nurse_referred_doctors(nurse_id);

-- RLS para nurse_referred_doctors
ALTER TABLE public.nurse_referred_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los enfermeros pueden ver sus propios doctores referentes"
    ON public.nurse_referred_doctors
    FOR SELECT
    USING (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Los enfermeros pueden insertar doctores referentes"
    ON public.nurse_referred_doctors
    FOR INSERT
    WITH CHECK (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Los enfermeros pueden actualizar sus propios doctores"
    ON public.nurse_referred_doctors
    FOR UPDATE
    USING (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ))
    WITH CHECK (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Los enfermeros pueden eliminar sus propios doctores"
    ON public.nurse_referred_doctors
    FOR DELETE
    USING (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

-- 2. Tabla: Historiales / Reportes y Documentos Subidos por Enfermeras
-- Relaciona el archivo o texto transcrito con el paciente (no registrado) registrado por la enfermera
-- Adicionalmente puede vincular al doctor que emitió el informe original.
CREATE TABLE public.nurse_patient_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nurse_id UUID REFERENCES public.nurse_profiles(nurse_profile_id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.unregisteredpatients(id) ON DELETE CASCADE NOT NULL,
    referred_doctor_id UUID REFERENCES public.nurse_referred_doctors(id) ON DELETE SET NULL, -- Puede ser null si el reporte es estrictamente de enfermeria
    record_type TEXT NOT NULL, -- Ej: 'INFORME_DOCTOR_PDF', 'LABORATORIOS', 'REPORTE_ENFERMERIA_TRANSCRITO'
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,         -- Para imágenes, pdfs o docx cargados en el bucket
    transcription TEXT,    -- Para reportes fisicos de enfermeria transcritos a mano
    record_date TIMESTAMPTZ DEFAULT NOW(), -- Fecha documentada
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para rendimiento
CREATE INDEX idx_nurse_record_nurse ON public.nurse_patient_records(nurse_id);
CREATE INDEX idx_nurse_record_patient ON public.nurse_patient_records(patient_id);
CREATE INDEX idx_nurse_record_doctor ON public.nurse_patient_records(referred_doctor_id);

-- RLS para nurse_patient_records
ALTER TABLE public.nurse_patient_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los enfermeros pueden ver historiales médicos de sus pacientes"
    ON public.nurse_patient_records
    FOR SELECT
    USING (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Los enfermeros pueden insertar documentos o transcripciones al historial"
    ON public.nurse_patient_records
    FOR INSERT
    WITH CHECK (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Los enfermeros pueden actualizar transcripciones"
    ON public.nurse_patient_records
    FOR UPDATE
    USING (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ))
    WITH CHECK (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Los enfermeros pueden eliminar registros"
    ON public.nurse_patient_records
    FOR DELETE
    USING (nurse_id IN (
        SELECT nurse_profile_id FROM public.nurse_profiles 
        WHERE user_id = auth.uid()
    ));

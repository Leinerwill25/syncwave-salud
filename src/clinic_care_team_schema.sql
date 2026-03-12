-- SCRIPT DE MIGRACIÓN: COORDINACIÓN DE CUIDADOS Y ESTADO DEL PACIENTE
-- Módulo interactivo de asignación de especialistas y enfermeros

-- 1. Tabla: Equipo de Cuidado del Paciente (Care Team)
-- Vincula pacientes con médicos y enfermeros de forma múltiple.
CREATE TABLE IF NOT EXISTS public.clinic_patient_care_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organization(id),
    
    -- El paciente puede ser registrado o no registrado
    patient_id UUID REFERENCES public.patient(id),
    unregistered_patient_id UUID REFERENCES public.unregisteredpatients(id),
    
    -- El profesional (Médico o Enfermero)
    professional_id UUID NOT NULL REFERENCES public.users(id),
    professional_role TEXT NOT NULL CHECK (professional_role IN ('MEDICO', 'ENFERMERO')),
    
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    
    -- Evitar duplicados (Un profesional no puede ser asignado dos veces al mismo paciente de forma activa)
    CONSTRAINT unique_active_assignment UNIQUE (organization_id, patient_id, professional_id, status) WHERE patient_id IS NOT NULL AND status = 'ACTIVE',
    CONSTRAINT unique_active_assignment_unreg UNIQUE (organization_id, unregistered_patient_id, professional_id, status) WHERE unregistered_patient_id IS NOT NULL AND status = 'ACTIVE',
    
    -- Validar que al menos un ID de paciente esté presente
    CONSTRAINT at_least_one_patient CHECK (patient_id IS NOT NULL OR unregistered_patient_id IS NOT NULL)
);

-- 2. Tabla: Estado de Gestión del Paciente en la Clínica
-- Rastrea el estado administrativo/clínico y la última atención.
CREATE TABLE IF NOT EXISTS public.patient_clinic_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organization(id),
    
    patient_id UUID REFERENCES public.patient(id),
    unregistered_patient_id UUID REFERENCES public.unregisteredpatients(id),
    
    overall_status TEXT DEFAULT 'ACTIVE' CHECK (overall_status IN ('ACTIVE', 'INACTIVE', 'OBSERVATION', 'CRITICAL', 'DISCHARGED')),
    last_attention_at TIMESTAMPTZ,
    last_update_at TIMESTAMPTZ DEFAULT NOW(),
    complexity_level TEXT DEFAULT 'LOW' CHECK (complexity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    notes TEXT,
    
    CONSTRAINT unique_status_patient UNIQUE (organization_id, patient_id) WHERE patient_id IS NOT NULL,
    CONSTRAINT unique_status_unreg UNIQUE (organization_id, unregistered_patient_id) WHERE unregistered_patient_id IS NOT NULL,
    CONSTRAINT at_least_one_patient_status CHECK (patient_id IS NOT NULL OR unregistered_patient_id IS NOT NULL)
);

-- 3. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_care_team_org ON public.clinic_patient_care_team(organization_id);
CREATE INDEX IF NOT EXISTS idx_care_team_patient ON public.clinic_patient_care_team(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_care_team_unreg ON public.clinic_patient_care_team(unregistered_patient_id) WHERE unregistered_patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_care_team_prof ON public.clinic_patient_care_team(professional_id);

CREATE INDEX IF NOT EXISTS idx_patient_status_org ON public.patient_clinic_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_status_date ON public.patient_clinic_status(last_attention_at);

-- 4. RLS (Row Level Security)
ALTER TABLE public.clinic_patient_care_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_clinic_status ENABLE ROW LEVEL SECURITY;

-- Políticas: La clínica y los profesionales asignados pueden ver/editar
CREATE POLICY "Clínica puede gestionar su equipo de cuidado" 
    ON public.clinic_patient_care_team FOR ALL 
    USING (organization_id IN (SELECT id FROM public.organization));

CREATE POLICY "Clínica puede gestionar el estado de sus pacientes" 
    ON public.patient_clinic_status FOR ALL 
    USING (organization_id IN (SELECT id FROM public.organization));

-- 5. Trigger para actualizar last_update_at
CREATE OR REPLACE FUNCTION update_patient_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_patient_status_timestamp
    BEFORE UPDATE ON public.patient_clinic_status
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_status_timestamp();

-- SCRIPT DE MIGRACIÓN: ENLACES COMPARTIDOS DE HISTORIAL CLÍNICO
-- Permite generar tokens temporales para que familiares vean el historial del paciente.

CREATE TABLE IF NOT EXISTS public.shared_history_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patient(id) ON DELETE CASCADE,
    unregistered_patient_id UUID REFERENCES public.unregisteredpatients(id) ON DELETE CASCADE,
    
    token TEXT NOT NULL UNIQUE, -- Token único seguro (ej: nanoid o crypto.randomUUID)
    expires_at TIMESTAMPTZ NOT NULL, -- Fecha y hora de expiración
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Restricción para asegurar que se vincule a un paciente (registrado o no)
    CONSTRAINT chk_shl_patient_xor CHECK (
        (patient_id IS NOT NULL AND unregistered_patient_id IS NULL)
        OR (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
    )
);

-- Índices para búsqueda rápida y limpieza
CREATE INDEX idx_shl_token ON public.shared_history_links(token);
CREATE INDEX idx_shl_expires ON public.shared_history_links(expires_at);
CREATE INDEX idx_shl_patient ON public.shared_history_links(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX idx_shl_unreg_patient ON public.shared_history_links(unregistered_patient_id) WHERE unregistered_patient_id IS NOT NULL;

-- RLS
ALTER TABLE public.shared_history_links ENABLE ROW LEVEL SECURITY;

-- Los miembros de la organización pueden gestionar sus enlaces
CREATE POLICY "Gestión de enlaces por organización"
    ON public.shared_history_links
    FOR ALL
    USING (
        organization_id::text IN (
            SELECT "organizationId"::text 
            FROM public.users 
            WHERE "authId"::text = auth.uid()::text
        )
    );

-- Acceso público de lectura para el token (sin auth para familiares)
-- NOTA: El acceso real se controlará en la API validando 'expires_at'
CREATE POLICY "Lectura pública por token"
    ON public.shared_history_links
    FOR SELECT
    USING (expires_at > NOW());

COMMENT ON TABLE public.shared_history_links IS 'Tokens temporales para compartir el historial clínico del paciente con terceros.';

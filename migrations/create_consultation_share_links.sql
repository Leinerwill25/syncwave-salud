-- Migración: Crear tabla para enlaces compartidos de consultas
-- Esta tabla permite generar enlaces únicos para compartir consultas con especialistas externos

CREATE TABLE IF NOT EXISTS public.consultation_share_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_by UUID, -- ID del paciente que creó el enlace
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Foreign keys
    CONSTRAINT fk_share_link_consultation 
        FOREIGN KEY (consultation_id) 
        REFERENCES public.consultation(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_share_link_patient 
        FOREIGN KEY (patient_id) 
        REFERENCES public.Patient(id) 
        ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_share_link_token ON public.consultation_share_link(token);
CREATE INDEX IF NOT EXISTS idx_share_link_consultation ON public.consultation_share_link(consultation_id);
CREATE INDEX IF NOT EXISTS idx_share_link_patient ON public.consultation_share_link(patient_id);
CREATE INDEX IF NOT EXISTS idx_share_link_active ON public.consultation_share_link(is_active, expires_at);

-- Comentarios para documentación
COMMENT ON TABLE public.consultation_share_link IS 'Enlaces compartidos para consultas médicas con especialistas externos';
COMMENT ON COLUMN public.consultation_share_link.token IS 'Token único para acceder al enlace compartido';
COMMENT ON COLUMN public.consultation_share_link.expires_at IS 'Fecha de expiración del enlace (NULL = sin expiración)';
COMMENT ON COLUMN public.consultation_share_link.is_active IS 'Indica si el enlace está activo';
COMMENT ON COLUMN public.consultation_share_link.access_count IS 'Número de veces que se ha accedido al enlace';
COMMENT ON COLUMN public.consultation_share_link.last_accessed_at IS 'Última vez que se accedió al enlace';


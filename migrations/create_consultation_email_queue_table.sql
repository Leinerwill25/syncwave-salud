-- ============================================================================
-- Script para crear la tabla de cola de emails de consultas
-- ============================================================================
-- 
-- Esta tabla rastrea qué consultas necesitan enviar emails automáticamente
-- después de 10 minutos de haberse guardado el informe.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consultation_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con la consulta
    consultation_id UUID NOT NULL REFERENCES public.consultation(id) ON DELETE CASCADE,
    
    -- Estado del envío
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    
    -- Intentos de envío
    attempts INTEGER NOT NULL DEFAULT 0,
    
    -- Fecha programada para envío (created_at + 10 minutos)
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Fecha en que se envió exitosamente
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Mensaje de error si falla
    error_message TEXT,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Asegurar que solo hay una entrada por consulta
    CONSTRAINT unique_consultation_email_queue UNIQUE (consultation_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_consultation_email_queue_status ON public.consultation_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_consultation_email_queue_scheduled_at ON public.consultation_email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultation_email_queue_consultation_id ON public.consultation_email_queue(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_email_queue_pending ON public.consultation_email_queue(status, scheduled_at) WHERE status = 'pending';

-- Comentarios para documentación
COMMENT ON TABLE public.consultation_email_queue IS 'Cola de emails automáticos para informes de consultas (envío después de 10 minutos)';
COMMENT ON COLUMN public.consultation_email_queue.scheduled_at IS 'Fecha y hora programada para el envío del email (created_at + 10 minutos)';
COMMENT ON COLUMN public.consultation_email_queue.status IS 'Estado del envío: pending, sent, failed';


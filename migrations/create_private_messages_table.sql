-- Tabla para mensajes privados entre usuarios del sistema
-- Permite comunicación entre role-users y doctores

CREATE TABLE IF NOT EXISTS public.private_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL, -- ID del usuario que envía (de la tabla User o consultorio_role_users)
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'role_user')), -- Tipo de remitente
    receiver_id UUID NOT NULL, -- ID del usuario que recibe
    receiver_type VARCHAR(20) NOT NULL CHECK (receiver_type IN ('user', 'role_user')), -- Tipo de receptor
    organization_id UUID NOT NULL REFERENCES public."Organization"(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_sender_receiver CHECK (sender_id != receiver_id OR sender_type != receiver_type)
);

CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON public.private_messages(receiver_id, receiver_type, is_read);
CREATE INDEX IF NOT EXISTS idx_private_messages_organization ON public.private_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON public.private_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON public.private_messages(
    LEAST(sender_id::text, receiver_id::text), 
    GREATEST(sender_id::text, receiver_id::text),
    sender_type,
    receiver_type
);

COMMENT ON TABLE public.private_messages IS 'Mensajes privados entre usuarios del sistema (doctores y role-users)';
COMMENT ON COLUMN public.private_messages.sender_id IS 'ID del remitente (de User.id o consultorio_role_users.id)';
COMMENT ON COLUMN public.private_messages.receiver_id IS 'ID del receptor (de User.id o consultorio_role_users.id)';
COMMENT ON COLUMN public.private_messages.sender_type IS 'Tipo de remitente: user (doctor/admin) o role_user';
COMMENT ON COLUMN public.private_messages.receiver_type IS 'Tipo de receptor: user (doctor/admin) o role_user';

-- Habilitar Realtime para esta tabla (si no está ya habilitado)
-- Nota: Esto debe ejecutarse manualmente en Supabase Dashboard si ALTER PUBLICATION falla
-- O usar: ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;


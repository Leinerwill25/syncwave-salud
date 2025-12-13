-- Trigger para asegurar que los cambios en private_messages se propaguen correctamente a Realtime
-- Nota: Este trigger es opcional pero puede ayudar a garantizar que los eventos se capturen correctamente

-- Función trigger para notificar cambios
CREATE OR REPLACE FUNCTION public.notify_private_message_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar el cambio a través del canal de Realtime
    -- Supabase Realtime detecta automáticamente los cambios si la tabla está en la publicación
    PERFORM pg_notify(
        'pgrst_notify',
        json_build_object(
            'channel', 'realtime:private_messages',
            'payload', json_build_object(
                'action', TG_OP,
                'table', TG_TABLE_NAME,
                'schema', TG_TABLE_SCHEMA
            )::text
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para INSERT
DROP TRIGGER IF EXISTS private_messages_insert_trigger ON public.private_messages;
CREATE TRIGGER private_messages_insert_trigger
    AFTER INSERT ON public.private_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_private_message_change();

-- Crear trigger para UPDATE (por si acaso)
DROP TRIGGER IF EXISTS private_messages_update_trigger ON public.private_messages;
CREATE TRIGGER private_messages_update_trigger
    AFTER UPDATE ON public.private_messages
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION public.notify_private_message_change();

-- Asegurar que la tabla esté en la publicación de Realtime
-- (Esto puede fallar si ya está agregado, es normal)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'private_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
    END IF;
END $$;

COMMENT ON FUNCTION public.notify_private_message_change() IS 'Función trigger para notificar cambios en la tabla private_messages a Realtime';


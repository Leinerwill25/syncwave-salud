-- Migración para el módulo de Plantillas de Recetas (Recipes)

-- 1. Crear la tabla de plantillas
CREATE TABLE IF NOT EXISTS public.prescription_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID, -- Opcional, si se quiere compartir por organización
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Ruta en el bucket de storage
    file_url TEXT, -- URL pública o firmada (opcional guardar, se puede derivar)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS (Policies)
-- Permitir al médico ver solo sus plantillas
CREATE POLICY "Doctors can view their own templates"
ON public.prescription_templates
FOR SELECT
USING (auth.uid() = doctor_id);

-- Permitir al médico insertar sus plantillas
CREATE POLICY "Doctors can insert their own templates"
ON public.prescription_templates
FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

-- Permitir al médico actualizar sus plantillas
CREATE POLICY "Doctors can update their own templates"
ON public.prescription_templates
FOR UPDATE
USING (auth.uid() = doctor_id);

-- Permitir al médico eliminar sus plantillas
CREATE POLICY "Doctors can delete their own templates"
ON public.prescription_templates
FOR DELETE
USING (auth.uid() = doctor_id);

-- 4. Crear bucket de storage (si no existe)
DO $$
DECLARE
    v_bucket_id TEXT := 'prescription-templates';
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        v_bucket_id,
        v_bucket_id,
        false, -- Privado
        52428800, -- 50MB
        ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    )
    ON CONFLICT (id) DO NOTHING;

    -- 5. Políticas de Storage (Storage Policies)
    EXECUTE format('CREATE POLICY "Doctors can select their own template files" ON storage.objects FOR SELECT USING ( bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1] )', v_bucket_id);

    EXECUTE format('CREATE POLICY "Doctors can upload their own template files" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1] )', v_bucket_id);

    EXECUTE format('CREATE POLICY "Doctors can update their own template files" ON storage.objects FOR UPDATE USING ( bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1] )', v_bucket_id);

    EXECUTE format('CREATE POLICY "Doctors can delete their own template files" ON storage.objects FOR DELETE USING ( bucket_id = %L AND auth.uid()::text = (storage.foldername(name))[1] )', v_bucket_id);
END $$;

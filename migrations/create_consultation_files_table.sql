-- Migración: Crear tabla consultation_files para almacenar archivos adjuntos de consultas
-- Esta tabla permite almacenar múltiples archivos (imágenes, PDFs, documentos) asociados a una consulta

-- Verificar si la tabla ya existe antes de crearla
DO $$
BEGIN
    -- Verificar si la tabla consultation_files ya existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'consultation_files'
    ) THEN
        -- Crear la tabla consultation_files
        CREATE TABLE public.consultation_files (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            consultation_id uuid NOT NULL,
            file_name text NOT NULL,
            path text NOT NULL,
            url text,
            size bigint,
            content_type text,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            CONSTRAINT consultation_files_pkey PRIMARY KEY (id),
            CONSTRAINT consultation_files_fk_consultation FOREIGN KEY (consultation_id) 
                REFERENCES public.consultation(id) ON DELETE CASCADE
        );

        -- Crear índice para mejorar las consultas por consultation_id
        CREATE INDEX idx_consultation_files_consultation_id 
            ON public.consultation_files(consultation_id);

        -- Crear índice para mejorar las consultas por created_at
        CREATE INDEX idx_consultation_files_created_at 
            ON public.consultation_files(created_at DESC);

        -- Agregar comentarios a la tabla y columnas
        COMMENT ON TABLE public.consultation_files IS 
            'Almacena archivos adjuntos (imágenes, PDFs, documentos) asociados a consultas médicas';
        
        COMMENT ON COLUMN public.consultation_files.consultation_id IS 
            'ID de la consulta a la que pertenece el archivo';
        
        COMMENT ON COLUMN public.consultation_files.file_name IS 
            'Nombre original del archivo';
        
        COMMENT ON COLUMN public.consultation_files.path IS 
            'Ruta del archivo en el almacenamiento (Supabase Storage)';
        
        COMMENT ON COLUMN public.consultation_files.url IS 
            'URL pública del archivo para acceso directo';
        
        COMMENT ON COLUMN public.consultation_files.size IS 
            'Tamaño del archivo en bytes';
        
        COMMENT ON COLUMN public.consultation_files.content_type IS 
            'Tipo MIME del archivo (ej: image/jpeg, application/pdf)';

        RAISE NOTICE 'Tabla consultation_files creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla consultation_files ya existe';
    END IF;
END $$;

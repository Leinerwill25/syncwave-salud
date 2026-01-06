-- Migración para soportar múltiples plantillas de informe por especialidad
-- Almacena las plantillas en un JSONB para escalabilidad

-- Agregar campo JSONB para plantillas por especialidad
ALTER TABLE public.medic_profile 
ADD COLUMN IF NOT EXISTS report_templates_by_specialty JSONB DEFAULT NULL;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.medic_profile.report_templates_by_specialty IS 'Plantillas de informe organizadas por especialidad. Formato JSON: {"specialty1": {"template_url": "...", "template_name": "...", "template_text": "...", "font_family": "Arial"}, "specialty2": {...}}';

-- Función helper para parsear especialidades (pueden venir como array, string o JSON string)
CREATE OR REPLACE FUNCTION parse_specialty_field(value_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
    result TEXT[] := ARRAY[]::TEXT[];
    parsed_json JSONB;
BEGIN
    IF value_text IS NULL OR value_text = '' THEN
        RETURN result;
    END IF;
    
    -- Intentar parsear como JSON
    BEGIN
        parsed_json := value_text::JSONB;
        IF jsonb_typeof(parsed_json) = 'array' THEN
            -- Es un array JSON, extraer los valores
            SELECT array_agg(value::text)
            INTO result
            FROM jsonb_array_elements_text(parsed_json);
        ELSE
            -- Es un valor simple, devolver como array con un elemento
            result := ARRAY[value_text];
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Si no es JSON válido, tratar como string simple
        result := ARRAY[value_text];
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Migrar datos existentes al nuevo formato (si existen)
-- Esto preserva las plantillas actuales asociándolas a la primera especialidad (Ginecología)
DO $$
DECLARE
    rec RECORD;
    specialty_key TEXT;
    template_data JSONB;
    private_specs TEXT[];
    clinic_specs TEXT[];
    all_specs TEXT[];
    first_specialty TEXT;
BEGIN
    FOR rec IN 
        SELECT 
            doctor_id,
            specialty,
            private_specialty,
            report_template_url,
            report_template_name,
            report_template_text,
            report_font_family
        FROM public.medic_profile
        WHERE (report_template_url IS NOT NULL OR report_template_text IS NOT NULL)
          AND (report_templates_by_specialty IS NULL OR report_templates_by_specialty = 'null'::jsonb)
    LOOP
        -- Parsear especialidades (pueden venir como arrays)
        private_specs := parse_specialty_field(rec.private_specialty);
        clinic_specs := parse_specialty_field(rec.specialty);
        
        -- Combinar todas las especialidades únicas
        all_specs := ARRAY(
            SELECT DISTINCT unnest(private_specs || clinic_specs)
            WHERE unnest IS NOT NULL AND unnest != ''
        );
        
        -- Usar la primera especialidad (que sería "Ginecología" en este caso)
        IF array_length(all_specs, 1) > 0 THEN
            first_specialty := all_specs[1];
        ELSE
            -- Fallback si no hay especialidades
            first_specialty := COALESCE(rec.private_specialty, rec.specialty, 'default');
        END IF;
        
        -- Construir objeto JSONB con los datos existentes
        template_data := jsonb_build_object(
            'template_url', rec.report_template_url,
            'template_name', rec.report_template_name,
            'template_text', rec.report_template_text,
            'font_family', COALESCE(rec.report_font_family, 'Arial')
        );
        
        -- Actualizar el registro con el nuevo formato
        UPDATE public.medic_profile
        SET report_templates_by_specialty = jsonb_build_object(first_specialty, template_data)
        WHERE doctor_id = rec.doctor_id;
    END LOOP;
END $$;

-- Limpiar función helper después de la migración
DROP FUNCTION IF EXISTS parse_specialty_field(TEXT);

-- Crear índice GIN para búsquedas eficientes en el campo JSONB
CREATE INDEX IF NOT EXISTS idx_medic_profile_report_templates_by_specialty 
ON public.medic_profile USING gin (report_templates_by_specialty);


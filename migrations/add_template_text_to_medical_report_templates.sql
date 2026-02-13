-- ============================================================================
-- MIGRATION: Add template_text to medical_report_templates
-- ============================================================================

BEGIN;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_report_templates' 
                   AND column_name = 'template_text') THEN
        ALTER TABLE public.medical_report_templates 
        ADD COLUMN template_text TEXT;
    END IF;
END $$;

COMMIT;

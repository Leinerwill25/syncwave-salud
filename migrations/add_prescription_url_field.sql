-- Migration: Add prescription_url field to prescription table
-- Description: Adds a field to store the URL of the generated prescription Word document

-- Add prescription_url field to prescription table
ALTER TABLE public.prescription
ADD COLUMN IF NOT EXISTS prescription_url text;

-- Add comment to explain the field
COMMENT ON COLUMN public.prescription.prescription_url IS 'URL of the generated prescription Word document stored in Supabase Storage';


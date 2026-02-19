-- Add treatment_plan column to prescription table
ALTER TABLE public.prescription 
ADD COLUMN IF NOT EXISTS treatment_plan TEXT;

-- Add description for the new column
COMMENT ON COLUMN public.prescription.treatment_plan IS 'Stores the structured treatment plan extracted from the recipe text by AI';

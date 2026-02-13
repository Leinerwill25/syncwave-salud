-- Add recipe_text column to prescription table to store the custom recipe content from templates
ALTER TABLE prescription 
ADD COLUMN IF NOT EXISTS recipe_text TEXT;

-- Add comment
COMMENT ON COLUMN prescription.recipe_text IS 'Stores the custom text content of the prescription, typically populated from a template';

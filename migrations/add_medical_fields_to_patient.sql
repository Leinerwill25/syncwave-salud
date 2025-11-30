-- Add medical information fields to Patient table
ALTER TABLE public."Patient"
ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10) NULL,
ADD COLUMN IF NOT EXISTS allergies TEXT NULL,
ADD COLUMN IF NOT EXISTS has_disability BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disability TEXT NULL,
ADD COLUMN IF NOT EXISTS has_elderly_conditions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS elderly_conditions TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public."Patient".blood_type IS 'Tipo de sangre del paciente (ej: A+, O-, etc.)';
COMMENT ON COLUMN public."Patient".allergies IS 'Alergias conocidas del paciente';
COMMENT ON COLUMN public."Patient".has_disability IS 'Indica si el paciente tiene alguna discapacidad';
COMMENT ON COLUMN public."Patient".disability IS 'Descripción de la discapacidad si has_disability es true';
COMMENT ON COLUMN public."Patient".has_elderly_conditions IS 'Indica si el paciente de tercera edad tiene condiciones especiales';
COMMENT ON COLUMN public."Patient".elderly_conditions IS 'Descripción de las condiciones de tercera edad si has_elderly_conditions es true';


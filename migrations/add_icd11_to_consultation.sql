-- Migration: Add ICD-11 (CIE-11) fields to consultation table
-- Date: 2025-01-XX
-- Description: Adds icd11_code and icd11_title fields to store CIE-11 diagnostic codes

ALTER TABLE "consultation"
ADD COLUMN IF NOT EXISTS "icd11_code" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "icd11_title" TEXT;

-- Add index for faster searches by ICD-11 code
CREATE INDEX IF NOT EXISTS "idx_consultation_icd11_code" ON "consultation"("icd11_code");

-- Add comment to columns
COMMENT ON COLUMN "consultation"."icd11_code" IS 'Código CIE-11 (Clasificación Internacional de Enfermedades, versión 11)';
COMMENT ON COLUMN "consultation"."icd11_title" IS 'Título/descripción del código CIE-11';


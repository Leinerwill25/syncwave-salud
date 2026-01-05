-- Migración para agregar campos de directivas anticipadas y token QR de emergencia al paciente

-- Agregar campos de directivas anticipadas
ALTER TABLE "Patient" 
ADD COLUMN IF NOT EXISTS advance_directives JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_qr_token TEXT UNIQUE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_qr_enabled BOOLEAN DEFAULT FALSE;

-- Crear índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_patient_emergency_qr_token ON "Patient"("emergency_qr_token") WHERE "emergency_qr_token" IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN "Patient"."advance_directives" IS 'Directivas anticipadas del paciente: DNR, restricciones de soporte vital, etc. Formato JSON: {dnr: boolean, restrictions: string[], other: string}';
COMMENT ON COLUMN "Patient"."emergency_contact_name" IS 'Nombre del contacto de emergencia';
COMMENT ON COLUMN "Patient"."emergency_contact_phone" IS 'Teléfono del contacto de emergencia';
COMMENT ON COLUMN "Patient"."emergency_contact_relationship" IS 'Relación del contacto de emergencia (ej: Esposo/a, Hijo/a, Padre/Madre)';
COMMENT ON COLUMN "Patient"."emergency_qr_token" IS 'Token único para acceder a la información de emergencia del paciente mediante QR';
COMMENT ON COLUMN "Patient"."emergency_qr_enabled" IS 'Indica si el QR de emergencia está habilitado para este paciente';


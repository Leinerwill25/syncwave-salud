-- Migración para crear los buckets de almacenamiento necesarios para el módulo de recetas
-- Buckets: prescription-templates (plantillas de recetas) y consultation-prescriptions (recetas generadas)

-- Nota: En Supabase, los buckets se pueden crear desde SQL usando la tabla storage.buckets
-- Sin embargo, para políticas (RLS) más complejas, es mejor usar el Dashboard de Supabase

-- 1. Crear bucket para plantillas de recetas (prescription-templates)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'prescription-templates',
    'prescription-templates',
    false, -- Privado, requiere autenticación
    52428800, -- 50MB (50 * 1024 * 1024)
    ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'] -- .docx y .doc
)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear bucket para recetas generadas (consultation-prescriptions)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'consultation-prescriptions',
    'consultation-prescriptions',
    false, -- Privado, requiere autenticación
    104857600, -- 100MB (100 * 1024 * 1024) para permitir ZIPs con múltiples archivos
    ARRAY['application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'] -- ZIP y Word
)
ON CONFLICT (id) DO NOTHING;

-- 3. Nota sobre políticas de Storage:
-- Las políticas de Storage en Supabase deben configurarse desde el Dashboard de Supabase
-- o usando la API de Supabase. El SQL directo para políticas puede ser complejo.
-- 
-- Para prescription-templates, se recomienda:
-- - Permitir INSERT/SELECT/UPDATE/DELETE solo a usuarios autenticados
-- - El código ya valida que el usuario sea médico en el endpoint de la API
-- - El formato de nombres de archivos ya incluye el doctor_id como primera carpeta: doctorId/timestamp-filename.docx
--
-- Para consultation-prescriptions, se recomienda:
-- - Permitir INSERT solo a médicos autenticados (validado en API)
-- - Permitir SELECT a médicos y pacientes relacionados con la consulta
-- - El formato de nombres de archivos incluye el consultation.id como primera carpeta: consultation.id/timestamp-recetas-id.zip
--
-- Puedes configurar estas políticas desde:
-- Supabase Dashboard → Storage → [nombre-del-bucket] → Policies

-- Nota: Si necesitas que los buckets sean públicos o si necesitas políticas más específicas,
-- puedes modificar las políticas después o usar el Dashboard de Supabase Storage para configurarlas.


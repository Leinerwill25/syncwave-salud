-- Migración para hacer patient_id nullable en la tabla consultation
-- Esto permite crear consultas para pacientes no registrados sin requerir patient_id

-- Primero, eliminar la restricción NOT NULL del campo patient_id
ALTER TABLE consultation ALTER COLUMN patient_id DROP NOT NULL;

-- Verificar que la restricción se haya eliminado correctamente
-- SELECT column_name, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'consultation' AND column_name = 'patient_id';

-- NOTA: Si tienes una foreign key constraint en patient_id, asegúrate de que permita NULL
-- La constraint existente debería permitir NULL automáticamente, pero verifica:
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
-- WHERE table_name = 'consultation' AND constraint_name LIKE '%patient%';


-- Agregar campo de contraseña a consultorio_role_users para autenticación
ALTER TABLE consultorio_role_users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Índice para búsqueda por email (si se usa para login)
CREATE INDEX IF NOT EXISTS idx_consultorio_role_users_email ON consultorio_role_users(email) WHERE email IS NOT NULL;

-- Índice para búsqueda por identifier (si se usa para login)
CREATE INDEX IF NOT EXISTS idx_consultorio_role_users_identifier ON consultorio_role_users(identifier);


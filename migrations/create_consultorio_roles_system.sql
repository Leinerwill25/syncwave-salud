-- =====================================================
-- Sistema de Roles Internos para Consultorios Privados
-- =====================================================

-- Tabla 1: consultorio_roles
-- Almacena los roles internos creados por el médico especialista
CREATE TABLE IF NOT EXISTS consultorio_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un rol no puede tener el mismo nombre dentro de una organización
    CONSTRAINT unique_role_name_per_org UNIQUE (organization_id, role_name)
);

-- Índices para consultorio_roles
CREATE INDEX IF NOT EXISTS idx_consultorio_roles_org_id ON consultorio_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_roles_created_by ON consultorio_roles(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_roles_active ON consultorio_roles(is_active);

-- Tabla 2: consultorio_role_users
-- Almacena los usuarios asignados a roles con sus datos personales
CREATE TABLE IF NOT EXISTS consultorio_role_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES consultorio_roles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    
    -- Datos personales del usuario del rol
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    identifier VARCHAR(50) NOT NULL, -- Cédula de identidad
    
    -- Credenciales de acceso (opcional, pueden usar el sistema sin cuenta propia)
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    last_access_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Una persona no puede tener el mismo rol dos veces
    CONSTRAINT unique_user_per_role UNIQUE (role_id, identifier)
);

-- Índices para consultorio_role_users
CREATE INDEX IF NOT EXISTS idx_consultorio_role_users_role_id ON consultorio_role_users(role_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_role_users_org_id ON consultorio_role_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_role_users_identifier ON consultorio_role_users(identifier);
CREATE INDEX IF NOT EXISTS idx_consultorio_role_users_active ON consultorio_role_users(is_active);

-- Tabla 3: consultorio_role_permissions
-- Almacena los permisos específicos de cada rol por módulo
CREATE TABLE IF NOT EXISTS consultorio_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES consultorio_roles(id) ON DELETE CASCADE,
    
    -- Módulo al que se aplica el permiso
    module VARCHAR(50) NOT NULL, -- 'pacientes', 'consultas', 'citas', 'recetas', 'ordenes', 'resultados', 'mensajes', 'tareas', 'reportes'
    
    -- Permisos específicos (JSONB para flexibilidad)
    permissions JSONB NOT NULL DEFAULT '{}',
    -- Ejemplo de estructura JSON:
    -- {
    --   "view": true,
    --   "create": true,
    --   "edit": false,
    --   "delete": false,
    --   "confirm": true,
    --   "schedule": true
    -- }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un rol no puede tener permisos duplicados para el mismo módulo
    CONSTRAINT unique_role_module_permission UNIQUE (role_id, module)
);

-- Índices para consultorio_role_permissions
CREATE INDEX IF NOT EXISTS idx_consultorio_role_permissions_role_id ON consultorio_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_role_permissions_module ON consultorio_role_permissions(module);
CREATE INDEX IF NOT EXISTS idx_consultorio_role_permissions_jsonb ON consultorio_role_permissions USING GIN (permissions);

-- Tabla 4: consultorio_role_audit_log
-- Registra todos los movimientos, cambios y alteraciones realizados por usuarios de roles
CREATE TABLE IF NOT EXISTS consultorio_role_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
    role_id UUID REFERENCES consultorio_roles(id) ON DELETE SET NULL,
    role_user_id UUID REFERENCES consultorio_role_users(id) ON DELETE SET NULL,
    
    -- Información del usuario que realizó la acción
    user_first_name VARCHAR(100) NOT NULL,
    user_last_name VARCHAR(100) NOT NULL,
    user_identifier VARCHAR(50) NOT NULL,
    
    -- Información de la acción
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view', 'confirm', 'schedule', 'cancel', etc.
    module VARCHAR(50) NOT NULL, -- 'pacientes', 'consultas', 'citas', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'appointment', 'consultation', 'prescription', 'lab_result', etc.
    entity_id UUID, -- ID del registro afectado
    
    -- Detalles de la acción (JSONB para flexibilidad)
    action_details JSONB DEFAULT '{}',
    -- Ejemplo:
    -- {
    --   "field": "status",
    --   "old_value": "pending",
    --   "new_value": "confirmed",
    --   "description": "Cita confirmada por asistente"
    -- }
    
    -- Información adicional
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultorio_role_audit_log
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_org_id ON consultorio_role_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_role_id ON consultorio_role_audit_log(role_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_role_user_id ON consultorio_role_audit_log(role_user_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_user_identifier ON consultorio_role_audit_log(user_identifier);
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_action_type ON consultorio_role_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_module ON consultorio_role_audit_log(module);
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_entity ON consultorio_role_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_consultorio_audit_log_created_at ON consultorio_role_audit_log(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_consultorio_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consultorio_roles_updated_at
    BEFORE UPDATE ON consultorio_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_consultorio_roles_updated_at();

CREATE TRIGGER trigger_update_consultorio_role_users_updated_at
    BEFORE UPDATE ON consultorio_role_users
    FOR EACH ROW
    EXECUTE FUNCTION update_consultorio_roles_updated_at();

CREATE TRIGGER trigger_update_consultorio_role_permissions_updated_at
    BEFORE UPDATE ON consultorio_role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_consultorio_roles_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE consultorio_roles IS 'Roles internos creados por médicos especialistas para sus consultorios privados';
COMMENT ON TABLE consultorio_role_users IS 'Usuarios asignados a roles con sus datos personales (nombre, apellido, cédula)';
COMMENT ON TABLE consultorio_role_permissions IS 'Permisos específicos por módulo para cada rol interno';
COMMENT ON TABLE consultorio_role_audit_log IS 'Registro de auditoría de todas las acciones realizadas por usuarios de roles internos';

COMMENT ON COLUMN consultorio_role_permissions.module IS 'Módulos disponibles: pacientes, consultas, citas, recetas, ordenes, resultados, mensajes, tareas, reportes';
COMMENT ON COLUMN consultorio_role_permissions.permissions IS 'JSONB con permisos: view, create, edit, delete, confirm, schedule, etc.';
COMMENT ON COLUMN consultorio_role_audit_log.action_type IS 'Tipos de acción: create, update, delete, view, confirm, schedule, cancel, etc.';
COMMENT ON COLUMN consultorio_role_audit_log.module IS 'Módulo donde se realizó la acción';
COMMENT ON COLUMN consultorio_role_audit_log.entity_type IS 'Tipo de entidad afectada: appointment, consultation, prescription, lab_result, etc.';


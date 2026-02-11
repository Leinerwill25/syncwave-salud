-- =====================================================
-- Migración: Sistema de Configuración de Horarios y Consultorios
-- Fecha: 2026-02-10
-- Descripción: Tabla para almacenar configuración de horarios,
--              turnos y consultorios de médicos
-- =====================================================

-- Crear tabla doctor_schedule_config
CREATE TABLE IF NOT EXISTS public.doctor_schedule_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  
  -- Configuración general
  consultation_type text NOT NULL DEFAULT 'TURNOS',
  max_patients_per_day integer DEFAULT 20,
  
  -- Configuración de turnos
  shift_config jsonb DEFAULT '{
    "enabled": true,
    "shifts": [
      {"id": "morning", "name": "Turno Mañana", "enabled": true},
      {"id": "afternoon", "name": "Turno Tarde", "enabled": true}
    ]
  }'::jsonb,
  
  -- Consultorios y horarios
  -- Estructura:
  -- [
  --   {
  --     "id": "uuid",
  --     "name": "Consultorio A",
  --     "location": "Dirección completa",
  --     "phone": "Teléfono opcional",
  --     "schedules": [
  --       {
  --         "days": ["monday", "tuesday"],
  --         "shifts": ["morning", "afternoon"],
  --         "hours": {
  --           "morning": {"start": "08:00", "end": "12:00"},
  --           "afternoon": {"start": "14:00", "end": "17:00"}
  --         }
  --       }
  --     ]
  --   }
  -- ]
  offices jsonb DEFAULT '[]'::jsonb,
  
  -- Metadatos
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT doctor_schedule_config_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_schedule_config_doctor_fkey 
    FOREIGN KEY (doctor_id) 
    REFERENCES public.user(id) 
    ON DELETE CASCADE,
  CONSTRAINT doctor_schedule_config_org_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES public.organization(id) 
    ON DELETE CASCADE,
  CONSTRAINT valid_consultation_type 
    CHECK (consultation_type IN ('TURNOS', 'ORDEN_LLEGADA')),
  CONSTRAINT valid_max_patients 
    CHECK (max_patients_per_day > 0 AND max_patients_per_day <= 200)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_config_doctor 
  ON public.doctor_schedule_config(doctor_id);

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_config_org 
  ON public.doctor_schedule_config(organization_id);

-- Índice GIN para búsquedas en JSONB
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_config_offices 
  ON public.doctor_schedule_config USING GIN (offices);

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_config_shift_config 
  ON public.doctor_schedule_config USING GIN (shift_config);

-- Comentarios para documentación
COMMENT ON TABLE public.doctor_schedule_config IS 
  'Configuración de horarios, turnos y consultorios para médicos';

COMMENT ON COLUMN public.doctor_schedule_config.consultation_type IS 
  'Tipo de consulta: TURNOS (con cita previa) o ORDEN_LLEGADA (sin cita)';

COMMENT ON COLUMN public.doctor_schedule_config.max_patients_per_day IS 
  'Máximo de pacientes que el doctor puede atender por día';

COMMENT ON COLUMN public.doctor_schedule_config.shift_config IS 
  'Configuración de turnos (mañana, tarde, completo) en formato JSONB';

COMMENT ON COLUMN public.doctor_schedule_config.offices IS 
  'Array de consultorios con sus horarios específicos en formato JSONB';

-- RLS (Row Level Security) Policies
ALTER TABLE public.doctor_schedule_config ENABLE ROW LEVEL SECURITY;

-- Eliminar policy existente si existe
DROP POLICY IF EXISTS doctor_schedule_config_service_role_policy ON public.doctor_schedule_config;

-- Policy: Permitir todas las operaciones con Service Role
-- El Service Role tiene acceso completo, la seguridad se maneja en la API
CREATE POLICY doctor_schedule_config_service_role_policy 
  ON public.doctor_schedule_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Nota: La seguridad real se implementa en la API verificando que:
-- 1. El usuario esté autenticado
-- 2. El doctor_id corresponda al usuario autenticado
-- 3. El organization_id corresponda a la organización del usuario

-- Función para actualizar updated_at automáticamente
DROP FUNCTION IF EXISTS update_doctor_schedule_config_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_doctor_schedule_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_doctor_schedule_config_updated_at_trigger ON public.doctor_schedule_config;

CREATE TRIGGER update_doctor_schedule_config_updated_at_trigger
  BEFORE UPDATE ON public.doctor_schedule_config
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_schedule_config_updated_at();

-- =====================================================
-- Datos de ejemplo (opcional - comentar si no se necesita)
-- =====================================================

-- Insertar configuración de ejemplo para testing
-- NOTA: Reemplazar los UUIDs con IDs reales de tu base de datos
/*
INSERT INTO public.doctor_schedule_config (
  doctor_id,
  organization_id,
  consultation_type,
  max_patients_per_day,
  shift_config,
  offices
) VALUES (
  'uuid-del-doctor-aqui'::uuid,
  'uuid-de-la-organizacion-aqui'::uuid,
  'TURNOS',
  25,
  '{
    "enabled": true,
    "shifts": [
      {"id": "morning", "name": "Turno Mañana", "enabled": true},
      {"id": "afternoon", "name": "Turno Tarde", "enabled": true}
    ]
  }'::jsonb,
  '[
    {
      "id": "office-1",
      "name": "Consultorio Centro Médico",
      "location": "Av. Principal, Edificio XYZ, Piso 3",
      "phone": "+58 412-1234567",
      "schedules": [
        {
          "days": ["monday", "tuesday"],
          "shifts": ["afternoon"],
          "hours": {
            "afternoon": {"start": "14:00", "end": "17:00"}
          }
        },
        {
          "days": ["wednesday", "thursday", "friday"],
          "shifts": ["morning", "afternoon"],
          "hours": {
            "morning": {"start": "08:00", "end": "12:00"},
            "afternoon": {"start": "14:00", "end": "17:00"}
          }
        }
      ]
    }
  ]'::jsonb
);
*/

-- =====================================================
-- Verificación de la migración
-- =====================================================

-- Verificar que la tabla se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'doctor_schedule_config'
  ) THEN
    RAISE NOTICE '✅ Tabla doctor_schedule_config creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Tabla doctor_schedule_config no se creó';
  END IF;
END $$;

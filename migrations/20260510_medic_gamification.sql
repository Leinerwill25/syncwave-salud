-- ==============================================================================
-- MODULE: ASHIRA MEDIC GAMIFICATION & ONBOARDING SYSTEM
-- ==============================================================================

-- 1. doctor_gamification
-- Tabla principal de progreso de gamificación por doctor
CREATE TABLE IF NOT EXISTS public.doctor_gamification (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points      INTEGER NOT NULL DEFAULT 0,
  current_level     INTEGER NOT NULL DEFAULT 1,
  -- Misiones completadas almacenadas como array de IDs
  completed_missions TEXT[] NOT NULL DEFAULT '{}',
  -- Módulos explícitamente desbloqueados (para logs y analytics)
  unlocked_modules  TEXT[] NOT NULL DEFAULT '{"dashboard","configuracion"}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_doctor_gamification UNIQUE (doctor_id)
);

-- Habilitar RLS
ALTER TABLE public.doctor_gamification ENABLE ROW LEVEL SECURITY;

-- Policy: el doctor solo ve y modifica su propio registro
CREATE POLICY "doctor_own_gamification"
  ON public.doctor_gamification
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_gamification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gamification_updated_at
  BEFORE UPDATE ON public.doctor_gamification
  FOR EACH ROW EXECUTE FUNCTION update_gamification_timestamp();


-- 2. plantilla_informe
-- Tabla para almacenar las plantillas de informe médico (M6)
CREATE TABLE IF NOT EXISTS public.plantilla_informe (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  especialidad        TEXT,          -- 'pediatria', 'obstetricia', etc.
  trimestre           TEXT,          -- Solo para Obstetricia: '1', '2-3'
  word_template_url   TEXT,          -- URL en Supabase Storage del .docx
  word_filename       TEXT,          -- Nombre original del archivo
  texto_estructura    TEXT,          -- El texto con headers (MOTIVO:, DIAGNÓSTICO:, etc.)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.plantilla_informe ENABLE ROW LEVEL SECURITY;

-- Policy: el doctor solo ve y modifica su propio registro
CREATE POLICY "doctor_own_plantilla_informe"
  ON public.plantilla_informe
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_plantilla_informe_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plantilla_informe_updated_at
  BEFORE UPDATE ON public.plantilla_informe
  FOR EACH ROW EXECUTE FUNCTION update_plantilla_informe_timestamp();

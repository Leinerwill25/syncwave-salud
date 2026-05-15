-- Migración para corregir las políticas RLS de doctor_gamification
-- Creado: 2026-05-11

-- Habilitar RLS si no está habilitado
ALTER TABLE public.doctor_gamification ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay para evitar conflictos
DROP POLICY IF EXISTS "doctor_own_gamification_select" ON public.doctor_gamification;
DROP POLICY IF EXISTS "doctor_own_gamification_insert" ON public.doctor_gamification;
DROP POLICY IF EXISTS "doctor_own_gamification_update" ON public.doctor_gamification;
DROP POLICY IF EXISTS "doctor_own_gamification" ON public.doctor_gamification;

-- Crear políticas específicas por operación

-- 1. SELECT: El doctor solo puede ver su propio progreso
CREATE POLICY "doctor_own_gamification_select"
  ON public.doctor_gamification
  FOR SELECT
  USING (doctor_id = auth.uid());

-- 2. INSERT: El doctor solo puede crear su propio registro
CREATE POLICY "doctor_own_gamification_insert"
  ON public.doctor_gamification
  FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

-- 3. UPDATE: El doctor solo puede actualizar su propio progreso
CREATE POLICY "doctor_own_gamification_update"
  ON public.doctor_gamification
  FOR UPDATE
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

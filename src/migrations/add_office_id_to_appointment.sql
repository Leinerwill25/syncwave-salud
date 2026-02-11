-- Migration: Add office_id to appointment table
-- This allows tracking which specific office an appointment is scheduled for.

ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS office_id text;

COMMENT ON COLUMN public.appointment.office_id IS 'ID del consultorio/sede donde se realizará la cita.';

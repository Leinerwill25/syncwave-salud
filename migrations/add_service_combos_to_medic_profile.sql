-- Migration: add_service_combos_to_medic_profile.sql
-- Objetivo: agregar un nuevo campo JSONB a medic_profile para almacenar combos de servicios

ALTER TABLE public.medic_profile
ADD COLUMN IF NOT EXISTS service_combos jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.medic_profile.service_combos IS 'Array JSON de combos de servicios [{ "id": "uuid", "name": "Combo Control Prenatal", "description": "...", "price": 80.00, "currency": "USD", "serviceIds": ["id-servicio-1","id-servicio-2"] }]';



-- Agregar campo created_by_role_user_id a la tabla appointment
-- Este campo permite rastrear qué usuario de rol (Asistente De Citas) creó la cita

ALTER TABLE public.appointment
ADD COLUMN IF NOT EXISTS created_by_role_user_id UUID DEFAULT NULL;

-- Referencia a consultorio_role_users
ALTER TABLE public.appointment
ADD CONSTRAINT IF NOT EXISTS appointment_created_by_role_user_fkey 
FOREIGN KEY (created_by_role_user_id) 
REFERENCES public.consultorio_role_users(id) 
ON DELETE SET NULL;

-- Crear índice para búsquedas por role user
CREATE INDEX IF NOT EXISTS idx_appointment_created_by_role_user 
ON public.appointment(created_by_role_user_id);

COMMENT ON COLUMN public.appointment.created_by_role_user_id IS 'ID del usuario de rol (Asistente De Citas) que creó esta cita';


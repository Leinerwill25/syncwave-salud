-- Agregar campo selected_service a la tabla appointment
-- Este campo almacenará el servicio seleccionado por el paciente al crear la cita

ALTER TABLE public.appointment 
ADD COLUMN IF NOT EXISTS selected_service jsonb DEFAULT NULL;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.appointment.selected_service IS 'Servicio seleccionado por el paciente al crear la cita. Formato: {"name": "Consulta General", "description": "...", "price": "50", "currency": "USD"}';

-- Crear índice GIN para búsquedas eficientes en el campo JSONB
CREATE INDEX IF NOT EXISTS idx_appointment_selected_service 
ON public.appointment USING gin (selected_service);


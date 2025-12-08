-- Agregar campo report_font_family a la tabla medic_profile
ALTER TABLE public.medic_profile
ADD COLUMN report_font_family TEXT DEFAULT 'Arial';

-- Comentario sobre el campo
COMMENT ON COLUMN public.medic_profile.report_font_family IS 'Fuente seleccionada para los informes médicos. Opciones: Arial, Calibri, Georgia, Cambria, Garamond';


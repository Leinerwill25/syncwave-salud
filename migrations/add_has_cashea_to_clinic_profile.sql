-- Migración: Agregar campo has_cashea a la tabla clinic_profile
-- Este campo indica si el consultorio cuenta con Cashea (cajero automático o punto de pago)

-- Agregar el campo has_cashea si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'clinic_profile'
        AND column_name = 'has_cashea'
    ) THEN
        ALTER TABLE public.clinic_profile ADD COLUMN has_cashea BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna has_cashea agregada a clinic_profile.';
    ELSE
        RAISE NOTICE 'Columna has_cashea ya existe en clinic_profile.';
    END IF;
END $$;


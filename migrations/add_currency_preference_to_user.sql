-- Migración: Agregar campo currency_preference a la tabla User
-- Este campo permite a los usuarios (especialistas/asistentes) seleccionar su moneda preferida para cotizar precios
-- La moneda debe existir en la tabla rates de la base de datos de tasas

-- Verificar si la columna ya existe antes de agregarla
DO $$
BEGIN
    -- Verificar si la columna currency_preference ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'User' 
        AND column_name = 'currency_preference'
    ) THEN
        -- Agregar la columna currency_preference
        -- VARCHAR(10) permite códigos de moneda estándar (USD, EUR, VES, COP, etc.)
        ALTER TABLE public."User" 
        ADD COLUMN currency_preference VARCHAR(10) DEFAULT 'USD';
        
        -- Agregar comentario a la columna
        COMMENT ON COLUMN public."User".currency_preference IS 'Moneda preferida del usuario para cotizar precios. Debe ser un código válido de la tabla rates (ej: USD, EUR, VES, COP, etc.)';
        
        RAISE NOTICE 'Campo currency_preference agregado a la tabla User';
    ELSE
        RAISE NOTICE 'Campo currency_preference ya existe en la tabla User';
        
        -- Si ya existe, verificar si tiene restricción CHECK y eliminarla si es muy restrictiva
        -- (esto permite que se puedan usar todas las monedas de la tabla rates)
        BEGIN
            ALTER TABLE public."User" DROP CONSTRAINT IF EXISTS user_currency_preference_check;
            RAISE NOTICE 'Restricción CHECK eliminada (si existía) para permitir todas las monedas';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'No se pudo eliminar restricción CHECK (puede que no exista)';
        END;
    END IF;
END $$;


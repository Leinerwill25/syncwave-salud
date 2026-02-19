-- Actualización de planes para Clínicas según nueva estructura de mercado

-- 1. Actualizar Plan Médico (Base individual)
-- Precio base: €70/mes
-- Trimestral (-10%): €189
-- Anual (-30%): €588
UPDATE "public"."plan"
SET 
    "monthlyPrice" = 70,
    "quarterlyPrice" = 189,
    "annualPrice" = 588,
    "description" = 'Plan individual para médicos independientes.'
WHERE "slug" = 'medico';

-- 2. Actualizar Plan "Pequeña" -> "Starter" (2-10 especialistas)
-- Precio: €56/esp/mes (20% descuento)
-- Trimestral (-10%): 56 * 3 * 0.9 = €151.2
-- Anual (-30%): 56 * 12 * 0.7 = €470.4
UPDATE "public"."plan"
SET 
    "slug" = 'clinic-starter',
    "name" = 'Starter (2–10 esp.)',
    "minSpecialists" = 2,
    "maxSpecialists" = 10,
    "monthlyPrice" = 56,
    "quarterlyPrice" = 151.2,
    "annualPrice" = 470.4,
    "description" = 'Para consultorios grupales y centros pequeños.'
WHERE "slug" = 'small';

-- 3. Actualizar Plan "10-20" -> "Clínica" (11-30 especialistas)
-- Precio: €49/esp/mes (30% descuento)
-- Trimestral (-10%): 49 * 3 * 0.9 = €132.3
-- Anual (-30%): 49 * 12 * 0.7 = €411.6
UPDATE "public"."plan"
SET 
    "slug" = 'clinic-medium',
    "name" = 'Clínica (11–30 esp.)',
    "minSpecialists" = 11,
    "maxSpecialists" = 30,
    "monthlyPrice" = 49,
    "quarterlyPrice" = 132.3,
    "annualPrice" = 411.6,
    "description" = 'Para centros ambulatorios y de diagnóstico.'
WHERE "slug" = '10-20';

-- 4. Actualizar Plan "21-50" -> "Pro" (31-80 especialistas)
-- Precio: €42/esp/mes (40% descuento)
-- Trimestral (-10%): 42 * 3 * 0.9 = €113.4
-- Anual (-30%): 42 * 12 * 0.7 = €352.8
UPDATE "public"."plan"
SET 
    "slug" = 'clinic-pro',
    "name" = 'Pro (31–80 esp.)',
    "minSpecialists" = 31,
    "maxSpecialists" = 80,
    "monthlyPrice" = 42,
    "quarterlyPrice" = 113.4,
    "annualPrice" = 352.8,
    "description" = 'Para clínicas medianas con emergencias.'
WHERE "slug" = '21-50';

-- 5. Actualizar Plan "51-100" -> "Enterprise" (81-200 especialistas)
-- Precio: €35/esp/mes (50% descuento)
-- Trimestral (-10%): 35 * 3 * 0.9 = €94.5
-- Anual (-30%): 35 * 12 * 0.7 = €294.0
UPDATE "public"."plan"
SET 
    "slug" = 'clinic-enterprise',
    "name" = 'Enterprise (81–200 esp.)',
    "minSpecialists" = 81,
    "maxSpecialists" = 200,
    "monthlyPrice" = 35,
    "quarterlyPrice" = 94.5,
    "annualPrice" = 294.0,
    "description" = 'Para grandes clínicas privadas.'
WHERE "slug" = '51-100';

-- 6. Actualizar Plan "Custom" (200+ especialistas)
UPDATE "public"."plan"
SET 
    "slug" = 'clinic-custom',
    "name" = 'Personalizado (200+ esp.)',
    "minSpecialists" = 201,
    "maxSpecialists" = 99999,
    "monthlyPrice" = 0,
    "quarterlyPrice" = 0,
    "annualPrice" = 0,
    "description" = 'Plan a medida para instituciones y policlínicas.'
WHERE "slug" = 'custom';

-- ============================================================
-- SQL para recuperar la plantilla de texto de otro usuario
-- ============================================================
-- INSTRUCCIONES:
-- 1. Reemplaza 'TU_EMAIL_AQUI' con tu email de usuario
-- 2. Ejecuta este script en tu base de datos
-- ============================================================

-- Paso 1: Ver qué usuarios tienen plantillas de texto (ejecuta esto primero para identificar)
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    CASE 
        WHEN mp.report_templates_by_specialty IS NOT NULL THEN 'Nuevo formato (por especialidad)'
        WHEN mp.report_template_text IS NOT NULL THEN 'Formato antiguo'
        ELSE 'Sin plantilla'
    END as tipo_plantilla,
    mp.report_templates_by_specialty IS NOT NULL as tiene_templates_por_especialidad,
    mp.report_template_text IS NOT NULL as tiene_template_text_antiguo
FROM "User" u
INNER JOIN medic_profile mp ON mp.doctor_id = u.id
WHERE (mp.report_template_text IS NOT NULL 
   OR mp.report_templates_by_specialty IS NOT NULL)
  AND u.role = 'MEDICO'
ORDER BY u.email;

-- ============================================================
-- Paso 2: Copiar plantilla automáticamente desde el usuario que la tiene
-- Reemplaza 'TU_EMAIL_AQUI' con tu email antes de ejecutar
-- ============================================================

-- Opción A: Si el usuario origen tiene report_templates_by_specialty (formato nuevo)
UPDATE medic_profile mp_destino
SET report_templates_by_specialty = (
    SELECT mp_origen.report_templates_by_specialty
    FROM medic_profile mp_origen
    INNER JOIN "User" u_origen ON u_origen.id = mp_origen.doctor_id
    WHERE u_origen.role = 'MEDICO'
      AND mp_origen.report_templates_by_specialty IS NOT NULL
      AND u_origen.email != 'TU_EMAIL_AQUI'  -- Excluir tu email
    ORDER BY mp_origen.updated_at DESC
    LIMIT 1
)
WHERE mp_destino.doctor_id = (
    SELECT u.id
    FROM "User" u
    WHERE u.email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR POR TU EMAIL
      AND u.role = 'MEDICO'
    LIMIT 1
)
AND EXISTS (
    SELECT 1
    FROM medic_profile mp_origen
    INNER JOIN "User" u_origen ON u_origen.id = mp_origen.doctor_id
    WHERE u_origen.role = 'MEDICO'
      AND mp_origen.report_templates_by_specialty IS NOT NULL
      AND u_origen.email != 'TU_EMAIL_AQUI'  -- Excluir tu email
);

-- Opción B: Si el usuario origen tiene report_template_text (formato antiguo)
UPDATE medic_profile mp_destino
SET report_template_text = (
    SELECT mp_origen.report_template_text
    FROM medic_profile mp_origen
    INNER JOIN "User" u_origen ON u_origen.id = mp_origen.doctor_id
    WHERE u_origen.role = 'MEDICO'
      AND mp_origen.report_template_text IS NOT NULL
      AND mp_origen.report_template_text != ''
      AND u_origen.email != 'TU_EMAIL_AQUI'  -- Excluir tu email
    ORDER BY mp_origen.updated_at DESC
    LIMIT 1
)
WHERE mp_destino.doctor_id = (
    SELECT u.id
    FROM "User" u
    WHERE u.email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR POR TU EMAIL
      AND u.role = 'MEDICO'
    LIMIT 1
)
AND EXISTS (
    SELECT 1
    FROM medic_profile mp_origen
    INNER JOIN "User" u_origen ON u_origen.id = mp_origen.doctor_id
    WHERE u_origen.role = 'MEDICO'
      AND mp_origen.report_template_text IS NOT NULL
      AND mp_origen.report_template_text != ''
      AND u_origen.email != 'TU_EMAIL_AQUI'  -- Excluir tu email
);

-- Opción C: Copiar ambos formatos si existen (más completo)
-- Este script copia tanto report_templates_by_specialty como report_template_text
WITH usuario_origen AS (
    SELECT 
        mp.report_templates_by_specialty,
        mp.report_template_text,
        mp.report_font_family
    FROM medic_profile mp
    INNER JOIN "User" u ON u.id = mp.doctor_id
    WHERE u.role = 'MEDICO'
      AND (mp.report_templates_by_specialty IS NOT NULL 
           OR (mp.report_template_text IS NOT NULL AND mp.report_template_text != ''))
      AND u.email != 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR POR TU EMAIL
    ORDER BY mp.updated_at DESC
    LIMIT 1
),
usuario_destino AS (
    SELECT u.id as user_id
    FROM "User" u
    WHERE u.email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR POR TU EMAIL
      AND u.role = 'MEDICO'
    LIMIT 1
)
UPDATE medic_profile mp
SET 
    report_templates_by_specialty = COALESCE(
        (SELECT report_templates_by_specialty FROM usuario_origen),
        mp.report_templates_by_specialty
    ),
    report_template_text = COALESCE(
        (SELECT report_template_text FROM usuario_origen),
        mp.report_template_text
    ),
    report_font_family = COALESCE(
        (SELECT report_font_family FROM usuario_origen),
        mp.report_font_family,
        'Arial'
    )
FROM usuario_destino ud
WHERE mp.doctor_id = ud.user_id
AND EXISTS (SELECT 1 FROM usuario_origen);

-- ============================================================
-- Paso 3: Verificar que se copió correctamente
-- ============================================================
SELECT 
    u.email,
    u.name,
    CASE 
        WHEN mp.report_templates_by_specialty IS NOT NULL THEN '✅ Plantilla por especialidad copiada'
        WHEN mp.report_template_text IS NOT NULL THEN '✅ Plantilla de texto copiada'
        ELSE '❌ Sin plantilla'
    END as estado,
    LENGTH(COALESCE(mp.report_template_text::text, '')) as longitud_template_text,
    CASE 
        WHEN mp.report_templates_by_specialty IS NOT NULL THEN 
            (SELECT jsonb_object_keys(mp.report_templates_by_specialty) LIMIT 1)
        ELSE NULL
    END as primera_especialidad_con_plantilla
FROM "User" u
INNER JOIN medic_profile mp ON mp.doctor_id = u.id
WHERE u.email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR POR TU EMAIL
LIMIT 1;

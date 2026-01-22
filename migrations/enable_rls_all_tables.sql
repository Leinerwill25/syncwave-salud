-- ============================================================================
-- Script para habilitar Row Level Security (RLS) en todas las tablas públicas
-- ============================================================================
-- Este script habilita RLS y crea políticas básicas que no rompen las APIs
-- existentes. Las APIs que usan SUPABASE_SERVICE_ROLE_KEY bypass RLS automáticamente.
-- ============================================================================

-- Lista de todas las tablas que necesitan RLS habilitado
DO $$
DECLARE
    table_name TEXT;
    tables_to_enable_rls TEXT[] := ARRAY[
        'Plan',
        'subscription_payments',
        'private_messages',
        'prescription_files',
        'medication_dose',
        'FamilyGroupMember',
        'MedicalRecord',
        'consultorio_roles',
        'Invite',
        'clinic_profile',
        'FamilyGroup',
        'Subscription',
        'pharmacy_order',
        'prescription_item',
        'prescription_dispense',
        'consultorio_role_permissions',
        'consultorio_role_users',
        'notification',
        'prescription',
        'task',
        'ai_conversation',
        'consultorio_role_audit_log',
        'medicalaccessgrant',
        'consultation_share_link',
        'medication',
        'appointment',
        'consultation',
        'lab_result',
        'message',
        'pharmacy_inventory',
        'pharmacy_order_item',
        'patientaccesskey',
        'consultation_files',
        'facturacion',
        'medic_profile',
        'User',
        'unregisteredpatients',
        'conversation',
        'Organization',
        'Patient',
        'role_user_payment_methods'
    ];
BEGIN
    -- Habilitar RLS en todas las tablas
    FOREACH table_name IN ARRAY tables_to_enable_rls
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', table_name);
            RAISE NOTICE 'RLS habilitado en: %', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error habilitando RLS en %: %', table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- Políticas RLS básicas que permiten acceso completo para service_role
-- y acceso controlado para usuarios autenticados
-- ============================================================================

-- Política genérica: Permitir todo para service_role (aunque service_role bypass RLS)
-- Esta política es redundante pero documenta la intención

-- Política para usuarios autenticados: Acceso basado en organización
-- Esta política permite acceso si el usuario pertenece a la misma organización

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE ORGANIZACIÓN
-- ============================================================================

-- Organization: Permitir lectura a usuarios autenticados de la misma organización
DROP POLICY IF EXISTS "Users can view their own organization" ON public."Organization";
CREATE POLICY "Users can view their own organization"
    ON public."Organization"
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public."User" WHERE "organizationId" = "Organization".id
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE USUARIOS
-- ============================================================================

-- User: Permitir a usuarios ver su propio perfil (CRÍTICO para login)
-- Esta política debe ser la primera para que los usuarios puedan leer su propia información durante el login
-- IMPORTANTE: La comparación debe ser "authId" = auth.uid()::text (sin ::text en authId)
-- porque authId es TEXT y auth.uid() es UUID que se convierte a TEXT
DROP POLICY IF EXISTS "Users can view their own profile" ON public."User";
CREATE POLICY "Users can view their own profile"
    ON public."User"
    FOR SELECT
    USING (
        -- Comparación principal: authId (TEXT) con auth.uid() (UUID convertido a TEXT)
        "authId" = auth.uid()::text
        OR
        -- Fallback: si el id de User coincide con auth.uid() (por si acaso)
        id::text = auth.uid()::text
    );

-- User: Permitir acceso a usuarios de la misma organización
-- NOTA: Esta política está temporalmente simplificada para evitar recursión infinita
-- Se puede mejorar más adelante usando una función SECURITY DEFINER si es necesario
DROP POLICY IF EXISTS "Users can view users in their organization" ON public."User";
-- Política temporalmente deshabilitada para evitar problemas de recursión
-- CREATE POLICY "Users can view users in their organization"
--     ON public."User"
--     FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM public."User" u
--             WHERE (u.id::text = auth.uid()::text OR u."authId"::text = auth.uid()::text OR u."authId" = auth.uid()::text)
--             AND u."organizationId" IS NOT NULL
--             AND u."organizationId" = "User"."organizationId"
--             AND "User".id::text != auth.uid()::text
--             AND ("User"."authId" IS NULL OR "User"."authId"::text != auth.uid()::text)
--         )
--     );

DROP POLICY IF EXISTS "Users can update their own profile" ON public."User";
CREATE POLICY "Users can update their own profile"
    ON public."User"
    FOR UPDATE
    USING (
        "authId" = auth.uid()::text
        OR
        id::text = auth.uid()::text
    )
    WITH CHECK (
        "authId" = auth.uid()::text
        OR
        id::text = auth.uid()::text
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE PACIENTES
-- ============================================================================

-- Patient: Permitir acceso a médicos de la misma organización
DROP POLICY IF EXISTS "Medics can view patients in their organization" ON public."Patient";
CREATE POLICY "Medics can view patients in their organization"
    ON public."Patient"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id::text = auth.uid()::text
            AND u.role = 'MEDICO'
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User"
                WHERE id IN (
                    SELECT "doctor_id" FROM public.appointment WHERE "patient_id" = "Patient".id
                    UNION
                    SELECT "doctor_id" FROM public.consultation WHERE "patient_id" = "Patient".id
                )
            )
        )
        OR
        -- Pacientes pueden ver su propio perfil
        id IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- unregisteredpatients: Similar a Patient
DROP POLICY IF EXISTS "Medics can view unregistered patients in their organization" ON public.unregisteredpatients;
CREATE POLICY "Medics can view unregistered patients in their organization"
    ON public.unregisteredpatients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id::text = auth.uid()::text
            AND u.role = 'MEDICO'
            AND u."organizationId" IN (
                SELECT "organization_id" FROM public.appointment WHERE "unregistered_patient_id" = unregisteredpatients.id
                UNION
                SELECT "organization_id" FROM public.consultation WHERE "unregistered_patient_id" = unregisteredpatients.id
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE CITAS Y CONSULTAS
-- ============================================================================

-- appointment: Permitir acceso a médicos y pacientes relacionados
DROP POLICY IF EXISTS "Users can view appointments in their organization" ON public.appointment;
CREATE POLICY "Users can view appointments in their organization"
    ON public.appointment
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "doctor_id"::text = auth.uid()::text
    );

-- consultation: Similar a appointment
DROP POLICY IF EXISTS "Users can view consultations in their organization" ON public.consultation;
CREATE POLICY "Users can view consultations in their organization"
    ON public.consultation
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "doctor_id"::text = auth.uid()::text
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE PERFILES MÉDICOS
-- ============================================================================

-- medic_profile: Permitir a médicos ver su propio perfil
DROP POLICY IF EXISTS "Medics can view their own profile" ON public.medic_profile;
CREATE POLICY "Medics can view their own profile"
    ON public.medic_profile
    FOR SELECT
    USING (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    );

-- medic_profile: Permitir acceso a médicos de la misma organización
DROP POLICY IF EXISTS "Users can view medic profiles in their organization" ON public.medic_profile;
CREATE POLICY "Users can view medic profiles in their organization"
    ON public.medic_profile
    FOR SELECT
    USING (
        "doctor_id" IN (
            SELECT id FROM public."User"
            WHERE "organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE "authId" = auth.uid()::text
            )
        )
    );

-- medic_profile: Permitir a médicos insertar su propio perfil
DROP POLICY IF EXISTS "Medics can insert their own profile" ON public.medic_profile;
CREATE POLICY "Medics can insert their own profile"
    ON public.medic_profile
    FOR INSERT
    WITH CHECK (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    );

-- medic_profile: Permitir a médicos actualizar su propio perfil
DROP POLICY IF EXISTS "Medics can update their own profile" ON public.medic_profile;
CREATE POLICY "Medics can update their own profile"
    ON public.medic_profile
    FOR UPDATE
    USING (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    )
    WITH CHECK (
        "doctor_id" IN (
            SELECT id FROM public."User" WHERE "authId" = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE FACTURACIÓN
-- ============================================================================

-- facturacion: Permitir acceso a médicos y pacientes relacionados
DROP POLICY IF EXISTS "Users can view billing in their organization" ON public.facturacion;
CREATE POLICY "Users can view billing in their organization"
    ON public.facturacion
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE PRESCRIPCIONES
-- ============================================================================

-- prescription: Permitir acceso a médicos y pacientes relacionados
DROP POLICY IF EXISTS "Users can view prescriptions in their organization" ON public.prescription;
CREATE POLICY "Users can view prescriptions in their organization"
    ON public.prescription
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE c.id = prescription."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- prescription_item: Similar a prescription
DROP POLICY IF EXISTS "Users can view prescription items in their organization" ON public.prescription_item;
CREATE POLICY "Users can view prescription items in their organization"
    ON public.prescription_item
    FOR SELECT
    USING (
        "prescription_id" IN (
            SELECT id FROM public.prescription WHERE "patient_id" IN (
                SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
            )
            OR EXISTS (
                SELECT 1 FROM public.consultation c
                JOIN public."User" u ON u.id = c."doctor_id"
                WHERE c.id = prescription."consultation_id"
                AND u."organizationId" IN (
                    SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
                )
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE RESULTADOS DE LABORATORIO
-- ============================================================================

-- lab_result: Permitir acceso a médicos y pacientes relacionados
DROP POLICY IF EXISTS "Users can view lab results in their organization" ON public.lab_result;
CREATE POLICY "Users can view lab results in their organization"
    ON public.lab_result
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE c.id = lab_result."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE MENSAJERÍA
-- ============================================================================

-- message: Permitir acceso a usuarios que participan en la conversación
DROP POLICY IF EXISTS "Users can view their messages" ON public.message;
CREATE POLICY "Users can view their messages"
    ON public.message
    FOR SELECT
    USING (
        "sender_id"::text = auth.uid()::text
        OR
        "recipient_user_id"::text = auth.uid()::text
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- conversation: Permitir acceso a usuarios que participan
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversation;
CREATE POLICY "Users can view their conversations"
    ON public.conversation
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE NOTIFICACIONES
-- ============================================================================

-- Notification: Permitir acceso a usuarios que son dueños de la notificación
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification;
CREATE POLICY "Users can view their notifications"
    ON public.notification
    FOR SELECT
    USING (
        "userId"::text = auth.uid()::text
        OR
        "organizationId" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE INVITACIONES
-- ============================================================================

-- Invite: Permitir acceso a usuarios de la misma organización
DROP POLICY IF EXISTS "Users can view invites in their organization" ON public."Invite";
CREATE POLICY "Users can view invites in their organization"
    ON public."Invite"
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE ROLES Y PERMISOS
-- ============================================================================

-- consultorio_roles: Permitir acceso a usuarios de la misma organización
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.consultorio_roles;
CREATE POLICY "Users can view roles in their organization"
    ON public.consultorio_roles
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- consultorio_role_users: Similar
DROP POLICY IF EXISTS "Users can view role users in their organization" ON public.consultorio_role_users;
CREATE POLICY "Users can view role users in their organization"
    ON public.consultorio_role_users
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- consultorio_role_permissions: Similar
DROP POLICY IF EXISTS "Users can view role permissions in their organization" ON public.consultorio_role_permissions;
CREATE POLICY "Users can view role permissions in their organization"
    ON public.consultorio_role_permissions
    FOR SELECT
    USING (
        "role_id" IN (
            SELECT id FROM public.consultorio_roles
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE FAMILIA
-- ============================================================================

-- FamilyGroup: Permitir acceso a dueños del grupo
DROP POLICY IF EXISTS "Users can view their family groups" ON public."FamilyGroup";
CREATE POLICY "Users can view their family groups"
    ON public."FamilyGroup"
    FOR SELECT
    USING (
        "ownerId" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- FamilyGroupMember: Similar
DROP POLICY IF EXISTS "Users can view their family group members" ON public."FamilyGroupMember";
CREATE POLICY "Users can view their family group members"
    ON public."FamilyGroupMember"
    FOR SELECT
    USING (
        "patientId" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "familyGroupId" IN (
            SELECT id FROM public."FamilyGroup"
            WHERE "ownerId" IN (
                SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS DE REGISTROS MÉDICOS
-- ============================================================================

-- MedicalRecord: Permitir acceso a médicos y pacientes relacionados
DROP POLICY IF EXISTS "Users can view medical records in their organization" ON public."MedicalRecord";
CREATE POLICY "Users can view medical records in their organization"
    ON public."MedicalRecord"
    FOR SELECT
    USING (
        "patientId" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE c."medical_record_id" = "MedicalRecord".id
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- POLÍTICAS PARA TABLAS RESTANTES (Políticas básicas permisivas)
-- ============================================================================

-- clinic_profile
DROP POLICY IF EXISTS "Users can view clinic profiles in their organization" ON public.clinic_profile;
CREATE POLICY "Users can view clinic profiles in their organization"
    ON public.clinic_profile
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- clinic_profile: Permitir INSERT/UPDATE para usuarios de la organización
DROP POLICY IF EXISTS "Users can modify clinic profiles in their organization" ON public.clinic_profile;
CREATE POLICY "Users can modify clinic profiles in their organization"
    ON public.clinic_profile
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- Plan: Permitir lectura a todos los usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public."Plan";
CREATE POLICY "Authenticated users can view plans"
    ON public."Plan"
    FOR SELECT
    TO authenticated
    USING (true);

-- Subscription: Permitir acceso a usuarios de la misma organización
DROP POLICY IF EXISTS "Users can view subscriptions in their organization" ON public."Subscription";
CREATE POLICY "Users can view subscriptions in their organization"
    ON public."Subscription"
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "patientId" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- subscription_payments: Similar a Subscription
-- La tabla tiene organization_id, user_id, verified_by
DROP POLICY IF EXISTS "Users can view subscription payments in their organization" ON public.subscription_payments;
CREATE POLICY "Users can view subscription payments in their organization"
    ON public.subscription_payments
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "user_id"::text = auth.uid()::text
        OR
        "verified_by"::text = auth.uid()::text
    );

-- Para las demás tablas, crear políticas básicas que permitan acceso
-- basado en organización o relación con el usuario autenticado

-- Políticas específicas para tablas restantes
-- consultation_files: Permitir acceso a usuarios de la misma organización
DROP POLICY IF EXISTS "Users can view consultation files in their organization" ON public.consultation_files;
CREATE POLICY "Users can view consultation files in their organization"
    ON public.consultation_files
    FOR SELECT
    USING (
        "consultation_id" IN (
            SELECT id FROM public.consultation
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- prescription_files: Similar
DROP POLICY IF EXISTS "Users can view prescription files in their organization" ON public.prescription_files;
CREATE POLICY "Users can view prescription files in their organization"
    ON public.prescription_files
    FOR SELECT
    USING (
        "prescription_id" IN (
            SELECT id FROM public.prescription
            WHERE "patient_id" IN (
                SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
            )
            OR EXISTS (
                SELECT 1 FROM public.consultation c
                JOIN public."User" u ON u.id = c."doctor_id"
                WHERE c.id = prescription."consultation_id"
                AND u."organizationId" IN (
                    SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
                )
            )
        )
    );

-- medication: Permitir lectura a todos los usuarios autenticados (catálogo de medicamentos)
DROP POLICY IF EXISTS "Authenticated users can view medications" ON public.medication;
CREATE POLICY "Authenticated users can view medications"
    ON public.medication
    FOR SELECT
    TO authenticated
    USING (true);

-- medication_dose: Permitir acceso a pacientes y médicos relacionados
DROP POLICY IF EXISTS "Users can view medication doses in their organization" ON public.medication_dose;
CREATE POLICY "Users can view medication doses in their organization"
    ON public.medication_dose
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM public.prescription p
            JOIN public.consultation c ON c.id = p."consultation_id"
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE p.id = medication_dose."prescription_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- task: Permitir acceso a usuarios de la misma organización
-- Nota: task no tiene organization_id directamente, se obtiene a través de patient_id, assigned_to, o created_by
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON public.task;
CREATE POLICY "Users can view tasks in their organization"
    ON public.task
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "assigned_to"::text = auth.uid()::text
        OR
        "created_by"::text = auth.uid()::text
        OR
        EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id::text = auth.uid()::text
            AND (
                u.id = task."assigned_to"
                OR u.id = task."created_by"
                OR EXISTS (
                    SELECT 1 FROM public."Patient" p
                    WHERE p.id = task."patient_id"
                    AND p.id IN (
                        SELECT "patientProfileId" FROM public."User"
                        WHERE "organizationId" = u."organizationId"
                    )
                )
            )
        )
    );

-- ai_conversation: Permitir acceso a pacientes dueños
DROP POLICY IF EXISTS "Users can view their AI conversations" ON public.ai_conversation;
CREATE POLICY "Users can view their AI conversations"
    ON public.ai_conversation
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- consultation_share_link: Permitir acceso basado en token (se maneja en la API)
-- Pero también permitir a usuarios de la organización ver los links
DROP POLICY IF EXISTS "Users can view share links in their organization" ON public.consultation_share_link;
CREATE POLICY "Users can view share links in their organization"
    ON public.consultation_share_link
    FOR SELECT
    USING (
        "consultation_id" IN (
            SELECT id FROM public.consultation
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- medicalaccessgrant: Permitir acceso a pacientes y médicos relacionados
DROP POLICY IF EXISTS "Users can view medical access grants" ON public.medicalaccessgrant;
CREATE POLICY "Users can view medical access grants"
    ON public.medicalaccessgrant
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "doctor_id"::text = auth.uid()::text
    );

-- patientaccesskey: Permitir acceso a pacientes dueños
DROP POLICY IF EXISTS "Users can view their patient access keys" ON public.patientaccesskey;
CREATE POLICY "Users can view their patient access keys"
    ON public.patientaccesskey
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- pharmacy_order: Permitir acceso a usuarios de la misma organización
-- Nota: pharmacy_order NO tiene patient_id ni prescription_id, solo organization_id, supplier_id, created_by
DROP POLICY IF EXISTS "Users can view pharmacy orders in their organization" ON public.pharmacy_order;
CREATE POLICY "Users can view pharmacy orders in their organization"
    ON public.pharmacy_order
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "created_by"::text = auth.uid()::text
    );

-- pharmacy_order_item: Similar a pharmacy_order
-- Nota: pharmacy_order NO tiene patient_id, se accede a través de organization_id del order
DROP POLICY IF EXISTS "Users can view pharmacy order items in their organization" ON public.pharmacy_order_item;
CREATE POLICY "Users can view pharmacy order items in their organization"
    ON public.pharmacy_order_item
    FOR SELECT
    USING (
        "order_id" IN (
            SELECT id FROM public.pharmacy_order
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
            OR "created_by"::text = auth.uid()::text
        )
    );

-- pharmacy_inventory: Permitir lectura a usuarios autenticados (catálogo)
DROP POLICY IF EXISTS "Authenticated users can view pharmacy inventory" ON public.pharmacy_inventory;
CREATE POLICY "Authenticated users can view pharmacy inventory"
    ON public.pharmacy_inventory
    FOR SELECT
    TO authenticated
    USING (true);

-- prescription_dispense: Similar a prescription
DROP POLICY IF EXISTS "Users can view prescription dispenses in their organization" ON public.prescription_dispense;
CREATE POLICY "Users can view prescription dispenses in their organization"
    ON public.prescription_dispense
    FOR SELECT
    USING (
        "prescription_id" IN (
            SELECT id FROM public.prescription
            WHERE "patient_id" IN (
                SELECT "patientProfileId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- consultorio_role_audit_log: Permitir acceso a usuarios de la misma organización
DROP POLICY IF EXISTS "Users can view audit logs in their organization" ON public.consultorio_role_audit_log;
CREATE POLICY "Users can view audit logs in their organization"
    ON public.consultorio_role_audit_log
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- role_user_payment_methods: Permitir acceso a usuarios de la misma organización
DROP POLICY IF EXISTS "Users can view payment methods in their organization" ON public.role_user_payment_methods;
CREATE POLICY "Users can view payment methods in their organization"
    ON public.role_user_payment_methods
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- private_messages: Permitir acceso a usuarios que participan
-- Nota: private_messages tiene sender_id, receiver_id, organization_id, sender_type, receiver_type
DROP POLICY IF EXISTS "Users can view their private messages" ON public.private_messages;
CREATE POLICY "Users can view their private messages"
    ON public.private_messages
    FOR SELECT
    USING (
        "sender_id"::text = auth.uid()::text
        OR
        "receiver_id"::text = auth.uid()::text
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- POLÍTICAS PARA OPERACIONES DE ESCRITURA (INSERT, UPDATE, DELETE)
-- ============================================================================
-- Nota: Las políticas de escritura son más restrictivas que las de lectura
-- para mantener la seguridad mientras permiten funcionalidad necesaria

-- appointment: Permitir INSERT/UPDATE a médicos de la misma organización
DROP POLICY IF EXISTS "Medics can manage appointments in their organization" ON public.appointment;
CREATE POLICY "Medics can manage appointments in their organization"
    ON public.appointment
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- consultation: Similar
DROP POLICY IF EXISTS "Medics can manage consultations in their organization" ON public.consultation;
CREATE POLICY "Medics can manage consultations in their organization"
    ON public.consultation
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "doctor_id"::text = auth.uid()::text
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
        OR
        "doctor_id"::text = auth.uid()::text
    );

-- facturacion: Permitir INSERT/UPDATE a médicos de la misma organización
DROP POLICY IF EXISTS "Medics can manage billing in their organization" ON public.facturacion;
CREATE POLICY "Medics can manage billing in their organization"
    ON public.facturacion
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- prescription: Permitir INSERT/UPDATE a médicos de la misma organización
DROP POLICY IF EXISTS "Medics can manage prescriptions in their organization" ON public.prescription;
CREATE POLICY "Medics can manage prescriptions in their organization"
    ON public.prescription
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE c.id = prescription."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE c.id = prescription."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- lab_result: Similar
DROP POLICY IF EXISTS "Medics can manage lab results in their organization" ON public.lab_result;
CREATE POLICY "Medics can manage lab results in their organization"
    ON public.lab_result
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE c.id = lab_result."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."User" u ON u.id = c."doctor_id"
            WHERE c.id = lab_result."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
            )
        )
    );

-- Notification: Permitir INSERT a usuarios autenticados, UPDATE/DELETE a dueños
DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notification;
CREATE POLICY "Users can manage their notifications"
    ON public.notification
    FOR ALL
    USING (
        "userId"::text = auth.uid()::text
        OR
        "organizationId" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "userId"::text = auth.uid()::text
        OR
        "organizationId" IN (
            SELECT "organizationId" FROM public."User" WHERE id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Las APIs que usan SUPABASE_SERVICE_ROLE_KEY bypass RLS automáticamente
-- 2. Las APIs que usan createSupabaseServerClient() (con anon key) están sujetas a RLS
-- 3. Estas políticas son básicas y permisivas para no romper funcionalidad existente
-- 4. Se recomienda revisar y ajustar las políticas según necesidades específicas
-- 5. Para tablas con datos sensibles, considerar políticas más restrictivas
-- 6. Si alguna API falla después de aplicar RLS, revisar las políticas específicas
--    y ajustarlas según sea necesario
-- ============================================================================


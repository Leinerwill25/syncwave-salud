-- ============================================================================
-- Script COMPLETO de políticas RLS para todas las tablas
-- ============================================================================
-- Este script crea todas las políticas RLS necesarias para que la plataforma
-- funcione correctamente después del renombrado de tablas a minúsculas.
-- ============================================================================
-- IMPORTANTE: Ejecuta este script DESPUÉS de renombrar las tablas a minúsculas
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS (usando nombres nuevos - minúsculas)
-- ============================================================================

DO $$
DECLARE
    table_name TEXT;
    tables_to_enable_rls TEXT[] := ARRAY[
        'plan',
        'subscription_payments',
        'private_messages',
        'prescription_files',
        'medication_dose',
        'familygroupmember',
        'medicalrecord',
        'consultorio_roles',
        'invite',
        'clinic_profile',
        'familygroup',
        'subscription',
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
        'user',
        'unregisteredpatients',
        'conversation',
        'organization',
        'patient',
        'role_user_payment_methods'
    ];
BEGIN
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
-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES (tanto antiguas como nuevas)
-- ============================================================================

-- Eliminar políticas usando nombres antiguos (por si acaso)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('User', 'Patient', 'Organization', 'Plan', 'Invite', 'FamilyGroup', 'FamilyGroupMember', 'MedicalRecord', 'Notification', 'Subscription')
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                policy_record.policyname, 
                policy_record.tablename);
            RAISE NOTICE 'Política eliminada: % en %', policy_record.policyname, policy_record.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error eliminando política % en %: %', policy_record.policyname, policy_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Eliminar políticas usando nombres nuevos
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                policy_record.policyname, 
                policy_record.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar errores al eliminar políticas
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- 3. CREAR POLÍTICAS RLS PARA TODAS LAS TABLAS
-- ============================================================================

-- ============================================================================
-- TABLA: user (CRÍTICA PARA LOGIN)
-- ============================================================================

-- User: Ver su propio perfil (CRÍTICO para login - permite que /api/auth/me funcione)
CREATE POLICY "Users can view their own profile"
    ON public."user"
    FOR SELECT
    USING (
        "authId" = auth.uid()::text
        OR
        id::text = auth.uid()::text
    );

-- User: Actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
    ON public."user"
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

-- NOTA: Política eliminada para evitar recursión infinita
-- La política anterior "Users can view their own profile" ya permite que cada usuario
-- vea su propio perfil, que es suficiente para que /api/auth/me funcione.
--
-- Para permitir que los usuarios vean otros usuarios de su organización (para mensajería, roles, etc.),
-- esto se debe manejar en el código de la aplicación usando service_role_key o creando
-- una función SECURITY DEFINER que evite la recursión.
--
-- Si necesitas esta funcionalidad, puedes crear una función como esta:
--
-- CREATE OR REPLACE FUNCTION public.get_user_organization_id(p_auth_id TEXT)
-- RETURNS UUID
-- LANGUAGE sql
-- SECURITY DEFINER
-- STABLE
-- AS $$
--   SELECT "organizationId" FROM public."user" WHERE "authId" = p_auth_id LIMIT 1;
-- $$;
--
-- Y luego usar esa función en las políticas RLS para evitar la recursión.

-- ============================================================================
-- TABLA: organization
-- ============================================================================

-- Organization: Ver su propia organización
CREATE POLICY "Users can view their own organization"
    ON public.organization
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT "authId" FROM public."user" WHERE "organizationId" = organization.id
        )
        OR
        auth.uid() IN (
            SELECT id FROM public."user" WHERE "organizationId" = organization.id
        )
    );

-- Organization: Actualizar su propia organización (para administradores)
CREATE POLICY "Users can update their organization"
    ON public.organization
    FOR UPDATE
    USING (
        auth.uid()::text IN (
            SELECT "authId" FROM public."user" 
            WHERE "organizationId" = organization.id 
            AND role IN ('ADMIN', 'MEDICO')
        )
    )
    WITH CHECK (
        auth.uid()::text IN (
            SELECT "authId" FROM public."user" 
            WHERE "organizationId" = organization.id 
            AND role IN ('ADMIN', 'MEDICO')
        )
    );

-- ============================================================================
-- TABLA: patient
-- ============================================================================

-- Patient: Médicos pueden ver pacientes de su organización
CREATE POLICY "Medics can view patients in their organization"
    ON public.patient
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
            AND (
                -- Paciente pertenece a usuarios de la misma organización
                patient.id IN (
                    SELECT "patientProfileId" FROM public."user" 
                    WHERE "organizationId" = u."organizationId"
                )
                OR
                -- Paciente tiene citas/consultas con médicos de la organización
                EXISTS (
                    SELECT 1 FROM public.appointment a
                    WHERE a."patient_id" = patient.id
                    AND a."organization_id" = u."organizationId"
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.consultation c
                    WHERE c."patient_id" = patient.id
                    AND c."organization_id" = u."organizationId"
                )
            )
        )
        OR
        -- Pacientes pueden ver su propio perfil
        patient.id IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Patient: Insertar pacientes (médicos pueden crear pacientes)
CREATE POLICY "Medics can insert patients in their organization"
    ON public.patient
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role IN ('MEDICO', 'ADMIN')
        )
    );

-- Patient: Actualizar pacientes (médicos y pacientes mismos)
CREATE POLICY "Users can update patients"
    ON public.patient
    FOR UPDATE
    USING (
        -- Médicos pueden actualizar pacientes de su organización
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
            AND patient.id IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "organizationId" = u."organizationId"
            )
        )
        OR
        -- Pacientes pueden actualizar su propio perfil
        patient.id IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
            AND patient.id IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "organizationId" = u."organizationId"
            )
        )
        OR
        patient.id IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: appointment
-- ============================================================================

-- Appointment: Ver citas de la organización o propias
CREATE POLICY "Users can view appointments"
    ON public.appointment
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Appointment: Insertar/actualizar citas (médicos de la organización)
CREATE POLICY "Medics can manage appointments"
    ON public.appointment
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: consultation
-- ============================================================================

-- Consultation: Ver consultas de la organización o propias
CREATE POLICY "Users can view consultations"
    ON public.consultation
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Consultation: Insertar/actualizar consultas (médicos de la organización)
CREATE POLICY "Medics can manage consultations"
    ON public.consultation
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: medic_profile
-- ============================================================================

-- Medic_profile: Ver perfil propio o perfiles de médicos de la organización
CREATE POLICY "Users can view medic profiles"
    ON public.medic_profile
    FOR SELECT
    USING (
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "organizationId" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- Medic_profile: Insertar/actualizar perfil propio
CREATE POLICY "Medics can manage their own profile"
    ON public.medic_profile
    FOR ALL
    USING (
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: prescription
-- ============================================================================

-- Prescription: Ver prescripciones relacionadas
CREATE POLICY "Users can view prescriptions"
    ON public.prescription
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = prescription."consultation_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = prescription."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- Prescription: Insertar/actualizar prescripciones (médicos de la organización)
CREATE POLICY "Medics can manage prescriptions"
    ON public.prescription
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = prescription."consultation_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = prescription."consultation_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    );

-- ============================================================================
-- TABLA: prescription_item
-- ============================================================================

-- Prescription_item: Ver items de prescripciones relacionadas
CREATE POLICY "Users can view prescription items"
    ON public.prescription_item
    FOR SELECT
    USING (
        "prescription_id" IN (
            SELECT id FROM public.prescription
            WHERE "patient_id" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
            OR EXISTS (
                SELECT 1 FROM public.consultation c
                JOIN public."user" u ON u.id = c."doctor_id"
                WHERE c.id = prescription."consultation_id"
                AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            )
        )
    );

-- Prescription_item: Insertar/actualizar items (médicos de la organización)
CREATE POLICY "Medics can manage prescription items"
    ON public.prescription_item
    FOR ALL
    USING (
        "prescription_id" IN (
            SELECT id FROM public.prescription
            WHERE EXISTS (
                SELECT 1 FROM public.consultation c
                JOIN public."user" u ON u.id = c."doctor_id"
                WHERE c.id = prescription."consultation_id"
                AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            )
        )
    )
    WITH CHECK (
        "prescription_id" IN (
            SELECT id FROM public.prescription
            WHERE EXISTS (
                SELECT 1 FROM public.consultation c
                JOIN public."user" u ON u.id = c."doctor_id"
                WHERE c.id = prescription."consultation_id"
                AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            )
        )
    );

-- ============================================================================
-- TABLA: lab_result
-- ============================================================================

-- Lab_result: Ver resultados de laboratorio relacionados
CREATE POLICY "Users can view lab results"
    ON public.lab_result
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = lab_result."consultation_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = lab_result."consultation_id"
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- Lab_result: Insertar/actualizar resultados (médicos de la organización)
CREATE POLICY "Medics can manage lab results"
    ON public.lab_result
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = lab_result."consultation_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c.id = lab_result."consultation_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    );

-- ============================================================================
-- TABLA: facturacion
-- ============================================================================

-- Facturacion: Ver facturas de la organización o propias
CREATE POLICY "Users can view billing"
    ON public.facturacion
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Facturacion: Insertar/actualizar facturas (médicos de la organización)
CREATE POLICY "Medics can manage billing"
    ON public.facturacion
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: notification
-- ============================================================================

-- Notification: Ver notificaciones de la organización
CREATE POLICY "Users can view their notifications"
    ON public.notification
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "userId" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Notification: Insertar/actualizar notificaciones (autenticados pueden crear, solo de su org pueden actualizar)
CREATE POLICY "Users can manage their notifications"
    ON public.notification
    FOR ALL
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "userId" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "userId" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: invite
-- ============================================================================

-- Invite: Ver invitaciones de la organización
CREATE POLICY "Users can view invites in their organization"
    ON public.invite
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Invite: Insertar/actualizar invitaciones (administradores de la organización)
CREATE POLICY "Users can manage invites in their organization"
    ON public.invite
    FOR ALL
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    )
    WITH CHECK (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    );

-- ============================================================================
-- TABLA: familygroup
-- ============================================================================

-- Familygroup: Ver grupos familiares propios
CREATE POLICY "Users can view their family groups"
    ON public.familygroup
    FOR SELECT
    USING (
        "ownerId" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Familygroup: Insertar/actualizar grupos familiares (pacientes dueños)
CREATE POLICY "Users can manage their family groups"
    ON public.familygroup
    FOR ALL
    USING (
        "ownerId" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "ownerId" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: familygroupmember
-- ============================================================================

-- FamilyGroupMember: Ver miembros de grupos familiares propios
CREATE POLICY "Users can view family group members"
    ON public.familygroupmember
    FOR SELECT
    USING (
        "familyGroupId" IN (
            SELECT id FROM public.familygroup
            WHERE "ownerId" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
        OR
        "patientId" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- FamilyGroupMember: Insertar/actualizar miembros (dueños de grupos familiares)
CREATE POLICY "Users can manage family group members"
    ON public.familygroupmember
    FOR ALL
    USING (
        "familyGroupId" IN (
            SELECT id FROM public.familygroup
            WHERE "ownerId" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    )
    WITH CHECK (
        "familyGroupId" IN (
            SELECT id FROM public.familygroup
            WHERE "ownerId" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- TABLA: medicalrecord
-- ============================================================================

-- MedicalRecord: Ver registros médicos relacionados
CREATE POLICY "Users can view medical records"
    ON public.medicalrecord
    FOR SELECT
    USING (
        "patientId" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c."medical_record_id" = medicalrecord.id
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
        OR
        EXISTS (
            SELECT 1 FROM public.consultation c
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE c."medical_record_id" = medicalrecord.id
            AND u."organizationId" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- MedicalRecord: Insertar/actualizar registros (médicos de la organización)
CREATE POLICY "Medics can manage medical records"
    ON public.medicalrecord
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
            AND medicalrecord."patientId" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "organizationId" = u."organizationId"
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
            AND medicalrecord."patientId" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "organizationId" = u."organizationId"
            )
        )
    );

-- ============================================================================
-- TABLA: message
-- ============================================================================

-- Message: Ver mensajes propios o de conversaciones relacionadas
CREATE POLICY "Users can view their messages"
    ON public.message
    FOR SELECT
    USING (
        "sender_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "recipient_user_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Message: Insertar mensajes (usuarios autenticados)
CREATE POLICY "Users can insert messages"
    ON public.message
    FOR INSERT
    WITH CHECK (
        "sender_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        auth.uid() IS NOT NULL
    );

-- Message: Actualizar mensajes propios (para marcar como leído, etc.)
CREATE POLICY "Users can update their messages"
    ON public.message
    FOR UPDATE
    USING (
        "sender_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "recipient_user_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "sender_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "recipient_user_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: conversation
-- ============================================================================

-- Conversation: Ver conversaciones de la organización
CREATE POLICY "Users can view conversations"
    ON public.conversation
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Conversation: Insertar/actualizar conversaciones (usuarios de la organización)
CREATE POLICY "Users can manage conversations"
    ON public.conversation
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: task
-- ============================================================================

-- Task: Ver tareas asignadas o relacionadas
CREATE POLICY "Users can view tasks"
    ON public.task
    FOR SELECT
    USING (
        "assigned_to" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "created_by" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND (
                task."assigned_to" IN (
                    SELECT id FROM public."user" WHERE "organizationId" = u."organizationId"
                )
                OR
                task."created_by" IN (
                    SELECT id FROM public."user" WHERE "organizationId" = u."organizationId"
                )
            )
        )
    );

-- Task: Insertar/actualizar tareas (usuarios de la organización)
CREATE POLICY "Users can manage tasks"
    ON public.task
    FOR ALL
    USING (
        "created_by" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND (
                task."assigned_to" IN (
                    SELECT id FROM public."user" WHERE "organizationId" = u."organizationId"
                )
                OR
                task."created_by" IN (
                    SELECT id FROM public."user" WHERE "organizationId" = u."organizationId"
                )
            )
        )
    )
    WITH CHECK (
        "created_by" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND (
                task."assigned_to" IN (
                    SELECT id FROM public."user" WHERE "organizationId" = u."organizationId"
                )
                OR
                task."created_by" IN (
                    SELECT id FROM public."user" WHERE "organizationId" = u."organizationId"
                )
            )
        )
    );

-- ============================================================================
-- TABLA: unregisteredpatients
-- ============================================================================

-- Unregisteredpatients: Ver pacientes no registrados de la organización
CREATE POLICY "Medics can view unregistered patients"
    ON public.unregisteredpatients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
            AND (
                EXISTS (
                    SELECT 1 FROM public.appointment a
                    WHERE a."unregistered_patient_id" = unregisteredpatients.id
                    AND a."organization_id" = u."organizationId"
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.consultation c
                    WHERE c."unregistered_patient_id" = unregisteredpatients.id
                    AND c."organization_id" = u."organizationId"
                )
            )
        )
    );

-- Unregisteredpatients: Insertar/actualizar (médicos de la organización)
CREATE POLICY "Medics can manage unregistered patients"
    ON public.unregisteredpatients
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role = 'MEDICO'
        )
    );

-- ============================================================================
-- TABLA: clinic_profile
-- ============================================================================

-- Clinic_profile: Ver perfiles de clínicas de la organización
CREATE POLICY "Users can view clinic profiles"
    ON public.clinic_profile
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        -- Permitir ver perfiles públicos para búsqueda (si hay campo public)
        TRUE  -- Temporalmente permisivo para búsqueda de clínicas
    );

-- Clinic_profile: Insertar/actualizar (administradores de la organización)
CREATE POLICY "Users can manage clinic profiles"
    ON public.clinic_profile
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    );

-- ============================================================================
-- TABLA: plan
-- ============================================================================

-- Plan: Ver planes (público para usuarios autenticados)
CREATE POLICY "Authenticated users can view plans"
    ON public.plan
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- TABLA: subscription
-- ============================================================================

-- Subscription: Ver suscripciones de la organización o propias
CREATE POLICY "Users can view subscriptions"
    ON public.subscription
    FOR SELECT
    USING (
        "organizationId" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "patientId" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: subscription_payments
-- ============================================================================

-- Subscription_payments: Ver pagos de la organización
CREATE POLICY "Users can view subscription payments"
    ON public.subscription_payments
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "user_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "verified_by" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: consultorio_roles
-- ============================================================================

-- Consultorio_roles: Ver roles de la organización
CREATE POLICY "Users can view roles in their organization"
    ON public.consultorio_roles
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Consultorio_roles: Insertar/actualizar roles (administradores)
CREATE POLICY "Admins can manage roles in their organization"
    ON public.consultorio_roles
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    );

-- ============================================================================
-- TABLA: consultorio_role_users
-- ============================================================================

-- Consultorio_role_users: Ver usuarios de roles de la organización
CREATE POLICY "Users can view role users in their organization"
    ON public.consultorio_role_users
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Consultorio_role_users: Insertar/actualizar (administradores)
CREATE POLICY "Admins can manage role users in their organization"
    ON public.consultorio_role_users
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            AND role IN ('ADMIN', 'MEDICO')
        )
    );

-- ============================================================================
-- TABLA: consultorio_role_permissions
-- ============================================================================

-- Consultorio_role_permissions: Ver permisos de roles de la organización
CREATE POLICY "Users can view role permissions in their organization"
    ON public.consultorio_role_permissions
    FOR SELECT
    USING (
        "role_id" IN (
            SELECT id FROM public.consultorio_roles
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- Consultorio_role_permissions: Insertar/actualizar (administradores)
CREATE POLICY "Admins can manage role permissions in their organization"
    ON public.consultorio_role_permissions
    FOR ALL
    USING (
        "role_id" IN (
            SELECT id FROM public.consultorio_roles
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
                AND role IN ('ADMIN', 'MEDICO')
            )
        )
    )
    WITH CHECK (
        "role_id" IN (
            SELECT id FROM public.consultorio_roles
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
                AND role IN ('ADMIN', 'MEDICO')
            )
        )
    );

-- ============================================================================
-- TABLA: consultorio_role_audit_log
-- ============================================================================

-- Consultorio_role_audit_log: Ver logs de auditoría de la organización
CREATE POLICY "Users can view audit logs in their organization"
    ON public.consultorio_role_audit_log
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Consultorio_role_audit_log: Insertar (sistema)
CREATE POLICY "System can insert audit logs"
    ON public.consultorio_role_audit_log
    FOR INSERT
    WITH CHECK (true);  -- Permitir inserción desde APIs

-- ============================================================================
-- TABLA: consultation_files
-- ============================================================================

-- Consultation_files: Ver archivos de consultas relacionadas
CREATE POLICY "Users can view consultation files"
    ON public.consultation_files
    FOR SELECT
    USING (
        "consultation_id" IN (
            SELECT id FROM public.consultation
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
            OR "patient_id" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
            OR "doctor_id" IN (
                SELECT id FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- Consultation_files: Insertar/actualizar (médicos de la organización)
CREATE POLICY "Medics can manage consultation files"
    ON public.consultation_files
    FOR ALL
    USING (
        "consultation_id" IN (
            SELECT id FROM public.consultation
            WHERE "doctor_id" IN (
                SELECT id FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    )
    WITH CHECK (
        "consultation_id" IN (
            SELECT id FROM public.consultation
            WHERE "doctor_id" IN (
                SELECT id FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- TABLA: prescription_files
-- ============================================================================

-- Prescription_files: Ver archivos de prescripciones relacionadas
CREATE POLICY "Users can view prescription files"
    ON public.prescription_files
    FOR SELECT
    USING (
        "prescription_id" IN (
            SELECT id FROM public.prescription
            WHERE "patient_id" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
            OR EXISTS (
                SELECT 1 FROM public.consultation c
                JOIN public."user" u ON u.id = c."doctor_id"
                WHERE c.id = prescription."consultation_id"
                AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            )
        )
    );

-- ============================================================================
-- TABLA: medication
-- ============================================================================

-- Medication: Ver catálogo de medicamentos (público para autenticados)
CREATE POLICY "Authenticated users can view medications"
    ON public.medication
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- TABLA: medication_dose
-- ============================================================================

-- Medication_dose: Ver dosis de medicamentos relacionados
CREATE POLICY "Users can view medication doses"
    ON public.medication_dose
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.prescription p
            JOIN public.consultation c ON c.id = p."consultation_id"
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE p.id = medication_dose."prescription_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    );

-- Medication_dose: Insertar/actualizar (médicos de la organización)
CREATE POLICY "Medics can manage medication doses"
    ON public.medication_dose
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.prescription p
            JOIN public.consultation c ON c.id = p."consultation_id"
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE p.id = medication_dose."prescription_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.prescription p
            JOIN public.consultation c ON c.id = p."consultation_id"
            JOIN public."user" u ON u.id = c."doctor_id"
            WHERE p.id = medication_dose."prescription_id"
            AND (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
        )
    );

-- ============================================================================
-- TABLA: ai_conversation
-- ============================================================================

-- Ai_conversation: Ver conversaciones AI propias
CREATE POLICY "Users can view their AI conversations"
    ON public.ai_conversation
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Ai_conversation: Insertar/actualizar (pacientes)
CREATE POLICY "Users can manage their AI conversations"
    ON public.ai_conversation
    FOR ALL
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: consultation_share_link
-- ============================================================================

-- Consultation_share_link: Ver links de consultas relacionadas
CREATE POLICY "Users can view share links"
    ON public.consultation_share_link
    FOR SELECT
    USING (
        "consultation_id" IN (
            SELECT id FROM public.consultation
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
            OR "patient_id" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
        OR
        -- Permitir acceso por token (se valida en la API)
        TRUE
    );

-- ============================================================================
-- TABLA: medicalaccessgrant
-- ============================================================================

-- Medicalaccessgrant: Ver grants de acceso médico relacionados
CREATE POLICY "Users can view medical access grants"
    ON public.medicalaccessgrant
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Medicalaccessgrant: Insertar/actualizar (pacientes y médicos)
CREATE POLICY "Users can manage medical access grants"
    ON public.medicalaccessgrant
    FOR ALL
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "doctor_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: patientaccesskey
-- ============================================================================

-- Patientaccesskey: Ver keys de acceso propias
CREATE POLICY "Users can view their patient access keys"
    ON public.patientaccesskey
    FOR SELECT
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Patientaccesskey: Insertar/actualizar (pacientes)
CREATE POLICY "Users can manage their patient access keys"
    ON public.patientaccesskey
    FOR ALL
    USING (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "patient_id" IN (
            SELECT "patientProfileId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: pharmacy_order
-- ============================================================================

-- Pharmacy_order: Ver órdenes de farmacia de la organización
CREATE POLICY "Users can view pharmacy orders"
    ON public.pharmacy_order
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        "created_by" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Pharmacy_order: Insertar/actualizar (usuarios de la organización)
CREATE POLICY "Users can manage pharmacy orders"
    ON public.pharmacy_order
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: pharmacy_order_item
-- ============================================================================

-- Pharmacy_order_item: Ver items de órdenes de farmacia relacionadas
CREATE POLICY "Users can view pharmacy order items"
    ON public.pharmacy_order_item
    FOR SELECT
    USING (
        "order_id" IN (
            SELECT id FROM public.pharmacy_order
            WHERE "organization_id" IN (
                SELECT "organizationId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- TABLA: pharmacy_inventory
-- ============================================================================

-- Pharmacy_inventory: Ver inventario (público para autenticados)
CREATE POLICY "Authenticated users can view pharmacy inventory"
    ON public.pharmacy_inventory
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- TABLA: prescription_dispense
-- ============================================================================

-- Prescription_dispense: Ver dispensaciones relacionadas
CREATE POLICY "Users can view prescription dispenses"
    ON public.prescription_dispense
    FOR SELECT
    USING (
        "prescription_id" IN (
            SELECT id FROM public.prescription
            WHERE "patient_id" IN (
                SELECT "patientProfileId" FROM public."user" 
                WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
            )
        )
    );

-- ============================================================================
-- TABLA: role_user_payment_methods
-- ============================================================================

-- Role_user_payment_methods: Ver métodos de pago de la organización
CREATE POLICY "Users can view payment methods in their organization"
    ON public.role_user_payment_methods
    FOR SELECT
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Role_user_payment_methods: Insertar/actualizar (usuarios de roles de la organización)
CREATE POLICY "Role users can manage payment methods"
    ON public.role_user_payment_methods
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- TABLA: private_messages
-- ============================================================================

-- Private_messages: Ver mensajes privados propios
CREATE POLICY "Users can view their private messages"
    ON public.private_messages
    FOR SELECT
    USING (
        "sender_id"::text = auth.uid()::text
        OR
        "receiver_id"::text = auth.uid()::text
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Private_messages: Insertar/actualizar (usuarios autenticados)
CREATE POLICY "Users can manage private messages"
    ON public.private_messages
    FOR ALL
    USING (
        "sender_id"::text = auth.uid()::text
        OR
        "receiver_id"::text = auth.uid()::text
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        "sender_id"::text = auth.uid()::text
        OR
        "receiver_id"::text = auth.uid()::text
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- ============================================================================
-- VERIFICAR QUE RLS ESTÁ HABILITADO
-- ============================================================================

-- Verificar que todas las tablas tienen RLS habilitado
DO $$
DECLARE
    table_record RECORD;
    rls_enabled BOOLEAN;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN (
            'user', 'organization', 'patient', 'appointment', 'consultation',
            'prescription', 'prescription_item', 'lab_result', 'facturacion',
            'notification', 'invite', 'familygroup', 'familygroupmember',
            'medicalrecord', 'medic_profile', 'message', 'conversation',
            'task', 'unregisteredpatients', 'clinic_profile', 'plan',
            'subscription', 'subscription_payments', 'consultorio_roles',
            'consultorio_role_users', 'consultorio_role_permissions',
            'consultorio_role_audit_log', 'consultation_files',
            'prescription_files', 'medication', 'medication_dose',
            'ai_conversation', 'consultation_share_link', 'medicalaccessgrant',
            'patientaccesskey', 'pharmacy_order', 'pharmacy_order_item',
            'pharmacy_inventory', 'prescription_dispense',
            'role_user_payment_methods', 'private_messages'
        )
    LOOP
        SELECT rowsecurity INTO rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = table_record.tablename;
        
        IF NOT rls_enabled THEN
            RAISE WARNING 'RLS no está habilitado en la tabla: %', table_record.tablename;
        ELSE
            RAISE NOTICE 'RLS habilitado en: %', table_record.tablename;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- IMPORTANTE: Revisa los resultados antes de hacer COMMIT
-- ============================================================================
-- Si todo está bien, descomenta la siguiente línea para hacer commit:
COMMIT;

-- Si hay problemas, ejecuta ROLLBACK para revertir todos los cambios:
-- ROLLBACK;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
-- ============================================================================
-- Ejecuta estos comandos para verificar que las políticas se crearon:
--
-- -- Ver todas las políticas creadas
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- -- Verificar RLS está habilitado
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('user', 'organization', 'patient', 'appointment', 'consultation')
-- ORDER BY tablename;
-- ============================================================================


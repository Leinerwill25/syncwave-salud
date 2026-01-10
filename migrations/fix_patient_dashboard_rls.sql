-- ============================================================================
-- Script para validar y corregir políticas RLS para el dashboard de pacientes
-- Este script asegura que los pacientes puedan ver sus propios datos
-- ============================================================================

-- Verificar que RLS esté habilitado en las tablas necesarias
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'patient'
    ) THEN
        RAISE EXCEPTION 'Tabla patient no existe';
    END IF;
END $$;

-- ============================================================================
-- TABLA: patient
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Patients can view their own profile" ON public.patient;
DROP POLICY IF EXISTS "Patients can update their own profile" ON public.patient;
DROP POLICY IF EXISTS "Medics can view patients in their organization" ON public.patient;
DROP POLICY IF EXISTS "Users can update patients" ON public.patient;
DROP POLICY IF EXISTS "Medics can insert patients in their organization" ON public.patient;

-- Política 1: Pacientes pueden ver su propio perfil
CREATE POLICY "Patients can view their own profile"
    ON public.patient
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = patient.id
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- Política 2: Médicos pueden ver pacientes de su organización
CREATE POLICY "Medics can view patients in their organization"
    ON public.patient
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE (u."authId" = auth.uid()::text OR u.id::text = auth.uid()::text)
            AND u."organizationId" IS NOT NULL
            AND u.role IN ('MEDICO', 'ADMIN')
            AND (
                -- Paciente pertenece a usuarios de la misma organización
                patient.id IN (
                    SELECT "patientProfileId" FROM public."user" 
                    WHERE "organizationId" = u."organizationId"
                    AND "patientProfileId" IS NOT NULL
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
    );

-- Política 3: Pacientes pueden actualizar su propio perfil
CREATE POLICY "Patients can update their own profile"
    ON public.patient
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = patient.id
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = patient.id
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- Política 4: Médicos pueden insertar pacientes
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

-- ============================================================================
-- TABLA: appointment
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Patients can view their appointments" ON public.appointment;
DROP POLICY IF EXISTS "Medics can view appointments in their organization" ON public.appointment;
DROP POLICY IF EXISTS "Users can view appointments" ON public.appointment;
DROP POLICY IF EXISTS "Medics can manage appointments" ON public.appointment;

-- Política 1: Pacientes pueden ver sus propias citas
CREATE POLICY "Patients can view their appointments"
    ON public.appointment
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = appointment."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- Política 2: Médicos y personal pueden ver citas de su organización
CREATE POLICY "Medics can view appointments in their organization"
    ON public.appointment
    FOR SELECT
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
    );

-- Política 3: Médicos pueden gestionar citas
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
-- TABLA: prescription
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Patients can view their prescriptions" ON public.prescription;
DROP POLICY IF EXISTS "Medics can view prescriptions from their consultations" ON public.prescription;
DROP POLICY IF EXISTS "Users can view prescriptions" ON public.prescription;
DROP POLICY IF EXISTS "Medics can manage prescriptions" ON public.prescription;

-- Política 1: Pacientes pueden ver sus propias recetas
CREATE POLICY "Patients can view their prescriptions"
    ON public.prescription
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = prescription."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- Política 2: Médicos pueden ver recetas de sus consultas
CREATE POLICY "Medics can view prescriptions from their consultations"
    ON public.prescription
    FOR SELECT
    USING (
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

-- Política 3: Médicos pueden gestionar recetas
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

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Patients can view their prescription items" ON public.prescription_item;
DROP POLICY IF EXISTS "Medics can view prescription items from their consultations" ON public.prescription_item;
DROP POLICY IF EXISTS "Users can view prescription items" ON public.prescription_item;
DROP POLICY IF EXISTS "Medics can manage prescription items" ON public.prescription_item;

-- Política 1: Pacientes pueden ver items de sus recetas
CREATE POLICY "Patients can view their prescription items"
    ON public.prescription_item
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.prescription p
            JOIN public."user" u ON u."patientProfileId" = p."patient_id"
            WHERE p.id = prescription_item."prescription_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- Política 2: Médicos pueden ver items de recetas de sus consultas
CREATE POLICY "Medics can view prescription items from their consultations"
    ON public.prescription_item
    FOR SELECT
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
    );

-- Política 3: Médicos pueden gestionar items de recetas
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

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Patients can view their lab results" ON public.lab_result;
DROP POLICY IF EXISTS "Medics can view lab results from their consultations" ON public.lab_result;
DROP POLICY IF EXISTS "Users can view lab results" ON public.lab_result;
DROP POLICY IF EXISTS "Medics can manage lab results" ON public.lab_result;

-- Política 1: Pacientes pueden ver sus propios resultados de laboratorio
CREATE POLICY "Patients can view their lab results"
    ON public.lab_result
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = lab_result."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- Política 2: Médicos pueden ver resultados de sus consultas
CREATE POLICY "Medics can view lab results from their consultations"
    ON public.lab_result
    FOR SELECT
    USING (
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

-- Política 3: Médicos pueden gestionar resultados
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
-- TABLA: message
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Patients can view their messages" ON public.message;
DROP POLICY IF EXISTS "Users can view their messages" ON public.message;
DROP POLICY IF EXISTS "Users can insert messages" ON public.message;
DROP POLICY IF EXISTS "Users can update their messages" ON public.message;

-- Política 1: Pacientes pueden ver sus propios mensajes
CREATE POLICY "Patients can view their messages"
    ON public.message
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = message."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
        OR
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

-- Política 2: Usuarios pueden insertar mensajes
CREATE POLICY "Users can insert messages"
    ON public.message
    FOR INSERT
    WITH CHECK (
        "sender_id" IN (
            SELECT id FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = message."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
        OR
        auth.uid() IS NOT NULL
    );

-- Política 3: Usuarios pueden actualizar sus mensajes
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
        OR
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = message."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
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
        OR
        EXISTS (
            SELECT 1 FROM public."user" u
            WHERE u."patientProfileId" = message."patient_id"
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- ============================================================================
-- TABLA: conversation
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Patients can view their conversations" ON public.conversation;
DROP POLICY IF EXISTS "Users can view conversations" ON public.conversation;
DROP POLICY IF EXISTS "Users can manage conversations" ON public.conversation;

-- Política 1: Pacientes pueden ver conversaciones donde participan
CREATE POLICY "Patients can view their conversations"
    ON public.conversation
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.message m
            JOIN public."user" u ON u."patientProfileId" = m."patient_id"
            WHERE m."conversation_id" = conversation.id
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
        OR
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
    );

-- Política 2: Usuarios pueden gestionar conversaciones
CREATE POLICY "Users can manage conversations"
    ON public.conversation
    FOR ALL
    USING (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.message m
            JOIN public."user" u ON u."patientProfileId" = m."patient_id"
            WHERE m."conversation_id" = conversation.id
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    )
    WITH CHECK (
        "organization_id" IN (
            SELECT "organizationId" FROM public."user" 
            WHERE "authId" = auth.uid()::text OR id::text = auth.uid()::text
        )
        OR
        EXISTS (
            SELECT 1 FROM public.message m
            JOIN public."user" u ON u."patientProfileId" = m."patient_id"
            WHERE m."conversation_id" = conversation.id
            AND (
                u."authId" = auth.uid()::text 
                OR u.id::text = auth.uid()::text
            )
            AND u.role = 'PACIENTE'
        )
    );

-- ============================================================================
-- Asegurar que RLS esté habilitado
-- ============================================================================

ALTER TABLE IF EXISTS public.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescription ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescription_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lab_result ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.message ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verificación final
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Verificar políticas en patient
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'patient';
    
    IF policy_count < 4 THEN
        RAISE WARNING 'Esperábamos al menos 4 políticas en patient, encontramos %', policy_count;
    END IF;
    
    RAISE NOTICE 'Políticas RLS configuradas correctamente para pacientes';
    RAISE NOTICE 'Políticas en patient: %', policy_count;
END $$;


-- ============================================================================
-- MIGRATION: Fix RLS policies for medical_report_templates
-- ============================================================================

-- Drop old policies to avoid collisions
DROP POLICY IF EXISTS "Users can view templates of their organization" ON public.medical_report_templates;
DROP POLICY IF EXISTS "Admins can manage organization templates" ON public.medical_report_templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON public.medical_report_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.medical_report_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.medical_report_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.medical_report_templates;

-- 1. Redefine SELECT policy (everyone in org or owner)
CREATE POLICY "Select policy for medical_report_templates" 
    ON public.medical_report_templates 
    FOR SELECT 
    USING (
        -- Personales
        (user_id IS NOT NULL AND user_id IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text))
        OR
        -- Organizacionales
        (organization_id IS NOT NULL AND 
         organization_id IN (SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text)
        )
    );

-- 2. Redefine ALL (Management) policy for Org Templates
-- We allow ADMIN and RECEPCION (Assistant) roles to manage ORG templates
-- IMPORTANT: Using CASE-SENSITIVE "organizationId" as found in Database.sql
CREATE POLICY "Manage org templates" 
    ON public.medical_report_templates 
    FOR ALL 
    USING (
        organization_id IS NOT NULL AND 
        organization_id IN (
            SELECT "organizationId" FROM public.users 
            WHERE "authId" = auth.uid()::text 
            AND role IN ('ADMIN', 'RECEPCION')
        )
    );

-- 3. Redefine ALL (Management) policy for Personal Templates
CREATE POLICY "Manage personal templates" 
    ON public.medical_report_templates 
    FOR ALL 
    USING (
        user_id IS NOT NULL AND 
        user_id IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text)
    );

-- Verification: check if policies are applied correctly
-- Note: Make sure the role names match exactly what's in the 'users' table

-- ============================================================================
-- MIGRATION: Add organization policies to medical_report_templates
-- ============================================================================

-- RLS policies for organization-level templates

-- 1. Everyone in the organization can view organization templates
CREATE POLICY "Users can view templates of their organization" 
    ON public.medical_report_templates 
    FOR SELECT 
    USING (
        organization_id IS NOT NULL AND 
        organization_id IN (SELECT "organizationId" FROM public.users WHERE "authId" = auth.uid()::text)
    );

-- 2. Organization admins can manage their organization templates
CREATE POLICY "Admins can manage organization templates" 
    ON public.medical_report_templates 
    FOR ALL 
    USING (
        organization_id IS NOT NULL AND 
        organization_id IN (
            SELECT "organizationId" FROM public.users 
            WHERE "authId" = auth.uid()::text AND role = 'ADMIN'
        )
    );

-- ============================================================================
-- MIGRATION: Create medical_report_templates table
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.medical_report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership: Linked to a specific user (doctor) or organization
    -- For this feature, we prioritize user_id for independence
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organization(id) ON DELETE CASCADE,
    
    -- Template Details
    name TEXT NOT NULL DEFAULT 'Informe Genérico',
    logo_url TEXT,
    header_text TEXT,
    footer_text TEXT,
    
    -- Styling
    primary_color TEXT DEFAULT '#0F172A', -- Slate 900
    secondary_color TEXT DEFAULT '#3B82F6', -- Blue 500
    font_family TEXT DEFAULT 'Arial', -- Arial, Times New Roman, Calibri, etc.
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: user_id or organization_id must be present
    CONSTRAINT owner_check CHECK (user_id IS NOT NULL OR organization_id IS NOT NULL)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_medical_report_templates_user ON public.medical_report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_report_templates_org ON public.medical_report_templates(organization_id);

-- Enable RLS
ALTER TABLE public.medical_report_templates ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own templates
CREATE POLICY "Users can view their own templates" 
    ON public.medical_report_templates 
    FOR SELECT 
    USING (
        (user_id IS NOT NULL AND user_id::text = auth.uid()::text)
        OR
        (user_id IS NOT NULL AND user_id IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text))
    );

-- 2. Users can insert their own templates
CREATE POLICY "Users can create their own templates" 
    ON public.medical_report_templates 
    FOR INSERT 
    WITH CHECK (
        (user_id IS NOT NULL AND user_id::text = auth.uid()::text)
        OR
        (user_id IS NOT NULL AND user_id IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text))
    );

-- 3. Users can update their own templates
CREATE POLICY "Users can update their own templates" 
    ON public.medical_report_templates 
    FOR UPDATE 
    USING (
        (user_id IS NOT NULL AND user_id::text = auth.uid()::text)
        OR
        (user_id IS NOT NULL AND user_id IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text))
    );

-- 4. Users can delete their own templates
CREATE POLICY "Users can delete their own templates" 
    ON public.medical_report_templates 
    FOR DELETE 
    USING (
        (user_id IS NOT NULL AND user_id::text = auth.uid()::text)
        OR
        (user_id IS NOT NULL AND user_id IN (SELECT id FROM public.users WHERE "authId" = auth.uid()::text))
    );

COMMIT;

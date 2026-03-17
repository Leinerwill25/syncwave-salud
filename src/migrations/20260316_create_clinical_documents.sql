-- =====================================================
-- MIGRACIÓN: CREACIÓN DE TABLAS DE DOCUMENTOS CLÍNICOS Y AUDITORÍA
-- =====================================================

-- 1. Tabla: clinical_documents
-- Propósito: Almacenar metadatos de documentos cargados para pacientes
CREATE TABLE IF NOT EXISTS public.clinical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patient(id) ON DELETE CASCADE,
  unregistered_patient_id UUID REFERENCES public.unregisteredpatients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.admin_consultations(id) ON DELETE SET NULL,
  
  -- Constraint: Debe tener al menos uno de los dos
  CONSTRAINT fk_document_patient CHECK (patient_id IS NOT NULL OR unregistered_patient_id IS NOT NULL),
  
  document_type TEXT NOT NULL, -- 'HISTORIA_CLINICA', 'IMAGEN', 'REPORTE', etc.
  description TEXT,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- URL o path en Storage
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices clinical_documents
CREATE INDEX IF NOT EXISTS idx_clinical_docs_org ON public.clinical_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_patient ON public.clinical_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_docs_type ON public.clinical_documents(document_type);

-- 2. Tabla: admin_audit_logs
-- Propósito: Registro de acciones administrativas para auditoría
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  
  action TEXT NOT NULL, -- 'UPLOAD_DOCUMENT', 'DELETE_PATIENT', etc.
  table_name TEXT,
  record_id UUID,
  details TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices admin_audit_logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_org ON public.admin_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON public.admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);

-- Enable RLS
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Admin can see all in their org)
CREATE POLICY "Admins can manage clinical documents in their org"
ON public.clinical_documents FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can see audit logs in their org"
ON public.admin_audit_logs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

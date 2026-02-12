-- =====================================================
-- SISTEMA DE CARGA PÚBLICA DE RESULTADOS DE LABORATORIO
-- =====================================================
-- Fecha: 10 de Febrero de 2026
-- Sistema: ASHIRA SOFTWARE
-- Propósito: Permitir a laboratorios externos cargar resultados
--            médicos a través de links públicos únicos por consultorio

-- =====================================================
-- TABLA 1: lab_upload_link
-- =====================================================
-- Propósito: Almacenar links únicos por consultorio para carga pública
-- Cada consultorio tiene un token único para compartir con laboratorios

CREATE TABLE IF NOT EXISTS public.lab_upload_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  -- Constraint: Solo un link activo por organización
  CONSTRAINT unique_active_link_per_org UNIQUE (organization_id, is_active)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_lab_upload_link_org ON public.lab_upload_link(organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_upload_link_token ON public.lab_upload_link(token) WHERE is_active = true;

-- Comentarios
COMMENT ON TABLE public.lab_upload_link IS 'Links públicos únicos por consultorio para carga de resultados de laboratorio';
COMMENT ON COLUMN public.lab_upload_link.token IS 'Token único para acceso público (UUID)';
COMMENT ON COLUMN public.lab_upload_link.is_active IS 'Si el link está activo. Al regenerar, se desactiva el anterior';

-- =====================================================
-- TABLA 2: lab_result_upload
-- =====================================================
-- Propósito: Almacenar resultados de laboratorio cargados por laboratorios externos
-- Incluye información del paciente, especialista, y archivos adjuntos

CREATE TABLE IF NOT EXISTS public.lab_result_upload (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ===== RELACIONES =====
  consultation_id UUID REFERENCES public.consultation(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patient(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  upload_link_id UUID REFERENCES public.lab_upload_link(id) ON DELETE SET NULL,
  
  -- ===== INFORMACIÓN DEL RESULTADO =====
  title TEXT NOT NULL,
  description TEXT,
  result_type TEXT, -- 'lab_test', 'imaging', 'pathology', 'blood_work', 'urine_test', 'other'
  additional_details TEXT,
  
  -- ===== ARCHIVOS ADJUNTOS =====
  -- Array de objetos JSON con estructura: {name, url, size, type}
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- ===== INFORMACIÓN DEL ESPECIALISTA QUE CARGA =====
  specialist_name TEXT NOT NULL,
  specialist_id_number TEXT NOT NULL,
  specialist_lab_name TEXT NOT NULL,
  specialist_email TEXT,
  specialist_phone TEXT,
  
  -- ===== INFORMACIÓN DEL PACIENTE =====
  -- Para pacientes no registrados o para verificación
  patient_first_name TEXT,
  patient_last_name TEXT,
  patient_id_number TEXT NOT NULL, -- Cédula/identificación (REQUERIDO)
  patient_email TEXT,
  patient_phone TEXT,
  
  -- ===== ESTADO Y METADATOS =====
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  is_critical BOOLEAN DEFAULT false,
  viewed_by_patient BOOLEAN DEFAULT false,
  viewed_by_doctor BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ===== CONSTRAINTS =====
  -- Debe tener patient_id O patient_id_number (o ambos)
  CONSTRAINT fk_patient CHECK (patient_id IS NOT NULL OR patient_id_number IS NOT NULL)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_lab_upload_patient ON public.lab_result_upload(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_upload_doctor ON public.lab_result_upload(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_upload_consultation ON public.lab_result_upload(consultation_id);
CREATE INDEX IF NOT EXISTS idx_lab_upload_org ON public.lab_result_upload(organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_upload_id_number ON public.lab_result_upload(patient_id_number);
CREATE INDEX IF NOT EXISTS idx_lab_upload_status ON public.lab_result_upload(status);
CREATE INDEX IF NOT EXISTS idx_lab_upload_created ON public.lab_result_upload(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_upload_critical ON public.lab_result_upload(is_critical) WHERE is_critical = true;

-- Comentarios
COMMENT ON TABLE public.lab_result_upload IS 'Resultados de laboratorio cargados por laboratorios externos';
COMMENT ON COLUMN public.lab_result_upload.attachments IS 'Array JSON de archivos: [{name, url, size, type}]';
COMMENT ON COLUMN public.lab_result_upload.patient_id_number IS 'Cédula del paciente (REQUERIDO para búsqueda)';
COMMENT ON COLUMN public.lab_result_upload.status IS 'Estado: pending (pendiente revisión), approved (aprobado), rejected (rechazado)';
COMMENT ON COLUMN public.lab_result_upload.is_critical IS 'Si el resultado es crítico (requiere atención inmediata)';

-- =====================================================
-- TABLA 3: lab_upload_notification
-- =====================================================
-- Propósito: Registrar notificaciones enviadas por carga de resultados
-- Permite tracking de emails y notificaciones in-app

CREATE TABLE IF NOT EXISTS public.lab_upload_notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id UUID NOT NULL REFERENCES public.lab_result_upload(id) ON DELETE CASCADE,
  
  -- ===== DESTINATARIO =====
  recipient_type TEXT NOT NULL, -- 'patient', 'doctor'
  recipient_id UUID REFERENCES public.users(id), -- NULL si paciente no registrado
  recipient_email TEXT NOT NULL,
  
  -- ===== TIPO Y ESTADO =====
  notification_type TEXT NOT NULL, -- 'in_app', 'email'
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  
  -- ===== METADATOS =====
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  resend_id TEXT, -- ID de Resend para tracking
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_lab_notif_result ON public.lab_upload_notification(lab_result_id);
CREATE INDEX IF NOT EXISTS idx_lab_notif_recipient ON public.lab_upload_notification(recipient_id);
CREATE INDEX IF NOT EXISTS idx_lab_notif_status ON public.lab_upload_notification(status);
CREATE INDEX IF NOT EXISTS idx_lab_notif_type ON public.lab_upload_notification(notification_type);

-- Comentarios
COMMENT ON TABLE public.lab_upload_notification IS 'Registro de notificaciones enviadas por carga de resultados';
COMMENT ON COLUMN public.lab_upload_notification.recipient_type IS 'Tipo de destinatario: patient o doctor';
COMMENT ON COLUMN public.lab_upload_notification.notification_type IS 'Tipo: in_app (notificación en plataforma) o email';
COMMENT ON COLUMN public.lab_upload_notification.resend_id IS 'ID de Resend para tracking de emails';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS en las tablas
ALTER TABLE public.lab_upload_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_result_upload ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_upload_notification ENABLE ROW LEVEL SECURITY;

-- ===== POLICIES: lab_upload_link =====

-- Médicos pueden ver links de su organización
CREATE POLICY "Médicos ven links de su organización"
  ON public.lab_upload_link FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Médicos pueden crear links para su organización
CREATE POLICY "Médicos crean links para su organización"
  ON public.lab_upload_link FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Médicos pueden actualizar links de su organización
CREATE POLICY "Médicos actualizan links de su organización"
  ON public.lab_upload_link FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ===== POLICIES: lab_result_upload =====

-- Médicos ven resultados de su organización
CREATE POLICY "Médicos ven resultados de su organización"
  ON public.lab_result_upload FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Pacientes ven sus propios resultados (solo si están aprobados)
CREATE POLICY "Pacientes ven sus resultados aprobados"
  ON public.lab_result_upload FOR SELECT
  USING (
    patient_id = auth.uid() AND status = 'approved'
  );

-- Médicos pueden actualizar resultados de su organización
CREATE POLICY "Médicos actualizan resultados de su organización"
  ON public.lab_result_upload FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ===== POLICIES: lab_upload_notification =====

-- Usuarios ven sus propias notificaciones
CREATE POLICY "Usuarios ven sus notificaciones"
  ON public.lab_upload_notification FOR SELECT
  USING (
    recipient_id = auth.uid()
  );

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_lab_result_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para lab_result_upload
CREATE TRIGGER update_lab_result_upload_updated_at
  BEFORE UPDATE ON public.lab_result_upload
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lab_result_updated_at();

-- Trigger para lab_upload_link
CREATE TRIGGER update_lab_upload_link_updated_at
  BEFORE UPDATE ON public.lab_upload_link
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lab_result_updated_at();

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Ejemplo de tipos de resultados comunes
-- Estos se pueden usar como referencia en el frontend

/*
TIPOS DE RESULTADOS COMUNES:
- lab_test: Análisis de laboratorio general
- blood_work: Hematología
- urine_test: Urianálisis
- imaging: Imágenes médicas (rayos X, TAC, resonancia)
- pathology: Patología
- microbiology: Microbiología
- biochemistry: Bioquímica
- immunology: Inmunología
- genetics: Genética
- other: Otro
*/

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================

/*
FLUJO DE TRABAJO:

1. GENERACIÓN DE LINK:
   - Médico genera link único en dashboard
   - Se crea registro en lab_upload_link con token UUID
   - Link se comparte con laboratorios: /lab-upload/[token]

2. CARGA DE RESULTADO:
   - Laboratorio accede al link público
   - Busca paciente por cédula
   - Completa formulario con información del resultado
   - Sube archivos (imágenes, PDFs)
   - Sistema crea registro en lab_result_upload

3. NOTIFICACIONES:
   - Sistema crea registros en lab_upload_notification
   - Envía email al paciente (si tiene email)
   - Envía email al doctor
   - Crea notificación in-app para ambos

4. REVISIÓN:
   - Médico revisa resultado en dashboard
   - Aprueba o rechaza resultado
   - Si aprueba: paciente puede ver resultado
   - Si rechaza: resultado marcado como rechazado

5. VISUALIZACIÓN:
   - Paciente ve resultados aprobados en su dashboard
   - Puede descargar archivos adjuntos
   - Puede ver información del laboratorio

SEGURIDAD:
- Links públicos usan tokens UUID (no predecibles)
- RLS policies protegen datos sensibles
- Validación de archivos en backend
- Sanitización de inputs
- Rate limiting en APIs públicas

STORAGE:
- Archivos se suben a Supabase Storage
- Bucket: lab-results
- Estructura: /[organization_id]/[result_id]/[filename]
- Políticas de acceso según RLS
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

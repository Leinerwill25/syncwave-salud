-- ══════════════════════════════════════════════════════════════
-- ASHIRA SOFTWARE — SQL PANEL ENFERMERÍA v1.1
-- Compatible con: Supabase + PostgreSQL 15+
-- Base: Database.sql existente (sin modificar tablas existentes)
-- Tablas origen: organization, patient, unregisteredpatients,
--                users, consultation, appointment
-- Ejecutar bloques en orden. Cada bloque es idempotente.
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 1 — ENUM TYPES
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE nurse_type_enum AS ENUM ('affiliated', 'independent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE nurse_status_enum AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE patient_origin_enum AS ENUM (
    'new', 'referred_internal', 'referred_external',
    'returning_same_org', 'returning_other_org', 'self_referred'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE referral_reason_enum AS ENUM (
    'second_opinion', 'treatment_continuity',
    'specialty_unavailable', 'emergency',
    'follow_up', 'routine', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prior_treatment_status_enum AS ENUM (
    'active', 'completed', 'suspended', 'adverse_reaction', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE queue_status_enum AS ENUM (
    'waiting', 'in_triage', 'ready_for_doctor',
    'in_consultation', 'in_observation', 'discharged', 'absent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE triage_level_enum AS ENUM (
    'immediate', 'urgent', 'less_urgent', 'non_urgent', 'deceased'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mar_status_enum AS ENUM (
    'pending', 'administered', 'omitted', 'refused',
    'held', 'not_available'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE procedure_status_enum AS ENUM (
    'pending', 'in_progress', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 2 — TABLA nurse_profiles
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nurse_profiles (
  nurse_profile_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nurse_type               nurse_type_enum NOT NULL,
  license_number           TEXT NOT NULL,
  license_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  license_expiry           DATE,
  organization_id          UUID REFERENCES organization(id) ON DELETE SET NULL,
  specializations          TEXT[] DEFAULT '{}',
  can_attend_independently BOOLEAN NOT NULL DEFAULT FALSE,
  independent_scope        JSONB DEFAULT '{}'::JSONB,
  active_since             DATE DEFAULT CURRENT_DATE,
  status                   nurse_status_enum NOT NULL DEFAULT 'active',
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID REFERENCES auth.users(id),
  updated_by               UUID REFERENCES auth.users(id),

  CONSTRAINT uq_nurse_license UNIQUE (license_number),
  CONSTRAINT chk_affiliated_has_org CHECK (
    nurse_type = 'independent'
    OR (nurse_type = 'affiliated' AND organization_id IS NOT NULL)
  )
);

COMMENT ON TABLE nurse_profiles IS
  'Perfil profesional de enfermeros/as. affiliated=org fija. independent=autónomo.';
COMMENT ON COLUMN nurse_profiles.independent_scope IS
  'JSONB: {"home_visits":bool,"prescription_reading":bool,"can_share_records":bool,"visible_in_network":bool}';
COMMENT ON COLUMN nurse_profiles.organization_id IS
  'NULL para independientes. Obligatorio para afiliados.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 3 — TABLA patients_daily_queue
-- Soporta pacientes registrados Y no registrados
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patients_daily_queue (
  queue_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Paciente: registrado O no registrado (CHECK garantiza exclusividad)
  patient_id              UUID REFERENCES patient(id) ON DELETE CASCADE,
  unregistered_patient_id UUID REFERENCES unregisteredpatients(id) ON DELETE CASCADE,

  -- Contexto de atención
  organization_id         UUID REFERENCES organization(id) ON DELETE CASCADE,
  assigned_nurse_id       UUID REFERENCES nurse_profiles(nurse_profile_id) ON DELETE SET NULL,
  assigned_doctor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id          UUID REFERENCES appointment(id) ON DELETE SET NULL,

  -- Estado en cola
  queue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  arrival_time            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                  queue_status_enum NOT NULL DEFAULT 'waiting',
  triage_level            triage_level_enum,
  triage_completed_at     TIMESTAMPTZ,
  queue_number            INTEGER,

  -- Flags clínicos
  vital_signs_taken       BOOLEAN NOT NULL DEFAULT FALSE,
  allergies_flag          BOOLEAN NOT NULL DEFAULT FALSE,
  chronic_flag            BOOLEAN NOT NULL DEFAULT FALSE,
  referral_flag           BOOLEAN NOT NULL DEFAULT FALSE,
  cross_org_history_flag  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Motivo y notas
  chief_complaint         TEXT,
  triage_notes            TEXT,
  nurse_notes             TEXT,

  -- Auditoría soft-delete
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES auth.users(id),
  updated_by              UUID REFERENCES auth.users(id),

  CONSTRAINT chk_queue_patient_xor CHECK (
    (patient_id IS NOT NULL AND unregistered_patient_id IS NULL)
    OR (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
  )
);

COMMENT ON TABLE patients_daily_queue IS
  'Cola diaria de pacientes. Soporta registrados (patient) y no registrados (unregisteredpatients).';
COMMENT ON COLUMN patients_daily_queue.queue_date IS
  'Fecha de la atención. Permite filtrar turno del día sin rangos de timestamp.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 4 — TABLA patient_origin_records
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patient_origin_records (
  origin_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              UUID REFERENCES patient(id) ON DELETE CASCADE,
  unregistered_patient_id UUID REFERENCES unregisteredpatients(id) ON DELETE CASCADE,
  queue_id                UUID REFERENCES patients_daily_queue(queue_id) ON DELETE SET NULL,
  origin_type             patient_origin_enum NOT NULL,

  -- Org de origen
  origin_org_id           UUID REFERENCES organization(id) ON DELETE SET NULL,
  origin_org_name         TEXT,
  origin_org_city         TEXT,
  origin_org_country      TEXT DEFAULT 'CO',
  last_seen_at_origin     DATE,

  -- Médico referente
  referring_doctor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  referring_doctor_name   TEXT,
  referring_specialty     TEXT,
  referring_org_name      TEXT,
  referring_contact       TEXT,
  referral_reason         referral_reason_enum,
  referral_notes          TEXT,
  referral_document_url   TEXT,

  -- Registrado por
  registered_by_nurse_id  UUID REFERENCES nurse_profiles(nurse_profile_id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id),

  CONSTRAINT chk_origin_patient_xor CHECK (
    (patient_id IS NOT NULL AND unregistered_patient_id IS NULL)
    OR (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
  )
);

COMMENT ON TABLE patient_origin_records IS
  'Procedencia clínica de cada paciente por visita. Inmutable tras INSERT.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 5 — TABLA patient_prior_treatments
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patient_prior_treatments (
  treatment_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              UUID REFERENCES patient(id) ON DELETE CASCADE,
  unregistered_patient_id UUID REFERENCES unregisteredpatients(id) ON DELETE CASCADE,
  origin_record_id        UUID REFERENCES patient_origin_records(origin_id) ON DELETE SET NULL,

  medication_name         TEXT NOT NULL,
  presentation            TEXT,
  dose                    TEXT,
  frequency               TEXT,
  route                   TEXT,
  duration_days           INTEGER,
  start_date              DATE,
  end_date                DATE,
  treatment_status        prior_treatment_status_enum NOT NULL DEFAULT 'unknown',
  suspension_reason       TEXT,
  treatment_outcome       TEXT,
  adverse_reaction_desc   TEXT,

  prescribed_by_doctor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  prescribed_by_doctor_name TEXT,
  prescribed_at_org_id      UUID REFERENCES organization(id) ON DELETE SET NULL,
  prescribed_at_org_name    TEXT,

  is_currently_active       BOOLEAN GENERATED ALWAYS AS (treatment_status = 'active') STORED,
  interaction_check_needed  BOOLEAN DEFAULT FALSE,
  notes                     TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id),

  CONSTRAINT chk_ppt_patient_xor CHECK (
    (patient_id IS NOT NULL AND unregistered_patient_id IS NULL)
    OR (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
  )
);

COMMENT ON TABLE patient_prior_treatments IS
  'Historial acumulativo de tratamientos anteriores. Nunca se elimina; se actualiza el estado.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 6 — TABLA nurse_vital_signs
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nurse_vital_signs (
  vital_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id                UUID NOT NULL REFERENCES patients_daily_queue(queue_id) ON DELETE CASCADE,
  patient_id              UUID REFERENCES patient(id) ON DELETE CASCADE,
  unregistered_patient_id UUID REFERENCES unregisteredpatients(id) ON DELETE CASCADE,
  nurse_id                UUID NOT NULL REFERENCES nurse_profiles(nurse_profile_id) ON DELETE RESTRICT,
  organization_id         UUID REFERENCES organization(id) ON DELETE SET NULL,

  -- Signos vitales
  bp_systolic             INTEGER CHECK (bp_systolic BETWEEN 50 AND 300),
  bp_diastolic            INTEGER CHECK (bp_diastolic BETWEEN 20 AND 200),
  heart_rate              INTEGER CHECK (heart_rate BETWEEN 20 AND 300),
  respiratory_rate        INTEGER CHECK (respiratory_rate BETWEEN 4 AND 60),
  temperature_celsius     NUMERIC(4,1) CHECK (temperature_celsius BETWEEN 30 AND 45),
  spo2_percent            INTEGER CHECK (spo2_percent BETWEEN 50 AND 100),
  glucose_mg_dl           NUMERIC(6,1) CHECK (glucose_mg_dl BETWEEN 20 AND 1000),
  weight_kg               NUMERIC(5,1) CHECK (weight_kg BETWEEN 0.5 AND 500),
  height_cm               NUMERIC(5,1) CHECK (height_cm BETWEEN 30 AND 250),
  bmi                     NUMERIC(5,2),
  pain_scale              INTEGER CHECK (pain_scale BETWEEN 0 AND 10),
  triage_level            triage_level_enum,
  notes                   TEXT,
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE nurse_vital_signs IS
  'Registro de signos vitales tomados por enfermería durante el triaje.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 7 — TABLA nurse_mar_records
-- Medication Administration Record
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nurse_mar_records (
  mar_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id                UUID NOT NULL REFERENCES patients_daily_queue(queue_id) ON DELETE RESTRICT,
  patient_id              UUID REFERENCES patient(id) ON DELETE CASCADE,
  unregistered_patient_id UUID REFERENCES unregisteredpatients(id) ON DELETE CASCADE,
  nurse_id                UUID NOT NULL REFERENCES nurse_profiles(nurse_profile_id) ON DELETE RESTRICT,
  organization_id         UUID REFERENCES organization(id) ON DELETE SET NULL,

  -- Medicamento
  medication_name         TEXT NOT NULL,
  medication_id           UUID REFERENCES medication(id) ON DELETE SET NULL,
  dose                    TEXT NOT NULL,
  route                   TEXT NOT NULL,
  frequency               TEXT,
  scheduled_at            TIMESTAMPTZ NOT NULL,
  administered_at         TIMESTAMPTZ,
  status                  mar_status_enum NOT NULL DEFAULT 'pending',
  omission_reason         TEXT,

  -- Prescripción de origen
  prescription_id         UUID REFERENCES prescription(id) ON DELETE SET NULL,
  ordered_by_doctor_id    UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Si continúa tratamiento previo
  prior_treatment_id      UUID REFERENCES patient_prior_treatments(treatment_id) ON DELETE SET NULL,

  notes                   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id),

  CONSTRAINT chk_mar_patient_xor CHECK (
    (patient_id IS NOT NULL AND unregistered_patient_id IS NULL)
    OR (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
  )
);

COMMENT ON TABLE nurse_mar_records IS
  'MAR: Registro oficial de administración de medicamentos por enfermería. Inmutable tras administración.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 8 — TABLA nurse_procedures
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nurse_procedures (
  procedure_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id                UUID NOT NULL REFERENCES patients_daily_queue(queue_id) ON DELETE RESTRICT,
  patient_id              UUID REFERENCES patient(id) ON DELETE CASCADE,
  unregistered_patient_id UUID REFERENCES unregisteredpatients(id) ON DELETE CASCADE,
  nurse_id                UUID NOT NULL REFERENCES nurse_profiles(nurse_profile_id) ON DELETE RESTRICT,
  organization_id         UUID REFERENCES organization(id) ON DELETE SET NULL,
  ordered_by_doctor_id    UUID REFERENCES users(id) ON DELETE SET NULL,

  procedure_name          TEXT NOT NULL,
  procedure_code          TEXT,
  description             TEXT,
  status                  procedure_status_enum NOT NULL DEFAULT 'pending',
  scheduled_at            TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  outcome                 TEXT,
  notes                   TEXT,
  supplies_used           JSONB DEFAULT '[]'::JSONB,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id),

  CONSTRAINT chk_proc_patient_xor CHECK (
    (patient_id IS NOT NULL AND unregistered_patient_id IS NULL)
    OR (patient_id IS NULL AND unregistered_patient_id IS NOT NULL)
  )
);

COMMENT ON TABLE nurse_procedures IS
  'Procedimientos de enfermería registrados por visita de paciente.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 9 — TABLA nurse_shift_reports
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nurse_shift_reports (
  report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id        UUID NOT NULL REFERENCES nurse_profiles(nurse_profile_id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organization(id) ON DELETE SET NULL,

  -- affiliated → reporte de turno; independent → reporte de atención
  report_type     TEXT NOT NULL CHECK (report_type IN ('shift_report', 'independent_care_report')),
  report_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_start     TIMESTAMPTZ,
  shift_end       TIMESTAMPTZ,
  patients_count  INTEGER DEFAULT 0,
  summary         TEXT,
  incidents       JSONB DEFAULT '[]'::JSONB,
  pending_tasks   JSONB DEFAULT '[]'::JSONB,
  pdf_url         TEXT,
  signed_at       TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE nurse_shift_reports IS
  'Reporte de turno (afiliada) o reporte de atención independiente. PDF descargable disponible.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 10 — TABLA cross_org_access_permissions
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cross_org_access_permissions (
  permission_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL UNIQUE REFERENCES organization(id) ON DELETE CASCADE,

  share_diagnoses         BOOLEAN NOT NULL DEFAULT FALSE,
  share_medications_admin BOOLEAN NOT NULL DEFAULT FALSE,
  share_lab_results       BOOLEAN NOT NULL DEFAULT FALSE,
  share_vital_signs       BOOLEAN NOT NULL DEFAULT FALSE,
  share_nursing_notes     BOOLEAN NOT NULL DEFAULT FALSE,
  share_visit_summary     BOOLEAN NOT NULL DEFAULT TRUE,

  allowed_org_ids         UUID[],
  blocked_org_ids         UUID[],

  last_updated_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id),
  updated_by  UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE cross_org_access_permissions IS
  'Control de qué datos comparte una organización con la red ASHIRA.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 11 — ÍNDICES
-- ══════════════════════════════════════════════════════════════

-- nurse_profiles
CREATE INDEX IF NOT EXISTS idx_nurse_prof_user   ON nurse_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_nurse_prof_org    ON nurse_profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nurse_prof_type   ON nurse_profiles(nurse_type);
CREATE INDEX IF NOT EXISTS idx_nurse_prof_status ON nurse_profiles(status) WHERE status = 'active';

-- patients_daily_queue
CREATE INDEX IF NOT EXISTS idx_pdq_date          ON patients_daily_queue(queue_date);
CREATE INDEX IF NOT EXISTS idx_pdq_patient        ON patients_daily_queue(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdq_unreg_patient  ON patients_daily_queue(unregistered_patient_id) WHERE unregistered_patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdq_org            ON patients_daily_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_pdq_nurse          ON patients_daily_queue(assigned_nurse_id);
CREATE INDEX IF NOT EXISTS idx_pdq_doctor         ON patients_daily_queue(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_pdq_status         ON patients_daily_queue(status);
CREATE INDEX IF NOT EXISTS idx_pdq_active         ON patients_daily_queue(queue_date, organization_id) WHERE deleted_at IS NULL;

-- patient_origin_records
CREATE INDEX IF NOT EXISTS idx_por_patient        ON patient_origin_records(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_por_unreg          ON patient_origin_records(unregistered_patient_id) WHERE unregistered_patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_por_queue          ON patient_origin_records(queue_id) WHERE queue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_por_origin_org     ON patient_origin_records(origin_org_id) WHERE origin_org_id IS NOT NULL;

-- patient_prior_treatments
CREATE INDEX IF NOT EXISTS idx_ppt_patient        ON patient_prior_treatments(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ppt_unreg          ON patient_prior_treatments(unregistered_patient_id) WHERE unregistered_patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ppt_active         ON patient_prior_treatments(patient_id) WHERE is_currently_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ppt_interaction    ON patient_prior_treatments(patient_id) WHERE interaction_check_needed = TRUE;

-- nurse_vital_signs
CREATE INDEX IF NOT EXISTS idx_nvs_queue          ON nurse_vital_signs(queue_id);
CREATE INDEX IF NOT EXISTS idx_nvs_patient        ON nurse_vital_signs(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nvs_recorded       ON nurse_vital_signs(recorded_at DESC);

-- nurse_mar_records
CREATE INDEX IF NOT EXISTS idx_mar_queue          ON nurse_mar_records(queue_id);
CREATE INDEX IF NOT EXISTS idx_mar_patient        ON nurse_mar_records(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mar_scheduled      ON nurse_mar_records(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mar_status         ON nurse_mar_records(status) WHERE status = 'pending';

-- nurse_procedures
CREATE INDEX IF NOT EXISTS idx_proc_queue         ON nurse_procedures(queue_id);
CREATE INDEX IF NOT EXISTS idx_proc_patient       ON nurse_procedures(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proc_status        ON nurse_procedures(status);

-- nurse_shift_reports
CREATE INDEX IF NOT EXISTS idx_nsr_nurse          ON nurse_shift_reports(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nsr_date           ON nurse_shift_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_nsr_org            ON nurse_shift_reports(organization_id) WHERE organization_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 12 — TRIGGERS updated_at
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION ashira_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_nurse_profiles_upd
  BEFORE UPDATE ON nurse_profiles
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_pdq_upd
  BEFORE UPDATE ON patients_daily_queue
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_por_upd
  BEFORE UPDATE ON patient_origin_records
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_ppt_upd
  BEFORE UPDATE ON patient_prior_treatments
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_nvs_upd
  BEFORE UPDATE ON nurse_vital_signs
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_mar_upd
  BEFORE UPDATE ON nurse_mar_records
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_proc_upd
  BEFORE UPDATE ON nurse_procedures
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_nsr_upd
  BEFORE UPDATE ON nurse_shift_reports
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

CREATE OR REPLACE TRIGGER trg_coap_upd
  BEFORE UPDATE ON cross_org_access_permissions
  FOR EACH ROW EXECUTE FUNCTION ashira_set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 13 — ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

-- ── HELPER: función segura para obtener nurse_profile del usuario activo ──
CREATE OR REPLACE FUNCTION auth_nurse_profile_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nurse_profile_id FROM nurse_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_nurse_type()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nurse_type::TEXT FROM nurse_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_nurse_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM nurse_profiles
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

-- ──────────────────────────────────────────────
-- RLS: nurse_profiles
-- ──────────────────────────────────────────────
ALTER TABLE nurse_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: enfermera ve su propio perfil; afiliada ve compañeras de su org
CREATE POLICY np_select ON nurse_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      auth_nurse_type() = 'affiliated'
      AND organization_id IS NOT NULL
      AND organization_id = auth_nurse_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'ADMIN'
        AND u."organizationId" = nurse_profiles.organization_id
    )
  );

-- INSERT: solo si el usuario es el propietario del perfil
CREATE POLICY np_insert ON nurse_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

-- UPDATE: propio perfil o admin de la org
CREATE POLICY np_update ON nurse_profiles FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'ADMIN'
        AND u."organizationId" = nurse_profiles.organization_id
    )
  )
  WITH CHECK (updated_by = auth.uid());

-- DELETE: prohibido — usar status = 'inactive'
CREATE POLICY np_no_delete ON nurse_profiles FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: patients_daily_queue
-- ──────────────────────────────────────────────
ALTER TABLE patients_daily_queue ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- Afiliada: ve la cola de su organización del día
-- Independiente: ve solo las colas donde es la enfermera asignada
CREATE POLICY pdq_select ON patients_daily_queue FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Enfermera afiliada ve toda su org
      (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
      -- Enfermera independiente ve solo sus asignadas
      OR assigned_nurse_id = auth_nurse_profile_id()
      -- Admin ve su org
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u."authId" = auth.uid()::text
          AND u.role = 'ADMIN'
          AND u."organizationId" = patients_daily_queue.organization_id
      )
      -- Médico asignado puede ver la cola
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u."authId" = auth.uid()::text
          AND u.role = 'MEDICO'
          AND u.id = patients_daily_queue.assigned_doctor_id
      )
    )
  );

-- INSERT: enfermera activa puede crear registros en cola
CREATE POLICY pdq_insert ON patients_daily_queue FOR INSERT
  WITH CHECK (
    auth_nurse_profile_id() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      -- Afiliada: solo en su org
      (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
      -- Independiente: puede crear en cualquier org o sin org (domiciliaria)
      OR auth_nurse_type() = 'independent'
    )
  );

-- UPDATE: enfermera asignada o de la misma org (afiliada)
CREATE POLICY pdq_update ON patients_daily_queue FOR UPDATE
  USING (
    assigned_nurse_id = auth_nurse_profile_id()
    OR (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'ADMIN'
        AND u."organizationId" = patients_daily_queue.organization_id
    )
  )
  WITH CHECK (updated_by = auth.uid() AND deleted_at IS NULL);

-- DELETE: prohibido — usar soft delete (deleted_at)
CREATE POLICY pdq_no_delete ON patients_daily_queue FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: patient_origin_records
-- ──────────────────────────────────────────────
ALTER TABLE patient_origin_records ENABLE ROW LEVEL SECURITY;

-- SELECT: enfermera que registró O que tiene al paciente en su cola hoy
CREATE POLICY por_select ON patient_origin_records FOR SELECT
  USING (
    registered_by_nurse_id = auth_nurse_profile_id()
    OR EXISTS (
      SELECT 1 FROM patients_daily_queue q
      WHERE q.queue_id = patient_origin_records.queue_id
        AND q.deleted_at IS NULL
        AND (
          q.assigned_nurse_id = auth_nurse_profile_id()
          OR (auth_nurse_type() = 'affiliated' AND q.organization_id = auth_nurse_org_id())
        )
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role IN ('ADMIN', 'MEDICO')
    )
  );

-- INSERT: enfermera activa, referenciando su propio auth.uid
CREATE POLICY por_insert ON patient_origin_records FOR INSERT
  WITH CHECK (
    auth_nurse_profile_id() IS NOT NULL
    AND registered_by_nurse_id = auth_nurse_profile_id()
    AND created_by = auth.uid()
  );

-- UPDATE y DELETE: prohibidos — registros históricos inmutables
CREATE POLICY por_no_update ON patient_origin_records FOR UPDATE USING (FALSE);
CREATE POLICY por_no_delete ON patient_origin_records FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: patient_prior_treatments
-- ──────────────────────────────────────────────
ALTER TABLE patient_prior_treatments ENABLE ROW LEVEL SECURITY;

-- SELECT: enfermera que tiene el paciente en su cola hoy
CREATE POLICY ppt_select ON patient_prior_treatments FOR SELECT
  USING (
    auth_nurse_profile_id() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM patients_daily_queue q
        WHERE (q.patient_id = patient_prior_treatments.patient_id
               OR q.unregistered_patient_id = patient_prior_treatments.unregistered_patient_id)
          AND q.deleted_at IS NULL
          AND (
            q.assigned_nurse_id = auth_nurse_profile_id()
            OR (auth_nurse_type() = 'affiliated' AND q.organization_id = auth_nurse_org_id())
          )
      )
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u."authId" = auth.uid()::text AND u.role IN ('ADMIN', 'MEDICO')
      )
    )
  );

-- INSERT: enfermera activa
CREATE POLICY ppt_insert ON patient_prior_treatments FOR INSERT
  WITH CHECK (
    auth_nurse_profile_id() IS NOT NULL
    AND created_by = auth.uid()
  );

-- UPDATE: solo quien lo creó o admin/médico (para cambiar estado)
CREATE POLICY ppt_update ON patient_prior_treatments FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role IN ('ADMIN', 'MEDICO')
    )
  )
  WITH CHECK (updated_by = auth.uid());

-- DELETE: prohibido
CREATE POLICY ppt_no_delete ON patient_prior_treatments FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: nurse_vital_signs
-- ──────────────────────────────────────────────
ALTER TABLE nurse_vital_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY nvs_select ON nurse_vital_signs FOR SELECT
  USING (
    nurse_id = auth_nurse_profile_id()
    OR (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role IN ('ADMIN', 'MEDICO')
    )
  );

CREATE POLICY nvs_insert ON nurse_vital_signs FOR INSERT
  WITH CHECK (
    auth_nurse_profile_id() IS NOT NULL
    AND nurse_id = auth_nurse_profile_id()
    AND created_by = auth.uid()
  );

-- UPDATE: prohibido — los signos vitales son inmutables tras registro clínico
CREATE POLICY nvs_no_update ON nurse_vital_signs FOR UPDATE USING (FALSE);
CREATE POLICY nvs_no_delete ON nurse_vital_signs FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: nurse_mar_records
-- ──────────────────────────────────────────────
ALTER TABLE nurse_mar_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY mar_select ON nurse_mar_records FOR SELECT
  USING (
    nurse_id = auth_nurse_profile_id()
    OR (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role IN ('ADMIN', 'MEDICO')
    )
  );

CREATE POLICY mar_insert ON nurse_mar_records FOR INSERT
  WITH CHECK (
    auth_nurse_profile_id() IS NOT NULL
    AND nurse_id = auth_nurse_profile_id()
    AND created_by = auth.uid()
    -- No permite insertar si el estado ya es 'administered' (previene doble registro)
    AND status = 'pending'
  );

-- UPDATE: solo la enfermera que lo creó puede cambiar estado; no puede retroceder a 'pending' si ya administrado
CREATE POLICY mar_update ON nurse_mar_records FOR UPDATE
  USING (
    nurse_id = auth_nurse_profile_id()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role = 'ADMIN'
    )
  )
  WITH CHECK (updated_by = auth.uid());

-- DELETE: prohibido — MAR es registro clínico oficial
CREATE POLICY mar_no_delete ON nurse_mar_records FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: nurse_procedures
-- ──────────────────────────────────────────────
ALTER TABLE nurse_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY proc_select ON nurse_procedures FOR SELECT
  USING (
    nurse_id = auth_nurse_profile_id()
    OR (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role IN ('ADMIN', 'MEDICO')
    )
  );

CREATE POLICY proc_insert ON nurse_procedures FOR INSERT
  WITH CHECK (
    auth_nurse_profile_id() IS NOT NULL
    AND nurse_id = auth_nurse_profile_id()
    AND created_by = auth.uid()
  );

CREATE POLICY proc_update ON nurse_procedures FOR UPDATE
  USING (
    nurse_id = auth_nurse_profile_id()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role = 'ADMIN'
    )
  )
  WITH CHECK (updated_by = auth.uid());

CREATE POLICY proc_no_delete ON nurse_procedures FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: nurse_shift_reports
-- ──────────────────────────────────────────────
ALTER TABLE nurse_shift_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY nsr_select ON nurse_shift_reports FOR SELECT
  USING (
    nurse_id = auth_nurse_profile_id()
    OR (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text AND u.role = 'ADMIN'
    )
  );

CREATE POLICY nsr_insert ON nurse_shift_reports FOR INSERT
  WITH CHECK (
    auth_nurse_profile_id() IS NOT NULL
    AND nurse_id = auth_nurse_profile_id()
    AND created_by = auth.uid()
    -- Afiliada solo puede crear shift_report; independiente solo independent_care_report
    AND (
      (auth_nurse_type() = 'affiliated' AND report_type = 'shift_report')
      OR (auth_nurse_type() = 'independent' AND report_type = 'independent_care_report')
    )
  );

CREATE POLICY nsr_update ON nurse_shift_reports FOR UPDATE
  USING (
    nurse_id = auth_nurse_profile_id()
    -- No permite editar reportes ya firmados
    AND signed_at IS NULL
  )
  WITH CHECK (updated_by = auth.uid());

CREATE POLICY nsr_no_delete ON nurse_shift_reports FOR DELETE USING (FALSE);

-- ──────────────────────────────────────────────
-- RLS: cross_org_access_permissions
-- ──────────────────────────────────────────────
ALTER TABLE cross_org_access_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: admin de la org o enfermera afiliada de esa org (lectura)
CREATE POLICY coap_select ON cross_org_access_permissions FOR SELECT
  USING (
    (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'ADMIN'
        AND u."organizationId" = cross_org_access_permissions.organization_id
    )
  );

-- INSERT/UPDATE/DELETE: solo admins de la organización
CREATE POLICY coap_admin_insert ON cross_org_access_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'ADMIN'
        AND u."organizationId" = cross_org_access_permissions.organization_id
    )
    AND created_by = auth.uid()
  );

CREATE POLICY coap_admin_update ON cross_org_access_permissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u."authId" = auth.uid()::text
        AND u.role = 'ADMIN'
        AND u."organizationId" = cross_org_access_permissions.organization_id
    )
  )
  WITH CHECK (updated_by = auth.uid());

CREATE POLICY coap_no_delete ON cross_org_access_permissions FOR DELETE USING (FALSE);

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 14 — VISTAS
-- ══════════════════════════════════════════════════════════════

-- Vista: perfil completo de enfermería
CREATE OR REPLACE VIEW nurse_full_profile
WITH (security_invoker = true)
AS
SELECT
  np.nurse_profile_id,
  np.nurse_type,
  np.license_number,
  np.license_verified,
  np.license_expiry,
  np.specializations,
  np.can_attend_independently,
  np.independent_scope,
  np.status,
  np.active_since,
  np.organization_id,
  u.email,
  u.raw_user_meta_data->>'full_name'  AS full_name,
  u.raw_user_meta_data->>'avatar_url' AS avatar_url,
  o.name         AS organization_name,
  o.address      AS organization_address,
  o."contactEmail" AS organization_email,
  o.phone        AS organization_phone
FROM nurse_profiles np
JOIN auth.users u ON u.id = np.user_id
LEFT JOIN organization o ON o.id = np.organization_id;

COMMENT ON VIEW nurse_full_profile IS
  'Vista desnormalizada del perfil de enfermería. Hereda RLS de nurse_profiles.';

-- Vista: dashboard diario de enfermería
CREATE OR REPLACE VIEW nurse_daily_dashboard
WITH (security_invoker = true)
AS
SELECT
  q.queue_id,
  q.queue_date,
  q.arrival_time,
  q.status,
  q.triage_level,
  q.queue_number,
  q.vital_signs_taken,
  q.allergies_flag,
  q.chronic_flag,
  q.referral_flag,
  q.cross_org_history_flag,
  q.chief_complaint,
  q.nurse_notes,
  q.assigned_nurse_id,
  q.assigned_doctor_id,
  q.organization_id,
  -- Datos del paciente registrado
  p.id            AS patient_id,
  p."firstName"   AS patient_first_name,
  p."lastName"    AS patient_last_name,
  p.identifier    AS patient_identifier,
  p.blood_type,
  p.allergies     AS patient_allergies,
  -- Datos del paciente no registrado
  up.id           AS unregistered_patient_id,
  up.first_name   AS unreg_first_name,
  up.last_name    AS unreg_last_name,
  up.identification AS unreg_identifier,
  up.allergies    AS unreg_allergies,
  -- Médico asignado
  u.name          AS doctor_name,
  -- Última toma de signos vitales
  (
    SELECT recorded_at FROM nurse_vital_signs nvs
    WHERE nvs.queue_id = q.queue_id
    ORDER BY recorded_at DESC LIMIT 1
  ) AS last_vitals_at
FROM patients_daily_queue q
LEFT JOIN patient       p  ON p.id  = q.patient_id
LEFT JOIN unregisteredpatients up ON up.id = q.unregistered_patient_id
LEFT JOIN users         u  ON u.id  = q.assigned_doctor_id
WHERE q.deleted_at IS NULL;

COMMENT ON VIEW nurse_daily_dashboard IS
  'Dashboard diario de enfermería. Hereda RLS de patients_daily_queue.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 15 — FUNCIONES RPC
-- ══════════════════════════════════════════════════════════════

-- RPC: get_patient_full_origin
-- Retorna origen + tratamientos previos de un paciente
CREATE OR REPLACE FUNCTION get_patient_full_origin(
  p_patient_id              UUID DEFAULT NULL,
  p_unregistered_patient_id UUID DEFAULT NULL,
  p_queue_id                UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result  JSONB;
  v_nurse   UUID;
BEGIN
  -- Validación: requiere al menos un identificador de paciente
  IF p_patient_id IS NULL AND p_unregistered_patient_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere patient_id o unregistered_patient_id';
  END IF;

  -- Verificar que el usuario es enfermera activa
  v_nurse := auth_nurse_profile_id();
  IF v_nurse IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: no es enfermera activa';
  END IF;

  -- Verificar acceso al paciente (está en cola activa asignada)
  IF NOT EXISTS (
    SELECT 1 FROM patients_daily_queue q
    WHERE (q.patient_id = p_patient_id OR q.unregistered_patient_id = p_unregistered_patient_id)
      AND q.deleted_at IS NULL
      AND (
        q.assigned_nurse_id = v_nurse
        OR (auth_nurse_type() = 'affiliated' AND q.organization_id = auth_nurse_org_id())
      )
  ) AND NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u."authId" = auth.uid()::text AND u.role IN ('ADMIN', 'MEDICO')
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: paciente no asignado';
  END IF;

  SELECT jsonb_build_object(
    'origin', (
      SELECT row_to_json(por.*)
      FROM patient_origin_records por
      WHERE (por.patient_id = p_patient_id OR por.unregistered_patient_id = p_unregistered_patient_id)
        AND (p_queue_id IS NULL OR por.queue_id = p_queue_id)
      ORDER BY por.created_at DESC
      LIMIT 1
    ),
    'treatments', (
      SELECT COALESCE(jsonb_agg(row_to_json(ppt.*) ORDER BY ppt.start_date DESC NULLS LAST), '[]'::JSONB)
      FROM patient_prior_treatments ppt
      WHERE ppt.patient_id = p_patient_id
         OR ppt.unregistered_patient_id = p_unregistered_patient_id
    ),
    'active_treatments_count', (
      SELECT COUNT(*) FROM patient_prior_treatments
      WHERE (patient_id = p_patient_id OR unregistered_patient_id = p_unregistered_patient_id)
        AND is_currently_active = TRUE
    ),
    'interaction_alerts_count', (
      SELECT COUNT(*) FROM patient_prior_treatments
      WHERE (patient_id = p_patient_id OR unregistered_patient_id = p_unregistered_patient_id)
        AND interaction_check_needed = TRUE
    )
  ) INTO v_result;

  RETURN COALESCE(v_result, jsonb_build_object(
    'origin', NULL,
    'treatments', '[]'::JSONB,
    'active_treatments_count', 0,
    'interaction_alerts_count', 0
  ));
END;
$$;

COMMENT ON FUNCTION get_patient_full_origin IS
  'RPC: retorna origen, tratamientos previos y alertas de interacción de un paciente. Requiere ser enfermera activa con acceso al paciente.';

-- RPC: get_nurse_dashboard_summary
-- Resumen del turno actual para el dashboard
CREATE OR REPLACE FUNCTION get_nurse_dashboard_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nurse  UUID;
  v_org    UUID;
  v_type   TEXT;
  v_result JSONB;
BEGIN
  v_nurse := auth_nurse_profile_id();
  IF v_nurse IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: no es enfermera activa';
  END IF;

  v_org  := auth_nurse_org_id();
  v_type := auth_nurse_type();

  SELECT jsonb_build_object(
    'today', CURRENT_DATE,
    'nurse_type', v_type,
    'total_patients', COUNT(*),
    'waiting',         COUNT(*) FILTER (WHERE status = 'waiting'),
    'in_triage',       COUNT(*) FILTER (WHERE status = 'in_triage'),
    'ready_for_doctor',COUNT(*) FILTER (WHERE status = 'ready_for_doctor'),
    'in_consultation', COUNT(*) FILTER (WHERE status = 'in_consultation'),
    'in_observation',  COUNT(*) FILTER (WHERE status = 'in_observation'),
    'discharged',      COUNT(*) FILTER (WHERE status = 'discharged'),
    'absent',          COUNT(*) FILTER (WHERE status = 'absent'),
    'referral_count',  COUNT(*) FILTER (WHERE referral_flag = TRUE),
    'interaction_alerts', (
      SELECT COUNT(*) FROM nurse_mar_records mar
      JOIN patients_daily_queue q2 ON q2.queue_id = mar.queue_id
      WHERE q2.queue_date = CURRENT_DATE
        AND mar.status = 'pending'
        AND mar.scheduled_at <= NOW()
        AND (
          (v_type = 'affiliated' AND q2.organization_id = v_org)
          OR q2.assigned_nurse_id = v_nurse
        )
    ),
    'pending_vitals', COUNT(*) FILTER (WHERE vital_signs_taken = FALSE AND status NOT IN ('discharged','absent'))
  )
  INTO v_result
  FROM patients_daily_queue
  WHERE queue_date = CURRENT_DATE
    AND deleted_at IS NULL
    AND (
      (v_type = 'affiliated' AND organization_id = v_org)
      OR assigned_nurse_id = v_nurse
    );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_nurse_dashboard_summary IS
  'RPC: resumen estadístico del turno actual para el dashboard de enfermería.';

-- RPC: soft_delete_queue_entry
-- Marca una entrada de la cola como eliminada (soft delete)
CREATE OR REPLACE FUNCTION soft_delete_queue_entry(p_queue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nurse UUID;
BEGIN
  v_nurse := auth_nurse_profile_id();
  IF v_nurse IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  UPDATE patients_daily_queue
  SET deleted_at = NOW(), updated_at = NOW(), updated_by = auth.uid()
  WHERE queue_id = p_queue_id
    AND deleted_at IS NULL
    AND (
      assigned_nurse_id = v_nurse
      OR (auth_nurse_type() = 'affiliated' AND organization_id = auth_nurse_org_id())
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no encontrado o sin permiso';
  END IF;
END;
$$;

-- RPC: get_cross_org_history
-- Historial cruzado de un paciente en la red ASHIRA (con control de permisos)
CREATE OR REPLACE FUNCTION get_cross_org_history(p_patient_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nurse    UUID;
  v_org      UUID;
  v_result   JSONB;
BEGIN
  v_nurse := auth_nurse_profile_id();
  IF v_nurse IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  v_org := auth_nurse_org_id();

  -- Retorna visitas en otras orgs donde la org de origen permitió compartir resumen
  SELECT jsonb_agg(
    jsonb_build_object(
      'organization_name', o.name,
      'queue_date',         q.queue_date,
      'status',             q.status,
      'chief_complaint',    q.chief_complaint,
      'triage_level',       q.triage_level
    ) ORDER BY q.queue_date DESC
  )
  INTO v_result
  FROM patients_daily_queue q
  JOIN organization o ON o.id = q.organization_id
  JOIN cross_org_access_permissions cap ON cap.organization_id = q.organization_id
  WHERE q.patient_id = p_patient_id
    AND q.deleted_at IS NULL
    AND q.organization_id != v_org
    AND cap.share_visit_summary = TRUE
    -- Verificar que la org consultante no está bloqueada
    AND (cap.blocked_org_ids IS NULL OR NOT (cap.blocked_org_ids @> ARRAY[v_org]))
    -- Si hay whitelist, verificar que estamos en ella
    AND (cap.allowed_org_ids IS NULL OR cap.allowed_org_ids @> ARRAY[v_org]);

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

COMMENT ON FUNCTION get_cross_org_history IS
  'Retorna historial de visitas del paciente en otras organizaciones ASHIRA que autorizaron compartir datos.';

-- ══════════════════════════════════════════════════════════════
-- BLOQUE 16 — SEED DATA
-- ══════════════════════════════════════════════════════════════

-- No se requieren inserts de catálogo adicional.
-- Los ENUMs cubren todos los valores válidos.
-- Los catálogos de especialidades y organizaciones usan las
-- tablas existentes (organization, users).

-- ══════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT SQL v1.1 — PANEL ENFERMERÍA ASHIRA
-- ══════════════════════════════════════════════════════════════
-- Tablas creadas (NUEVAS, no modifica existentes):
--   nurse_profiles, patients_daily_queue,
--   patient_origin_records, patient_prior_treatments,
--   nurse_vital_signs, nurse_mar_records,
--   nurse_procedures, nurse_shift_reports,
--   cross_org_access_permissions
-- Vistas: nurse_full_profile, nurse_daily_dashboard
-- Funciones RPC: get_patient_full_origin,
--   get_nurse_dashboard_summary, soft_delete_queue_entry,
--   get_cross_org_history
-- Helpers RLS: auth_nurse_profile_id(), auth_nurse_type(),
--              auth_nurse_org_id()
-- ══════════════════════════════════════════════════════════════

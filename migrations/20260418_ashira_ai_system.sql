-- ====================================================
-- SISTEMA DE CACHÉ DE IA PARA ASHIRA
-- ====================================================

-- 1. Caché de análisis de informes médicos
CREATE TABLE IF NOT EXISTS public.ai_report_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash       VARCHAR(32) UNIQUE NOT NULL,
  patient_id      UUID NOT NULL, -- Changed to UUID to match project schema
  analysis_result JSONB NOT NULL,
  tokens_used     INTEGER,
  model_used      VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_report_cache_patient FOREIGN KEY (patient_id) REFERENCES public.patient(id)
);

CREATE INDEX IF NOT EXISTS idx_report_cache_hash ON public.ai_report_cache(file_hash);

-- 2. Caché del saludo de voz diario
CREATE TABLE IF NOT EXISTS public.ai_voice_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL,
  date            DATE NOT NULL,
  greeting_text   TEXT NOT NULL,
  audio_url       TEXT,
  chars_used      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, date),
  CONSTRAINT fk_voice_cache_doctor FOREIGN KEY (doctor_id) REFERENCES public.users(id)
);

-- 3. Caché del resumen del historial del paciente
CREATE TABLE IF NOT EXISTS public.ai_memory_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID UNIQUE NOT NULL, -- Changed to UUID to match project schema
  history_hash    VARCHAR(32) NOT NULL,
  summary         JSONB NOT NULL,
  tokens_used     INTEGER,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_memory_cache_patient FOREIGN KEY (patient_id) REFERENCES public.patient(id)
);

-- 4. Log de consumo de tokens
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature         VARCHAR(20) NOT NULL,  -- 'doc', 'voice', 'memory'
  tokens_in       INTEGER NOT NULL,
  tokens_out      INTEGER NOT NULL,
  model           VARCHAR(50),
  source          VARCHAR(10),           -- 'api' o 'cache'
  doctor_id       UUID,
  patient_id      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Función para calcular el hash del estado del historial
CREATE OR REPLACE FUNCTION get_patient_history_hash(p_patient_id UUID)
RETURNS JSON AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT MD5(
    COALESCE(
      (SELECT STRING_AGG(id::TEXT || updated_at::TEXT, ',' ORDER BY id)
       FROM consultations 
       WHERE patient_id = p_patient_id
       LIMIT 5),
      'empty'
    ) ||
    COALESCE(
      (SELECT updated_at::TEXT FROM patient WHERE id = p_patient_id),
      'empty'
    )
  ) INTO v_hash;
  
  RETURN JSON_BUILD_OBJECT('hash', v_hash);
END;
$$ LANGUAGE plpgsql;

-- 6. Vista de consumo diario para monitoreo
CREATE OR REPLACE VIEW public.ai_daily_usage AS
SELECT 
  DATE(created_at) AS date,
  feature,
  COUNT(*) FILTER (WHERE source = 'api') AS api_calls,
  COUNT(*) FILTER (WHERE source = 'cache') AS cache_hits,
  SUM(tokens_in + tokens_out) FILTER (WHERE source = 'api') AS total_tokens,
  ROUND(
    COUNT(*) FILTER (WHERE source = 'cache')::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) AS cache_hit_rate_pct
FROM ai_usage_log
GROUP BY DATE(created_at), feature;

-- 7. Buckets de almacenamiento (Nota: Usualmente se crean vía UI o SDK, pero dejamos la referencia)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ai-audio', 'ai-audio', true) ON CONFLICT (id) DO NOTHING;


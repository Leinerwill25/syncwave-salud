-- =====================================================
-- ÍNDICES DE RENDIMIENTO PARA OPTIMIZACIÓN DE QUERIES
-- Syncwave - Sistema de Gestión Clínica MVP
-- =====================================================
-- Estos índices mejoran significativamente el rendimiento de las consultas más frecuentes
-- Reducen tiempos de respuesta de queries de segundos a milisegundos

-- =====================================================
-- ÍNDICES PARA TABLA consultation
-- =====================================================

-- Índice compuesto para consultas por doctor y fecha (usado en KPIs y listados)
CREATE INDEX IF NOT EXISTS idx_consultation_doctor_date 
ON consultation(doctor_id, started_at DESC, created_at DESC)
WHERE started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultation_doctor_created 
ON consultation(doctor_id, created_at DESC)
WHERE started_at IS NULL;

-- Índice compuesto para consultas por organización y doctor (seguridad y filtrado)
CREATE INDEX IF NOT EXISTS idx_consultation_org_doctor 
ON consultation(organization_id, doctor_id, created_at DESC);

-- Índice para consultas por paciente (usado en historial)
CREATE INDEX IF NOT EXISTS idx_consultation_patient 
ON consultation(patient_id, created_at DESC)
WHERE patient_id IS NOT NULL;

-- Índice para consultas por paciente no registrado
CREATE INDEX IF NOT EXISTS idx_consultation_unregistered_patient 
ON consultation(unregistered_patient_id, created_at DESC)
WHERE unregistered_patient_id IS NOT NULL;

-- Índice para búsqueda por appointment_id
CREATE INDEX IF NOT EXISTS idx_consultation_appointment 
ON consultation(appointment_id)
WHERE appointment_id IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA TABLA appointment
-- =====================================================

-- Índice compuesto para citas por doctor y fecha (usado en agenda y KPIs)
CREATE INDEX IF NOT EXISTS idx_appointment_doctor_date 
ON appointment(doctor_id, scheduled_at DESC, status);

-- Índice compuesto para citas por organización y doctor
CREATE INDEX IF NOT EXISTS idx_appointment_org_doctor 
ON appointment(organization_id, doctor_id, scheduled_at DESC);

-- Índice para citas por paciente
CREATE INDEX IF NOT EXISTS idx_appointment_patient 
ON appointment(patient_id, scheduled_at DESC)
WHERE patient_id IS NOT NULL;

-- Índice para citas por paciente no registrado
CREATE INDEX IF NOT EXISTS idx_appointment_unregistered_patient 
ON appointment(unregistered_patient_id, scheduled_at DESC)
WHERE unregistered_patient_id IS NOT NULL;

-- Índice para búsqueda por estado y fecha (usado en filtros)
CREATE INDEX IF NOT EXISTS idx_appointment_status_date 
ON appointment(status, scheduled_at DESC);

-- =====================================================
-- ÍNDICES PARA TABLA facturacion
-- =====================================================

-- Índice compuesto para facturación por doctor y fecha de pago (usado en KPIs)
CREATE INDEX IF NOT EXISTS idx_facturacion_doctor_fecha_pago 
ON facturacion(doctor_id, fecha_pago DESC, estado_pago)
WHERE estado_pago = 'pagada' AND fecha_pago IS NOT NULL;

-- Índice compuesto para facturación por doctor y fecha de emisión
CREATE INDEX IF NOT EXISTS idx_facturacion_doctor_fecha_emision 
ON facturacion(doctor_id, fecha_emision DESC, estado_pago)
WHERE estado_pago = 'pagada' AND fecha_pago IS NULL;

-- Índice para facturación por appointment_id
CREATE INDEX IF NOT EXISTS idx_facturacion_appointment 
ON facturacion(appointment_id)
WHERE appointment_id IS NOT NULL;

-- Índice para facturación por organización
CREATE INDEX IF NOT EXISTS idx_facturacion_org 
ON facturacion(organization_id, fecha_pago DESC);

-- =====================================================
-- ÍNDICES PARA TABLA Patient
-- =====================================================

-- Índice para búsqueda por identificador (cédula) - ya debería ser único, pero asegurar índice
CREATE INDEX IF NOT EXISTS idx_patient_identifier 
ON Patient(identifier)
WHERE identifier IS NOT NULL;

-- Índice compuesto para búsqueda por nombre y apellido (usado en búsquedas)
CREATE INDEX IF NOT EXISTS idx_patient_name_search 
ON Patient USING gin(to_tsvector('spanish', coalesce(firstName, '') || ' ' || coalesce(lastName, '')));

-- Índice para búsqueda por nombre (búsqueda simple)
CREATE INDEX IF NOT EXISTS idx_patient_firstname 
ON Patient(firstName);

CREATE INDEX IF NOT EXISTS idx_patient_lastname 
ON Patient(lastName);

-- =====================================================
-- ÍNDICES PARA TABLA prescription
-- =====================================================

-- Índice compuesto para prescripciones por doctor y paciente
CREATE INDEX IF NOT EXISTS idx_prescription_doctor_patient 
ON prescription(doctor_id, patient_id, created_at DESC);

-- Índice para prescripciones por consulta
CREATE INDEX IF NOT EXISTS idx_prescription_consultation 
ON prescription(consultation_id)
WHERE consultation_id IS NOT NULL;

-- Índice para prescripciones por paciente (usado en historial)
CREATE INDEX IF NOT EXISTS idx_prescription_patient 
ON prescription(patient_id, created_at DESC);

-- =====================================================
-- ÍNDICES PARA TABLA lab_result
-- =====================================================

-- Índice compuesto para resultados de laboratorio por consulta
CREATE INDEX IF NOT EXISTS idx_lab_result_consultation 
ON lab_result(consultation_id, created_at DESC)
WHERE consultation_id IS NOT NULL;

-- Índice para resultados por paciente
CREATE INDEX IF NOT EXISTS idx_lab_result_patient 
ON lab_result(patient_id, created_at DESC)
WHERE patient_id IS NOT NULL;

-- Índice para resultados por paciente no registrado
CREATE INDEX IF NOT EXISTS idx_lab_result_unregistered_patient 
ON lab_result(unregistered_patient_id, created_at DESC)
WHERE unregistered_patient_id IS NOT NULL;

-- Índice para resultados críticos
CREATE INDEX IF NOT EXISTS idx_lab_result_critical 
ON lab_result(is_critical, reported_at DESC)
WHERE is_critical = true;

-- =====================================================
-- ÍNDICES PARA TABLA User
-- =====================================================

-- Índice para búsqueda por authId (ya debería ser único, pero asegurar índice)
CREATE INDEX IF NOT EXISTS idx_user_authid 
ON "User"(authId)
WHERE authId IS NOT NULL;

-- Índice compuesto para usuarios por organización y rol
CREATE INDEX IF NOT EXISTS idx_user_org_role 
ON "User"(organizationId, role)
WHERE organizationId IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA TABLA unregisteredpatients
-- =====================================================

-- Índice para búsqueda por identificación
CREATE INDEX IF NOT EXISTS idx_unregisteredpatients_identification 
ON unregisteredpatients(identification)
WHERE identification IS NOT NULL;

-- Índice para búsqueda por nombre
CREATE INDEX IF NOT EXISTS idx_unregisteredpatients_name 
ON unregisteredpatients(first_name, last_name);

-- =====================================================
-- NOTAS DE MANTENIMIENTO
-- =====================================================
-- 
-- 1. Estos índices mejoran el rendimiento de SELECT pero pueden
--    ralentizar ligeramente INSERT/UPDATE/DELETE. Para la mayoría
--    de casos de uso (más lecturas que escrituras), esto es óptimo.
--
-- 2. Los índices parciales (con WHERE) son más eficientes en espacio
--    y rendimiento cuando solo se indexa un subconjunto de filas.
--
-- 3. Revisar periódicamente el uso de índices con:
--    SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
--
-- 4. Para tablas muy grandes, considerar índices adicionales o
--    particionamiento por fecha.
--
-- 5. Los índices GIN (Generalized Inverted Index) son ideales para
--    búsquedas de texto completo pero requieren más espacio.
--
-- =====================================================


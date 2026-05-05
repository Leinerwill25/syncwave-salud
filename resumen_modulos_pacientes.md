# Implementación: Módulo de Informes Médicos y Encuesta Post-Consulta (ASHIRA)

Este documento detalla todas las implementaciones aditivas desarrolladas para integrar los nuevos módulos en el portal del paciente de ASHIRA, respetando el diseño, la arquitectura y aislando la funcionalidad de los módulos existentes.

---

## 1. Migraciones de Base de Datos
**Ruta:** `migrations/create_medical_reports_and_surveys.sql`

Se creó un script SQL único que realiza las siguientes operaciones en Supabase:
- Creación de la tabla `patient_medical_reports` vinculada a `auth.users` y `consultation`.
- Creación del *Storage Bucket* `medical-reports` para hospedar los documentos de forma segura (solo acceso por RLS para pacientes y médicos vinculados).
- Políticas de Seguridad RLS aplicadas a nivel de base de datos y de storage (Principio de mínimo privilegio `auth.uid()`).
- Creación de la tabla de encuestas dinámicas `consultation_surveys` (configuración JSONB).
- Creación de la tabla de respuestas `consultation_survey_responses` para vincular a una cita específica y evitar duplicados.
- Creación del trigger `trigger_survey_on_complete` asociado a la tabla `consultation`, que se dispara automáticamente generando una encuesta pendiente cuando el status de la consulta pasa a `'completada'`.

---

## 2. Tipos e Interfaces (TypeScript)
**Rutas:**
- `src/types/medical-reports.ts`
- `src/types/surveys.ts`

Se añadieron tipos estrictos para garantizar la seguridad durante el paso de propiedades:
- **Medical Reports:** `PatientMedicalReport`, `PatientMedicalReportInsert`, y el enum de reportes permitidos (`laboratorio`, `imagen`, etc.).
- **Surveys:** Configuración polimórfica para preguntas (`SurveyQuestionType`) soportando texto, estrellas de calificación, selección única y valores booleanos (sí/no).

---

## 3. Server Actions (Backend / Supabase)
**Rutas:**
- `src/lib/actions/medical-reports.ts`
- `src/lib/actions/surveys.ts`

Se implementaron Server Actions reutilizables llamando a la instancia segura `createSupabaseServerClient`:
- **Informes:** `getMedicalReports()`, `createMedicalReport()`, `deleteMedicalReport()`, y `getMedicalReportSignedUrl()` para asegurar visualización segura en cliente mediante URLs firmadas.
- **Encuestas:** `getPendingSurvey()` (recupera encuestas de los últimos 7 días con JOINs seguros), `dismissSurvey()` y `submitSurveyResponse()`.

---

## 4. Módulo de Interfaz UI: Informes Médicos
**Rutas:**
- `src/app/dashboard/patient/informes/page.tsx`
- `src/app/dashboard/patient/components/medical-reports/MedicalReportCard.tsx`
- `src/app/dashboard/patient/components/medical-reports/UploadReportModal.tsx`
- `src/app/dashboard/patient/components/medical-reports/ReportPreviewModal.tsx`

Se implementó una experiencia de usuario robusta y premium:
- **Gestor Principal:** Una interfaz para filtrar informes por tipo y realizar búsquedas de texto.
- **Subida de Archivos:** Drag and drop integrado directamente con *Supabase Storage*, soportando validación de 20MB e indicando el porcentaje de progreso de subida de manera fluida.
- **Visualización Inline:** Carga dinámica de imágenes o iframes (PDFs) a partir de URLs firmadas de duración limitada. Descarga disponible en un clic.

---

## 5. Módulo de Interfaz UI: Encuestas Post-Consulta
**Rutas:**
- `src/app/dashboard/patient/components/surveys/PendingSurveyBanner.tsx`
- `src/app/dashboard/patient/components/surveys/SurveyModal.tsx`
- `src/app/dashboard/patient/components/surveys/SurveyQuestion.tsx`

Sistema no invasivo de recopilación de métricas de calidad (QoS):
- **Banner Inteligente:** Detecta pasivamente la existencia de una consulta recién completada y muestra un banner amigable en la parte superior del Dashboard (estilo *SafeCare*).
- **Modal de Pasos Dinámico:** Renderiza visualmente la pregunta dependiendo del tipo configurado en el backend sin requerir cambios de código front-end (Estrellas, Botones Yes/No, Listas y Áreas de Texto).
- **Control de Abandono:** Permite descartar la encuesta si el paciente no desea completarla (`dismissed = true`).

---

## 6. Modificaciones al Dashboard Principal
**Ruta:** `src/app/dashboard/patient/page.tsx`

Para que el paciente pueda descubrir estas nuevas funcionalidades, se integraron los puntos de acceso en la página base `page.tsx`:
- Renderizado de `<PendingSurveyBanner />` como primer componente visual debajo del saludo.
- Transformación del grid de navegación (se expandió la cuadrícula a `lg:grid-cols-5`) para insertar de manera orgánica la Action Card **"Mis Informes"**, la cual posee el estilo *glassmorphism* de las otras opciones y redirige al nuevo módulo.

Todo se implementó con `0` errores de dependencias de tipos asegurando integridad sin afectar rutas críticas del software médico.

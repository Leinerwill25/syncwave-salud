# Análisis de Integración de Inteligencia Artificial - ASHIRA Clinical Platform

Este documento detalla todas las funcionalidades potenciadas por Inteligencia Artificial que han sido integradas en la plataforma ASHIRA (Syncwave Salud). El sistema utiliza una arquitectura multi-modelo robusta con procesos de fallback y logging de consumo.

## 1. Arquitectura Central de IA (AI Engine)
La plataforma utiliza un cliente centralizado localizado en `src/lib/ai/client.ts` que gestiona las peticiones a los modelos de lenguaje.

- **Modelos Principales**: 
    - **Gemini 1.5 Flash**: Modelo base por su alta ventana de contexto y soporte nativo de JSON.
    - **Groq (Llama 3.3 70B)**: Utilizado como motor de inferencia de baja latencia y fallback de seguridad.
- **Gestión de Fallbacks**: Si Gemini falla o produce un error 403 (bloqueo regional), el sistema conmuta automáticamente a Groq para asegurar la continuidad del servicio.
- **Consumo y Trazabilidad**: Cada interacción se registra en `ai_usage_log` para auditar el uso de tokens por médico, paciente y funcionalidad.

---

## 2. Funcionalidades Integradas

### 2.1 ASHIRA-Voice (Asistente de Briefing Matutino)
- **Localización**: `src/lib/ai/ashira-voice.ts`
- **Descripción**: Genera saludos personalizados para los médicos al inicio de su jornada.
- **Capacidades**:
    - Analiza la agenda de citas del día en tiempo real.
    - Identifica la hora de la primera y última cita.
    - Clasifica pacientes confirmados vs. pendientes.
    - Genera un discurso cálido y profesional en español venezolano formal.

### 2.2 ASHIRA-Memory (Resumen Clínico Inteligente)
- **Localización**: `src/lib/ai/ashira-memory.ts`
- **Descripción**: Sintetiza el historial médico del paciente antes de la consulta para el médico.
- **Capacidades**:
    - Resumen narrativo de las últimas 5 consultas.
    - Extracción automática de diagnósticos activos y alertas críticas (alergias, riesgos).
    - Consolidación de medicamentos vigentes.
    - **Optimización**: Utiliza un sistema de *hashing* de base de datos (`get_patient_history_hash`) para regenerar el resumen solo si el historial ha cambiado, ahorrando tokens.

### 2.3 Generación de Informes Médicos desde Audio
- **Localización**: `api/consultations/[id]/generate-report-from-audio`
- **Descripción**: Permite a los médicos dictar una consulta y obtener un informe estructurado automáticamente.
- **Workflow**:
    1. Transcripción de alta fidelidad vía Groq.
    2. Limpieza de muletillas y estructuración clínica mediante IA.
    3. Mapeo de hallazgos a plantillas especializadas (Ginecología, Medicina General, etc.).
    4. Generación final de documento (PDF/DOC) orquestada por n8n.

### 2.4 Nursing Kardex (Audio-to-Note)
- **Localización**: `api/nurse/kardex/audio-to-note`
- **Descripción**: Facilita el trabajo de enfermería permitiendo dictar notas de evolución.
- **Capacidad**: Transforma dictados informales en notas de Kardex estructuradas y profesionales.

### 2.5 WhatsApp Inteligente (Integración WAHA + IA)
- **Localización**: `api/waha/webhook`
- **Descripción**: El asistente de WhatsApp no solo envía recordatorios, sino que "entiende" las respuestas.
- **Capacidad**: Utiliza procesamiento de lenguaje natural para detectar si el paciente está confirmando ("sí, iré"), cancelando ("no puedo ir") o solicitando reprogramar, actualizando el estado de la cita en el dashboard sin intervención humana.

### 2.6 Consejero de Salud para Pacientes (Patient Advice)
- **Localización**: `api/patient/advice`
- **Descripción**: Brinda recomendaciones personalizadas a los pacientes basadas en sus datos clínicos y consultas previas.

---

## 3. Próximos Pasos Sugeridos
1. **Análisis Multimodal**: Implementar análisis de imágenes de laboratorio/radiología usando `Gemini 1.5 Pro`.
2. **Predictor de Ausentismo**: Analizar patrones históricos con IA para predecir qué pacientes tienen alta probabilidad de faltar a su cita.
3. **Optimización de Prescripciones**: Sugerir medicamentos basados en guías actualizadas y evitando interacciones adversas detectadas en el perfil del paciente.

---
**Archivo generado el**: 2026-04-22  
**Sistema**: ASHIRA Clinical Intelligence

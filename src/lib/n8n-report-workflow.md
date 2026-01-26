# Workflow de n8n para Generación de Informes desde Audio

## Descripción del Workflow

Este workflow procesa audio del doctor, lo transcribe, analiza, limpia y genera un informe médico en formato Word.

## Estructura del Workflow

### 1. Webhook Trigger (HTTP Request)
- **Tipo**: Webhook
- **Método**: POST
- **Path**: `generate-report-from-audio`
- **Campos recibidos**:
  - `audioUrl`: URL del audio en Supabase Storage
  - `audioFileName`: Nombre del archivo
  - `audioType`: Tipo MIME del audio
  - `consultationId`: ID de la consulta
  - `doctorId`: ID del doctor
  - `reportType`: Tipo de informe (gynecology, first_trimester, second_third_trimester)
  - `specialty`: Especialidad
  - `patientData`: Datos del paciente
  - `consultationData`: Datos de la consulta (vitals, diagnosis, etc.)
  - `medicProfile`: Perfil del médico con plantillas
  - `groqApiKey`: API Key de Groq

### 2. Descargar Audio
- **Tipo**: HTTP Request
- **Método**: GET
- **URL**: `{{ $json.audioUrl }}`
- **Response Format**: File
- **Guardar respuesta en**: Variable temporal

### 3. Convertir Audio a MP3 (si es necesario)
- **Tipo**: Code (Node.js)
- **Código**: 
```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Si el audio ya es MP3, retornar directamente
const inputFile = $input.item.json.binary.data.fileName;
const inputData = $input.item.json.binary.data.data;

if (inputFile.endsWith('.mp3') || inputFile.endsWith('.MP3')) {
  return {
    audioBuffer: inputData,
    audioFormat: 'mp3',
  };
}

// Para otros formatos, usar ffmpeg (requiere ffmpeg instalado en el sistema)
// Nota: Si no tienes ffmpeg, puedes omitir este paso y enviar el audio directamente a Groq
// Groq soporta varios formatos de audio

return {
  audioBuffer: inputData,
  audioFormat: path.extname(inputFile).slice(1),
};
```

### 4. Transcribir con Groq
- **Tipo**: HTTP Request
- **Método**: POST
- **URL**: `https://api.groq.com/openai/v1/audio/transcriptions`
- **Headers**:
  - `Authorization`: `Bearer {{ $json.groqApiKey }}`
- **Body**:
  - `file`: (Binary) Audio buffer
  - `model`: `whisper-large-v3`
  - `language`: `es`
  - `response_format`: `json`

### 5. Limpiar y Analizar Transcripción
- **Tipo**: Code (Node.js)
- **Código**:
```javascript
const transcription = $json.text;

// Eliminar muletillas comunes en español médico
const muletillas = [
  /\b(eh|em|ah|mm|umm|este|esto|bueno|entonces|así que|o sea|es decir)\b/gi,
  /\b(como|tipo|tal vez|quizás|a ver|mira|fíjate|osea)\b/gi,
];

let cleaned = transcription;
muletillas.forEach(pattern => {
  cleaned = cleaned.replace(pattern, ' ');
});

// Normalizar espacios
cleaned = cleaned.replace(/\s+/g, ' ').trim();

// Identificar campos del formulario usando patrones
// Esto se puede mejorar con IA, pero por ahora usamos patrones básicos
const fields = {
  motivo: extractField(cleaned, ['motivo', 'consulta', 'síntomas', 'dolor', 'molestia']),
  diagnosis: extractField(cleaned, ['diagnóstico', 'diagnostico', 'diagnosticar', 'condición']),
  // Agregar más campos según la especialidad
};

function extractField(text, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[\\s:]+([^.,]+)`, 'i');
    const match = text.match(regex);
    if (match) return match[1].trim();
  }
  return '';
}

return {
  original: transcription,
  cleaned: cleaned,
  fields: fields,
};
```

### 6. Analizar con IA para Extraer Campos
- **Tipo**: HTTP Request
- **Método**: POST
- **URL**: `https://api.groq.com/openai/v1/chat/completions`
- **Headers**:
  - `Authorization`: `Bearer {{ $json.groqApiKey }}`
  - `Content-Type`: `application/json`
- **Body**:
```json
{
  "model": "llama-3.1-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "Eres un asistente médico que analiza transcripciones de audio y extrae información estructurada para informes médicos. Responde SOLO en JSON válido con los campos identificados."
    },
    {
      "role": "user",
      "content": "Analiza esta transcripción médica y extrae los campos relevantes:\n\n{{ $json.cleaned }}\n\nEspecialidad: {{ $('Webhook').item.json.specialty }}\nTipo de informe: {{ $('Webhook').item.json.reportType }}\n\nResponde con un JSON que contenga los campos del formulario de la especialidad."
    }
  ],
  "temperature": 0.3,
  "response_format": { "type": "json_object" }
}
```

### 7. Obtener Plantilla Word
- **Tipo**: HTTP Request
- **Método**: GET
- **URL**: URL de la plantilla desde `medicProfile.report_template_url`
- **Response Format**: File
- **Guardar**: Template buffer

### 8. Procesar Plantilla y Generar Informe
- **Tipo**: Code (Node.js)
- **Instalar dependencias**:
  - `docxtemplater`
  - `pizzip`
- **Código**: Similar al que está en `generate-report/route.ts` pero adaptado para n8n

### 9. Subir Informe a Supabase Storage
- **Tipo**: HTTP Request
- **Método**: POST
- **URL**: `{{ SUPABASE_URL }}/storage/v1/object/consultation-reports/{{ consultationId }}/{{ timestamp }}-informe-{{ consultationId }}.docx`
- **Headers**:
  - `Authorization`: `Bearer {{ SUPABASE_SERVICE_ROLE_KEY }}`
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Body**: Binary (archivo .docx generado)

### 10. Callback a Next.js
- **Tipo**: HTTP Request
- **Método**: POST
- **URL**: `{{ NEXT_PUBLIC_APP_URL }}/api/n8n/callback/report-generated`
- **Body**:
```json
{
  "consultationId": "{{ $('Webhook').item.json.consultationId }}",
  "reportUrl": "{{ URL del informe generado }}",
  "transcription": "{{ Transcripción original }}"
}
```

## Configuración de Variables de Entorno en n8n

Agregar en n8n (Settings > Environment Variables):
- `SUPABASE_URL`: URL de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key de Supabase
- `NEXT_PUBLIC_APP_URL`: URL de tu aplicación Next.js

## Instalación de Dependencias Node.js en n8n

Para el paso 8 (Procesar Plantilla), necesitarás instalar:
```bash
cd ~/.n8n
npm install docxtemplater pizzip
```

## Notas Importantes

1. **Conversión de Audio**: Si no tienes ffmpeg instalado, Groq puede aceptar el audio directamente sin conversión para muchos formatos.

2. **Límites de Groq**: Revisa los límites de la API gratuita de Groq para transcripciones.

3. **Plantillas**: Asegúrate de que las plantillas Word estén correctamente formateadas con marcadores `{{variable}}`.

4. **Seguridad**: El API key de Groq se envía desde Next.js a n8n. Considera usar variables de entorno en n8n en lugar de pasarla en el payload.







# 🚀 Guía Rápida: Configuración de Generación de Informes desde Audio

## ✅ Implementación Completada

He creado toda la infraestructura necesaria para generar informes médicos desde audio usando n8n y Groq.

## 📦 Componentes Implementados

### 1. APIs de Next.js ✅

-   ✅ `/api/consultations/[id]/generate-report-from-audio` - Recibe audio y envía a n8n
-   ✅ `/api/n8n/generate-report-internal` - Endpoint interno para generar informe desde n8n
-   ✅ `/api/n8n/callback/report-generated` - Callback cuando el informe está listo

### 2. Workflow de n8n ✅

-   ✅ Archivo JSON del workflow creado: `n8n-workflow-generate-report.json`
-   ✅ Documentación detallada: `src/lib/n8n-report-workflow.md`

## 🔧 Configuración Paso a Paso

### Paso 1: Variables de Entorno

Agrega a tu `.env.local`:

```env
# n8n (Local o Cloud)
# Para n8n LOCAL:
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-report-from-audio
# Para n8n CLOUD (ejemplo):
# N8N_WEBHOOK_URL=https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio

N8N_API_KEY=tu-clave-secreta-aqui-123456789

# Groq (ya debería estar)
API_GROQ=tu-api-key-de-groq

# App URL
# Si usas n8n CLOUD, esta URL debe ser accesible desde internet (usa túnel o producción)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Para n8n cloud en desarrollo local, usa túnel (ej: ngrok):
# NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

⚠️ **¿Usas n8n Cloud?** Ve a `CONFIGURACION_N8N_CLOUD.md` para pasos detallados.

### Paso 2: Crear Bucket en Supabase

**📖 Para pasos detallados, ve a: `GUIA_CREAR_BUCKET_SUPABASE.md`**

Resumen rápido:

1. Ve a **Supabase Dashboard** → **Storage** (https://app.supabase.com/)
2. Haz clic en **"New bucket"** o **"+ New Bucket"**
3. Nombre: `temp-audio` (exactamente así, con guión)
4. **Configuración recomendada para empezar:**
    - **Public bucket**: Activa el toggle (más fácil para testing)
    - **File size limit**: 50 MB o más
    - **Allowed MIME types**: `audio/*` (o déjalo vacío)
5. Haz clic en **"Create bucket"**
6. Verifica que el bucket aparezca en la lista

⚠️ **Nota**: Para pasos detallados con capturas de pantalla y troubleshooting, consulta `GUIA_CREAR_BUCKET_SUPABASE.md`

### Paso 3: Configurar n8n

1. **Inicia n8n** (si no está corriendo):

    ```bash
    cd my-app
    pnpm run n8n
    ```

2. **Accede a n8n**: `http://localhost:5678`

3. **Importar workflow**:

    - Ve a **Workflows** → **Import from File**
    - Selecciona: `n8n-workflow-generate-report.json`
    - Guarda el workflow

4. **Configurar Variables de Entorno en n8n**:

    - Settings → Environment Variables
    - Agrega:
        - `SUPABASE_URL`: Tu URL de Supabase
        - `SUPABASE_SERVICE_ROLE_KEY`: Tu service role key
        - `NEXT_PUBLIC_APP_URL`: http://localhost:3000
        - `GROQ_API_KEY`: Tu API key de Groq (o úsala desde el payload)

5. **Editar nodos del workflow**:

    a) **Nodo "Transcribir con Groq"**:

    - Configura el header Authorization: `Bearer {{ $('Webhook').item.json.groqApiKey }}`
    - Body: multipart/form-data
    - Campo `file`: Seleccionar binary data del audio
    - Campo `model`: `whisper-large-v3`
    - Campo `language`: `es`
    - Campo `response_format`: `json`

    b) **Nodo "Analizar con IA"**:

    - URL: `https://api.groq.com/openai/v1/chat/completions`
    - Header Authorization: `Bearer {{ $json.groqApiKey }}`
    - Body JSON:
        ```json
        {
        	"model": "llama-3.1-70b-versatile",
        	"messages": [
        		{
        			"role": "system",
        			"content": "Eres un asistente médico que analiza transcripciones y extrae información estructurada para informes médicos. Responde SOLO en JSON válido."
        		},
        		{
        			"role": "user",
        			"content": "Analiza esta transcripción médica y extrae los campos relevantes para el formulario:\n\nTranscripción:\n{{ $json.cleaned }}\n\nEspecialidad: {{ $json.specialty }}\nTipo de informe: {{ $json.reportType }}\n\nResponde con un JSON que contenga los campos extraídos."
        		}
        	],
        	"temperature": 0.3,
        	"response_format": { "type": "json_object" }
        }
        ```

    c) **Nodo "Generar Informe"**:

    - URL: `{{ $env.NEXT_PUBLIC_APP_URL }}/api/n8n/generate-report-internal`
    - Método: POST
    - Body JSON:
        ```json
        {
          "consultationId": "{{ $json.consultationId }}",
          "doctorId": "{{ $json.doctorId }}",
          "reportType": "{{ $json.reportType }}",
          "transcription": "{{ $json.transcription }}",
          "extractedFields": {{ $json.extractedFields }},
          "updatedVitals": {{ $json.updatedVitals }},
          "apiKey": "{{ $('Webhook').item.json.n8nApiKey }}"
        }
        ```

6. **Activar workflow**: Activa el toggle en la parte superior del workflow

### Paso 4: Probar el Flujo

1. **Desde Postman o similar**, prueba el endpoint:

    ```bash
    POST http://localhost:3000/api/consultations/[CONSULTATION_ID]/generate-report-from-audio
    Content-Type: multipart/form-data

    Form Data:
    - audio: [archivo de audio]
    - reportType: gynecology
    - specialty: gynecology
    ```

2. **Verifica los logs**:
    - Logs de n8n en la interfaz
    - Logs de Next.js en la consola
    - Verifica que se genere el informe

## 🎯 Flujo Completo

```
Frontend (Next.js)
    ↓ [Grabar audio]
API: /generate-report-from-audio
    ↓ [Subir a Supabase Storage]
    ↓ [Enviar webhook a n8n]
n8n Workflow
    ↓ [Descargar audio]
    ↓ [Transcribir con Groq Whisper]
    ↓ [Limpiar muletillas]
    ↓ [Analizar con Groq Llama]
    ↓ [Extraer campos del formulario]
    ↓ [Llamar a /api/n8n/generate-report-internal]
API: /generate-report-internal
    ↓ [Obtener plantilla Word]
    ↓ [Procesar con Docxtemplater]
    ↓ [Subir informe .docx a Supabase]
    ↓ [Retornar URL del informe]
n8n Workflow
    ↓ [Callback a /api/n8n/callback/report-generated]
Frontend (Next.js)
    ↓ [Mostrar informe generado]
```

## 🔍 Troubleshooting

### Error: "Cannot find module zod"

-   **Solución**: Ya está resuelto con la configuración de `.npmrc`

### Error: "command start not found"

-   **Solución**: Usa `pnpm exec n8n start` o `npx n8n start`

### Error: "No se encontró plantilla"

-   **Verifica**: Que el doctor tenga una plantilla configurada en `dashboard/medic/plantilla-informe`

### Error: "API de Groq no configurada"

-   **Verifica**: Que `API_GROQ` esté en `.env.local`

### Error: "Bucket temp-audio no existe"

-   **Solución**: Crea el bucket en Supabase Storage

## 📝 Notas Importantes

1. **Límites de Groq**: La API gratuita tiene límites. Considera implementar rate limiting.

2. **Seguridad**: El `N8N_API_KEY` debe ser una cadena aleatoria segura. Cámbialo en producción.

3. **Tamaño de Audio**: Considera limitar el tamaño máximo (ej: 25MB) para evitar problemas.

4. **Conversión de Audio**: Si el audio no es MP3, Groq puede aceptarlo directamente, pero si tienes problemas, considera usar ffmpeg en n8n.

5. **Manejo de Errores**: El workflow actual tiene manejo básico de errores. Considera agregar más validaciones.

## 🎉 ¡Listo para Usar!

Una vez configurado, los doctores podrán:

1. Grabar audio durante la consulta
2. Enviarlo al sistema
3. Recibir automáticamente el informe médico generado

## 📚 Archivos de Referencia

-   `IMPLEMENTACION_AUDIO_INFORMES.md` - Documentación completa
-   `src/lib/n8n-report-workflow.md` - Detalles técnicos del workflow
-   `n8n-workflow-generate-report.json` - Workflow exportable

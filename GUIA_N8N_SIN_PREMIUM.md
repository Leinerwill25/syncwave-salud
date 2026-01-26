# 📋 Guía: Configuración de n8n SIN Plan Premium (Gratis)

Esta guía te muestra cómo configurar n8n **sin necesidad de las Environment Variables premium**. Todas las variables se pasarán desde Next.js en el payload del webhook.

---

## 🎯 Objetivo

Configurar n8n para procesar audios médicos usando solo el plan gratuito, **sin necesidad de Environment Variables premium**.

---

## 📍 PASO 1: Verificar que n8n esté corriendo

### 1.1. Iniciar n8n

```bash
cd my-app
pnpm run n8n
```

O directamente:

```bash
npx n8n start
```

### 1.2. Verificar que n8n esté funcionando

1. Abre: `http://localhost:5678`
2. Crea una cuenta o inicia sesión (es gratis)

✅ **Verificación**: Deberías ver el dashboard de n8n sin errores.

---

## 📍 PASO 2: Importar el Workflow

### 2.1. Preparar el Archivo

Asegúrate de que `n8n-workflow-generate-report.json` esté en `my-app`.

### 2.2. Importar el Workflow en n8n

1. En n8n, ve a **"Workflows"**
2. Haz clic en **"Import from File"** o **"+"** → **"Import from File"**
3. Selecciona: `n8n-workflow-generate-report.json`
4. Haz clic en **"Import"**

✅ **Verificación**: Deberías ver el workflow importado con todos los nodos.

---

## 📍 PASO 3: Configurar el Webhook

### 3.1. Localizar el Nodo Webhook

1. Busca el nodo **"Webhook"** (primer nodo a la izquierda)
2. Haz **doble clic** para editarlo

### 3.2. Configurar el Webhook

1. **HTTP Method**: `POST`
2. **Path**: `generate-report-from-audio`
3. **Response Mode**: `When Last Node Finishes` o `Response Node`
4. **Authentication**: `None`

### 3.3. Activar el Workflow y Obtener URL

1. Haz clic en **"Save"**
2. Activa el **toggle** en la parte superior (debe volverse verde)
3. Copia la URL del webhook que aparece arriba del nodo:
    ```
    http://localhost:5678/webhook/generate-report-from-audio
    ```

✅ **Verificación**: El workflow debe estar activado (toggle verde) y la URL visible.

---

## 📍 PASO 4: Generar N8N_API_KEY

### 4.1. Generar Clave Secreta

Ejecuta en PowerShell:

```powershell
[System.Guid]::NewGuid().ToString()
```

O si tienes Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copia la clave generada** (ejemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### 4.2. Agregar al .env.local

Abre `.env.local` en la raíz de `my-app` y agrega:

```env
N8N_API_KEY=tu-clave-generada-aqui
```

Ejemplo:

```env
N8N_API_KEY=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

✅ **Verificación**: `.env.local` debe contener `N8N_API_KEY=...`

---

## 📍 PASO 5: Configurar .env.local Completo

Asegúrate de que `.env.local` tenga todas las variables:

```env
# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-report-from-audio
N8N_API_KEY=tu-clave-generada-aqui

# Groq API
API_GROQ=tu-api-key-de-groq

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **IMPORTANTE**: No necesitas configurar Environment Variables en n8n. Todo se pasa desde Next.js.

---

## 📍 PASO 6: Configurar los Nodos del Workflow

### 6.1. Nodo "Descargar Audio"

1. Doble clic en **"Descargar Audio"**
2. **Method**: `GET`
3. **URL**: `={{ $json.audioUrl }}`
4. En **Options** → **Response** → **Response Format**: `File`
5. **Save**

### 6.2. Nodo "Preparar Audio"

Ya está configurado. Solo verifica que existe.

### 6.3. Nodo "Transcribir con Groq"

1. Doble clic en **"Transcribir con Groq"**
2. **Method**: `POST`
3. **URL**: `https://api.groq.com/openai/v1/audio/transcriptions`

**Headers:**

-   Agrega header:
    -   **Name**: `Authorization`
    -   **Value**: `Bearer {{ $('Webhook').item.json.groqApiKey }}`

**Body:**

-   **Body Content Type**: `multipart-form-data`
-   **Specify Body**: `Using Fields Below`
-   Campos:
    -   `file`: Selecciona **Binary Data** del nodo anterior
    -   `model`: `whisper-large-v3`
    -   `language`: `es`
    -   `response_format`: `json`

3. **Save**

### 6.4. Nodo "Limpiar Transcripción"

Ya está configurado. Solo verifica que existe.

### 6.5. Nodo "Analizar con IA"

1. Doble clic en **"Analizar con IA"**
2. **Method**: `POST`
3. **URL**: `https://api.groq.com/openai/v1/chat/completions`

**Headers:**

-   Agrega header:
    -   **Name**: `Authorization`
    -   **Value**: `Bearer {{ $json.groqApiKey }}`
-   Agrega header:
    -   **Name**: `Content-Type`
    -   **Value**: `application/json`

**Body:**

-   **Body Content Type**: `JSON`
-   **Specify Body**: `JSON`
-   **JSON Body**: Usa esta expresión:

```json
{
	"model": "llama-3.1-70b-versatile",
	"messages": [
		{
			"role": "system",
			"content": "Eres un asistente médico que analiza transcripciones de consultas médicas. Tu tarea es extraer información estructurada de la transcripción y mapearla a los campos del formulario médico correspondiente a la especialidad. Responde SOLO con un JSON válido que contenga los campos extraídos."
		},
		{
			"role": "user",
			"content": "Analiza esta transcripción médica y extrae los campos relevantes para el formulario:\n\nTranscripción:\n{{ $json.cleaned }}\n\nEspecialidad: {{ $json.specialty }}\nTipo de informe: {{ $json.reportType }}\n\nDatos de la consulta actual:\n{{ JSON.stringify($json.consultationData) }}\n\nResponde con un JSON que contenga los campos extraídos del audio, mapeados a la estructura del formulario de la especialidad."
		}
	],
	"temperature": 0.3,
	"response_format": { "type": "json_object" }
}
```

3. **Save**

### 6.6. Nodo "Procesar Campos"

Ya está configurado. Solo verifica que existe.

### 6.7. Nodo "Generar Informe" ⚠️ IMPORTANTE

1. Doble clic en **"Generar Informe"**
2. **Method**: `POST`
3. **URL**: `{{ $('Webhook').item.json.nextAppUrl }}/api/n8n/generate-report-internal`

    ⚠️ **NOTA**: Usa `{{ $('Webhook').item.json.nextAppUrl }}` en lugar de `{{ $env.NEXT_PUBLIC_APP_URL }}`

**Headers:**

-   Agrega header:
    -   **Name**: `Content-Type`
    -   **Value**: `application/json`

**Body:**

-   **Body Content Type**: `JSON`
-   **Specify Body**: `JSON`
-   **JSON Body**:

```json
{
  "consultationId": "{{ $json.consultationId }}",
  "doctorId": "{{ $json.doctorId }}",
  "reportType": "{{ $json.reportType }}",
  "transcription": "{{ $json.transcription }}",
  "extractedFields": {{ JSON.stringify($json.extractedFields) }},
  "updatedVitals": {{ JSON.stringify($json.updatedVitals) }},
  "apiKey": "{{ $('Webhook').item.json.n8nApiKey }}"
}
```

3. **Save**

### 6.8. Nodo "Callback a Next.js"

1. Doble clic en **"Callback a Next.js"**
2. **Method**: `POST`
3. **URL**: `{{ $('Webhook').item.json.callbackUrl }}`

    ⚠️ **NOTA**: Usa `{{ $('Webhook').item.json.callbackUrl }}` en lugar de variables de entorno

**Headers:**

-   Agrega header:
    -   **Name**: `Content-Type`
    -   **Value**: `application/json`

**Body:**

-   **Body Content Type**: `JSON`
-   **Specify Body**: `JSON`
-   **JSON Body**:

```json
{
	"consultationId": "{{ $('Procesar Campos').item.json.consultationId }}",
	"reportUrl": "{{ $json.report_url }}",
	"transcription": "{{ $('Procesar Campos').item.json.transcription }}"
}
```

3. **Save**

✅ **Verificación**: Todos los nodos configurados usando variables del payload en lugar de Environment Variables.

---

## 📍 PASO 7: Activar el Workflow

1. Haz clic en **"Save"** (💾) en la parte superior
2. Activa el **toggle** (debe volverse verde)
3. El webhook está escuchando

✅ **Verificación**: Toggle verde, nodo Webhook escuchando.

---

## 📍 PASO 8: Verificar que Next.js esté actualizado

Asegúrate de que el archivo `generate-report-from-audio/route.ts` esté actualizado con las variables en el payload. El código ya debería estar actualizado para incluir:

-   `nextAppUrl`
-   `supabaseUrl`
-   `supabaseServiceRoleKey`
-   `callbackUrl`

✅ **Verificación**: Revisa que el código incluya todas estas variables en `n8nPayload`.

---

## 📍 PASO 9: Probar el Sistema

### 9.1. Reiniciar Next.js

Si ya estaba corriendo:

1. Detén el servidor (Ctrl+C)
2. Reinícialo:

```bash
cd my-app
pnpm run dev
```

### 9.2. Probar desde Postman o similar

```bash
POST http://localhost:3000/api/consultations/[CONSULTATION_ID]/generate-report-from-audio
Content-Type: multipart/form-data

Form Data:
- audio: [archivo de audio]
- reportType: gynecology
- specialty: gynecology
```

### 9.3. Verificar Logs

1. Revisa los logs de n8n en cada nodo
2. Los nodos ejecutados muestran círculo verde ✅
3. Los errores muestran círculo rojo ❌

---

## 🎉 ¡Listo! Funciona Sin Premium

Ahora tienes n8n funcionando **sin necesidad de Environment Variables premium**. Todas las variables se pasan desde Next.js en el payload del webhook.

---

## 🔍 Troubleshooting

### Problema: El nodo no encuentra las variables

**Solución:**

-   Asegúrate de usar `{{ $('Webhook').item.json.variableName }}` para acceder a las variables del payload
-   Verifica que Next.js esté enviando todas las variables necesarias

### Problema: Error en "Generar Informe" o "Callback"

**Solución:**

-   Verifica que uses `{{ $('Webhook').item.json.nextAppUrl }}` en lugar de `{{ $env.NEXT_PUBLIC_APP_URL }}`
-   Verifica que uses `{{ $('Webhook').item.json.callbackUrl }}` en lugar de variables de entorno

### Problema: Error de autenticación

**Solución:**

-   Verifica que `N8N_API_KEY` esté en `.env.local`
-   Verifica que Next.js esté pasando `n8nApiKey` en el payload

---

## ✅ Checklist Final (SIN Premium)

-   [ ] n8n corriendo en `http://localhost:5678`
-   [ ] Workflow importado
-   [ ] Webhook configurado y activo
-   [ ] N8N_API_KEY generada y en `.env.local`
-   [ ] Todas las variables en `.env.local`
-   [ ] Todos los nodos configurados usando variables del payload
-   [ ] Nodo "Generar Informe" usa `{{ $('Webhook').item.json.nextAppUrl }}`
-   [ ] Nodo "Callback" usa `{{ $('Webhook').item.json.callbackUrl }}`
-   [ ] Workflow activado (toggle verde)
-   [ ] Servidor Next.js reiniciado

---

**¡Perfecto!** Ahora funciona sin necesidad del plan premium. 🎉






# 📋 Guía Paso a Paso: Configuración de n8n para Generación de Informes desde Audio

Esta guía te llevará paso a paso para configurar n8n, crear el webhook, importar el workflow y obtener la API key.

---

## 🎯 Objetivo

Configurar n8n para procesar audios médicos y generar informes automáticamente.

---

## 📍 PASO 1: Verificar que n8n esté corriendo

### 1.1. Iniciar n8n

En tu terminal, ejecuta:

```bash
cd my-app
pnpm run n8n
```

O si prefieres ejecutarlo directamente:

```bash
npx n8n start
```

### 1.2. Verificar que n8n esté funcionando

1. Abre tu navegador
2. Ve a: `http://localhost:5678`
3. Deberías ver la interfaz de n8n
4. Si es la primera vez, crea una cuenta o inicia sesión

✅ **Verificación**: Deberías ver el dashboard de n8n sin errores.

---

## 📍 PASO 2: Configurar Variables (SIN Premium - Omitir si tienes plan gratuito)

⚠️ **IMPORTANTE**: Si tienes el plan **gratuito** de n8n, las Environment Variables **NO están disponibles** (solo en Enterprise).

**Solución**: Todas las variables se pasarán desde Next.js en el payload del webhook. **Puedes saltarte este paso** y ver la guía `GUIA_N8N_SIN_PREMIUM.md` para configurar sin premium.

### 2.1. Si tienes plan Premium/Enterprise

Si tienes acceso a Environment Variables:

1. En n8n, haz clic en tu **perfil** (icono de usuario) en la esquina superior derecha
2. Selecciona **"Settings"** (Configuración)
3. En el menú lateral, haz clic en **"Environment Variables"** (Variables de Entorno)

### 2.2. Agregar Variables (Solo si tienes Premium)

Agrega las siguientes variables haciendo clic en **"+ Add Variable"**:

| Variable                    | Valor                             | Descripción                                                                       |
| --------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | `https://tu-proyecto.supabase.co` | URL de tu proyecto Supabase                                                       |
| `SUPABASE_SERVICE_ROLE_KEY` | `tu-service-role-key-aqui`        | Service Role Key de Supabase (encuéntrala en Supabase Dashboard → Settings → API) |
| `NEXT_PUBLIC_APP_URL`       | `http://localhost:3000`           | URL de tu aplicación Next.js (o la URL de producción si está desplegada)          |
| `GROQ_API_KEY`              | `tu-api-key-de-groq`              | API Key de Groq (opcional si la envías desde Next.js)                             |

### 2.3. Si NO tienes Premium (Plan Gratuito)

**No necesitas configurar Environment Variables**. Ve directamente al **PASO 3** y luego revisa la guía `GUIA_N8N_SIN_PREMIUM.md` para configurar los nodos usando variables del payload.

---

## 📍 PASO 3: Importar el Workflow

### 3.1. Preparar el Archivo

1. Asegúrate de que el archivo `n8n-workflow-generate-report.json` esté en la carpeta `my-app`
2. Verifica que el archivo existe ejecutando:

```bash
cd my-app
ls n8n-workflow-generate-report.json
```

O en Windows PowerShell:

```powershell
cd my-app
Test-Path n8n-workflow-generate-report.json
```

### 3.2. Importar el Workflow en n8n

1. En n8n, ve a **"Workflows"** en el menú superior
2. Haz clic en el botón **"Import from File"** o **"+"** → **"Import from File"**
3. Selecciona el archivo: `n8n-workflow-generate-report.json`
4. Haz clic en **"Import"** o **"Abrir"**
5. El workflow se importará y se abrirá automáticamente

✅ **Verificación**: Deberías ver el workflow importado con todos los nodos visibles.

---

## 📍 PASO 4: Configurar el Webhook

### 4.1. Localizar el Nodo Webhook

1. En el workflow importado, busca el nodo llamado **"Webhook"** (generalmente el primer nodo a la izquierda)
2. Haz **doble clic** en el nodo para editarlo

### 4.2. Configurar el Webhook

En la configuración del nodo Webhook:

1. **HTTP Method**: Debe estar en **"POST"** ✅
2. **Path**: Verifica que sea `generate-report-from-audio`
    - Si está vacío o diferente, cámbialo a: `generate-report-from-audio`
3. **Response Mode**: Debe estar en **"When Last Node Finishes"** o **"Response Node"**
4. **Authentication**: Deja en **"None"** (sin autenticación)

### 4.3. Obtener la URL del Webhook

1. Después de configurar, haz clic en **"Save"** para guardar
2. En la parte superior del workflow, asegúrate de que el **toggle esté activado** (ON/Verde) para activar el workflow
3. Una vez activado, verás la URL del webhook arriba del nodo, algo como:
    ```
    http://localhost:5678/webhook/generate-report-from-audio
    ```
4. **Copia esta URL completa** - la necesitarás para el siguiente paso

### 4.4. Verificar que el Webhook esté Activo

1. El nodo Webhook debería mostrar un ícono de "play" verde cuando está activo
2. Si no está activo, haz clic en el toggle en la parte superior del workflow para activarlo

✅ **Verificación**:

-   El workflow debe estar activado (toggle verde)
-   La URL del webhook debe ser visible
-   El nodo Webhook debe mostrar que está escuchando

---

## 📍 PASO 5: Obtener N8N_API_KEY

### 5.1. Opción A: Usar la API Key de n8n (Recomendado)

n8n no tiene una API key predefinida por defecto. Tienes dos opciones:

#### **Opción A1: Crear tu propia clave secreta**

1. Genera una clave secreta segura. Puedes usar:

    - Un generador online: https://www.uuidgenerator.net/
    - O ejecuta en PowerShell:

    ```powershell
    [System.Guid]::NewGuid().ToString()
    ```

    - O en terminal (si tienes Node.js):

    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

2. **Copia esta clave generada** - la usarás en los siguientes pasos

#### **Opción A2: Usar una clave simple (Solo para desarrollo)**

Para desarrollo local, puedes usar una clave simple como:

```
dev-n8n-api-key-2024-secret-12345
```

⚠️ **IMPORTANTE**: En producción, usa una clave segura y aleatoria.

### 5.2. Configurar la Clave en n8n (Opcional)

Si quieres que n8n valide esta clave, puedes:

1. Ve a **Settings** → **Environment Variables**
2. Agrega una nueva variable:
    - **Variable**: `N8N_API_KEY`
    - **Value**: La clave que generaste en el paso anterior
3. Haz clic en **"Save"**

### 5.3. Agregar la Clave a tu archivo .env.local

1. Abre el archivo `.env.local` en la raíz de `my-app`
2. Si no existe, créalo
3. Agrega la siguiente línea (usa la clave que generaste):

```env
N8N_API_KEY=tu-clave-generada-aqui
```

Por ejemplo:

```env
N8N_API_KEY=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

O si usaste una clave simple:

```env
N8N_API_KEY=dev-n8n-api-key-2024-secret-12345
```

4. **Guarda el archivo** `.env.local`

✅ **Verificación**:

-   El archivo `.env.local` debe contener `N8N_API_KEY=...`
-   La clave debe ser la misma que configuraste en n8n (si lo hiciste)

---

## 📍 PASO 6: Configurar el Archivo .env.local Completo

Asegúrate de que tu archivo `.env.local` contenga todas las variables necesarias:

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

### 6.1. Obtener API_GROQ

1. Ve a: https://console.groq.com/
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys**
4. Crea una nueva API key o copia una existente
5. Pégala en `.env.local` como `API_GROQ=...`

### 6.2. Obtener SUPABASE_SERVICE_ROLE_KEY

1. Ve a tu proyecto en: https://app.supabase.com/
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Busca **"service_role" secret**
5. Haz clic en el ícono del ojo para revelar la clave
6. Cópiala y pégala en `.env.local` como `SUPABASE_SERVICE_ROLE_KEY=...`

⚠️ **IMPORTANTE**:

-   La `service_role` key es muy poderosa, no la compartas ni la subas a Git
-   Asegúrate de que `.env.local` esté en `.gitignore`

✅ **Verificación**: Todas las variables deben estar configuradas en `.env.local`

---

## 📍 PASO 7: Configurar los Nodos del Workflow

### 7.1. Configurar Nodo "Transcribir con Groq"

1. Haz doble clic en el nodo **"Transcribir con Groq"**
2. Configura los siguientes campos:

    **General:**

    - **Method**: `POST`
    - **URL**: `https://api.groq.com/openai/v1/audio/transcriptions`

    **Authentication:**

    - En la pestaña **"Authentication"**, selecciona **"Header Auth"** o **"Generic Credential Type"**
    - **Name**: `Authorization`
    - **Value**: `Bearer {{ $('Webhook').item.json.groqApiKey }}`

    **Body:**

    - **Body Content Type**: `multipart-form-data`
    - **Specify Body**: `Using Fields Below`
    - Agrega los siguientes campos:
        - `file`: Selecciona **"Binary Data"** → Elige el binary del audio descargado
        - `model`: `whisper-large-v3`
        - `language`: `es`
        - `response_format`: `json`

3. Haz clic en **"Save"**

### 7.2. Configurar Nodo "Analizar con IA"

1. Haz doble clic en el nodo **"Analizar con IA"**
2. Configura:

    **General:**

    - **Method**: `POST`
    - **URL**: `https://api.groq.com/openai/v1/chat/completions`

    **Headers:**

    - Agrega header:
        - **Name**: `Authorization`
        - **Value**: `Bearer {{ $json.groqApiKey }}`
    - Agrega header:
        - **Name**: `Content-Type`
        - **Value**: `application/json`

    **Body:**

    - **Body Content Type**: `JSON`
    - **Specify Body**: `JSON`
    - **JSON Body**: Usa esta expresión:

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

3. Haz clic en **"Save"**

### 7.3. Configurar Nodo "Generar Informe"

1. Haz doble clic en el nodo **"Generar Informe"**
2. Configura:

    **General:**

    - **Method**: `POST`
    - **URL**: `{{ $('Webhook').item.json.nextAppUrl }}/api/n8n/generate-report-internal`

    ⚠️ **NOTA para Plan Gratuito**: Si no tienes Environment Variables, usa `{{ $('Webhook').item.json.nextAppUrl }}` en lugar de `{{ $env.NEXT_PUBLIC_APP_URL }}`

    **Headers:**

    - Agrega header:
        - **Name**: `Content-Type`
        - **Value**: `application/json`

    **Body:**

    - **Body Content Type**: `JSON`
    - **Specify Body**: `JSON`
    - **JSON Body**: Usa esta expresión:

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

3. Haz clic en **"Save"**

### 7.4. Configurar Nodo "Callback a Next.js"

1. Haz doble clic en el nodo **"Callback a Next.js"**
2. Configura:

    **General:**

    - **Method**: `POST`
    - **URL**: `{{ $('Webhook').item.json.callbackUrl }}`

    ⚠️ **NOTA para Plan Gratuito**: Si no tienes Environment Variables, usa `{{ $('Webhook').item.json.callbackUrl }}` en lugar de `{{ $env.NEXT_PUBLIC_APP_URL }}/api/n8n/callback/report-generated`

    **Headers:**

    - Agrega header:
        - **Name**: `Content-Type`
        - **Value**: `application/json`

    **Body:**

    - **Body Content Type**: `JSON`
    - **Specify Body**: `JSON`
    - **JSON Body**: Usa esta expresión:

    ```json
    {
    	"consultationId": "{{ $('Procesar Campos').item.json.consultationId }}",
    	"reportUrl": "{{ $json.report_url }}",
    	"transcription": "{{ $('Procesar Campos').item.json.transcription }}"
    }
    ```

3. Haz clic en **"Save"**

✅ **Verificación**: Todos los nodos deben estar configurados y guardados.

---

## 📍 PASO 8: Activar el Workflow

### 8.1. Guardar el Workflow

1. En la parte superior del workflow, haz clic en **"Save"** (💾)
2. Si te pide un nombre, usa: `Generar Informe Médico desde Audio`

### 8.2. Activar el Workflow

1. En la parte superior del workflow, encontrarás un **toggle** (interruptor)
2. Haz clic en el toggle para activarlo
3. Debería volverse **verde** o mostrar **"Active"**
4. El webhook ahora está escuchando peticiones

✅ **Verificación**:

-   El toggle debe estar activado (verde)
-   El nodo Webhook debe mostrar que está escuchando
-   No deberías ver errores en los nodos

---

## 📍 PASO 9: Probar el Workflow

### 9.1. Preparar Datos de Prueba

Crea un archivo de prueba o usa una herramienta como Postman:

```bash
POST http://localhost:5678/webhook/generate-report-from-audio
Content-Type: application/json

{
  "audioUrl": "https://ejemplo.com/audio.mp3",
  "consultationId": "test-consultation-id",
  "doctorId": "test-doctor-id",
  "reportType": "gynecology",
  "specialty": "gynecology",
  "groqApiKey": "tu-api-key-de-groq",
  "n8nApiKey": "tu-clave-generada-aqui",
  "patientData": {},
  "consultationData": {},
  "medicProfile": {}
}
```

### 9.2. Ejecutar Prueba Manual

1. En n8n, en el workflow activo, haz clic en **"Execute Workflow"** (▶️) en la parte superior
2. O prueba desde Postman/curl enviando el webhook
3. Revisa los logs en cada nodo para ver si hay errores

### 9.3. Verificar Resultados

1. Revisa cada nodo del workflow
2. Los nodos que se ejecutaron deberían mostrar un círculo verde ✅
3. Los nodos con errores mostrarán un círculo rojo ❌
4. Haz clic en cada nodo para ver los datos de entrada y salida

✅ **Verificación**: El workflow debería ejecutarse sin errores críticos.

---

## 📍 PASO 10: Integrar con Next.js

### 10.1. Actualizar N8N_WEBHOOK_URL en .env.local

Asegúrate de que `.env.local` tenga la URL correcta del webhook:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-report-from-audio
```

### 10.2. Reiniciar el Servidor de Next.js

Si ya tenías el servidor corriendo:

1. Detén el servidor (Ctrl+C)
2. Reinícialo:

```bash
cd my-app
pnpm run dev
```

Esto cargará las nuevas variables de entorno.

### 10.3. Probar desde Next.js

Ahora puedes probar el endpoint desde tu aplicación Next.js:

```bash
POST http://localhost:3000/api/consultations/[CONSULTATION_ID]/generate-report-from-audio
Content-Type: multipart/form-data

Form Data:
- audio: [archivo de audio]
- reportType: gynecology
- specialty: gynecology
```

---

## 🎉 ¡Configuración Completada!

Ya tienes n8n configurado y listo para procesar audios y generar informes médicos.

---

## 🔍 Troubleshooting

### Problema: El webhook no responde

**Solución:**

-   Verifica que el workflow esté activado (toggle verde)
-   Verifica que n8n esté corriendo: `http://localhost:5678`
-   Revisa la URL del webhook en la configuración del nodo

### Problema: Error "Cannot find module"

**Solución:**

-   Verifica que todas las variables de entorno estén configuradas
-   Reinicia n8n después de agregar variables de entorno

### Problema: Error de autenticación en Groq

**Solución:**

-   Verifica que `API_GROQ` esté configurada en `.env.local`
-   Verifica que la API key de Groq sea válida
-   Revisa los límites de cuota en Groq

### Problema: El workflow no se ejecuta completamente

**Solución:**

-   Revisa los logs de cada nodo haciendo clic en ellos
-   Verifica que los datos fluyan correctamente entre nodos
-   Asegúrate de que las expresiones de los campos sean correctas

---

## 📚 Recursos Adicionales

-   **Documentación de n8n**: https://docs.n8n.io/
-   **API de Groq**: https://console.groq.com/docs
-   **Guía completa**: Ver `IMPLEMENTACION_AUDIO_INFORMES.md`
-   **Guía SIN Premium**: Si tienes plan gratuito, ve `GUIA_N8N_SIN_PREMIUM.md`

---

## ✅ Checklist Final

Antes de considerar la configuración completa, verifica:

-   [ ] n8n está corriendo en `http://localhost:5678`
-   [ ] Variables de entorno configuradas en n8n
-   [ ] Workflow importado correctamente
-   [ ] Webhook configurado y activo
-   [ ] N8N_API_KEY generada y agregada a `.env.local`
-   [ ] Todas las variables en `.env.local` configuradas
-   [ ] Todos los nodos del workflow configurados
-   [ ] Workflow activado (toggle verde)
-   [ ] Prueba manual ejecutada sin errores
-   [ ] Servidor Next.js reiniciado con nuevas variables

---

**¡Listo!** Ahora puedes usar el sistema para generar informes desde audio. 🎉

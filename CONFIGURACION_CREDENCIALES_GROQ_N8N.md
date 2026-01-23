# 🔐 Configuración de Credenciales para Groq en n8n

Esta guía explica cómo configurar la autenticación para los nodos de Groq **SIN usar el sistema de credenciales de n8n** (que requiere configuración adicional).

---

## 🎯 Solución: Configurar Headers Manualmente

En lugar de usar "Header Auth" (que requiere credenciales preconfiguradas), configuraremos los headers directamente en cada nodo HTTP Request.

---

## 📍 PASO 1: Nodo "Transcribir con Groq"

### Configuración Paso a Paso

1. **Abre el nodo** "Transcribir con Groq" (doble clic)

2. **Configuración General:**
   - **Method**: `POST`
   - **URL**: `https://api.groq.com/openai/v1/audio/transcriptions`

3. **Authentication (IMPORTANTE):**
   - En la sección **"Authentication"**, selecciona: **"None"** o déjalo en "None"
   - ⚠️ **NO uses "Header Auth"** ni "Generic Credential Type"

4. **Configurar Headers Manualmente:**
   
   Opción A - Si ves una sección "Headers" directamente:
   - Ve a la pestaña/sección **"Headers"**
   - Haz clic en **"Add Header"** o **"+ Add Header"**
   - Agrega:
     - **Name**: `Authorization`
     - **Value**: `Bearer {{ $('Webhook').item.json.groqApiKey }}`

   Opción B - Si NO ves "Headers" directamente:
   - Ve a **"Options"** (opciones avanzadas)
   - Activa **"Send Headers"** (toggle o checkbox)
   - En **"Header Parameters"**, haz clic en **"Add Parameter"**
   - Agrega:
     - **Name**: `Authorization`
     - **Value**: `Bearer {{ $('Webhook').item.json.groqApiKey }}`

5. **Configurar Body:**
   - **Body Content Type**: `multipart-form-data`
   - **Specify Body**: `Using Fields Below` o similar
   - En **"Body Parameters"**, agrega estos campos:
     
     **Campo 1: file**
     - **Name**: `file`
     - **Type**: Selecciona **"Binary"** o **"Binary Data"**
     - **Value**: Haz clic y selecciona el binary data del nodo anterior (ej: `binary.data` de "Descargar Audio")
     
     **Campo 2: model**
     - **Name**: `model`
     - **Type**: `String` o `Text`
     - **Value**: `whisper-large-v3`
     
     **Campo 3: language**
     - **Name**: `language`
     - **Type**: `String` o `Text`
     - **Value**: `es`
     
     **Campo 4: response_format**
     - **Name**: `response_format`
     - **Type**: `String` o `Text`
     - **Value**: `json`

6. **Save** (Guardar)

✅ **Verificación**: El nodo no debe mostrar el error de credenciales. El header `Authorization` debe estar configurado con la expresión.

---

## 📍 PASO 2: Nodo "Analizar con IA"

### Configuración Paso a Paso

1. **Abre el nodo** "Analizar con IA" (doble clic)

2. **Configuración General:**
   - **Method**: `POST`
   - **URL**: `https://api.groq.com/openai/v1/chat/completions`

3. **Authentication (IMPORTANTE):**
   - En la sección **"Authentication"**, selecciona: **"None"** o déjalo en "None"
   - ⚠️ **NO uses "Header Auth"** ni "Generic Credential Type"

4. **Configurar Headers Manualmente:**
   
   Opción A - Si ves una sección "Headers":
   - Ve a la sección **"Headers"**
   - Haz clic en **"Add Header"** dos veces y agrega:
     
     **Header 1:**
     - **Name**: `Authorization`
     - **Value**: `Bearer {{ $json.groqApiKey }}`
     
     **Header 2:**
     - **Name**: `Content-Type`
     - **Value**: `application/json`

   Opción B - Si NO ves "Headers" directamente:
   - Ve a **"Options"** → **"Send Headers"**: Actívalo
   - En **"Header Parameters"**, agrega dos parámetros:
     
     **Parámetro 1:**
     - **Name**: `Authorization`
     - **Value**: `Bearer {{ $json.groqApiKey }}`
     
     **Parámetro 2:**
     - **Name**: `Content-Type`
     - **Value**: `application/json`

5. **Configurar Body:**
   - **Body Content Type**: `JSON`
   - **Specify Body**: `JSON` o `Using JSON`
   - **JSON Body**: Pega esta expresión completa:

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

6. **Save** (Guardar)

✅ **Verificación**: El nodo no debe mostrar el error de credenciales. Ambos headers deben estar configurados.

---

## 🔍 Troubleshooting

### Problema: Sigue apareciendo el error de credenciales

**Solución:**
1. Asegúrate de que **"Authentication"** esté en **"None"**
2. Verifica que los headers estén configurados en **"Header Parameters"** o en la sección **"Headers"**
3. Guarda el nodo y recarga la página si es necesario

### Problema: No puedo encontrar dónde agregar headers

**Solución:**
1. Busca la pestaña **"Options"** o **"Opciones"** en el nodo
2. Activa **"Send Headers"**
3. Los campos **"Header Parameters"** aparecerán

### Problema: La expresión `{{ $json.groqApiKey }}` no funciona

**Soluciones alternativas:**
- Prueba: `{{ $('Webhook').item.json.groqApiKey }}`
- O: `{{ $('Limpiar Transcripción').item.json.groqApiKey }}`
- Verifica que el nodo anterior esté pasando correctamente `groqApiKey`

### Problema: No puedo seleccionar Binary Data para el archivo

**Solución:**
1. Asegúrate de que el nodo "Descargar Audio" esté configurado correctamente
2. En el campo `file` del Body, selecciona **"Binary Data"** o **"Binary"**
3. Luego selecciona el dato del nodo anterior (debería aparecer como `binary.data` o similar)

---

## 📝 Resumen de Headers Necesarios

### Para "Transcribir con Groq":
```
Authorization: Bearer {{ $('Webhook').item.json.groqApiKey }}
```

### Para "Analizar con IA":
```
Authorization: Bearer {{ $json.groqApiKey }}
Content-Type: application/json
```

---

## ✅ Checklist

- [ ] Nodo "Transcribir con Groq": Authentication = "None"
- [ ] Nodo "Transcribir con Groq": Header `Authorization` configurado
- [ ] Nodo "Transcribir con Groq": Body con campo `file` (binary), `model`, `language`, `response_format`
- [ ] Nodo "Analizar con IA": Authentication = "None"
- [ ] Nodo "Analizar con IA": Headers `Authorization` y `Content-Type` configurados
- [ ] Nodo "Analizar con IA": Body JSON configurado correctamente
- [ ] Ambos nodos guardados sin errores
- [ ] No aparece el mensaje de "credenciales no configuradas"

---

**¡Listo!** Ya no deberías ver el error de credenciales. Los headers se configuran directamente en cada nodo sin necesidad del sistema de credenciales de n8n. 🎉






# ☁️ Configuración: n8n Cloud + Next.js Local (SIN ngrok)

Esta guía explica cómo usar n8n cloud con tu aplicación Next.js local **sin necesidad de ngrok** ni exponer tu aplicación a internet.

---

## 🎯 Solución: Webhook Síncrono (Sin Callback)

En lugar de usar un callback (que requiere que Next.js sea accesible desde internet), haremos que n8n **retorne directamente el resultado** en la respuesta del webhook. Next.js esperará esa respuesta.

---

## 📍 PASO 1: Configurar el Workflow en n8n Cloud

### 1.1. Modificar el Nodo "Respond to Webhook"

El workflow debe retornar el resultado directamente sin usar callback:

1. En n8n cloud, abre tu workflow
2. Busca el nodo **"Respond to Webhook"** o **"Respond"** (último nodo)
3. Haz doble clic en él

### 1.2. Configurar la Respuesta

1. En **"Respond With"**, selecciona **"JSON"**
2. En **"Response Body"**, usa esta expresión:

```json
{
  "success": true,
  "report_url": "{{ $('Generar Informe').item.json.report_url }}",
  "transcription": "{{ $('Procesar Campos').item.json.transcription }}",
  "message": "Informe generado exitosamente"
}
```

3. **IMPORTANTE**: Elimina o desactiva el nodo **"Callback a Next.js"** si existe
   - O simplemente no lo conectes al flujo
   - El webhook retornará directamente la respuesta

### 1.3. Guardar y Activar

1. Guarda el workflow
2. Activa el toggle (verde)

---

## 📍 PASO 2: Actualizar el Código de Next.js

El código ya está preparado para recibir la respuesta directamente, pero vamos a asegurarnos de que funcione correctamente sin callback.

### 2.1. Verificar que el Código Esté Correcto

El archivo `generate-report-from-audio/route.ts` ya debería esperar la respuesta del webhook. Verifica que tenga algo como:

```typescript
const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(n8nPayload),
});

const n8nResult = await n8nResponse.json();

// Actualizar consulta directamente desde aquí
if (n8nResult.reportUrl) {
  await supabase
    .from('consultation')
    .update({ report_url: n8nResult.reportUrl })
    .eq('id', id);
}
```

✅ **El código ya debería estar así**. No necesitas cambiarlo.

---

## 📍 PASO 3: Actualizar .env.local

### 3.1. Configurar N8N_WEBHOOK_URL

En tu `.env.local`, actualiza solo la URL del webhook de n8n cloud:

```env
# n8n Cloud Configuration
N8N_WEBHOOK_URL=https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio

# N8N_API_KEY (la que generaste antes)
N8N_API_KEY=tu-clave-generada-aqui

# Groq API
API_GROQ=tu-api-key-de-groq

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# App URL (puede quedarse en localhost ya que NO se usa para callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **IMPORTANTE**: 
- `N8N_WEBHOOK_URL` debe ser la URL de tu webhook en n8n cloud
- `NEXT_PUBLIC_APP_URL` puede quedarse en `http://localhost:3000` porque **ya no se usa para callback**
- Solo se usa internamente en tu aplicación

---

## 📍 PASO 4: Obtener la URL del Webhook en n8n Cloud

### 4.1. Acceder al Workflow

1. Ve a: `https://ashirasoftware.app.n8n.cloud/workflow/nU4jx8lrCKHzfZeDxFZIO?projectId=uPmiIjo5V35wnE7p`
2. Asegúrate de que el workflow esté **activado** (toggle verde)

### 4.2. Copiar URL del Webhook

1. Haz clic en el nodo **"Webhook"**
2. Copia la URL que aparece arriba del nodo
3. Debería ser algo como:
   ```
   https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
   ```

### 4.3. Actualizar .env.local

Pega esa URL en `.env.local`:

```env
N8N_WEBHOOK_URL=https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
```

---

## 📍 PASO 5: Probar el Sistema

### 5.1. Reiniciar Next.js

1. Detén el servidor (Ctrl+C) si está corriendo
2. Reinícialo:
   ```bash
   cd my-app
   pnpm run dev
   ```

### 5.2. Probar desde tu Aplicación

Ahora puedes probar enviando un audio desde tu aplicación. El flujo será:

1. **Next.js** → Envía audio y datos a **n8n cloud** (webhook)
2. **n8n cloud** → Procesa el audio (transcripción, análisis, generación de informe)
3. **n8n cloud** → Retorna el resultado directamente al webhook (NO usa callback)
4. **Next.js** → Recibe la respuesta y actualiza la consulta

✅ **No necesitas ngrok ni exponer tu aplicación a internet**.

---

## 🔍 Flujo Completo (Sin Callback)

```
┌─────────────┐
│  Next.js    │
│  (Local)    │
│             │
│  POST       │──────────────────┐
│  webhook    │                  │
└─────────────┘                  │
                                 ▼
                        ┌─────────────────┐
                        │   n8n Cloud     │
                        │                 │
                        │  1. Recibe      │
                        │  2. Procesa     │
                        │  3. Genera      │
                        │  4. RETORNA     │──────┐
                        └─────────────────┘      │
                                                  │
                        ┌─────────────────┐      │
                        │   Next.js       │◄─────┘
                        │   (Local)       │
                        │                 │
                        │  Recibe respuesta
                        │  Actualiza DB
                        └─────────────────┘
```

---

## 🔍 Troubleshooting

### Problema: El webhook retorna pero no veo el resultado

**Solución:**
- Verifica que el nodo "Respond to Webhook" esté configurado correctamente
- Verifica que retorne `report_url` en la respuesta
- Revisa los logs de Next.js para ver qué está recibiendo

### Problema: Timeout en la petición

**Solución:**
- n8n cloud puede tener límites de tiempo para ejecuciones
- El procesamiento de audio puede tardar, considera aumentar el timeout en Next.js
- Revisa los logs en n8n cloud para ver si el workflow se completa

### Problema: Error al actualizar la consulta

**Solución:**
- Verifica que `n8nResult.reportUrl` esté presente en la respuesta
- Revisa los logs de Supabase
- Verifica que la consulta existe

---

## ✅ Checklist Final

- [ ] Workflow en n8n cloud activado
- [ ] Nodo "Respond to Webhook" configurado para retornar JSON con `report_url` y `transcription`
- [ ] Nodo "Callback a Next.js" eliminado o desconectado del flujo
- [ ] URL del webhook copiada desde n8n cloud
- [ ] `N8N_WEBHOOK_URL` actualizado en `.env.local` con la URL de n8n cloud
- [ ] `NEXT_PUBLIC_APP_URL` puede quedarse en `http://localhost:3000` (no se usa)
- [ ] Next.js reiniciado con nuevas variables
- [ ] Prueba enviando un audio desde tu aplicación

---

## 📝 Resumen de Cambios

### En n8n Cloud:
- ✅ Nodo "Respond to Webhook" retorna el resultado directamente
- ✅ No se usa callback (no necesita acceso a Next.js desde internet)

### En .env.local:
```env
N8N_WEBHOOK_URL=https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Puede quedarse así
```

### No necesitas:
- ❌ ngrok
- ❌ Exponer tu aplicación a internet
- ❌ Configurar túneles
- ❌ Callback desde n8n a Next.js

---

## 🎉 ¡Listo!

Ahora puedes usar n8n cloud con tu aplicación Next.js local **sin necesidad de ngrok ni exponer tu aplicación a internet**. El resultado se retorna directamente en la respuesta del webhook. 🚀



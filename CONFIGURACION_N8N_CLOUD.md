# ☁️ Configuración de n8n Cloud (En la Nube)

Esta guía explica cómo usar n8n en la nube en lugar de localmente.

---

## ✅ ¿Puedo usar n8n Cloud?

**¡SÍ!** Puedes usar n8n en la nube. De hecho, tiene varias ventajas:

### Ventajas de n8n Cloud:
- ✅ No necesitas mantener n8n corriendo localmente
- ✅ Siempre disponible (24/7)
- ✅ No consume recursos de tu máquina
- ✅ Más fácil de compartir con tu equipo
- ✅ Accesible desde cualquier lugar

### Consideraciones:
- ⚠️ Necesitas que tu aplicación Next.js pueda acceder a internet (para llamar al webhook)
- ⚠️ La URL del webhook será diferente a localhost

---

## 📍 PASO 1: Obtener la URL del Webhook desde n8n Cloud

### 1.1. Acceder a tu Workflow en n8n Cloud

1. Abre tu workflow en n8n cloud: 
   ```
   https://ashirasoftware.app.n8n.cloud/workflow/nU4jx8lrCKHzfZeDxFZIO?projectId=uPmiIjo5V35wnE7p
   ```

2. Asegúrate de que el workflow esté **activado** (toggle verde en la parte superior)

### 1.2. Obtener la URL del Webhook

1. Haz clic en el nodo **"Webhook"** (primer nodo del workflow)
2. En la parte superior del nodo, verás la **URL del webhook**
3. La URL debería verse algo así:
   ```
   https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
   ```
   O puede tener un formato diferente como:
   ```
   https://ashirasoftware.app.n8n.cloud/webhook-test/generate-report-from-audio
   ```
   O:
   ```
   https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio/xxxx-xxxx-xxxx
   ```

4. **Copia esta URL completa** - la necesitarás para el siguiente paso

⚠️ **IMPORTANTE**: 
- La URL puede variar según la configuración de tu instancia de n8n cloud
- Asegúrate de copiar la URL completa que aparece en el nodo Webhook
- Si no ves la URL, verifica que el workflow esté activado

---

## 📍 PASO 2: Actualizar .env.local

### 2.1. Abrir .env.local

Abre el archivo `.env.local` en la raíz de `my-app`

### 2.2. Actualizar N8N_WEBHOOK_URL

Busca la línea que dice:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-report-from-audio
```

Y cámbiala por la URL que copiaste del webhook en n8n cloud:

```env
N8N_WEBHOOK_URL=https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
```

**Ejemplo completo de .env.local:**

```env
# n8n Configuration (CLOUD)
N8N_WEBHOOK_URL=https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
N8N_API_KEY=tu-clave-generada-aqui

# Groq API
API_GROQ=tu-api-key-de-groq

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# App URL (IMPORTANTE: Debe ser accesible desde internet para que n8n pueda hacer callbacks)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
# O si estás en desarrollo local con túnel:
# NEXT_PUBLIC_APP_URL=https://tu-app.ngrok.io
```

### 2.3. Actualizar NEXT_PUBLIC_APP_URL (IMPORTANTE)

⚠️ **MUY IMPORTANTE**: Si estás usando n8n cloud, tu aplicación Next.js **debe ser accesible desde internet** para que n8n pueda hacer callbacks.

**Opciones:**

#### Opción A: Si tu app está en producción (Vercel, etc.)
```env
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

#### Opción B: Si estás en desarrollo local
Necesitas usar un túnel como ngrok o similar:

1. **Instala ngrok** (si no lo tienes):
   ```bash
   npm install -g ngrok
   # O descarga desde https://ngrok.com/
   ```

2. **Inicia tu app Next.js**:
   ```bash
   cd my-app
   pnpm run dev
   ```

3. **En otra terminal, inicia ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copia la URL HTTPS** que ngrok te da (ej: `https://abc123.ngrok.io`)

5. **Actualiza .env.local**:
   ```env
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

#### Opción C: Usar Cloudflare Tunnel o similar
Cualquier servicio de túnel que exponga tu localhost a internet funcionará.

---

## 📍 PASO 3: Verificar Configuración en n8n Cloud

### 3.1. Verificar que el Workflow esté Activo

1. En n8n cloud, verifica que el **toggle** en la parte superior del workflow esté **verde/activado**
2. El nodo Webhook debería mostrar que está escuchando

### 3.2. Verificar Nodos del Workflow

Asegúrate de que todos los nodos estén configurados correctamente:

- **"Generar Informe"**: Debe usar `{{ $('Webhook').item.json.nextAppUrl }}`
- **"Callback a Next.js"**: Debe usar `{{ $('Webhook').item.json.callbackUrl }}`

Estos valores se pasan desde Next.js, así que funcionarán tanto con n8n local como cloud.

---

## 📍 PASO 4: Probar la Conexión

### 4.1. Reiniciar Next.js

Si ya estaba corriendo:

1. Detén el servidor (Ctrl+C)
2. Reinícialo:
   ```bash
   cd my-app
   pnpm run dev
   ```

Esto cargará las nuevas variables de entorno.

### 4.2. Probar el Webhook

Puedes probar el webhook directamente desde Postman o curl:

```bash
POST https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
Content-Type: application/json

{
  "audioUrl": "https://ejemplo.com/audio.mp3",
  "consultationId": "test-id",
  "doctorId": "test-doctor-id",
  "reportType": "gynecology",
  "specialty": "gynecology",
  "groqApiKey": "tu-api-key",
  "n8nApiKey": "tu-clave",
  "nextAppUrl": "https://tu-app.com",
  "supabaseUrl": "https://tu-proyecto.supabase.co",
  "supabaseServiceRoleKey": "tu-key",
  "callbackUrl": "https://tu-app.com/api/n8n/callback/report-generated",
  "patientData": {},
  "consultationData": {},
  "medicProfile": {}
}
```

### 4.3. Verificar Logs

1. En n8n cloud, ve a tu workflow
2. Revisa los **executions** (ejecuciones) en la parte inferior
3. Haz clic en una ejecución para ver los logs de cada nodo
4. Verifica que no haya errores

---

## 🔍 Troubleshooting

### Problema: n8n cloud no puede acceder a mi aplicación local

**Solución:**
- Usa un túnel (ngrok, Cloudflare Tunnel, etc.) para exponer tu localhost
- O despliega tu aplicación en producción (Vercel, etc.)

### Problema: Error 404 al llamar al webhook

**Solución:**
- Verifica que la URL del webhook sea correcta
- Verifica que el workflow esté activado
- Verifica que el path del webhook sea correcto (`generate-report-from-audio`)

### Problema: n8n no puede hacer callback a Next.js

**Solución:**
- Verifica que `NEXT_PUBLIC_APP_URL` sea accesible desde internet
- Si estás en local, usa un túnel
- Verifica que la ruta `/api/n8n/callback/report-generated` exista y funcione

### Problema: Timeout en las peticiones

**Solución:**
- n8n cloud puede tener límites de tiempo de ejecución
- Considera optimizar el workflow
- Verifica los logs en n8n cloud para ver dónde se detiene

---

## ✅ Checklist para n8n Cloud

- [ ] Workflow importado en n8n cloud
- [ ] Workflow activado (toggle verde)
- [ ] URL del webhook copiada correctamente
- [ ] `N8N_WEBHOOK_URL` actualizado en `.env.local` con la URL de n8n cloud
- [ ] `NEXT_PUBLIC_APP_URL` configurado y accesible desde internet
- [ ] Si estás en local, túnel configurado (ngrok, etc.)
- [ ] Todos los nodos del workflow configurados correctamente
- [ ] Prueba del webhook exitosa
- [ ] Callback desde n8n a Next.js funcionando

---

## 📝 Resumen de Cambios Necesarios

### En `.env.local`:

**Antes (n8n local):**
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-report-from-audio
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Después (n8n cloud):**
```env
N8N_WEBHOOK_URL=https://ashirasoftware.app.n8n.cloud/webhook/generate-report-from-audio
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
# O si estás en local con túnel:
# NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

---

## 🎉 ¡Listo!

Ahora tu aplicación Next.js se comunicará con n8n cloud en lugar de n8n local. Todo lo demás funciona igual, solo cambia la URL del webhook.

**Ventaja adicional**: No necesitas mantener n8n corriendo localmente. 🚀







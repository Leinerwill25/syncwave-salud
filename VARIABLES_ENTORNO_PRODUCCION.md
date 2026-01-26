# Variables de Entorno para Producción

Este documento lista todas las variables de entorno necesarias para que el sistema de generación de reportes médicos funcione correctamente en producción.

## Variables Requeridas

### 1. Supabase (Base de Datos y Storage)

```bash
# URL de tu proyecto Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co

# URL pública de Supabase (puede ser la misma que SUPABASE_URL)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Clave de servicio de Supabase (Service Role Key)
# ⚠️ IMPORTANTE: Esta clave tiene permisos de administrador, mantenerla segura
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Dónde obtenerlas:**
- Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
- Settings → API
- `SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (secret)

---

### 2. N8N (Automatización de Workflows)

```bash
# URL del webhook de N8N donde se ejecuta el workflow
N8N_WEBHOOK_URL=https://tu-n8n-instance.com/webhook/generate-report-multiagent

# Clave secreta para autenticar llamadas entre N8N y Next.js
# ⚠️ IMPORTANTE: Debe ser una cadena segura y aleatoria
N8N_API_KEY=tu-clave-secreta-super-segura-aqui
```

**Configuración:**
- `N8N_WEBHOOK_URL`: URL pública donde está desplegado tu N8N
- `N8N_API_KEY`: Genera una clave segura (ej: `openssl rand -base64 32`)

**Nota:** Esta clave debe coincidir con la que uses en el workflow de N8N cuando llame a los endpoints internos.

---

### 3. Groq (IA para Transcripción y Procesamiento)

```bash
# API Key de Groq para transcripción de audio y procesamiento con IA
# Puedes usar cualquiera de estas dos variables (el código busca ambas)
GROQ_API_KEY=tu-groq-api-key-aqui
# O alternativamente:
API_GROQ=tu-groq-api-key-aqui
```

**Dónde obtenerla:**
- Ve a [Groq Console](https://console.groq.com)
- API Keys → Create API Key
- Copia la clave generada

**Nota:** El código busca primero `API_GROQ`, luego `GROQ_API_KEY`. Usa la que prefieras.

---

### 4. Next.js (URL de la Aplicación)

```bash
# URL pública de tu aplicación Next.js
# ⚠️ IMPORTANTE: Debe ser la URL completa sin barra final
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
# O para desarrollo local:
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Configuración:**
- En producción: URL completa de tu dominio (ej: `https://clinica-syncwave.com`)
- En desarrollo: `http://localhost:3000`
- **No incluir barra final** (`/`)

---

## Resumen Completo

```bash
# ============================================
# SUPABASE
# ============================================
SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# ============================================
# N8N
# ============================================
N8N_WEBHOOK_URL=https://tu-n8n-instance.com/webhook/generate-report-multiagent
N8N_API_KEY=tu-clave-secreta-super-segura-aqui

# ============================================
# GROQ
# ============================================
GROQ_API_KEY=tu-groq-api-key-aqui
# O alternativamente:
# API_GROQ=tu-groq-api-key-aqui

# ============================================
# NEXT.JS
# ============================================
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

---

## Variables Opcionales

### Node Environment

```bash
# Entorno de ejecución (development, production, etc.)
NODE_ENV=production
```

---

## Dónde Configurar las Variables

### Vercel (Recomendado para Next.js)

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com)
2. Settings → Environment Variables
3. Agrega cada variable con su valor
4. Selecciona los entornos donde aplica (Production, Preview, Development)
5. Guarda y redespliega

### Otras Plataformas

- **Netlify**: Site settings → Environment variables
- **Railway**: Variables tab
- **Docker**: Archivo `.env` o `docker-compose.yml`
- **Servidor propio**: Archivo `.env.local` en la raíz del proyecto

---

## Verificación

Para verificar que todas las variables están configuradas correctamente:

1. **Supabase**: Intenta crear un cliente de Supabase y hacer una consulta simple
2. **N8N**: Verifica que el webhook responde correctamente
3. **Groq**: Intenta hacer una transcripción de prueba
4. **Next.js**: Verifica que `NEXT_PUBLIC_APP_URL` apunta a tu dominio correcto

---

## Seguridad

⚠️ **IMPORTANTE:**

1. **NUNCA** commits las variables de entorno al repositorio
2. **NUNCA** compartas las claves en mensajes o documentos públicos
3. **SIEMPRE** usa valores diferentes para desarrollo y producción
4. **ROTA** las claves periódicamente, especialmente si sospechas que fueron comprometidas
5. **USA** un gestor de secretos (Vercel, AWS Secrets Manager, etc.) en producción

---

## Troubleshooting

### Error: "Unauthorized" en endpoints de N8N
- Verifica que `N8N_API_KEY` sea la misma en Next.js y en el workflow de N8N

### Error: "Error de configuración" en Supabase
- Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén correctos
- Asegúrate de usar la Service Role Key, no la anon key

### Error: "API de Groq no configurada"
- Verifica que `GROQ_API_KEY` o `API_GROQ` estén configuradas
- Verifica que la API key sea válida y tenga créditos disponibles

### Error: "Error descargando plantilla"
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` tenga permisos de lectura en Storage
- Verifica que las plantillas estén en el bucket correcto (`report-templates`)

---

## Actualización

Última actualización: Enero 2026
Versión del sistema: MVP SyncWave Salud


# Implementación: Generación de Informes Médicos desde Audio con n8n

## 📋 Resumen

Esta implementación permite que los médicos graben audio durante la consulta, el cual es procesado automáticamente para generar informes médicos en formato Word (.docx) utilizando IA.

## 🔄 Flujo Completo

1. **Doctor graba audio** → Frontend (Next.js)
2. **Audio se envía** → API `/api/consultations/[id]/generate-report-from-audio`
3. **Audio se sube** → Supabase Storage (temporal)
4. **Webhook n8n** → Recibe datos del audio
5. **n8n procesa**:
   - Descarga audio
   - Convierte formato (si es necesario)
   - Transcribe con Groq Whisper
   - Limpia muletillas
   - Analiza con IA (Groq Llama) para extraer campos
   - Obtiene plantilla Word del doctor
   - Genera informe .docx
   - Sube a Supabase Storage
6. **Callback** → Notifica a Next.js cuando está listo
7. **Frontend** → Muestra informe generado

## 📁 Archivos Creados

### APIs de Next.js

1. **`src/app/api/consultations/[id]/generate-report-from-audio/route.ts`**
   - Recibe audio del frontend
   - Sube audio temporal a Supabase
   - Envía payload a n8n webhook
   - Retorna respuesta al frontend

2. **`src/app/api/n8n/callback/report-generated/route.ts`**
   - Callback webhook desde n8n
   - Actualiza consulta con URL del informe generado
   - Guarda transcripción en notas

3. **`src/app/api/n8n/generate-report-internal/route.ts`**
   - Endpoint interno para que n8n genere el informe
   - No requiere autenticación del usuario (usa API key)
   - Procesa plantilla Word y genera .docx

### Documentación

3. **`src/lib/n8n-report-workflow.md`**
   - Documentación detallada del workflow de n8n
   - Explicación de cada nodo
   - Configuración necesaria

4. **`n8n-workflow-generate-report.json`**
   - Export del workflow de n8n (para importar)
   - Estructura completa del workflow

## 🚀 Pasos de Implementación

### 1. Configurar n8n

#### a) Importar Workflow

1. Accede a n8n: `http://localhost:5678`
2. Ve a **Workflows** → **Import from File**
3. Selecciona `n8n-workflow-generate-report.json`
4. Guarda el workflow

#### b) Configurar Variables de Entorno

En n8n, ve a **Settings** → **Environment Variables** y agrega:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
GROQ_API_KEY=tu-api-key-de-groq
```

#### c) Configurar Webhook

1. Abre el workflow importado
2. Edita el nodo **Webhook**
3. Asegúrate que el path sea: `generate-report-from-audio`
4. Activa el workflow
5. Copia la URL del webhook (algo como: `http://localhost:5678/webhook/generate-report-from-audio`)

### 2. Configurar Variables en Next.js

Agrega a tu archivo `.env.local`:

```env
# n8n Webhook URL
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-report-from-audio

# Groq API (ya debería estar configurado)
API_GROQ=tu-api-key-de-groq

# Supabase (ya debería estar configurado)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Clave secreta para autenticación interna de n8n
N8N_API_KEY=tu-clave-secreta-aqui-cambiar

# URL de tu aplicación (para callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Crear Bucket en Supabase Storage

Crea un bucket llamado `temp-audio` en Supabase Storage:
- Ve a Supabase Dashboard → Storage
- Crea nuevo bucket: `temp-audio`
- Política: Public (o configurar RLS apropiadamente)

### 4. Instalar Dependencias en n8n (Opcional)

Si necesitas procesar plantillas directamente en n8n (alternativa al paso actual que llama a Next.js):

```bash
cd ~/.n8n
npm install docxtemplater pizzip
```

## 🔧 Ajustes al Workflow (si es necesario)

El workflow actual llama al endpoint `/api/consultations/[id]/generate-report` de Next.js que ya existe. Si prefieres procesar todo en n8n:

1. Reemplaza el nodo "Generar Informe" con código Node.js que use `docxtemplater`
2. Descarga la plantilla desde Supabase Storage
3. Procesa la plantilla con los datos extraídos
4. Sube el informe generado a Supabase Storage

Ver `src/lib/n8n-report-workflow.md` para más detalles.

## 📱 Integración en Frontend

Agrega un componente de grabación de audio en la página de edición de consultas:

```tsx
// Ejemplo de uso en EditConsultationForm.tsx
const handleGenerateReportFromAudio = async () => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('reportType', selectedReportType);
  formData.append('specialty', specialty);
  
  const response = await fetch(`/api/consultations/${id}/generate-report-from-audio`, {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  if (result.success) {
    setReportUrl(result.report_url);
    // Mostrar transcripción si está disponible
    if (result.transcription) {
      console.log('Transcripción:', result.transcription);
    }
  }
};
```

## 🧪 Pruebas

1. **Probar workflow manualmente**:
   - Ve a n8n → Workflows
   - Ejecuta el workflow manualmente con datos de prueba
   - Verifica cada paso

2. **Probar desde frontend**:
   - Graba un audio de prueba
   - Envía desde la interfaz
   - Verifica que se genere el informe

3. **Verificar logs**:
   - Revisa logs de n8n
   - Revisa logs de Next.js
   - Verifica que el audio se procese correctamente

## ⚠️ Consideraciones Importantes

1. **Límites de Groq**:
   - Revisa los límites de la API gratuita
   - Considera implementar rate limiting
   - Maneja errores de cuota excedida

2. **Seguridad**:
   - El API key de Groq se envía en el payload
   - Considera moverla a variables de entorno de n8n
   - Valida que solo médicos puedan usar este endpoint

3. **Tamaño de Audio**:
   - Implementa límites de tamaño de archivo
   - Considera compresión antes de subir
   - Limpia archivos temporales después de procesar

4. **Conversión de Audio**:
   - Si necesitas convertir formatos, instala `ffmpeg` en el servidor
   - O usa servicios cloud para conversión
   - Groq acepta varios formatos nativamente

5. **Manejo de Errores**:
   - Implementa retry logic
   - Notifica al usuario si hay errores
   - Guarda logs de errores para debugging

## 🔄 Mejoras Futuras

1. **Procesamiento en tiempo real**: Stream de audio mientras se graba
2. **Edición de transcripción**: Permitir al doctor editar antes de generar informe
3. **Validación de campos**: Verificar que los campos extraídos sean correctos
4. **Múltiples idiomas**: Soporte para otros idiomas además de español
5. **Plantillas inteligentes**: Detectar automáticamente qué plantilla usar según el audio

## 📚 Referencias

- [Documentación de n8n](https://docs.n8n.io/)
- [API de Groq](https://console.groq.com/docs)
- [Docxtemplater](https://docxtemplater.readthedocs.io/)
- Workflow existente: `src/app/api/consultations/[id]/generate-report/route.ts`


# 📦 Guía Paso a Paso: Crear Bucket en Supabase Storage

Esta guía te muestra cómo crear el bucket `temp-audio` en Supabase Storage para almacenar temporalmente los audios antes de procesarlos en n8n.

---

## 🎯 Objetivo

Crear un bucket llamado `temp-audio` en Supabase Storage con las políticas necesarias para que n8n pueda descargar los archivos de audio.

---

## 📍 PASO 1: Acceder a Supabase Dashboard

1. Abre tu navegador
2. Ve a: **https://app.supabase.com/**
3. **Inicia sesión** con tu cuenta de Supabase
4. Selecciona tu proyecto (el que estás usando para tu aplicación)

✅ **Verificación**: Deberías ver el dashboard de tu proyecto en Supabase.

---

## 📍 PASO 2: Ir a Storage

1. En el menú lateral izquierdo, busca y haz clic en **"Storage"**
   - Puede estar representado con un ícono de carpeta o disco
   - Si no lo ves, puede estar en el menú de "More" (Más opciones)

✅ **Verificación**: Deberías ver la página de Storage con los buckets existentes (si hay alguno).

---

## 📍 PASO 3: Crear Nuevo Bucket

1. En la parte superior de la página de Storage, busca el botón **"New bucket"** o **"Create bucket"** o **"+ New Bucket"**
2. Haz clic en el botón
3. Se abrirá un modal o formulario para crear el bucket

✅ **Verificación**: Deberías ver un formulario o modal para crear el bucket.

---

## 📍 PASO 4: Configurar el Bucket

### 4.1. Nombre del Bucket

En el campo **"Name"** o **"Bucket name"**, escribe exactamente:
```
temp-audio
```

⚠️ **IMPORTANTE**: 
- El nombre debe ser exactamente `temp-audio` (con guión, sin espacios)
- No uses mayúsculas ni caracteres especiales

### 4.2. Configurar Visibilidad (Público/Privado)

Tienes dos opciones según tu necesidad:

#### **Opción A: Bucket Público (Más fácil para testing) - Recomendado para empezar**

1. En el campo **"Public bucket"** o **"Make bucket public"**, activa el toggle o marca el checkbox
2. Esto permite que los archivos sean accesibles mediante URL pública
3. Útil para que n8n pueda descargar el audio directamente

#### **Opción B: Bucket Privado (Más seguro para producción)**

1. Deja el toggle de **"Public bucket"** desactivado
2. Tendrás que configurar políticas de acceso más específicas (ver Paso 5)

### 4.3. Otras Configuraciones

- **File size limit**: Puedes dejarlo en el valor por defecto o aumentarlo si esperas archivos grandes (ej: 50 MB o 100 MB)
- **Allowed MIME types**: Puedes dejarlo vacío para permitir todos los tipos, o especificar:
  - `audio/*` (para todos los formatos de audio)
  - O específicos: `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/ogg`

### 4.4. Confirmar Creación

1. Revisa que el nombre sea correcto: `temp-audio`
2. Haz clic en el botón **"Create bucket"** o **"Create"** o **"Save"**

✅ **Verificación**: Deberías ver el nuevo bucket `temp-audio` en la lista de buckets.

---

## 📍 PASO 5: Configurar Políticas de Acceso (Si el bucket es PRIVADO)

Si creaste el bucket como **privado**, necesitas configurar políticas para que n8n pueda leer los archivos.

### 5.1. Acceder a Políticas

1. Haz clic en el bucket `temp-audio` que acabas de crear
2. Ve a la pestaña **"Policies"** o **"Políticas"** en la parte superior
3. Haz clic en **"New Policy"** o **"Create Policy"**

### 5.2. Crear Política de Lectura

1. Selecciona **"Create a policy from scratch"** o similar
2. Configura:
   - **Policy name**: `Allow public read access`
   - **Allowed operation**: Selecciona **"SELECT"** (para lectura)
   - **Target roles**: Selecciona **"public"** o **"anon"**
   - **USING expression**: Deja vacío o usa `true` (permite leer todo)
   - **WITH CHECK expression**: Deja vacío o usa `true`

3. Haz clic en **"Save policy"** o **"Create"**

✅ **Verificación**: Deberías ver la política creada en la lista de políticas del bucket.

---

## 📍 PASO 6: Verificar Configuración

### 6.1. Verificar que el Bucket Existe

1. En la página de Storage, deberías ver `temp-audio` en la lista
2. El bucket debería mostrar su nombre, tamaño, y número de archivos (0 si está vacío)

### 6.2. Probar Subida de Archivo (Opcional)

1. Haz clic en el bucket `temp-audio`
2. Haz clic en **"Upload file"** o **"Upload"**
3. Sube un archivo de prueba pequeño
4. Verifica que se suba correctamente

### 6.3. Verificar URL Pública (Si es público)

1. Haz clic en el archivo que subiste
2. Copia la URL pública que aparece
3. Abre esa URL en una pestaña nueva del navegador
4. Deberías poder ver/descargar el archivo

✅ **Verificación**: El bucket está configurado correctamente si puedes subir y acceder a archivos.

---

## 📍 PASO 7: Configurar en .env.local (Si es necesario)

Si necesitas usar URLs firmadas o acceso programático, asegúrate de tener configuradas estas variables en `.env.local`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

Estas ya deberían estar configuradas si estás usando Supabase en tu proyecto.

---

## 🔍 Troubleshooting

### Problema: No veo la opción "Storage" en el menú

**Solución:**
1. Verifica que estés en el proyecto correcto
2. El Storage puede estar en "More" o en el menú desplegable
3. Asegúrate de tener permisos de administrador en el proyecto

### Problema: No puedo crear el bucket (Error de permisos)

**Solución:**
1. Verifica que tengas permisos de administrador o editor en el proyecto
2. Contacta al administrador del proyecto si es necesario

### Problema: El bucket se crea pero n8n no puede descargar archivos

**Solución:**
1. Si el bucket es privado, verifica que las políticas estén configuradas correctamente
2. Si el bucket es público, verifica que la URL del archivo sea accesible
3. Revisa los logs de n8n para ver el error específico
4. Asegúrate de que la URL del archivo sea correcta

### Problema: Error al subir archivos grandes

**Solución:**
1. Aumenta el límite de tamaño del bucket en la configuración
2. Verifica los límites de tu plan de Supabase
3. Considera comprimir los archivos de audio antes de subirlos

---

## ✅ Checklist Final

Antes de considerar el bucket configurado:

- [ ] Accedí a Supabase Dashboard
- [ ] Fui a la sección Storage
- [ ] Creé el bucket con el nombre exacto: `temp-audio`
- [ ] Configuré la visibilidad (público o privado con políticas)
- [ ] El bucket aparece en la lista de buckets
- [ ] Probé subir un archivo de prueba (opcional)
- [ ] Verifiqué que puedo acceder a los archivos (si es público)
- [ ] Configuré políticas si el bucket es privado

---

## 📝 Notas Importantes

1. **Bucket Público**: Más fácil de configurar, pero los archivos son accesibles públicamente. Usa para desarrollo/testing.

2. **Bucket Privado**: Más seguro, pero requiere configurar políticas. Usa para producción.

3. **Limpieza Automática**: Considera configurar una política para eliminar archivos antiguos automáticamente (los audios son temporales).

4. **Costos**: Los archivos en Supabase Storage pueden tener costos según el plan. Verifica tu plan actual.

---

**¡Listo!** El bucket `temp-audio` está configurado y listo para recibir archivos de audio desde tu aplicación. 🎉






# Cómo Verificar el Bucket `prescriptions` en Supabase

## Opción 1: Desde la Interfaz Web de Supabase

1. **Ve a tu proyecto en Supabase**
   - Abre https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navega a Storage**
   - En el menú lateral izquierdo, haz clic en **"Storage"**
   - Verás una lista de todos los buckets

3. **Busca el bucket `prescriptions`**
   - Si existe, deberías verlo en la lista
   - Haz clic en él para ver su contenido

4. **Verificar si es público**
   - Haz clic en el bucket `prescriptions`
   - Ve a la pestaña **"Settings"** o **"Configuración"**
   - Verifica que **"Public bucket"** esté marcado/activado
   - Si NO está activado, actívalo

5. **Ver archivos**
   - En la pestaña **"Files"** o **"Archivos"**
   - Deberías ver todos los archivos subidos
   - Puedes hacer clic en un archivo para ver su URL pública

## Opción 2: Usar el Endpoint API que Creé

He creado un endpoint especial para verificar el bucket. Ejecuta esto en tu navegador o con curl:

```bash
# Si estás en desarrollo local
curl http://localhost:3000/api/storage/verify-bucket

# Si estás en producción
curl https://tu-dominio.com/api/storage/verify-bucket
```

O simplemente abre en tu navegador:
- Desarrollo: `http://localhost:3000/api/storage/verify-bucket`
- Producción: `https://tu-dominio.com/api/storage/verify-bucket`

El endpoint te dirá:
- ✅ Si el bucket existe
- ✅ Si es público o privado
- ✅ Cuántos archivos tiene
- ✅ Algunos archivos de ejemplo

## Opción 3: Verificar con SQL

Ejecuta este query en el SQL Editor de Supabase:

```sql
-- Ver información de buckets (requiere permisos de administrador)
SELECT 
    name,
    public,
    file_size_limit,
    created_at
FROM storage.buckets
WHERE name = 'prescriptions';
```

## Solución Rápida: Hacer el Bucket Público

Si el bucket existe pero NO es público, ejecuta este SQL:

```sql
-- Hacer el bucket prescriptions público
UPDATE storage.buckets
SET public = true
WHERE name = 'prescriptions';
```

## Crear el Bucket si No Existe

Si el bucket no existe, ejecuta este SQL:

```sql
-- Crear el bucket prescriptions como público
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'prescriptions',
    'prescriptions',
    true,
    10485760  -- 10MB en bytes
)
ON CONFLICT (id) DO UPDATE
SET public = true;
```

## Verificar URLs Guardadas

Ejecuta el script SQL que creé:

```sql
-- Ver URLs guardadas
SELECT 
    file_name,
    url,
    path,
    CASE 
        WHEN url LIKE '%prescriptions%' THEN '✅ Apunta a prescriptions'
        ELSE '⚠️ Verificar bucket'
    END as bucket_check
FROM consultation_files
ORDER BY created_at DESC;
```

## Problemas Comunes

### ❌ El bucket no es público
**Solución:** Ejecuta el SQL para hacerlo público (ver arriba)

### ❌ La URL guardada no funciona
**Posibles causas:**
- El archivo fue eliminado del bucket
- El path guardado no coincide con el path real
- Hay un problema con permisos

**Solución:** 
1. Verifica que el archivo exista en el bucket
2. Compara el path guardado con el path real
3. Si no coinciden, ejecuta el script de corrección

### ❌ El bucket no existe
**Solución:** El código debería crearlo automáticamente cuando subes un archivo, pero puedes crearlo manualmente con el SQL de arriba.


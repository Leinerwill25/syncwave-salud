# ⚠️ SOLUCIÓN RÁPIDA: Ejecutar Migración del QR de Emergencia

## El Error
El 404 en `/api/emergency/[token]` ocurre porque **la migración SQL no se ha ejecutado**. Los campos necesarios no existen en la tabla `Patient`.

## ✅ Solución Rápida (2 minutos)

### Opción 1: Supabase Dashboard (RECOMENDADO - Más Fácil)

1. **Abre** https://app.supabase.com
2. **Selecciona** tu proyecto
3. **Ve a** "SQL Editor" (menú lateral izquierdo)
4. **Copia** todo el contenido del archivo: `migrations/add_patient_emergency_qr_fields.sql`
5. **Pega** en el editor SQL
6. **Haz clic** en "Run" o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
7. **Verifica** que aparezca "Success. No rows returned"

### Opción 2: Script Node.js

```bash
cd my-app
node scripts/run-qr-migration.js
```

**Nota**: Requiere que `DATABASE_URL` esté en `.env.local` o `.env`

---

## 📋 Contenido del SQL a Ejecutar

Si prefieres copiar directamente, aquí está el SQL:

```sql
-- Migración para agregar campos de directivas anticipadas y token QR de emergencia al paciente

-- Agregar campos de directivas anticipadas
ALTER TABLE "Patient" 
ADD COLUMN IF NOT EXISTS advance_directives JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_qr_token TEXT UNIQUE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS emergency_qr_enabled BOOLEAN DEFAULT FALSE;

-- Crear índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_patient_emergency_qr_token ON "Patient"("emergency_qr_token") WHERE "emergency_qr_token" IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN "Patient"."advance_directives" IS 'Directivas anticipadas del paciente: DNR, restricciones de soporte vital, etc. Formato JSON: {dnr: boolean, restrictions: string[], other: string}';
COMMENT ON COLUMN "Patient"."emergency_contact_name" IS 'Nombre del contacto de emergencia';
COMMENT ON COLUMN "Patient"."emergency_contact_phone" IS 'Teléfono del contacto de emergencia';
COMMENT ON COLUMN "Patient"."emergency_contact_relationship" IS 'Relación del contacto de emergencia (ej: Esposo/a, Hijo/a, Padre/Madre)';
COMMENT ON COLUMN "Patient"."emergency_qr_token" IS 'Token único para acceder a la información de emergencia del paciente mediante QR';
COMMENT ON COLUMN "Patient"."emergency_qr_enabled" IS 'Indica si el QR de emergencia está habilitado para este paciente';
```

---

## ✅ Después de Ejecutar

1. **Reinicia** el servidor de desarrollo (`npm run dev` si está corriendo)
2. **Prueba** nuevamente accediendo a `/dashboard/patient/qr-urgente`
3. **Habilita** el QR
4. **Accede** a la URL del QR - debería funcionar ahora

---

## 🔍 Verificar que Funcionó

Ejecuta esta query en Supabase SQL Editor para verificar:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Patient' 
  AND column_name LIKE 'emergency%';
```

Deberías ver 2 filas: `emergency_qr_token` y `emergency_qr_enabled`


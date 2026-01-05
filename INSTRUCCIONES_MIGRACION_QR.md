# Instrucciones para Ejecutar la Migración del QR de Emergencia

## ⚠️ Problema
El error 404 ocurre porque la migración SQL no se ha ejecutado. Los campos necesarios no existen en la tabla `Patient`.

## ✅ Solución: Ejecutar la Migración SQL

Tienes **2 opciones** para ejecutar la migración:

### Opción 1: Usando Supabase Dashboard (Recomendado)

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido completo del archivo `migrations/add_patient_emergency_qr_fields.sql`
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Verifica que no haya errores

### Opción 2: Usando psql (Línea de comandos)

Si tienes `psql` instalado y la variable `DATABASE_URL` configurada:

```bash
cd my-app
psql $DATABASE_URL -f migrations/add_patient_emergency_qr_fields.sql
```

O en Windows PowerShell:
```powershell
cd my-app
$env:DATABASE_URL = "tu-connection-string-aqui"
Get-Content migrations/add_patient_emergency_qr_fields.sql | psql $env:DATABASE_URL
```

### Opción 3: Desde Node.js (Script temporal)

Puedes crear un script temporal para ejecutar la migración:

```javascript
// scripts/run-migration.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/add_patient_emergency_qr_fields.sql'),
    'utf8'
  );
  
  try {
    await pool.query(sql);
    console.log('✅ Migración ejecutada exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
```

Ejecutar con:
```bash
node scripts/run-migration.js
```

## 📋 Verificación

Después de ejecutar la migración, verifica que los campos se hayan creado:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Patient'
  AND column_name IN (
    'emergency_qr_token',
    'emergency_qr_enabled',
    'advance_directives',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relationship'
  );
```

Deberías ver 6 filas con los nuevos campos.

## 🔄 Después de la Migración

1. Reinicia el servidor de desarrollo (`npm run dev`)
2. Accede a `/dashboard/patient/qr-urgente`
3. Habilita el QR
4. Intenta acceder a la URL del QR

## ⚠️ Nota Importante

Si estás usando Prisma y quieres mantener el schema sincronizado, también deberías actualizar `prisma/schema.prisma`, pero como este proyecto parece usar Supabase directamente, la migración SQL es suficiente.


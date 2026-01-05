# Debug: Error 404 en /api/emergency/[token]

## Estado Actual
✅ Los campos ya existen en la base de datos:
- `emergency_qr_token`
- `emergency_qr_enabled`
- `advance_directives`
- `emergency_contact_name`
- `emergency_contact_phone`
- `emergency_contact_relationship`

## Posibles Causas del 404

### 1. El paciente no tiene token generado
El token QR se genera cuando el paciente:
- Habilita el QR por primera vez, O
- Accede a `/dashboard/patient/qr-urgente` (GET genera token si no existe)

**Solución**: Ir a `/dashboard/patient/qr-urgente` y habilitar el QR.

### 2. El QR está deshabilitado
Aunque el token existe, si `emergency_qr_enabled = false`, la API devuelve 404.

**Solución**: Habilitar el QR desde `/dashboard/patient/qr-urgente`.

### 3. Nombres de columnas incorrectos
Supabase puede requerir los nombres exactos de las columnas. Verificar que en el código se usen los nombres correctos.

**Verificación**: Comparar nombres en el código vs schema:
- Schema: `emergency_qr_token`, `emergency_qr_enabled`
- Código: `emergency_qr_token`, `emergency_qr_enabled` ✅

### 4. Error en la consulta SQL
Si hay un error en la consulta, Supabase podría devolver un error que se interpreta como 404.

**Debug**: Agregar logging en la API para ver el error real.

## Pasos para Debug

1. **Verificar que el paciente tenga token**:
   ```sql
   SELECT id, "firstName", "lastName", emergency_qr_token, emergency_qr_enabled
   FROM "Patient"
   WHERE id = 'ID_DEL_PACIENTE';
   ```

2. **Verificar que el token sea correcto**:
   - Ir a `/dashboard/patient/qr-urgente`
   - Ver el token/URL generado
   - Comparar con el token en la URL que da 404

3. **Agregar logging temporal** en `/api/emergency/[token]/route.ts`:
   ```typescript
   console.log('[Emergency API] Token recibido:', token);
   console.log('[Emergency API] Error de consulta:', patientError);
   console.log('[Emergency API] Datos encontrados:', patient);
   ```

4. **Verificar permisos de RLS (Row Level Security)**:
   - Si Supabase tiene RLS habilitado, puede estar bloqueando la consulta
   - Verificar políticas en Supabase Dashboard

## Solución Inmediata

1. Ir a `/dashboard/patient/qr-urgente`
2. Hacer clic en "Habilitar QR"
3. Copiar la URL del QR
4. Probar acceder a esa URL

Si sigue dando 404, revisar los logs del servidor para ver el error real de Supabase.


# Instrucciones para Crear Usuario Superadmin

## ⚠️ IMPORTANTE: Diferencia entre Supabase Auth y la tabla superadmin

**El usuario NO debe estar en Supabase Auth** (Authentication > Users). 
El usuario debe estar en la tabla **`public.superadmin`**, que es una tabla personalizada de la base de datos.

Es **normal** que el usuario NO aparezca en:
- https://supabase.com/dashboard/project/lyxlnduyzhwwupxjackg/auth/users

El usuario aparecerá en la tabla `public.superadmin` que puedes verificar en el SQL Editor.

---

## Opción 1: Ejecutar el SQL directamente en Supabase (RECOMENDADO)

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/lyxlnduyzhwwupxjackg
2. Abre el **SQL Editor** (menú izquierdo)
3. Abre el archivo `migrations/create_superadmin_user.sql`
4. Copia y pega el contenido completo en el SQL Editor
5. Haz clic en **Run** para ejecutar
6. Verifica que aparezca el mensaje de éxito

### Verificar que se creó correctamente:

Ejecuta esta consulta en el SQL Editor:

```sql
SELECT id, username, email, is_active, created_at 
FROM public.superadmin 
WHERE username = 'ADMIN';
```

Deberías ver una fila con:
- username: `ADMIN`
- email: `admin@ashira.com`
- is_active: `true`

---

## Opción 2: Ejecutar el script de Node.js

### Requisitos previos:

Asegúrate de tener las variables de entorno configuradas en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lyxlnduyzhwwupxjackg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### Ejecutar el script:

```bash
cd my-app
node scripts/verify-superadmin.js
```

Este script:
- ✅ Verificará si el usuario existe
- ✅ Si no existe, lo creará automáticamente
- ✅ Si existe pero la contraseña no coincide, la actualizará
- ✅ Verificará que la contraseña funcione correctamente

---

## Credenciales del Superadmin

- **Usuario:** `ADMIN`
- **Contraseña:** `Escorpio25#`
- **Email:** `admin@ashira.com`

---

## Verificar que funciona el login

1. Ve a: http://localhost:3000/login/analytics
2. Ingresa:
   - Usuario: `ADMIN`
   - Contraseña: `Escorpio25#`
3. Deberías ser redirigido a `/dashboard/analytics`

---

## Solución de problemas

### Error 401: "Credenciales incorrectas"

1. Verifica que el usuario existe en `public.superadmin`:
   ```sql
   SELECT * FROM public.superadmin WHERE username = 'ADMIN';
   ```

2. Si no existe, ejecuta el SQL de migración nuevamente

3. Si existe pero sigue fallando, ejecuta el script de verificación:
   ```bash
   node scripts/verify-superadmin.js
   ```

### Error: "Error al buscar usuario"

1. Verifica que la tabla `superadmin` existe:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'superadmin';
   ```

2. Verifica los permisos RLS (Row Level Security) de la tabla

### El usuario no aparece en Supabase Auth

**Esto es normal y esperado.** El sistema usa la tabla `public.superadmin`, no Supabase Auth. El usuario NO debe aparecer en Authentication > Users.

---

## Estructura de la tabla superadmin

```sql
CREATE TABLE public.superadmin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email text,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  last_login_ip text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```


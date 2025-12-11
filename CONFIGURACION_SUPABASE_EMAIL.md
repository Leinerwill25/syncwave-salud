# Configuración de Supabase para Confirmación de Email

## Pasos para Configurar la Confirmación de Email en Supabase

### 1. Configurar URL de Redirección

**Ruta exacta:**

-   En el menú lateral izquierdo: **Authentication** → **URL Configuration**
-   O directamente: `https://app.supabase.com/project/[tu-proyecto-id]/auth/url-configuration`

**Pasos:**

1. Ve al **Dashboard de Supabase**: https://app.supabase.com
2. Selecciona tu proyecto
3. En el menú lateral izquierdo, haz clic en **Authentication**
4. Luego haz clic en **URL Configuration** (está en la lista de opciones bajo Authentication)
5. Configura lo siguiente:

    **Site URL:**

    ```
    https://syncwavesaludbeta.vercel.app
    ```

    **Redirect URLs** (agrega estas URLs):

    ```
    https://syncwavesaludbeta.vercel.app/auth/confirm-email
    https://syncwavesaludbeta.vercel.app/auth/confirm-email/**
    http://localhost:3000/auth/confirm-email
    http://localhost:3000/auth/confirm-email/**
    ```

### 2. Configurar Template de Email de Confirmación

**Ruta exacta:**

-   En el menú lateral izquierdo: **Authentication** → **Email Templates**
-   O directamente: `https://app.supabase.com/project/[tu-proyecto-id]/auth/templates`

**Pasos:**

1. En el menú lateral izquierdo, haz clic en **Authentication**
2. Luego haz clic en **Email Templates** (está en la lista de opciones bajo Authentication)
3. Selecciona **Confirm signup** (deberías ver una lista de templates: Confirm signup, Magic Link, etc.)
4. Asegúrate de que el template use la variable correcta:

    **Enlace de confirmación (debe usar):**

    ```html
    {{ .ConfirmationURL }}
    ```

    **Ejemplo de template completo:**

    ```html
    <h2>¡Bienvenido a SyncWave Salud!</h2>
    <p>Hola {{ .FullName }},</p>
    <p>Nos complace darte la bienvenida a SyncWave Salud. Tu cuenta ha sido creada exitosamente.</p>
    <p>Tu cuenta: {{ .Email }}</p>
    <p>
    	<a href="{{ .ConfirmationURL }}" style="background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"> Confirmar Email </a>
    </p>
    <p>Estamos aquí para ayudarte. Si tienes alguna pregunta, no dudes en contactarnos.</p>
    ```

    **IMPORTANTE:** El enlace debe usar `{{ .ConfirmationURL }}` para que Supabase redirija correctamente a tu página de confirmación.

    **⚠️ ERROR COMÚN - NO hagas esto:**

    ```html
    <a href="{{ .ConfirmationURL }}/login">Iniciar Sesión</a>
    ```

    **✅ CORRECTO - Haz esto:**

    ```html
    <a href="{{ .ConfirmationURL }}">Confirmar Email</a>
    ```

    El enlace debe usar **SOLO** `{{ .ConfirmationURL }}` sin agregar nada después. Si agregas `/login` o cualquier otra ruta, la URL resultante será incorrecta (ej: `/auth/confirm-email/login` en lugar de `/auth/confirm-email`).

    **Nota:** El código del proyecto ahora maneja automáticamente este error limpiando la URL si tiene `/login` al final, pero es mejor corregir el template en Supabase.

### 3. Habilitar Confirmación de Email

**Ruta exacta:**

-   En el menú lateral izquierdo: **Settings** (icono de engranaje) → **Auth**
-   O directamente: `https://app.supabase.com/project/[tu-proyecto-id]/settings/auth`

**Pasos:**

1. En el menú lateral izquierdo, haz clic en **Settings** (icono de engranaje ⚙️ en la parte inferior)
2. Luego haz clic en **Auth** (en la lista de opciones de Settings)
3. Busca la sección **Email Auth** o **Email**
4. Asegúrate de que esté habilitado:
    - ✅ **Enable email confirmations**
    - ✅ **Secure email change** (recomendado)
    - ✅ **Double confirm email changes** (recomendado)

### 4. Verificar Configuración de SMTP (Opcional)

Si quieres usar tu propio proveedor de email:

**Ruta exacta:**

-   En el menú lateral izquierdo: **Settings** → **Auth**
-   O directamente: `https://app.supabase.com/project/[tu-proyecto-id]/settings/auth`

**Pasos:**

1. Ve a **Settings** → **Auth** (misma ruta que el paso 3)
2. Busca la sección **SMTP Settings** o **SMTP**
3. Configura tu proveedor SMTP (Gmail, SendGrid, etc.)

**Nota:** Si no configuras SMTP, Supabase usará su servicio de email por defecto (limitado pero funcional para desarrollo).

**Nota:** Si no configuras SMTP, Supabase usará su servicio de email por defecto.

### 5. Variables Disponibles en Templates

En los templates de email puedes usar:

-   `{{ .Email }}` - Email del usuario
-   `{{ .FullName }}` - Nombre completo del usuario
-   `{{ .ConfirmationURL }}` - URL de confirmación (IMPORTANTE: usar esta)
-   `{{ .SiteURL }}` - URL del sitio
-   `{{ .RedirectTo }}` - URL de redirección después de confirmar

### 6. Probar la Configuración

1. Registra un nuevo usuario
2. Revisa el email recibido
3. Verifica que el enlace apunte a: `https://syncwavesaludbeta.vercel.app/auth/confirm-email?...`
4. Haz clic en el enlace
5. Deberías ser redirigido a la página de confirmación y luego al login

### Troubleshooting

**Problema:** El enlace en el email no funciona

-   **Solución:** Verifica que `{{ .ConfirmationURL }}` esté en el template
-   Verifica que la URL de redirección esté en la lista de Redirect URLs

**Problema:** "Email not confirmed" después de hacer clic

-   **Solución:** Verifica que la página `/auth/confirm-email` esté funcionando
-   Revisa los logs del navegador para ver errores
-   Verifica que las variables de entorno de Supabase estén correctas

**Problema:** El email no se envía

-   **Solución:** Verifica la configuración de SMTP
-   Revisa los logs en Supabase → Logs → Auth Logs
-   Verifica que "Enable email confirmations" esté activado

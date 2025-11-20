# Configuración de Resend para SyncWave Salud

Este documento explica cómo configurar Resend para el envío de correos electrónicos en toda la plataforma.

## 📋 Requisitos Previos

1. Crear una cuenta en [Resend](https://resend.com/)
2. Obtener tu API Key de Resend
3. Verificar un dominio (opcional pero recomendado para producción)

## 🔧 Variables de Entorno

Agrega las siguientes variables a tu archivo `.env.local` o `.env`:

```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
EMAIL_FROM=onboarding@resend.dev

# Application Configuration
APP_NAME=SyncWave Salud
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Otras configuraciones existentes
NEXT_PUBLIC_INVITE_BASE_URL=http://localhost:3000
NEXT_PUBLIC_VERCEL_URL=tu-dominio.vercel.app
```

### Explicación de Variables

- **RESEND_API_KEY**: Tu API key de Resend (obtener desde https://resend.com/api-keys)
- **RESEND_FROM_EMAIL** / **EMAIL_FROM**: El email desde el cual se enviarán los correos. En desarrollo puedes usar `onboarding@resend.dev`, pero en producción debes verificar tu dominio.
- **APP_NAME**: Nombre de la aplicación que aparecerá en los correos
- **NEXT_PUBLIC_APP_URL**: URL base de tu aplicación (usado para generar enlaces en los emails)

## 📧 Tipos de Emails Implementados

La plataforma ahora envía automáticamente emails para:

### 1. **Invitaciones** (`INVITE`)
- Cuando se invita a un especialista a unirse a una organización
- Template: `getInviteEmailTemplate`

### 2. **Citas Médicas** (`APPOINTMENT_REQUEST`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_STATUS`)
- Cuando un paciente solicita una cita
- Cuando se confirma una cita
- Cuando cambia el estado de una cita
- Templates: `getAppointmentNotificationTemplate`

### 3. **Recetas Médicas** (`PRESCRIPTION`)
- Cuando un médico emite una nueva receta
- Template: `getPrescriptionNotificationTemplate`

### 4. **Resultados de Laboratorio** (`LAB_RESULT`)
- Cuando hay nuevos resultados disponibles
- Incluye alerta especial para resultados críticos
- Template: `getLabResultNotificationTemplate`

### 5. **Facturas** (`INVOICE`)
- Cuando se genera una nueva factura
- Template: `getInvoiceNotificationTemplate`

### 6. **Notificaciones Genéricas**
- Para cualquier otro tipo de notificación
- Template: `getGenericNotificationTemplate`

### 7. **Recuperación de Contraseña** (`PASSWORD_RESET`)
- Cuando un usuario solicita restablecer su contraseña
- Template: `getPasswordResetTemplate`

### 8. **Bienvenida** (`WELCOME`)
- Cuando se crea una nueva cuenta
- Template: `getWelcomeEmailTemplate`

## 🏗️ Arquitectura

### Estructura de Archivos

```
src/lib/email/
├── resend.ts          # Cliente Resend y función sendEmail
├── templates.ts       # Templates HTML para cada tipo de email
└── index.ts           # Exportaciones y helper sendNotificationEmail

src/lib/
└── notifications.ts   # Helper para crear notificaciones y enviar emails
```

### Flujo de Envío

1. **Creación de Notificación**: Se llama a `createNotification()` desde cualquier API
2. **Inserción en DB**: Se crea el registro en la tabla `Notification`
3. **Envío de Email**: Si el usuario tiene email y `sendEmail: true`, se envía automáticamente
4. **Template Selection**: Se selecciona el template apropiado según el `type`
5. **Resend API**: Se envía el email usando la API de Resend

## 🔌 Integración en APIs

### Ejemplo: Crear notificación con email

```typescript
import { createNotification } from '@/lib/notifications';

await createNotification({
  userId: 'user-id',
  organizationId: 'org-id',
  type: 'PRESCRIPTION',
  title: 'Nueva Receta Médica',
  message: 'El Dr. ha emitido una nueva receta para ti.',
  payload: {
    prescriptionId: 'prescription-id',
    patientName: 'Juan Pérez',
    doctorName: 'Dr. García',
    prescriptionDate: '2024-01-15',
    prescriptionUrl: 'https://app.com/recetas',
  },
  sendEmail: true, // Por defecto es true
});
```

### APIs Actualizadas

Las siguientes APIs ahora envían emails automáticamente:

- ✅ `/api/invites/send` - Invitaciones
- ✅ `/api/invites/resend` - Reenvío de invitaciones
- ✅ `/api/patient/appointments/new` - Nueva cita solicitada
- ✅ `/api/dashboard/medic/appointments/[id]` - Cambio de estado de cita
- ✅ `/api/medic/prescriptions` - Nueva receta médica
- ✅ `/api/prescriptions` - Nueva receta médica (form data)
- ✅ `/api/facturacion` - Nueva factura generada

## 🎨 Personalización de Templates

Los templates están en `src/lib/email/templates.ts`. Puedes personalizar:

- Colores y estilos CSS
- Estructura HTML
- Contenido y mensajes
- Botones de acción

## 🧪 Testing

Para probar en desarrollo:

1. Usa el dominio de prueba de Resend: `onboarding@resend.dev`
2. Los emails se enviarán a cualquier dirección válida
3. Revisa los logs de la consola para ver el estado del envío

## 🚀 Producción

Para producción:

1. Verifica tu dominio en Resend
2. Actualiza `EMAIL_FROM` con tu dominio verificado (ej: `noreply@tudominio.com`)
3. Configura `NEXT_PUBLIC_APP_URL` con tu URL de producción
4. Asegúrate de tener `RESEND_API_KEY` configurada en Vercel

## 📝 Notas Importantes

- Los emails se envían de forma asíncrona y no bloquean la creación de notificaciones
- Si el envío de email falla, la notificación se crea igualmente en la base de datos
- Los errores de email se registran en los logs pero no afectan la operación principal
- Resend tiene límites de envío según tu plan (ver https://resend.com/pricing)

## 🔗 Referencias

- [Documentación de Resend](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/emails)
- [Resend API Reference](https://resend.com/docs/api-reference)


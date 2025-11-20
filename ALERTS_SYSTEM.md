# Sistema de Alertas para Especialistas

## 📋 Resumen

Sistema completo de alertas que escanea múltiples tablas de la base de datos al iniciar sesión y genera alertas críticas, advertencias e informativas para el especialista.

## 🗂️ Tablas Escaneadas y Tipos de Alertas

### 1. **appointment** (Citas)
- **APPOINTMENT_IMMINENT** (CRITICAL): Citas en menos de 2 horas
- **APPOINTMENT_SOON** (WARNING): Citas en las próximas 24 horas

### 2. **prescription** (Recetas)
- **PRESCRIPTION_EXPIRED** (CRITICAL): Recetas vencidas
- **PRESCRIPTION_EXPIRING** (WARNING): Recetas próximas a vencer (3 días o menos)

### 3. **lab_result** (Resultados de Laboratorio)
- **LAB_RESULT_CRITICAL** (CRITICAL): Resultados marcados como críticos sin revisar

### 4. **task** (Tareas)
- **TASK_OVERDUE** (CRITICAL): Tareas vencidas
- **TASK_DUE_SOON** (WARNING): Tareas próximas a vencer (24 horas o menos)

### 5. **consultation** (Consultas)
- **CONSULTATION_UNFINISHED** (WARNING): Consultas iniciadas hace más de 3 días sin finalizar

### 6. **facturacion** (Facturas)
- **INVOICE_PENDING** (INFO): Facturas pendientes de pago

### 7. **message** (Mensajes)
- **MESSAGE_UNREAD** (INFO): Mensajes no leídos

### 8. **Notification** (Notificaciones)
- **NOTIFICATION_UNREAD** (INFO): Notificaciones no leídas

## 🎯 Niveles de Alerta

- **CRITICAL** (Rojo): Requiere acción inmediata
- **WARNING** (Amarillo): Atención en las próximas horas
- **INFO** (Azul): Informativo

## 🔄 Funcionalidades

### Actualización Automática
- El botón de alertas se actualiza cada 60 segundos
- El modal se actualiza cada 30 segundos mientras está abierto
- Contadores en tiempo real

### Validaciones de Tiempo
- **Citas**: Validación de `scheduled_at` vs hora actual
- **Recetas**: Validación de `valid_until` vs hora actual
- **Tareas**: Validación de `due_at` vs hora actual
- **Consultas**: Validación de `started_at` (más de 3 días sin finalizar)

### Interfaz
- Modal con filtros por nivel (Todas, Críticas, Advertencias, Informativas)
- Badge con contador en el botón (rojo si hay críticas, teal si solo hay otras)
- Iconos específicos por tipo de alerta
- Contador de tiempo hasta vencimiento
- Enlaces directos a la acción requerida

## 📁 Archivos Creados

1. **`/app/api/medic/alerts/route.ts`**: API que escanea todas las tablas y genera alertas
2. **`/components/medic/AlertsModal.tsx`**: Modal completo con filtros y lista de alertas
3. **`/components/medic/AlertsButton.tsx`**: Botón con badge de contador
4. Integrado en **`/app/dashboard/medic/components/MedicSidebar.tsx`**

## 🚀 Uso

El sistema se activa automáticamente:
1. Al iniciar sesión, el botón de alertas aparece en el sidebar
2. El contador se actualiza automáticamente cada minuto
3. Al hacer clic, se abre el modal con todas las alertas
4. Las alertas están ordenadas: Críticas primero, luego Advertencias, luego Informativas
5. Dentro de cada nivel, se ordenan por fecha de vencimiento

## 🔒 Seguridad

- Solo accesible para usuarios con rol `MEDICO`
- Validación de autenticación en cada petición
- Filtrado por `doctor_id` para mostrar solo alertas del médico autenticado

## 📊 Datos Mostrados en Cada Alerta

- **Título**: Tipo de alerta
- **Mensaje**: Descripción con información del paciente/entidad
- **Nivel**: CRITICAL, WARNING, o INFO
- **Tiempo hasta vencimiento**: Si aplica (ej: "En 2 horas", "Vencido")
- **URL de acción**: Enlace directo para resolver la alerta
- **Metadatos**: Información adicional (IDs, fechas, etc.)

## ⚙️ Configuración

Los umbrales de tiempo están definidos en la API:
- Citas inminentes: ≤ 2 horas
- Citas próximas: ≤ 24 horas
- Recetas próximas a vencer: ≤ 3 días
- Tareas próximas a vencer: ≤ 24 horas
- Consultas sin finalizar: > 3 días

Estos valores pueden ajustarse en `/app/api/medic/alerts/route.ts`.


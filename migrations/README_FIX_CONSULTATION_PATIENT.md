# Solución para sincronizar patient_id y unregistered_patient_id en consultation

## Problema

Al confirmar una cita de un paciente no registrado, la consulta se crea correctamente pero no refleja a qué paciente pertenece. El problema es que cuando se crea una consulta desde un appointment, no se están copiando correctamente los campos `patient_id` o `unregistered_patient_id` desde el appointment a la consulta.

## Solución

Se han creado varias migraciones SQL para resolver este problema:

### 1. Asegurar que patient_id sea nullable (opcional)

Si tu tabla `consultation` tiene `patient_id` como NOT NULL, ejecuta primero:

```sql
-- my-app/migrations/ensure_consultation_patient_id_nullable.sql
```

Esto permite que las consultas de pacientes no registrados no requieran un `patient_id`.

### 2. Crear el trigger para sincronización automática

Ejecuta el trigger que automáticamente sincroniza los IDs de paciente cuando se crea o actualiza una consulta:

**Opción A: Trigger completo (recomendado)**
```sql
-- my-app/migrations/sync_consultation_patient_from_appointment.sql
```
Este script incluye:
- Función de sincronización
- Triggers para INSERT y UPDATE
- Script para corregir consultas existentes
- Verificación de resultados

**Opción B: Trigger simplificado**
```sql
-- my-app/migrations/trigger_sync_consultation_from_appointment.sql
```
Esta es una versión más simple que solo sincroniza los IDs de paciente.

### 3. Corregir consultas existentes

Si ya tienes consultas creadas que no tienen los IDs correctos, ejecuta:

```sql
-- my-app/migrations/fix_existing_consultations_patient_ids.sql
```

Este script:
- Actualiza todas las consultas existentes que tienen `appointment_id`
- Copia `patient_id` y `unregistered_patient_id` desde el appointment
- Muestra un resumen de las consultas corregidas

## Orden recomendado de ejecución

1. **Primero**: Asegurar que `patient_id` sea nullable (si es necesario)
   ```bash
   psql -d tu_base_de_datos -f migrations/ensure_consultation_patient_id_nullable.sql
   ```

2. **Segundo**: Corregir consultas existentes
   ```bash
   psql -d tu_base_de_datos -f migrations/fix_existing_consultations_patient_ids.sql
   ```

3. **Tercero**: Crear el trigger para futuras consultas
   ```bash
   psql -d tu_base_de_datos -f migrations/sync_consultation_patient_from_appointment.sql
   ```

## Verificación

Después de ejecutar las migraciones, puedes verificar que todo funciona correctamente con:

```sql
-- Consultar consultas con sus appointments
SELECT 
    c.id as consultation_id,
    c.appointment_id,
    c.patient_id as consultation_patient_id,
    c.unregistered_patient_id as consultation_unregistered_id,
    a.patient_id as appointment_patient_id,
    a.unregistered_patient_id as appointment_unregistered_id
FROM public.consultation c
LEFT JOIN public.appointment a ON c.appointment_id = a.id
WHERE c.appointment_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 10;
```

Todos los valores de `consultation_patient_id` y `consultation_unregistered_id` deberían coincidir con los de `appointment_patient_id` y `appointment_unregistered_id` respectivamente.

## Mejoras en el código

También se ha mejorado el código de creación de consultas en:
- `my-app/src/app/api/consultations/route.ts`

Los cambios incluyen:
- Mejor sincronización de datos desde el appointment al crear una consulta
- Soporte para copiar `doctor_id` y `organization_id` desde el appointment si no se proporcionan
- Código simplificado que usa Supabase directamente en lugar de SQL raw

## Notas importantes

1. **Backup**: Siempre haz un backup de tu base de datos antes de ejecutar migraciones en producción.

2. **Testing**: Prueba primero en un entorno de desarrollo o staging.

3. **Triggers**: Los triggers se ejecutarán automáticamente en todas las futuras inserciones y actualizaciones de consultas, asegurando que los datos siempre estén sincronizados.

4. **Performance**: Los triggers tienen un impacto mínimo en el rendimiento ya que solo hacen una consulta SELECT simple cuando hay un `appointment_id`.

## Soporte

Si encuentras algún problema después de ejecutar las migraciones, revisa los logs de PostgreSQL para identificar errores específicos.


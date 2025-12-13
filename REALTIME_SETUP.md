# Configuración de Realtime para Mensajería Privada

Para que la mensajería privada funcione en tiempo real, necesitas habilitar Realtime en Supabase para la tabla `private_messages`.

## Pasos para habilitar Realtime:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Database** → **Replication**
3. Busca la tabla `private_messages` en la lista
4. Si no aparece, haz clic en **Enable Realtime** en la parte superior
5. Busca `private_messages` en la lista de tablas
6. Activa el toggle para habilitar Realtime en esta tabla
7. Asegúrate de que el toggle esté **ON** (verde)

Alternativamente, puedes ejecutar este SQL en el SQL Editor de Supabase:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
```

## Verificación:

Después de habilitar Realtime, los mensajes deberían aparecer automáticamente sin necesidad de recargar la página.

## Notas:

- Si ya ejecutaste la migración `create_private_messages_table.sql`, la tabla ya debería existir
- Realtime requiere que la tabla tenga la columna `created_at` (que ya existe)
- Asegúrate de que tu proyecto tenga Realtime habilitado en el plan


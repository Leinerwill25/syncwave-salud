-- ============================================================================
-- SCRIPT: Corregir función fn_notify_user_insert
-- ============================================================================
-- Esta función se ejecuta cuando se inserta un usuario y está usando
-- "Notification" con mayúscula. Necesitamos corregirla para usar "notification"
-- ============================================================================

-- Eliminar la función existente
DROP FUNCTION IF EXISTS public.fn_notify_user_insert() CASCADE;

-- Recrear la función con la referencia correcta a notification (minúscula)
CREATE OR REPLACE FUNCTION public.fn_notify_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
declare
  n_title text;
  n_message text;
  n_type text;
  payload jsonb;
begin
  -- Only proceed when organizationId is present
  if NEW."organizationId" is null then
    return NEW;
  end if;

  -- Build payload (you can pick exact fields to avoid sensitive data)
  payload := jsonb_build_object(
    'id', NEW.id,
    'email', NEW.email,
    'name', NEW.name,
    'role', NEW.role,
    'organizationId', NEW."organizationId",
    'createdAt', NEW."createdAt"
  );

  -- Decide notification type and message based on role
  n_type := 'USER_REGISTERED';
  
  if NEW.role = 'MEDICO' then
    n_title := 'Médico registrado';
    n_message := coalesce(NEW.name, NEW.email, 'Un médico') || ' se ha registrado en la clínica.';
  elsif NEW.role = 'PACIENTE' then
    n_title := 'Paciente registrado';
    n_message := coalesce(NEW.name, NEW.email, 'Un paciente') || ' se ha registrado y está asociado a la clínica.';
  else
    n_title := 'Usuario registrado';
    n_message := coalesce(NEW.name, NEW.email, 'Un usuario') || ' se ha registrado y está asociado a la clínica.';
  end if;

  -- CORRECCIÓN: Usar la tabla notification (minúscula)
  insert into public.notification("organizationId", type, title, message, payload)
  values (NEW."organizationId", n_type, n_title, n_message, payload);

  return NEW;
end;
$function$;

-- Verificar que el trigger existe y recrearlo si es necesario
DROP TRIGGER IF EXISTS trigger_notify_user_insert ON public."user";
CREATE TRIGGER trigger_notify_user_insert
    AFTER INSERT ON public."user"
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_user_insert();


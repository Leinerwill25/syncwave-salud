-- Ver la definición completa de la función problemática
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'fn_notify_user_insert'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');


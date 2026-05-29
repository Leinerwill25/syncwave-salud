-- Migration to fix create_survey_on_consultation_complete trigger function
-- The function was referencing NEW.status and OLD.status, but the public.consultation table has no "status" column.
-- It now references NEW.ended_at and OLD.ended_at which are correct columns on the consultation table.

CREATE OR REPLACE FUNCTION public.create_survey_on_consultation_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if NEW.ended_at is not null and OLD.ended_at is null then
    insert into consultation_survey_responses
      (consultation_id, patient_id, survey_id, answers)
    select
      NEW.id,
      NEW.patient_id,
      s.id,
      '{}'::jsonb
    from consultation_surveys s
    where s.is_active = true
    order by s.version desc
    limit 1
    on conflict (consultation_id, patient_id) do nothing;
  end if;
  return NEW;
end;
$function$;

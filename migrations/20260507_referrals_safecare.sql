-- ==========================================
-- ASHIRA: SISTEMA DE REFERIDOS + SAFECARE
-- ==========================================

-- 1. SISTEMA DE REFERIDOS
------------------------------------------

-- Función para generar código único
create or replace function generate_referral_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := 'ASH-';
  i int;
begin
  for i in 1..5 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$ language plpgsql;

-- Tabla de referidos
create table if not exists patient_referrals (
  id                  uuid primary key default gen_random_uuid(),
  referrer_id         uuid not null references auth.users(id) on delete cascade,
  referred_id         uuid references auth.users(id) on delete set null,
  referral_code       text not null unique,
  referral_link       text not null,
  status              text not null default 'pending' check (status in (
    'pending',
    'registered',
    'profile_completed',
    'converted'
  )),
  stage1_awarded      boolean default false,
  stage2_awarded      boolean default false,
  welcome_awarded     boolean default false,
  referred_email      text,
  created_at          timestamptz default now(),
  registered_at       timestamptz,
  converted_at        timestamptz
);

-- Índices Referidos
create index if not exists idx_referrals_referrer on patient_referrals(referrer_id);
create index if not exists idx_referrals_code on patient_referrals(referral_code);
create index if not exists idx_referrals_referred on patient_referrals(referred_id);

-- 2. INTEGRACIÓN SAFECARE
------------------------------------------

-- Extender tabla de organization si no tiene los campos
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='organization' and column_name='is_allied_partner') then
    alter table organization add column is_allied_partner boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='organization' and column_name='partner_slug') then
    alter table organization add column partner_slug text unique;
  end if;
end $$;

-- Tabla de solicitudes SafeCare
create table if not exists safecare_requests (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references auth.users(id) on delete cascade,
  referral_id         uuid references patient_referrals(id) on delete set null,
  plan_type           text not null check (plan_type in (
    'atencion_puntual',
    'revitalizacion_bienestar'
  )),
  service_details     jsonb,
  patient_address     text not null,
  patient_zone        text not null check (patient_zone in (
    'caracas',
    'altos_mirandinos',
    'guarenas_guatire'
  )),
  preferred_datetime  timestamptz,
  patient_notes       text,
  whatsapp_sent       boolean default false,
  whatsapp_sent_at    timestamptz,
  status              text not null default 'requested' check (status in (
    'requested',
    'contacted',
    'attended',
    'cancelled'
  )),
  beneficiary_id      uuid references public.patient(id) on delete set null,
  attended_at         timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Tabla de documentos SafeCare
create table if not exists safecare_documents (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references safecare_requests(id) on delete cascade,
  patient_id      uuid not null references public.patient(id) on delete cascade,
  document_type   text not null check (document_type in (
    'informe_consulta',
    'resultado_laboratorio',
    'imagen_radiologia',
    'receta',
    'otro'
  )),
  file_url        text not null,
  file_name       text not null,
  file_size       bigint,
  uploaded_by     uuid,
  notes           text,
  created_at      timestamptz default now()
);

-- 3. TRIGGERS Y AUTOMATIZACIÓN
------------------------------------------

-- Trigger: cuando SafeCare sube el primer documento
create or replace function on_safecare_document_uploaded()
returns trigger as $$
begin
  update safecare_requests
  set status = 'attended', attended_at = now(), updated_at = now()
  where id = NEW.request_id and status != 'attended';
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_safecare_document_upload on safecare_documents;
create trigger trigger_safecare_document_upload
after insert on safecare_documents
for each row execute function on_safecare_document_uploaded();

-- RLS (Ejemplos básicos, se pueden ajustar según roles reales)
alter table patient_referrals enable row level security;
alter table safecare_requests enable row level security;
alter table safecare_documents enable row level security;

-- RLS para Referidos
drop policy if exists "Users can see their own referrals" on patient_referrals;
create policy "Users can see their own referrals"
  on patient_referrals for select
  using (auth.uid()::text = (select "authId" from public.users where "patientProfileId" = referrer_id));

drop policy if exists "Users can create their own referrals" on patient_referrals;
create policy "Users can create their own referrals"
  on patient_referrals for insert
  with check (auth.uid()::text = (select "authId" from public.users where "patientProfileId" = referrer_id));

-- RLS para SafeCare
drop policy if exists "Patients can see their own requests" on safecare_requests;
create policy "Patients can see their own requests"
  on safecare_requests for select
  using (auth.uid()::text = (select "authId" from public.users where "patientProfileId" = patient_id));

drop policy if exists "Patients can create their own requests" on safecare_requests;
create policy "Patients can create their own requests"
  on safecare_requests for insert
  with check (auth.uid()::text = (select "authId" from public.users where "patientProfileId" = patient_id));

drop policy if exists "Staff can see all requests" on safecare_requests;
create policy "Staff can see all requests"
  on safecare_requests for all
  using (
    exists (
      select 1 from public.users
      where "authId" = auth.uid()::text
      and (
        "authId" in (
          '8c9c8cbd-fa15-4f6c-8673-ddf80d1efc91',
          'ef34afcf-4653-4706-931c-1ebcc1b76c8d',
          'b8e3cda7-e548-4b5b-aba6-5236595e723e'
        )
        or role::text in ('ADMIN', 'ADMINISTRACION', 'SAFECARE')
      )
    )
  );

-- RLS para Documentos de SafeCare
drop policy if exists "Patients can see their own documents" on safecare_documents;
create policy "Patients can see their own documents"
  on safecare_documents for select
  using (auth.uid()::text = (select "authId" from public.users where "patientProfileId" = patient_id));

drop policy if exists "Staff can manage documents" on safecare_documents;
create policy "Staff can manage documents"
  on safecare_documents for all
  using (
    exists (
      select 1 from public.users
      where "authId" = auth.uid()::text
      and (
        "authId" in (
          '8c9c8cbd-fa15-4f6c-8673-ddf80d1efc91',
          'ef34afcf-4653-4706-931c-1ebcc1b76c8d',
          'b8e3cda7-e548-4b5b-aba6-5236595e723e'
        )
        or role::text in ('ADMIN', 'ADMINISTRACION', 'SAFECARE')
      )
    )
  );

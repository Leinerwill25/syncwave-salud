-- ==============================================================================
-- MODULE: ASHIRA SALUD+ (POINTS & REWARDS SYSTEM)
-- ==============================================================================

-- 1. patient_points_transactions
create table if not exists patient_points_transactions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references auth.users(id) on delete cascade,
  event_type      text not null,
  points          int not null,              -- positivo = earn, negativo = burn
  description     text not null,
  reference_id    uuid,                      -- id del objeto relacionado (cita, informe, etc.)
  reference_table text,                      -- tabla del objeto relacionado
  created_at      timestamptz default now()
);

-- Indices for frequent queries
create index if not exists idx_points_patient on patient_points_transactions(patient_id);
create index if not exists idx_points_created on patient_points_transactions(patient_id, created_at desc);

-- RLS: Patient can only read. Admin/Service role can write.
alter table patient_points_transactions enable row level security;

create policy "Patient can view their own point transactions"
  on patient_points_transactions for select
  using (patient_id = auth.uid());


-- 2. patient_points_summary
create table if not exists patient_points_summary (
  patient_id      uuid primary key references auth.users(id) on delete cascade,
  total_earned    int not null default 0,
  total_spent     int not null default 0,
  current_balance int generated always as (total_earned - total_spent) stored,
  current_level   int not null default 1,
  streak_count    int not null default 0,    -- citas consecutivas asistidas
  updated_at      timestamptz default now()
);

-- RLS: Patient can only read. Admin/Service role can write.
alter table patient_points_summary enable row level security;

create policy "Patient can view their own points summary"
  on patient_points_summary for select
  using (patient_id = auth.uid());

-- Trigger to recalculate summary on insert
create or replace function recalculate_patient_summary()
returns trigger as $$
declare
  v_earned  int;
  v_spent   int;
  v_level   int;
begin
  select
    coalesce(sum(case when points > 0 then points else 0 end), 0),
    coalesce(sum(case when points < 0 then abs(points) else 0 end), 0)
  into v_earned, v_spent
  from patient_points_transactions
  where patient_id = NEW.patient_id;

  -- Calcular nivel basado en puntos totales ganados (no en balance)
  v_level := case
    when v_earned >= 1500 then 4
    when v_earned >= 800  then 3
    when v_earned >= 300  then 2
    else 1
  end;

  insert into patient_points_summary (patient_id, total_earned, total_spent, current_level, updated_at)
  values (NEW.patient_id, v_earned, v_spent, v_level, now())
  on conflict (patient_id) do update set
    total_earned  = excluded.total_earned,
    total_spent   = excluded.total_spent,
    current_level = excluded.current_level,
    updated_at    = now();

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_recalculate_summary on patient_points_transactions;
create trigger trigger_recalculate_summary
after insert on patient_points_transactions
for each row execute function recalculate_patient_summary();


-- 3. points_rewards_catalog
create table if not exists points_rewards_catalog (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text not null,
  cost_points     int not null,
  reward_type     text not null check (reward_type in (
    'priority_waitlist',
    'extended_reminders',
    'pdf_export',
    'family_dashboard',
    'verified_badge'
  )),
  min_level       int not null default 1,
  is_active       boolean default true,
  icon            text,                      -- nombre del ícono lucide-react
  created_at      timestamptz default now()
);

-- RLS: Public read (authenticated)
alter table points_rewards_catalog enable row level security;
create policy "Anyone authenticated can view rewards catalog"
  on points_rewards_catalog for select
  using (auth.role() = 'authenticated');

-- Insert initial catalog
insert into points_rewards_catalog (name, description, cost_points, reward_type, min_level, icon) values
('Prioridad en Lista de Espera', 'Recibe una notificación prioritaria cuando se libere un cupo cancelado con tu médico, antes que otros pacientes.', 200, 'priority_waitlist', 1, 'Clock'),
('Recordatorios Extendidos', 'Recibe recordatorios de tu cita 48 horas y 2 horas antes, además del recordatorio estándar.', 150, 'extended_reminders', 1, 'Bell'),
('Historial en PDF Clínico', 'Exporta tu historial médico completo en formato PDF estructurado, listo para llevar a cualquier especialista.', 100, 'pdf_export', 1, 'FileText'),
('Dashboard Familiar Unificado', 'Visualiza la salud de todos tus familiares registrados en una sola vista consolidada.', 300, 'family_dashboard', 2, 'Users'),
('Badge Paciente Comprometido', 'Muestra un badge verificado en tu perfil visible para tu médico, indicando tu historial de compromiso con tu salud.', 75, 'verified_badge', 1, 'BadgeCheck')
on conflict do nothing;


-- 4. patient_reward_redemptions
create table if not exists patient_reward_redemptions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references auth.users(id) on delete cascade,
  reward_id       uuid not null references points_rewards_catalog(id),
  points_spent    int not null,
  status          text not null default 'active' check (status in ('active', 'used', 'expired')),
  activated_at    timestamptz default now(),
  expires_at      timestamptz,
  created_at      timestamptz default now()
);

-- RLS
alter table patient_reward_redemptions enable row level security;
create policy "Patient can view their own reward redemptions"
  on patient_reward_redemptions for select
  using (patient_id = auth.uid());


-- 5. patient_points_daily_limits
create table if not exists patient_points_daily_limits (
  patient_id      uuid not null references auth.users(id) on delete cascade,
  event_category  text not null,             -- 'documents', 'surveys', 'profile', etc.
  event_date      date not null default current_date,
  count           int not null default 0,
  primary key (patient_id, event_category, event_date)
);

-- RLS
alter table patient_points_daily_limits enable row level security;
create policy "Patient can view their own daily limits"
  on patient_points_daily_limits for select
  using (patient_id = auth.uid());

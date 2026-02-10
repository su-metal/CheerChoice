begin;

insert into public.apps (app_id, name, status)
values ('cheerchoice', 'CheerChoice', 'active')
on conflict (app_id) do update
set name = excluded.name,
    status = excluded.status;

create table if not exists public.cc_meal_records (
  id                 uuid primary key default gen_random_uuid(),
  app_id             text not null default 'cheerchoice' check (app_id = 'cheerchoice'),
  user_id            uuid not null references auth.users(id) on delete cascade,
  timestamp          timestamptz not null default now(),
  photo_uri          text,
  food_name          text not null,
  estimated_calories integer not null,
  confidence         integer not null check (confidence between 0 and 100),
  choice             text not null check (choice in ('ate', 'skipped')),
  created_at         timestamptz not null default now()
);

create table if not exists public.cc_exercise_records (
  id              uuid primary key default gen_random_uuid(),
  app_id          text not null default 'cheerchoice' check (app_id = 'cheerchoice'),
  user_id         uuid not null references auth.users(id) on delete cascade,
  meal_record_id  uuid references public.cc_meal_records(id) on delete set null,
  timestamp       timestamptz not null default now(),
  exercise_type   text not null check (exercise_type in ('squat', 'situp', 'pushup')),
  count           integer not null check (count >= 0),
  target_count    integer not null check (target_count > 0),
  calories_burned numeric(6,1) not null check (calories_burned >= 0),
  created_at      timestamptz not null default now()
);

create table if not exists public.cc_exercise_obligations (
  id               uuid primary key default gen_random_uuid(),
  app_id           text not null default 'cheerchoice' check (app_id = 'cheerchoice'),
  user_id          uuid not null references auth.users(id) on delete cascade,
  meal_record_id   uuid not null references public.cc_meal_records(id) on delete cascade,
  created_at       timestamptz not null default now(),
  due_at           timestamptz not null,
  due_local_date   date not null,
  week_start_local date not null,
  timezone         text not null,
  exercise_type    text not null check (exercise_type in ('squat', 'situp', 'pushup')),
  target_count     integer not null check (target_count > 0),
  completed_count  integer not null default 0 check (completed_count >= 0),
  status           text not null default 'open' check (status in ('open', 'completed', 'unmet')),
  finalized_at     timestamptz
);

create table if not exists public.cc_exercise_session_events (
  id              uuid primary key default gen_random_uuid(),
  app_id          text not null default 'cheerchoice' check (app_id = 'cheerchoice'),
  user_id         uuid not null references auth.users(id) on delete cascade,
  obligation_id   uuid not null references public.cc_exercise_obligations(id) on delete cascade,
  timestamp       timestamptz not null default now(),
  event_type      text not null check (event_type in ('start', 'pause', 'resume', 'end')),
  count_snapshot  integer not null default 0 check (count_snapshot >= 0)
);

create table if not exists public.cc_recovery_ledger (
  id                  uuid primary key default gen_random_uuid(),
  app_id              text not null default 'cheerchoice' check (app_id = 'cheerchoice'),
  user_id             uuid not null references auth.users(id) on delete cascade,
  obligation_id       uuid not null references public.cc_exercise_obligations(id) on delete cascade,
  week_start_local    date not null,
  generated_at        timestamptz not null default now(),
  initial_unmet_count integer not null check (initial_unmet_count >= 0),
  recovered_count     integer not null default 0 check (recovered_count >= 0),
  remaining_count     integer not null check (remaining_count >= 0),
  status              text not null default 'open' check (status in ('open', 'closed', 'reset')),
  reset_at            timestamptz
);

create table if not exists public.cc_user_settings (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  app_id                 text not null default 'cheerchoice' check (app_id = 'cheerchoice'),
  daily_calorie_goal     integer not null default 300 check (daily_calorie_goal between 100 and 1000),
  voice_feedback_enabled boolean not null default true,
  language               text not null default 'auto' check (language in ('auto', 'en', 'ja')),
  updated_at             timestamptz not null default now()
);

create table if not exists public.cc_usage_tracking (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  app_id           text not null default 'cheerchoice' check (app_id = 'cheerchoice'),
  ai_photos_used   integer not null default 0 check (ai_photos_used >= 0),
  ai_photos_today  integer not null default 0 check (ai_photos_today >= 0),
  last_reset_date  date not null default current_date,
  updated_at       timestamptz not null default now()
);

create index if not exists idx_cc_meal_user_ts
  on public.cc_meal_records (app_id, user_id, timestamp desc);

create index if not exists idx_cc_meal_choice_ts
  on public.cc_meal_records (app_id, user_id, choice, timestamp desc);

create index if not exists idx_cc_exercise_user_ts
  on public.cc_exercise_records (app_id, user_id, timestamp desc);

create index if not exists idx_cc_exercise_meal
  on public.cc_exercise_records (meal_record_id)
  where meal_record_id is not null;

create index if not exists idx_cc_oblig_user_status
  on public.cc_exercise_obligations (app_id, user_id, status, due_at)
  where status = 'open';

create index if not exists idx_cc_oblig_user_week
  on public.cc_exercise_obligations (app_id, user_id, week_start_local, status);

create index if not exists idx_cc_session_oblig
  on public.cc_exercise_session_events (obligation_id, timestamp desc);

create index if not exists idx_cc_recovery_week
  on public.cc_recovery_ledger (app_id, user_id, week_start_local, status);

alter table public.cc_meal_records enable row level security;
alter table public.cc_exercise_records enable row level security;
alter table public.cc_exercise_obligations enable row level security;
alter table public.cc_exercise_session_events enable row level security;
alter table public.cc_recovery_ledger enable row level security;
alter table public.cc_user_settings enable row level security;
alter table public.cc_usage_tracking enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cc_meal_records' and policyname = 'cc_meal_records_user_policy'
  ) then
    create policy cc_meal_records_user_policy
      on public.cc_meal_records for all to authenticated
      using (app_id = 'cheerchoice' and user_id = auth.uid())
      with check (app_id = 'cheerchoice' and user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cc_exercise_records' and policyname = 'cc_exercise_records_user_policy'
  ) then
    create policy cc_exercise_records_user_policy
      on public.cc_exercise_records for all to authenticated
      using (app_id = 'cheerchoice' and user_id = auth.uid())
      with check (app_id = 'cheerchoice' and user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cc_exercise_obligations' and policyname = 'cc_exercise_obligations_user_policy'
  ) then
    create policy cc_exercise_obligations_user_policy
      on public.cc_exercise_obligations for all to authenticated
      using (app_id = 'cheerchoice' and user_id = auth.uid())
      with check (app_id = 'cheerchoice' and user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cc_exercise_session_events' and policyname = 'cc_session_events_user_policy'
  ) then
    create policy cc_session_events_user_policy
      on public.cc_exercise_session_events for all to authenticated
      using (app_id = 'cheerchoice' and user_id = auth.uid())
      with check (app_id = 'cheerchoice' and user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cc_recovery_ledger' and policyname = 'cc_recovery_ledger_user_policy'
  ) then
    create policy cc_recovery_ledger_user_policy
      on public.cc_recovery_ledger for all to authenticated
      using (app_id = 'cheerchoice' and user_id = auth.uid())
      with check (app_id = 'cheerchoice' and user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cc_user_settings' and policyname = 'cc_user_settings_user_policy'
  ) then
    create policy cc_user_settings_user_policy
      on public.cc_user_settings for all to authenticated
      using (app_id = 'cheerchoice' and user_id = auth.uid())
      with check (app_id = 'cheerchoice' and user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cc_usage_tracking' and policyname = 'cc_usage_tracking_user_policy'
  ) then
    create policy cc_usage_tracking_user_policy
      on public.cc_usage_tracking for all to authenticated
      using (app_id = 'cheerchoice' and user_id = auth.uid())
      with check (app_id = 'cheerchoice' and user_id = auth.uid());
  end if;
end
$$;

commit;


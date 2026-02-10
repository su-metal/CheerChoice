begin;

alter table public.apps enable row level security;
alter table public.profiles enable row level security;
alter table public.stripe_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.user_presets_backup_20260114 enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'apps'
      and policyname = 'apps_select_authenticated'
  ) then
    create policy apps_select_authenticated
      on public.apps
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_crud_own'
  ) then
    create policy profiles_crud_own
      on public.profiles
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_events'
      and policyname = 'stripe_events_deny_all_clients'
  ) then
    create policy stripe_events_deny_all_clients
      on public.stripe_events
      for all
      to authenticated, anon
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'usage_events'
      and policyname = 'usage_events_crud_own'
  ) then
    create policy usage_events_crud_own
      on public.usage_events
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_presets_backup_20260114'
      and policyname = 'user_presets_backup_deny_all_clients'
  ) then
    create policy user_presets_backup_deny_all_clients
      on public.user_presets_backup_20260114
      for all
      to authenticated, anon
      using (false)
      with check (false);
  end if;
end
$$;

commit;

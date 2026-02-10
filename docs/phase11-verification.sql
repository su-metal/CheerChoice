-- Phase 11 verification SQL
-- Run in Supabase SQL Editor after first app launch migration.

-- 1) Basic counts per CheerChoice tables
select 'cc_meal_records' as table_name, count(*) as row_count
from public.cc_meal_records
where app_id = 'cheerchoice'
union all
select 'cc_exercise_records', count(*)
from public.cc_exercise_records
where app_id = 'cheerchoice'
union all
select 'cc_exercise_obligations', count(*)
from public.cc_exercise_obligations
where app_id = 'cheerchoice'
union all
select 'cc_exercise_session_events', count(*)
from public.cc_exercise_session_events
where app_id = 'cheerchoice'
union all
select 'cc_recovery_ledger', count(*)
from public.cc_recovery_ledger
where app_id = 'cheerchoice'
union all
select 'cc_user_settings', count(*)
from public.cc_user_settings
where app_id = 'cheerchoice'
union all
select 'cc_usage_tracking', count(*)
from public.cc_usage_tracking
where app_id = 'cheerchoice';

-- 2) Per-user distribution (quick check)
select user_id, count(*) as meal_count
from public.cc_meal_records
where app_id = 'cheerchoice'
group by user_id
order by meal_count desc;

-- 3) FK integrity: exercise -> meal
select count(*) as orphan_exercise_meal_refs
from public.cc_exercise_records e
left join public.cc_meal_records m on m.id = e.meal_record_id
where e.app_id = 'cheerchoice'
  and e.meal_record_id is not null
  and m.id is null;

-- 4) FK integrity: obligation -> meal
select count(*) as orphan_obligation_meal_refs
from public.cc_exercise_obligations o
left join public.cc_meal_records m on m.id = o.meal_record_id
where o.app_id = 'cheerchoice'
  and m.id is null;

-- 5) FK integrity: session -> obligation
select count(*) as orphan_session_obligation_refs
from public.cc_exercise_session_events s
left join public.cc_exercise_obligations o on o.id = s.obligation_id
where s.app_id = 'cheerchoice'
  and o.id is null;

-- 6) FK integrity: recovery -> obligation
select count(*) as orphan_recovery_obligation_refs
from public.cc_recovery_ledger r
left join public.cc_exercise_obligations o on o.id = r.obligation_id
where r.app_id = 'cheerchoice'
  and o.id is null;

-- 7) Duplicate guard checks
select user_id, id, count(*) as duplicate_count
from public.cc_meal_records
where app_id = 'cheerchoice'
group by user_id, id
having count(*) > 1
order by duplicate_count desc;

select user_id, id, count(*) as duplicate_count
from public.cc_exercise_records
where app_id = 'cheerchoice'
group by user_id, id
having count(*) > 1
order by duplicate_count desc;

-- 8) Last migrated activity per table (sanity)
select 'cc_meal_records' as table_name, max(created_at) as latest_at
from public.cc_meal_records
where app_id = 'cheerchoice'
union all
select 'cc_exercise_records', max(created_at)
from public.cc_exercise_records
where app_id = 'cheerchoice'
union all
select 'cc_exercise_obligations', max(created_at)
from public.cc_exercise_obligations
where app_id = 'cheerchoice'
union all
select 'cc_exercise_session_events', max(timestamp)
from public.cc_exercise_session_events
where app_id = 'cheerchoice'
union all
select 'cc_recovery_ledger', max(generated_at)
from public.cc_recovery_ledger
where app_id = 'cheerchoice'
union all
select 'cc_user_settings', max(updated_at)
from public.cc_user_settings
where app_id = 'cheerchoice'
union all
select 'cc_usage_tracking', max(updated_at)
from public.cc_usage_tracking
where app_id = 'cheerchoice';


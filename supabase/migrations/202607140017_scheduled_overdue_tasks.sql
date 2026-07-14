create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.sync_all_overdue_door_tasks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer := 0;
begin
  with candidates as (
    select
      d.id as door_id,
      f.id as floor_id,
      b.id as building_id,
      o.id as object_id,
      o.company_id,
      o.responsible_director_id,
      coalesce(d.assigned_user_id, b.responsible_itr_id, oa.user_id) as assigned_to,
      d.mounted_at,
      kind.title,
      kind.task_type,
      kind.days_limit,
      kind.key_prefix
    from public.doors d
    join public.floors f on f.id = d.floor_id
    join public.buildings b on b.id = f.building_id
    join public.objects o on o.id = b.object_id
    left join lateral (
      select p.id as user_id
      from public.object_assignments a
      join public.profiles p on p.id = a.user_id and p.role = 'itr' and p.status = 'active'
      where a.object_id = o.id
      order by a.created_at
      limit 1
    ) oa on true
    cross join lateral (
      values
        ('Передать дверь ТН', 'Проверить замечание ТН', 2, 'tn-overdue'),
        ('Добавить акт АОХ', 'Добавить акт АОХ', 3, 'act-overdue')
    ) kind(title, task_type, days_limit, key_prefix)
    where d.status = 'смонтирована'
      and d.mounted_at is not null
      and (
        (kind.key_prefix = 'tn-overdue' and d.tn_accepted_at is null and d.mounted_at < now() - interval '2 days')
        or
        (kind.key_prefix = 'act-overdue' and d.custody_act_uploaded_at is null and d.mounted_at < now() - interval '3 days')
      )
  ), inserted as (
    insert into public.tasks (
      company_id, title, description, type, priority, status,
      assigned_to, object_id, building_id, floor_id, door_id, due_date, automatic_key
    )
    select
      company_id,
      title,
      'Автоматически создано серверным контролем срока после монтажа',
      task_type,
      'высокий',
      'новая',
      assigned_to,
      object_id,
      building_id,
      floor_id,
      door_id,
      mounted_at::date + days_limit,
      key_prefix || ':' || door_id::text || ':' || mounted_at::date::text
    from candidates
    on conflict (automatic_key) do nothing
    returning id, company_id, title, priority, assigned_to, object_id, building_id, floor_id, door_id
  ), itr_notifications as (
    insert into public.notifications (
      company_id, user_id, type, title, message, priority, task_id,
      object_id, building_id, floor_id, door_id
    )
    select
      company_id, assigned_to, 'automatic_task', title,
      'Контрольный срок после монтажа нарушен', priority, id,
      object_id, building_id, floor_id, door_id
    from inserted
    where assigned_to is not null
    returning id
  ), director_notifications as (
    insert into public.notifications (
      company_id, user_id, type, title, message, priority, task_id,
      object_id, building_id, floor_id, door_id
    )
    select
      i.company_id, o.responsible_director_id, 'automatic_task_overdue', i.title,
      'На объекте нарушен контрольный срок после монтажа', i.priority, i.id,
      i.object_id, i.building_id, i.floor_id, i.door_id
    from inserted i
    join public.objects o on o.id = i.object_id
    where o.responsible_director_id is not null
      and o.responsible_director_id is distinct from i.assigned_to
    returning id
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

revoke all on function public.sync_all_overdue_door_tasks() from public, anon, authenticated;

select cron.schedule(
  'gross-sync-overdue-door-tasks',
  '*/30 * * * *',
  'select public.sync_all_overdue_door_tasks()'
);

comment on function public.sync_all_overdue_door_tasks() is
  'Server-only cross-company overdue door scan. Scheduled by pg_cron every 30 minutes.';

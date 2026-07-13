create table public.document_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  object_id uuid references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  floor_id uuid references public.floors(id) on delete cascade,
  door_id uuid references public.doors(id) on delete cascade,
  title text not null,
  category text not null default 'document',
  url text not null,
  comment text,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (object_id is not null or building_id is not null or floor_id is not null or door_id is not null)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'Другое',
  priority text not null default 'средний' check (priority in ('низкий', 'средний', 'высокий', 'критичный')),
  status text not null default 'новая' check (status in ('новая', 'в работе', 'выполнена', 'отменена')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  assigned_to uuid references public.profiles(id) on delete set null,
  object_id uuid references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  floor_id uuid references public.floors(id) on delete cascade,
  door_id uuid references public.doors(id) on delete cascade,
  due_date date,
  automatic_key text unique,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  user_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  document_id uuid references public.document_items(id) on delete set null,
  title text not null,
  url text not null,
  category text not null default 'document',
  comment text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role_target public.app_role,
  type text not null,
  title text not null,
  message text,
  priority text not null default 'низкий' check (priority in ('низкий', 'средний', 'высокий', 'критичный')),
  status text not null default 'unread' check (status in ('unread', 'read')),
  object_id uuid references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  floor_id uuid references public.floors(id) on delete cascade,
  door_id uuid references public.doors(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  action_url text,
  created_at timestamptz not null default now()
);

create table public.custody_acts (
  id uuid primary key default gen_random_uuid(),
  door_id uuid not null references public.doors(id) on delete cascade,
  status text not null default 'не передана',
  document_id uuid references public.document_items(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (door_id)
);

create table public.tn_issues (
  id uuid primary key default gen_random_uuid(),
  door_id uuid not null references public.doors(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'открыто',
  priority text not null default 'средний' check (priority in ('низкий', 'средний', 'высокий', 'критичный')),
  responsible_id uuid references public.profiles(id) on delete set null,
  due_date date,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index document_items_scope_idx on public.document_items(company_id, object_id, building_id, floor_id, door_id);
create index tasks_company_status_idx on public.tasks(company_id, status, due_date);
create index tasks_assigned_idx on public.tasks(assigned_to, status, due_date);
create index tasks_door_idx on public.tasks(door_id);
create index task_comments_task_idx on public.task_comments(task_id, created_at);
create index notifications_user_idx on public.notifications(user_id, status, created_at desc);
create index notifications_role_idx on public.notifications(company_id, role_target, status);
create index tn_issues_door_idx on public.tn_issues(door_id, status);
create index activity_logs_entity_idx on public.activity_logs(company_id, entity_type, entity_id, created_at desc);

create trigger document_items_set_updated_at before update on public.document_items
for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
create trigger custody_acts_set_updated_at before update on public.custody_acts
for each row execute function public.set_updated_at();
create trigger tn_issues_set_updated_at before update on public.tn_issues
for each row execute function public.set_updated_at();

create or replace function public.set_door_milestone_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'смонтирована' and old.status is distinct from new.status and new.mounted_at is null then
    new.mounted_at = now();
  end if;
  if new.tn_status in ('принято ТН', 'принято технадзором') and old.tn_status is distinct from new.tn_status and new.tn_accepted_at is null then
    new.tn_accepted_at = now();
  end if;
  if new.custody_act_status in ('акт загружен', 'передано по акту', 'закрыто') and new.custody_act_uploaded_at is null then
    new.custody_act_uploaded_at = now();
  end if;
  if new.custody_act_status in ('передано по акту', 'закрыто') and new.custody_act_closed_at is null then
    new.custody_act_closed_at = now();
  end if;
  return new;
end;
$$;

create trigger doors_set_milestone_dates
before update on public.doors
for each row execute function public.set_door_milestone_dates();

create or replace function public.task_company_from_object(target_object_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.objects where id = target_object_id;
$$;

create or replace function public.can_access_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = target_task_id
      and t.company_id = public.current_company_id()
      and (
        public.current_app_role() in ('creator', 'company_head')
        or t.created_by = auth.uid()
        or t.assigned_to = auth.uid()
        or (t.object_id is not null and public.can_access_object(t.object_id))
      )
  );
$$;

create or replace function public.sync_overdue_door_tasks()
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
      join public.profiles p on p.id = a.user_id and p.role = 'itr'
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
      and o.company_id = public.current_company_id()
      and public.can_access_object(o.id)
      and (
        (kind.key_prefix = 'tn-overdue' and d.tn_accepted_at is null and d.mounted_at < now() - interval '2 days')
        or
        (kind.key_prefix = 'act-overdue' and d.custody_act_uploaded_at is null and d.mounted_at < now() - interval '3 days')
      )
  ), inserted as (
    insert into public.tasks (
      company_id, title, description, type, priority, status, created_by,
      assigned_to, object_id, building_id, floor_id, door_id, due_date, automatic_key
    )
    select
      company_id, title, 'Автоматически создано по контрольному сроку после монтажа',
      task_type, 'высокий', 'новая', auth.uid(), assigned_to,
      object_id, building_id, floor_id, door_id,
      (mounted_at::date + days_limit),
      key_prefix || ':' || door_id::text || ':' || mounted_at::date::text
    from candidates
    on conflict (automatic_key) do nothing
    returning id, company_id, title, assigned_to, object_id, building_id, floor_id, door_id
  ), task_notifications as (
    insert into public.notifications (
      company_id, user_id, type, title, message, priority, task_id,
      object_id, building_id, floor_id, door_id
    )
    select company_id, assigned_to, 'automatic_task', title,
      'Контрольный срок после монтажа нарушен', 'высокий', id,
      object_id, building_id, floor_id, door_id
    from inserted
    where assigned_to is not null
    returning id
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

create or replace function public.complete_task_when_door_condition_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tasks
  set status = 'выполнена', completed_at = now()
  where door_id = new.id
    and status in ('новая', 'в работе')
    and (
      (automatic_key like 'tn-overdue:%' and new.tn_accepted_at is not null)
      or (automatic_key like 'act-overdue:%' and new.custody_act_uploaded_at is not null)
    );
  return new;
end;
$$;

create trigger doors_complete_automatic_tasks
after update on public.doors
for each row execute function public.complete_task_when_door_condition_closed();

create or replace function public.notify_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.assigned_to is not null and new.automatic_key is null then
    insert into public.notifications (
      company_id, user_id, type, title, message, priority, task_id,
      object_id, building_id, floor_id, door_id
    ) values (
      new.company_id, new.assigned_to, 'manual_task', 'Новая задача',
      new.title, new.priority, new.id,
      new.object_id, new.building_id, new.floor_id, new.door_id
    );
  elsif tg_op = 'UPDATE'
    and new.status = 'выполнена'
    and old.status is distinct from new.status
    and new.created_by is not null
    and new.created_by is distinct from new.assigned_to
  then
    insert into public.notifications (
      company_id, user_id, type, title, message, priority, task_id,
      object_id, building_id, floor_id, door_id
    ) values (
      new.company_id, new.created_by, 'task_completed', 'Задача выполнена',
      new.title, new.priority, new.id,
      new.object_id, new.building_id, new.floor_id, new.door_id
    );
  end if;
  return new;
end;
$$;

create trigger tasks_notify_on_insert
after insert on public.tasks
for each row execute function public.notify_task_change();
create trigger tasks_notify_on_update
after update on public.tasks
for each row execute function public.notify_task_change();

grant execute on function public.sync_overdue_door_tasks() to authenticated;
grant execute on function public.can_access_task(uuid) to authenticated;

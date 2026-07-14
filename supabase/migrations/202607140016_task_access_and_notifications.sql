create or replace function public.can_access_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and t.company_id = public.current_company_id()
      and (
        public.current_app_role() in ('creator', 'company_head')
        or t.created_by = auth.uid()
        or t.assigned_to = auth.uid()
        or (
          public.current_app_role() = 'construction_director'
          and t.object_id is not null
          and public.can_access_object(t.object_id)
        )
      )
  );
$$;

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update
using (
  company_id = public.current_company_id()
  and (public.has_admin_access() or assigned_to = auth.uid())
)
with check (
  company_id = public.current_company_id()
  and (object_id is null or public.can_access_object(object_id))
  and (public.has_admin_access() or assigned_to = auth.uid())
);

create or replace function public.guard_task_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin') or public.has_admin_access() then
    return new;
  end if;

  if old.assigned_to is distinct from auth.uid() then
    raise exception 'Only the assigned user may update this task';
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.type is distinct from old.type
    or new.priority is distinct from old.priority
    or new.created_by is distinct from old.created_by
    or new.assigned_to is distinct from old.assigned_to
    or new.object_id is distinct from old.object_id
    or new.building_id is distinct from old.building_id
    or new.floor_id is distinct from old.floor_id
    or new.door_id is distinct from old.door_id
    or new.due_date is distinct from old.due_date
    or new.automatic_key is distinct from old.automatic_key
  then
    raise exception 'Assigned users may update only task status';
  end if;

  if new.status not in ('новая', 'в работе', 'выполнена') then
    raise exception 'Assigned users cannot cancel tasks';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_guard_update on public.tasks;
create trigger tasks_guard_update
before update on public.tasks
for each row execute function public.guard_task_update();

create or replace function public.notify_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.tasks%rowtype;
  actor_name text;
begin
  select * into task_row from public.tasks where id = new.task_id;
  select name into actor_name from public.profiles where id = auth.uid();

  if task_row.created_by is not null and task_row.created_by is distinct from auth.uid() then
    insert into public.notifications (
      company_id, user_id, type, title, message, priority, task_id,
      object_id, building_id, floor_id, door_id
    ) values (
      task_row.company_id,
      task_row.created_by,
      case when tg_table_name = 'task_comments' then 'task_comment' else 'task_link' end,
      case when tg_table_name = 'task_comments' then 'Комментарий к задаче' else 'Документ к задаче' end,
      coalesce(actor_name, 'Сотрудник') || ': ' || case when tg_table_name = 'task_comments' then to_jsonb(new)->>'text' else to_jsonb(new)->>'title' end,
      task_row.priority,
      task_row.id,
      task_row.object_id,
      task_row.building_id,
      task_row.floor_id,
      task_row.door_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists task_comments_notify on public.task_comments;
create trigger task_comments_notify
after insert on public.task_comments
for each row execute function public.notify_task_activity();

drop trigger if exists task_links_notify on public.task_links;
create trigger task_links_notify
after insert on public.task_links
for each row execute function public.notify_task_activity();

grant execute on function public.can_access_task(uuid) to authenticated;

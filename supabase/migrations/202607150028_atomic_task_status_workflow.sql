create or replace function public.update_task_status_workflow(
  p_task_id uuid,
  p_status text
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.tasks%rowtype;
  actor_id uuid := auth.uid();
  actor_role public.app_role := public.current_app_role();
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;
  if p_status not in ('новая', 'в работе', 'выполнена', 'отменена') then
    raise exception 'Unsupported task status';
  end if;

  select * into task_row
  from public.tasks
  where id = p_task_id
  for update;

  if not found or task_row.company_id is distinct from public.current_company_id() then
    raise exception 'Task not found';
  end if;
  if actor_role not in ('creator', 'company_head', 'construction_director')
    and task_row.assigned_to is distinct from actor_id
  then
    raise exception 'Task status update is not allowed';
  end if;
  if actor_role = 'construction_director'
    and task_row.object_id is not null
    and not public.can_access_object(task_row.object_id)
  then
    raise exception 'Task status update is not allowed';
  end if;
  if actor_role = 'itr' and p_status = 'отменена' then
    raise exception 'Assigned users cannot cancel tasks';
  end if;
  if task_row.status = p_status then
    return task_row;
  end if;

  update public.tasks
  set status = p_status,
      completed_at = case when p_status = 'выполнена' then coalesce(completed_at, now()) else null end
  where id = p_task_id
  returning * into task_row;

  insert into public.activity_logs (
    company_id, user_id, entity_type, entity_id, action, payload
  ) values (
    task_row.company_id, actor_id, 'task', task_row.id, 'status_changed',
    jsonb_build_object('status', p_status)
  );

  if p_status = 'выполнена'
    and task_row.created_by is not null
    and task_row.created_by is distinct from actor_id
  then
    insert into public.notifications (
      company_id, user_id, type, title, message, priority, task_id,
      object_id, building_id, floor_id, door_id, action_url
    ) values (
      task_row.company_id, task_row.created_by, 'task_completed', 'Задача выполнена',
      task_row.title, task_row.priority, task_row.id, task_row.object_id,
      task_row.building_id, task_row.floor_id, task_row.door_id, '/tasks'
    );
  end if;

  return task_row;
end;
$$;

revoke all on function public.update_task_status_workflow(uuid, text) from public;
grant execute on function public.update_task_status_workflow(uuid, text) to authenticated;

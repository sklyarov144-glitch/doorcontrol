-- Keep the door status and its active TN issue in one database transaction.
with ranked_issues as (
  select
    id,
    row_number() over (partition by door_id order by created_at desc, id desc) as issue_rank
  from public.tn_issues
  where status <> 'устранено'
)
update public.tn_issues issue
set
  status = 'устранено',
  resolved_at = coalesce(issue.resolved_at, now())
from ranked_issues ranked
where issue.id = ranked.id
  and ranked.issue_rank > 1;

create unique index tn_issues_one_active_per_door_idx
on public.tn_issues (door_id)
where status <> 'устранено';

create or replace function public.update_door_workflow(
  p_door_id uuid,
  p_door jsonb,
  p_issue jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_door public.doors%rowtype;
  updated_issue public.tn_issues%rowtype;
  active_issue_id uuid;
begin
  if p_door is null then
    raise exception using errcode = '22023', message = 'Door payload is required';
  end if;

  update public.doors
  set
    label = p_door ->> 'label',
    mark = p_door ->> 'mark',
    type = p_door ->> 'type',
    opening_number = nullif(p_door ->> 'opening_number', '')::integer,
    status = p_door ->> 'status',
    opening_status = p_door ->> 'opening_status',
    issue_status = p_door ->> 'issue_status',
    custody_act_status = p_door ->> 'custody_act_status',
    tn_status = p_door ->> 'tn_status',
    assigned_user_id = nullif(p_door ->> 'assigned_user_id', '')::uuid,
    x = (p_door ->> 'x')::numeric,
    y = (p_door ->> 'y')::numeric,
    width_fact = nullif(p_door ->> 'width_fact', '')::numeric,
    height_fact = nullif(p_door ->> 'height_fact', '')::numeric,
    model = nullif(p_door ->> 'model', ''),
    mounted_at = nullif(p_door ->> 'mounted_at', '')::timestamptz,
    tn_accepted_at = nullif(p_door ->> 'tn_accepted_at', '')::timestamptz,
    custody_act_uploaded_at = nullif(p_door ->> 'custody_act_uploaded_at', '')::timestamptz,
    custody_act_closed_at = nullif(p_door ->> 'custody_act_closed_at', '')::timestamptz,
    meta = coalesce(p_door -> 'meta', '{}'::jsonb)
  where id = p_door_id
  returning * into updated_door;

  if updated_door.id is null then
    raise exception using errcode = '42501', message = 'Door is unavailable or access is denied';
  end if;

  if p_issue is not null then
    select id into active_issue_id
    from public.tn_issues
    where door_id = p_door_id and status <> 'устранено'
    order by created_at desc
    limit 1;

    if p_issue ->> 'status' = 'устранено' then
      if active_issue_id is not null then
        update public.tn_issues
        set
          status = 'устранено',
          resolved_at = coalesce(nullif(p_issue ->> 'resolved_at', '')::timestamptz, now())
        where id = active_issue_id
        returning * into updated_issue;
      end if;
    elsif active_issue_id is not null then
      update public.tn_issues
      set
        title = p_issue ->> 'title',
        description = nullif(p_issue ->> 'description', ''),
        status = coalesce(nullif(p_issue ->> 'status', ''), 'открыто'),
        priority = coalesce(nullif(p_issue ->> 'priority', ''), 'средний'),
        responsible_id = nullif(p_issue ->> 'responsible_id', '')::uuid,
        due_date = nullif(p_issue ->> 'due_date', '')::date,
        resolved_at = null
      where id = active_issue_id
      returning * into updated_issue;
    else
      insert into public.tn_issues (
        door_id, title, description, status, priority, responsible_id, due_date, resolved_at
      ) values (
        p_door_id,
        p_issue ->> 'title',
        nullif(p_issue ->> 'description', ''),
        coalesce(nullif(p_issue ->> 'status', ''), 'открыто'),
        coalesce(nullif(p_issue ->> 'priority', ''), 'средний'),
        nullif(p_issue ->> 'responsible_id', '')::uuid,
        nullif(p_issue ->> 'due_date', '')::date,
        nullif(p_issue ->> 'resolved_at', '')::timestamptz
      )
      returning * into updated_issue;
    end if;
  end if;

  return jsonb_build_object(
    'door', to_jsonb(updated_door),
    'issue', case when updated_issue.id is null then null else to_jsonb(updated_issue) end
  );
end;
$$;

revoke all on function public.update_door_workflow(uuid, jsonb, jsonb) from public;
grant execute on function public.update_door_workflow(uuid, jsonb, jsonb) to authenticated;

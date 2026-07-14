alter table public.activity_logs
add column object_id uuid references public.objects(id) on delete set null;

create index activity_logs_object_idx
on public.activity_logs(object_id, created_at desc);

create or replace function public.audit_object_id(table_name text, row_data jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result uuid;
begin
  if public.try_uuid(row_data ->> 'object_id') is not null then
    return public.try_uuid(row_data ->> 'object_id');
  end if;

  if table_name = 'objects' then
    return public.try_uuid(row_data ->> 'id');
  end if;

  if public.try_uuid(row_data ->> 'building_id') is not null then
    select b.object_id into result from public.buildings b
    where b.id = public.try_uuid(row_data ->> 'building_id');
    return result;
  end if;

  if public.try_uuid(row_data ->> 'floor_id') is not null then
    select b.object_id into result
    from public.floors f join public.buildings b on b.id = f.building_id
    where f.id = public.try_uuid(row_data ->> 'floor_id');
    return result;
  end if;

  if public.try_uuid(row_data ->> 'door_id') is not null then
    select b.object_id into result
    from public.doors d
    join public.floors f on f.id = d.floor_id
    join public.buildings b on b.id = f.building_id
    where d.id = public.try_uuid(row_data ->> 'door_id');
    return result;
  end if;

  if table_name = 'buildings' then
    select b.object_id into result from public.buildings b
    where b.id = public.try_uuid(row_data ->> 'id');
  elsif table_name in ('task_comments', 'task_links') then
    select t.object_id into result from public.tasks t
    where t.id = public.try_uuid(row_data ->> 'task_id');
  end if;

  return result;
end;
$$;

create or replace function public.audit_entity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_data jsonb;
  after_data jsonb;
  source_data jsonb;
  target_company_id uuid;
  target_object_id uuid;
  target_entity_id uuid;
begin
  before_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  source_data := coalesce(after_data, before_data);
  target_company_id := public.audit_company_id(tg_table_name, source_data);
  target_object_id := public.audit_object_id(tg_table_name, source_data);
  target_entity_id := public.try_uuid(source_data ->> 'id');

  if target_company_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  before_data := before_data - array['email', 'phone', 'avatar_url', 'url'];
  after_data := after_data - array['email', 'phone', 'avatar_url', 'url'];

  insert into public.activity_logs (
    company_id, object_id, user_id, entity_type, entity_id, action, payload
  ) values (
    target_company_id,
    target_object_id,
    auth.uid(),
    tg_table_name,
    target_entity_id,
    lower(tg_op),
    jsonb_strip_nulls(jsonb_build_object('before', before_data, 'after', after_data))
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop policy if exists activity_logs_select on public.activity_logs;
drop policy if exists activity_logs_insert on public.activity_logs;

create policy activity_logs_select on public.activity_logs for select
using (
  company_id = public.current_company_id()
  and (
    public.current_app_role() in ('creator', 'company_head')
    or (
      public.current_app_role() = 'construction_director'
      and object_id is not null
      and public.can_access_object(object_id)
    )
  )
);

revoke insert, update, delete on public.activity_logs from anon, authenticated;

do $$
declare
  audited_table text;
  trigger_name text;
begin
  foreach audited_table in array array[
    'teams',
    'employees',
    'work_standards',
    'object_work_plans',
    'daily_work_reports',
    'manpower_requests',
    'contracts',
    'budget_items',
    'financial_transactions'
  ] loop
    trigger_name := 'audit_' || audited_table;
    execute format('drop trigger if exists %I on public.%I', trigger_name, audited_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_entity_change()',
      trigger_name,
      audited_table
    );
  end loop;
end;
$$;

revoke all on function public.audit_object_id(text, jsonb) from public, anon, authenticated;

create or replace function public.audit_company_id(table_name text, row_data jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result uuid;
begin
  if row_data ? 'company_id' then
    return public.try_uuid(row_data ->> 'company_id');
  end if;

  if table_name = 'buildings' then
    select o.company_id into result from public.objects o where o.id = public.try_uuid(row_data ->> 'object_id');
  elsif table_name = 'floors' then
    select o.company_id into result
    from public.buildings b join public.objects o on o.id = b.object_id
    where b.id = public.try_uuid(row_data ->> 'building_id');
  elsif table_name = 'doors' then
    select o.company_id into result
    from public.floors f join public.buildings b on b.id = f.building_id join public.objects o on o.id = b.object_id
    where f.id = public.try_uuid(row_data ->> 'floor_id');
  elsif table_name in ('custody_acts', 'tn_issues') then
    select o.company_id into result
    from public.doors d join public.floors f on f.id = d.floor_id
    join public.buildings b on b.id = f.building_id join public.objects o on o.id = b.object_id
    where d.id = public.try_uuid(row_data ->> 'door_id');
  elsif table_name in ('task_comments', 'task_links') then
    select t.company_id into result from public.tasks t where t.id = public.try_uuid(row_data ->> 'task_id');
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
  target_entity_id uuid;
begin
  before_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  source_data := coalesce(after_data, before_data);
  target_company_id := public.audit_company_id(tg_table_name, source_data);
  target_entity_id := public.try_uuid(source_data ->> 'id');

  if target_company_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  before_data := before_data - array['email', 'phone', 'avatar_url', 'url'];
  after_data := after_data - array['email', 'phone', 'avatar_url', 'url'];

  insert into public.activity_logs (
    company_id, user_id, entity_type, entity_id, action, payload
  ) values (
    target_company_id,
    auth.uid(),
    tg_table_name,
    target_entity_id,
    lower(tg_op),
    jsonb_strip_nulls(jsonb_build_object('before', before_data, 'after', after_data))
  );
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger audit_profiles after insert or update or delete on public.profiles
for each row execute function public.audit_entity_change();
create trigger audit_objects after insert or update or delete on public.objects
for each row execute function public.audit_entity_change();
create trigger audit_buildings after insert or update or delete on public.buildings
for each row execute function public.audit_entity_change();
create trigger audit_floors after insert or update or delete on public.floors
for each row execute function public.audit_entity_change();
create trigger audit_doors after insert or update or delete on public.doors
for each row execute function public.audit_entity_change();
create trigger audit_tasks after insert or update or delete on public.tasks
for each row execute function public.audit_entity_change();
create trigger audit_task_comments after insert or update or delete on public.task_comments
for each row execute function public.audit_entity_change();
create trigger audit_task_links after insert or update or delete on public.task_links
for each row execute function public.audit_entity_change();
create trigger audit_documents after insert or update or delete on public.document_items
for each row execute function public.audit_entity_change();
create trigger audit_custody_acts after insert or update or delete on public.custody_acts
for each row execute function public.audit_entity_change();
create trigger audit_tn_issues after insert or update or delete on public.tn_issues
for each row execute function public.audit_entity_change();

create or replace function public.prevent_activity_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Activity logs are immutable';
end;
$$;

create trigger activity_logs_immutable
before update or delete on public.activity_logs
for each row execute function public.prevent_activity_log_mutation();

revoke all on function public.audit_company_id(text, jsonb) from public, anon, authenticated;
revoke all on function public.audit_entity_change() from public, anon, authenticated;

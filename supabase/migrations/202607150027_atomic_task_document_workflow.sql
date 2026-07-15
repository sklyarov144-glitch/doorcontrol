create or replace function public.add_task_document_workflow(
  p_task_id uuid,
  p_document jsonb,
  p_link jsonb,
  p_door jsonb default null,
  p_act jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  task_row public.tasks%rowtype;
  document_row public.document_items%rowtype;
  link_row public.task_links%rowtype;
  act_result jsonb;
begin
  select * into task_row from public.tasks where id = p_task_id;
  if task_row.id is null then
    raise exception using errcode = '42501', message = 'Task is unavailable or access is denied';
  end if;
  if task_row.object_id is null and task_row.building_id is null
    and task_row.floor_id is null and task_row.door_id is null then
    raise exception using errcode = '22023', message = 'Task has no document scope';
  end if;
  if p_document is null or nullif(p_document ->> 'url', '') is null then
    raise exception using errcode = '22023', message = 'Document URL is required';
  end if;

  insert into public.document_items (
    company_id, object_id, building_id, floor_id, door_id,
    title, category, url, comment, created_by
  ) values (
    task_row.company_id,
    task_row.object_id,
    task_row.building_id,
    task_row.floor_id,
    task_row.door_id,
    coalesce(nullif(p_document ->> 'title', ''), 'Документ к задаче'),
    coalesce(nullif(p_document ->> 'category', ''), 'document'),
    p_document ->> 'url',
    nullif(p_document ->> 'comment', ''),
    auth.uid()
  ) returning * into document_row;

  insert into public.task_links (
    task_id, document_id, title, url, category, comment, created_by
  ) values (
    task_row.id,
    document_row.id,
    coalesce(nullif(p_link ->> 'title', ''), document_row.title),
    document_row.url,
    coalesce(nullif(p_link ->> 'category', ''), document_row.category),
    coalesce(nullif(p_link ->> 'comment', ''), document_row.comment),
    auth.uid()
  ) returning * into link_row;

  if p_act is not null then
    if task_row.door_id is null or p_door is null then
      raise exception using errcode = '22023', message = 'Door workflow data is required for a custody act';
    end if;
    act_result := public.save_custody_act_workflow(
      task_row.door_id,
      p_door,
      p_act || jsonb_build_object('document_id', document_row.id),
      null
    );
  end if;

  return jsonb_build_object(
    'document', to_jsonb(document_row),
    'link', to_jsonb(link_row),
    'custody', act_result
  );
end;
$$;

revoke all on function public.add_task_document_workflow(uuid, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.add_task_document_workflow(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;

comment on function public.add_task_document_workflow(uuid, jsonb, jsonb, jsonb, jsonb) is
  'Atomically links a document to a task and optionally updates its door custody workflow.';

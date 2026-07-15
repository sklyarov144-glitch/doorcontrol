create or replace function public.save_custody_act_workflow(
  p_door_id uuid,
  p_door jsonb,
  p_act jsonb,
  p_document jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  door_context record;
  current_act public.custody_acts%rowtype;
  updated_act public.custody_acts%rowtype;
  updated_document public.document_items%rowtype;
  target_document_id uuid;
  door_result jsonb;
begin
  if p_act is null or nullif(p_act ->> 'status', '') is null then
    raise exception using errcode = '22023', message = 'Custody act status is required';
  end if;

  select
    d.id as door_id,
    f.id as floor_id,
    b.id as building_id,
    o.id as object_id,
    o.company_id
  into door_context
  from public.doors d
  join public.floors f on f.id = d.floor_id
  join public.buildings b on b.id = f.building_id
  join public.objects o on o.id = b.object_id
  where d.id = p_door_id;

  if door_context.door_id is null then
    raise exception using errcode = '42501', message = 'Door is unavailable or access is denied';
  end if;

  door_result := public.update_door_workflow(p_door_id, p_door, null);

  select * into current_act
  from public.custody_acts
  where door_id = p_door_id;

  target_document_id := coalesce(
    nullif(p_act ->> 'document_id', '')::uuid,
    current_act.document_id
  );

  if target_document_id is not null then
    select * into updated_document
    from public.document_items
    where id = target_document_id
      and company_id = door_context.company_id
      and door_id = p_door_id;

    if updated_document.id is null then
      raise exception using errcode = '22023', message = 'Custody document does not belong to the door';
    end if;
  end if;

  if p_document is not null and nullif(p_document ->> 'url', '') is not null then
    if target_document_id is null then
      insert into public.document_items (
        company_id, object_id, building_id, floor_id, door_id,
        title, category, url, comment, created_by
      ) values (
        door_context.company_id,
        door_context.object_id,
        door_context.building_id,
        door_context.floor_id,
        p_door_id,
        coalesce(nullif(p_document ->> 'title', ''), 'Акт ОХ'),
        'custody_act',
        p_document ->> 'url',
        nullif(p_document ->> 'comment', ''),
        auth.uid()
      )
      returning * into updated_document;
      target_document_id := updated_document.id;
    else
      update public.document_items
      set
        title = coalesce(nullif(p_document ->> 'title', ''), title),
        category = 'custody_act',
        url = p_document ->> 'url',
        comment = coalesce(nullif(p_document ->> 'comment', ''), comment)
      where id = target_document_id
      returning * into updated_document;
    end if;
  end if;

  insert into public.custody_acts (
    door_id, status, document_id, uploaded_by, uploaded_at, closed_at
  ) values (
    p_door_id,
    p_act ->> 'status',
    target_document_id,
    case when target_document_id is not null then auth.uid() else null end,
    nullif(p_act ->> 'uploaded_at', '')::timestamptz,
    nullif(p_act ->> 'closed_at', '')::timestamptz
  )
  on conflict (door_id) do update set
    status = excluded.status,
    document_id = coalesce(excluded.document_id, public.custody_acts.document_id),
    uploaded_by = coalesce(excluded.uploaded_by, public.custody_acts.uploaded_by),
    uploaded_at = coalesce(excluded.uploaded_at, public.custody_acts.uploaded_at),
    closed_at = coalesce(excluded.closed_at, public.custody_acts.closed_at)
  returning * into updated_act;

  return jsonb_build_object(
    'door', door_result -> 'door',
    'act', to_jsonb(updated_act),
    'document', case when updated_document.id is null then null else to_jsonb(updated_document) end
  );
end;
$$;

revoke all on function public.save_custody_act_workflow(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_custody_act_workflow(uuid, jsonb, jsonb, jsonb) to authenticated;

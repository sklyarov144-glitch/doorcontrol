create or replace function public.import_pilot_hierarchy(
  p_company_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  object_data jsonb;
  building_data jsonb;
  floor_data jsonb;
  door_data jsonb;
  v_object_id uuid;
  v_building_id uuid;
  v_floor_id uuid;
  v_assigned_user_id uuid;
  v_responsible_user_id uuid;
  v_existing_company_id uuid;
  object_count integer := 0;
  building_count integer := 0;
  floor_count integer := 0;
  door_count integer := 0;
begin
  if p_payload is null or jsonb_typeof(p_payload -> 'objects') <> 'array' then
    raise exception 'objects must be an array';
  end if;
  if not exists (select 1 from public.companies where id = p_company_id and status = 'active') then
    raise exception 'Active company not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('gross-pilot-import', 0));

  for object_data in select value from jsonb_array_elements(p_payload -> 'objects') loop
    select company_id into v_existing_company_id
    from public.objects
    where legacy_id = object_data ->> 'legacyId';
    if found and v_existing_company_id <> p_company_id then
      raise exception 'Object legacyId belongs to another company: %', object_data ->> 'legacyId';
    end if;

    v_responsible_user_id := public.try_uuid(object_data ->> 'responsibleDirectorId');
    if v_responsible_user_id is not null and not exists (
      select 1 from public.profiles
      where id = v_responsible_user_id and company_id = p_company_id and role = 'construction_director' and status = 'active'
    ) then
      raise exception 'Invalid responsible director for object %', object_data ->> 'legacyId';
    end if;

    insert into public.objects (
      legacy_id, company_id, name, address, district, metro, status,
      responsible_director_id, meta
    ) values (
      object_data ->> 'legacyId', p_company_id, object_data ->> 'name',
      nullif(object_data ->> 'address', ''), nullif(object_data ->> 'district', ''),
      nullif(object_data ->> 'metro', ''), coalesce(nullif(object_data ->> 'status', ''), 'В работе'),
      v_responsible_user_id, coalesce(object_data -> 'meta', '{}'::jsonb)
    )
    on conflict (legacy_id) do update set
      name = excluded.name,
      address = excluded.address,
      district = excluded.district,
      metro = excluded.metro,
      status = excluded.status,
      responsible_director_id = excluded.responsible_director_id,
      meta = excluded.meta
    returning id into v_object_id;
    object_count := object_count + 1;

    for building_data in select value from jsonb_array_elements(object_data -> 'buildings') loop
      select o.company_id into v_existing_company_id
      from public.buildings b join public.objects o on o.id = b.object_id
      where b.legacy_id = building_data ->> 'legacyId';
      if found and v_existing_company_id <> p_company_id then
        raise exception 'Building legacyId belongs to another company: %', building_data ->> 'legacyId';
      end if;

      v_responsible_user_id := public.try_uuid(building_data ->> 'responsibleItrId');
      if v_responsible_user_id is not null and not exists (
        select 1 from public.profiles
        where id = v_responsible_user_id and company_id = p_company_id and role = 'itr' and status = 'active'
      ) then
        raise exception 'Invalid responsible ITR for building %', building_data ->> 'legacyId';
      end if;

      insert into public.buildings (
        legacy_id, object_id, name, floors_count, has_parking, readiness,
        responsible_itr_id, floor_template
      ) values (
        building_data ->> 'legacyId', v_object_id, building_data ->> 'name',
        (building_data ->> 'floorsCount')::integer,
        coalesce((building_data ->> 'hasParking')::boolean, false),
        coalesce(nullif(building_data ->> 'readiness', '')::numeric, 0),
        v_responsible_user_id, coalesce(building_data -> 'floorTemplate', '{}'::jsonb)
      )
      on conflict (legacy_id) do update set
        object_id = excluded.object_id,
        name = excluded.name,
        floors_count = excluded.floors_count,
        has_parking = excluded.has_parking,
        readiness = excluded.readiness,
        responsible_itr_id = excluded.responsible_itr_id,
        floor_template = excluded.floor_template
      returning id into v_building_id;
      building_count := building_count + 1;

      for floor_data in select value from jsonb_array_elements(building_data -> 'floors') loop
        insert into public.floors (
          legacy_id, building_id, floor_number, plan_image_url, template_snapshot
        ) values (
          floor_data ->> 'legacyId', v_building_id, (floor_data ->> 'number')::integer,
          nullif(floor_data ->> 'planImageUrl', ''),
          coalesce(floor_data -> 'templateSnapshot', '{}'::jsonb)
        )
        on conflict (building_id, floor_number) do update set
          legacy_id = excluded.legacy_id,
          plan_image_url = excluded.plan_image_url,
          template_snapshot = excluded.template_snapshot
        returning id into v_floor_id;
        floor_count := floor_count + 1;

        for door_data in select value from jsonb_array_elements(floor_data -> 'doors') loop
          select o.company_id into v_existing_company_id
          from public.doors d
          join public.floors f on f.id = d.floor_id
          join public.buildings b on b.id = f.building_id
          join public.objects o on o.id = b.object_id
          where d.legacy_id = door_data ->> 'legacyId';
          if found and v_existing_company_id <> p_company_id then
            raise exception 'Door legacyId belongs to another company: %', door_data ->> 'legacyId';
          end if;

          v_assigned_user_id := public.try_uuid(door_data ->> 'assignedUserId');
          if v_assigned_user_id is not null and not exists (
            select 1 from public.profiles
            where id = v_assigned_user_id and company_id = p_company_id and role = 'itr' and status = 'active'
          ) then
            raise exception 'Invalid assigned ITR for door %', door_data ->> 'legacyId';
          end if;

          insert into public.doors (
            legacy_id, floor_id, label, mark, type, opening_number, status,
            opening_status, issue_status, custody_act_status, tn_status,
            assigned_user_id, x, y, model, width_fact, height_fact, meta
          ) values (
            door_data ->> 'legacyId', v_floor_id, door_data ->> 'label', door_data ->> 'mark',
            door_data ->> 'type', nullif(door_data ->> 'openingNumber', '')::integer,
            coalesce(nullif(door_data ->> 'status', ''), 'не начато'),
            coalesce(nullif(door_data ->> 'openingStatus', ''), 'готов'),
            coalesce(nullif(door_data ->> 'issueStatus', ''), 'нет'),
            coalesce(nullif(door_data ->> 'custodyActStatus', ''), 'не передана'),
            coalesce(nullif(door_data ->> 'tnStatus', ''), 'не передано'),
            v_assigned_user_id, (door_data ->> 'x')::numeric, (door_data ->> 'y')::numeric,
            nullif(door_data ->> 'model', ''), nullif(door_data ->> 'widthFact', '')::numeric,
            nullif(door_data ->> 'heightFact', '')::numeric,
            coalesce(door_data -> 'meta', '{}'::jsonb)
          )
          on conflict (legacy_id) do update set
            floor_id = excluded.floor_id,
            label = excluded.label,
            mark = excluded.mark,
            type = excluded.type,
            opening_number = excluded.opening_number,
            status = excluded.status,
            opening_status = excluded.opening_status,
            issue_status = excluded.issue_status,
            custody_act_status = excluded.custody_act_status,
            tn_status = excluded.tn_status,
            assigned_user_id = excluded.assigned_user_id,
            x = excluded.x,
            y = excluded.y,
            model = excluded.model,
            width_fact = excluded.width_fact,
            height_fact = excluded.height_fact,
            meta = excluded.meta;
          door_count := door_count + 1;
        end loop;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object(
    'objects', object_count,
    'buildings', building_count,
    'floors', floor_count,
    'doors', door_count
  );
end;
$$;

revoke all on function public.import_pilot_hierarchy(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_pilot_hierarchy(uuid, jsonb) to service_role;

comment on function public.import_pilot_hierarchy(uuid, jsonb) is
  'Transactional, idempotent hierarchy import for trusted pilot tooling only.';

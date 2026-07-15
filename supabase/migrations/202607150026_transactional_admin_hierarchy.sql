create or replace function public.save_object_hierarchy(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_company_id uuid;
  caller_role public.app_role;
  object_data jsonb;
  building_data jsonb;
  floor_data jsonb;
  door_data jsonb;
  existing_object_id uuid;
  existing_object_company_id uuid;
  existing_building_object_id uuid;
  existing_door_building_legacy_id text;
begin
  target_company_id := public.current_company_id();
  caller_role := public.current_app_role();

  if target_company_id is null or caller_role is null then
    raise exception using errcode = '42501', message = 'Active profile is required';
  end if;
  if caller_role not in ('creator', 'company_head', 'construction_director') then
    raise exception using errcode = '42501', message = 'Role cannot manage object hierarchy';
  end if;
  if p_payload is null or jsonb_typeof(p_payload -> 'objects') <> 'array' then
    raise exception using errcode = '22023', message = 'objects must be an array';
  end if;

  for object_data in select value from jsonb_array_elements(p_payload -> 'objects') loop
    if nullif(object_data ->> 'legacyId', '') is null then
      raise exception using errcode = '22023', message = 'Object legacyId is required';
    end if;

    existing_object_id := null;
    existing_object_company_id := null;
    select id, company_id into existing_object_id, existing_object_company_id
    from public.objects
    where legacy_id = object_data ->> 'legacyId';

    if existing_object_id is null then
      if caller_role not in ('creator', 'company_head') then
        raise exception using errcode = '42501', message = 'Only company leadership can create objects';
      end if;
    elsif existing_object_company_id <> target_company_id
      or not public.can_access_object(existing_object_id) then
      raise exception using errcode = '42501', message = 'Object is outside the caller access scope';
    end if;

    for building_data in select value from jsonb_array_elements(coalesce(object_data -> 'buildings', '[]'::jsonb)) loop
      if nullif(building_data ->> 'legacyId', '') is null then
        raise exception using errcode = '22023', message = 'Building legacyId is required';
      end if;

      existing_building_object_id := null;
      select object_id into existing_building_object_id
      from public.buildings
      where legacy_id = building_data ->> 'legacyId';

      if existing_building_object_id is not null
        and existing_building_object_id is distinct from existing_object_id then
        raise exception using errcode = '42501', message = 'Building cannot be moved between objects';
      end if;

      for floor_data in select value from jsonb_array_elements(coalesce(building_data -> 'floors', '[]'::jsonb)) loop
        for door_data in select value from jsonb_array_elements(coalesce(floor_data -> 'doors', '[]'::jsonb)) loop
          if nullif(door_data ->> 'legacyId', '') is null then
            raise exception using errcode = '22023', message = 'Door legacyId is required';
          end if;

          existing_door_building_legacy_id := null;
          select b.legacy_id into existing_door_building_legacy_id
          from public.doors d
          join public.floors f on f.id = d.floor_id
          join public.buildings b on b.id = f.building_id
          where d.legacy_id = door_data ->> 'legacyId';

          if existing_door_building_legacy_id is not null
            and existing_door_building_legacy_id is distinct from building_data ->> 'legacyId' then
            raise exception using errcode = '42501', message = 'Door cannot be moved between buildings';
          end if;
        end loop;
      end loop;
    end loop;
  end loop;

  return public.import_pilot_hierarchy(target_company_id, p_payload);
end;
$$;

revoke all on function public.save_object_hierarchy(jsonb) from public, anon;
grant execute on function public.save_object_hierarchy(jsonb) to authenticated;

comment on function public.save_object_hierarchy(jsonb) is
  'Transactional hierarchy save for authenticated company leadership and assigned construction directors.';

create or replace function public.save_profile_assignments(
  p_user_id uuid,
  p_name text,
  p_role public.app_role,
  p_position text,
  p_phone text,
  p_avatar_url text,
  p_status public.record_status,
  p_object_ids uuid[] default '{}'::uuid[],
  p_building_ids uuid[] default '{}'::uuid[]
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_profile public.profiles;
begin
  update public.profiles
  set name = p_name,
      role = p_role,
      position = p_position,
      phone = p_phone,
      avatar_url = p_avatar_url,
      status = p_status
  where id = p_user_id
  returning * into saved_profile;

  if saved_profile.id is null then
    raise exception 'Profile is unavailable';
  end if;

  delete from public.object_assignments where user_id = p_user_id;
  insert into public.object_assignments (object_id, user_id)
  select distinct ids.object_id, p_user_id
  from unnest(coalesce(p_object_ids, '{}'::uuid[])) as ids(object_id);

  delete from public.building_assignments where user_id = p_user_id;
  insert into public.building_assignments (building_id, user_id)
  select distinct ids.building_id, p_user_id
  from unnest(coalesce(p_building_ids, '{}'::uuid[])) as ids(building_id);

  return saved_profile;
end;
$$;

revoke all on function public.save_profile_assignments(uuid, text, public.app_role, text, text, text, public.record_status, uuid[], uuid[]) from public, anon;
grant execute on function public.save_profile_assignments(uuid, text, public.app_role, text, text, text, public.record_status, uuid[], uuid[]) to authenticated;

create or replace function public.can_access_floor_plan_storage_path(
  target_company_id uuid,
  target_object_id uuid,
  target_building_id uuid,
  target_floor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_company_id = public.current_company_id()
    and exists (
      select 1
      from public.floors f
      join public.buildings b on b.id = f.building_id
      join public.objects o on o.id = b.object_id
      where f.id = target_floor_id
        and b.id = target_building_id
        and o.id = target_object_id
        and o.company_id = target_company_id
        and public.can_access_building(b.id)
    );
$$;

create or replace function public.can_access_profile_avatar(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.company_id = public.current_company_id()
      and p.status = 'active'
  );
$$;

revoke all on function public.can_access_floor_plan_storage_path(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.can_access_floor_plan_storage_path(uuid, uuid, uuid, uuid) to authenticated;
revoke all on function public.can_access_profile_avatar(uuid) from public, anon;
grant execute on function public.can_access_profile_avatar(uuid) to authenticated;

drop policy if exists documents_storage_select on storage.objects;
drop policy if exists documents_storage_insert on storage.objects;
drop policy if exists documents_storage_update on storage.objects;
drop policy if exists documents_storage_delete on storage.objects;

create policy documents_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);
create policy documents_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);
create policy documents_storage_update on storage.objects for update to authenticated
using (
  bucket_id = 'documents'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
  and (owner_id = auth.uid()::text or public.has_admin_access())
)
with check (
  bucket_id = 'documents'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
  and (owner_id = auth.uid()::text or public.has_admin_access())
);
create policy documents_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
  and (owner_id = auth.uid()::text or public.has_admin_access())
);

drop policy if exists floor_plans_storage_select on storage.objects;
drop policy if exists floor_plans_storage_insert on storage.objects;
drop policy if exists floor_plans_storage_update on storage.objects;
drop policy if exists floor_plans_storage_delete on storage.objects;

create policy floor_plans_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'floor-plans'
  and array_length(storage.foldername(name), 1) = 4
  and public.can_access_floor_plan_storage_path(
    public.try_uuid((storage.foldername(name))[1]),
    public.try_uuid((storage.foldername(name))[2]),
    public.try_uuid((storage.foldername(name))[3]),
    public.try_uuid((storage.foldername(name))[4])
  )
);
create policy floor_plans_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'floor-plans'
  and array_length(storage.foldername(name), 1) = 4
  and public.can_access_floor_plan_storage_path(
    public.try_uuid((storage.foldername(name))[1]),
    public.try_uuid((storage.foldername(name))[2]),
    public.try_uuid((storage.foldername(name))[3]),
    public.try_uuid((storage.foldername(name))[4])
  )
);
create policy floor_plans_storage_update on storage.objects for update to authenticated
using (
  bucket_id = 'floor-plans'
  and array_length(storage.foldername(name), 1) = 4
  and public.can_access_floor_plan_storage_path(
    public.try_uuid((storage.foldername(name))[1]),
    public.try_uuid((storage.foldername(name))[2]),
    public.try_uuid((storage.foldername(name))[3]),
    public.try_uuid((storage.foldername(name))[4])
  )
  and (owner_id = auth.uid()::text or public.has_admin_access())
)
with check (
  bucket_id = 'floor-plans'
  and array_length(storage.foldername(name), 1) = 4
  and public.can_access_floor_plan_storage_path(
    public.try_uuid((storage.foldername(name))[1]),
    public.try_uuid((storage.foldername(name))[2]),
    public.try_uuid((storage.foldername(name))[3]),
    public.try_uuid((storage.foldername(name))[4])
  )
  and (owner_id = auth.uid()::text or public.has_admin_access())
);
create policy floor_plans_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'floor-plans'
  and array_length(storage.foldername(name), 1) = 4
  and public.can_access_floor_plan_storage_path(
    public.try_uuid((storage.foldername(name))[1]),
    public.try_uuid((storage.foldername(name))[2]),
    public.try_uuid((storage.foldername(name))[3]),
    public.try_uuid((storage.foldername(name))[4])
  )
  and (owner_id = auth.uid()::text or public.has_admin_access())
);

drop policy if exists avatars_storage_select on storage.objects;
create policy avatars_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and array_length(storage.foldername(name), 1) = 1
  and public.can_access_profile_avatar(public.try_uuid((storage.foldername(name))[1]))
);


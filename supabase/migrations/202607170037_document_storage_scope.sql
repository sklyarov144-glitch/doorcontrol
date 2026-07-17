-- Keep private document binaries at the same domain scope as document_items.
-- New paths use company/object/building/floor/door/file with `_` for an absent
-- optional level. Legacy company/object/file paths remain readable only when a
-- matching, authorized document_items row exists.
create or replace function public.can_access_document_storage_path(target_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := storage.foldername(target_name);
  part_count integer := coalesce(array_length(parts, 1), 0);
  building_id uuid;
  floor_id uuid;
  door_id uuid;
begin
  if part_count = 5 then
    if public.try_uuid(parts[1]) is null
      or public.try_uuid(parts[2]) is null
      or (parts[3] <> '_' and public.try_uuid(parts[3]) is null)
      or (parts[4] <> '_' and public.try_uuid(parts[4]) is null)
      or (parts[5] <> '_' and public.try_uuid(parts[5]) is null)
      or (parts[3] = '_' and (parts[4] <> '_' or parts[5] <> '_'))
      or (parts[4] = '_' and parts[5] <> '_') then
      return false;
    end if;

    building_id := case when parts[3] = '_' then null else public.try_uuid(parts[3]) end;
    floor_id := case when parts[4] = '_' then null else public.try_uuid(parts[4]) end;
    door_id := case when parts[5] = '_' then null else public.try_uuid(parts[5]) end;

    return public.can_access_domain_scope(
      public.try_uuid(parts[1]),
      public.try_uuid(parts[2]),
      building_id,
      floor_id,
      door_id,
      true
    );
  end if;

  if part_count = 2 then
    return exists (
      select 1
      from public.document_items d
      where d.url = 'storage://documents/' || target_name
        and public.can_access_domain_scope(
          d.company_id,
          d.object_id,
          d.building_id,
          d.floor_id,
          d.door_id,
          true
        )
    );
  end if;

  return false;
end;
$$;

revoke all on function public.can_access_document_storage_path(text) from public, anon;
grant execute on function public.can_access_document_storage_path(text) to authenticated;

drop policy if exists documents_storage_select on storage.objects;
drop policy if exists documents_storage_insert on storage.objects;
drop policy if exists documents_storage_update on storage.objects;
drop policy if exists documents_storage_delete on storage.objects;

create policy documents_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and public.can_access_document_storage_path(name)
);

create policy documents_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and public.can_access_document_storage_path(name)
  and public.privileged_mfa_satisfied()
);

create policy documents_storage_update on storage.objects for update to authenticated
using (
  bucket_id = 'documents'
  and public.can_access_document_storage_path(name)
  and (owner_id = auth.uid()::text or public.has_admin_access())
  and public.privileged_mfa_satisfied()
)
with check (
  bucket_id = 'documents'
  and public.can_access_document_storage_path(name)
  and (owner_id = auth.uid()::text or public.has_admin_access())
  and public.privileged_mfa_satisfied()
);

create policy documents_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and public.can_access_document_storage_path(name)
  and (owner_id = auth.uid()::text or public.has_admin_access())
  and public.privileged_mfa_satisfied()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('floor-plans', 'floor-plans', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create policy documents_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);

create policy documents_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);

create policy documents_storage_update on storage.objects for update to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);

create policy documents_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
  and public.has_admin_access()
);

create policy floor_plans_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'floor-plans'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);

create policy floor_plans_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'floor-plans'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);

create policy floor_plans_storage_update on storage.objects for update to authenticated
using (
  bucket_id = 'floor-plans'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
)
with check (
  bucket_id = 'floor-plans'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
);

create policy floor_plans_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'floor-plans'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.can_access_object(public.try_uuid((storage.foldername(name))[2]))
  and public.has_admin_access()
);

create policy avatars_storage_select on storage.objects for select to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text);
create policy avatars_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_storage_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text);


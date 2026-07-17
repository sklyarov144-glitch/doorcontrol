-- A scoped path authorizes upload and compensation cleanup, but a binary only
-- becomes readable after its document_items metadata has committed.
create or replace function public.can_read_document_storage_path(target_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.can_access_document_storage_path(target_name)
    and exists (
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
$$;

revoke all on function public.can_read_document_storage_path(text) from public, anon;
grant execute on function public.can_read_document_storage_path(text) to authenticated;

create index if not exists document_items_url_idx on public.document_items(url);

drop policy if exists documents_storage_select on storage.objects;
create policy documents_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (
    public.can_read_document_storage_path(name)
    or (
      public.can_access_document_storage_path(name)
      and (owner_id = auth.uid()::text or public.has_admin_access())
    )
  )
);

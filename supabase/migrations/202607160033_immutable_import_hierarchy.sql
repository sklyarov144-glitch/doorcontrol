create or replace function public.prevent_import_hierarchy_reparenting()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_column text := tg_argv[0];
  old_parent text;
  new_parent text;
begin
  if old.legacy_id is not null and new.legacy_id is distinct from old.legacy_id then
    raise exception using
      errcode = '23514',
      message = format('Imported %s legacy identity cannot be changed', tg_table_name);
  end if;

  old_parent := to_jsonb(old) ->> parent_column;
  new_parent := to_jsonb(new) ->> parent_column;
  if old.legacy_id is not null and new_parent is distinct from old_parent then
    raise exception using
      errcode = '23514',
      message = format('Imported %s cannot be moved by changing %s', tg_table_name, parent_column);
  end if;
  return new;
end;
$$;

create trigger objects_import_identity_guard
before update on public.objects
for each row execute function public.prevent_import_hierarchy_reparenting('company_id');

create trigger buildings_import_identity_guard
before update on public.buildings
for each row execute function public.prevent_import_hierarchy_reparenting('object_id');

create trigger floors_import_identity_guard
before update on public.floors
for each row execute function public.prevent_import_hierarchy_reparenting('building_id');

create trigger doors_import_identity_guard
before update on public.doors
for each row execute function public.prevent_import_hierarchy_reparenting('floor_id');

comment on function public.prevent_import_hierarchy_reparenting() is
  'Keeps imported legacy identities and hierarchy parents immutable across all write paths.';

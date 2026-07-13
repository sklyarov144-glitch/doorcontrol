alter table public.objects add column legacy_id text unique;
alter table public.buildings add column legacy_id text unique;
alter table public.floors add column legacy_id text;
alter table public.doors add column legacy_id text unique;

create unique index floors_building_legacy_idx
on public.floors(building_id, legacy_id)
where legacy_id is not null;


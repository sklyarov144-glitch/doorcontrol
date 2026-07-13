create extension if not exists pgcrypto;

create type public.app_role as enum (
  'creator',
  'company_head',
  'construction_director',
  'itr'
);

create type public.record_status as enum ('active', 'disabled');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role public.app_role not null default 'itr',
  position text,
  email text not null,
  phone text,
  avatar_url text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  district text,
  metro text,
  status text not null default 'В работе',
  responsible_director_id uuid references public.profiles(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  name text not null,
  floors_count integer not null check (floors_count > 0),
  has_parking boolean not null default false,
  readiness numeric(5,2) not null default 0 check (readiness between 0 and 100),
  responsible_itr_id uuid references public.profiles(id) on delete set null,
  floor_template jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (object_id, name)
);

create table public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  floor_number integer not null,
  plan_image_url text,
  template_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, floor_number)
);

create table public.doors (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  label text not null,
  mark text not null,
  type text not null check (type in ('apartment', 'mop', 'Квартирная', 'МОП')),
  opening_number integer,
  status text not null default 'не начато',
  opening_status text not null default 'готов',
  issue_status text not null default 'нет',
  custody_act_status text not null default 'не передана',
  tn_status text not null default 'не передано',
  assigned_user_id uuid references public.profiles(id) on delete set null,
  x numeric(6,3) not null default 50 check (x between 0 and 100),
  y numeric(6,3) not null default 50 check (y between 0 and 100),
  width_fact numeric(8,2),
  height_fact numeric(8,2),
  model text,
  mounted_at timestamptz,
  tn_accepted_at timestamptz,
  custody_act_uploaded_at timestamptz,
  custody_act_closed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, mark)
);

create table public.object_assignments (
  object_id uuid not null references public.objects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (object_id, user_id)
);

create table public.building_assignments (
  building_id uuid not null references public.buildings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (building_id, user_id)
);

create index profiles_company_idx on public.profiles(company_id);
create index objects_company_idx on public.objects(company_id);
create index buildings_object_idx on public.buildings(object_id);
create index floors_building_idx on public.floors(building_id, floor_number);
create index doors_floor_idx on public.doors(floor_id);
create index doors_assigned_user_idx on public.doors(assigned_user_id);
create index object_assignments_user_idx on public.object_assignments(user_id);
create index building_assignments_user_idx on public.building_assignments(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger objects_set_updated_at before update on public.objects
for each row execute function public.set_updated_at();
create trigger buildings_set_updated_at before update on public.buildings
for each row execute function public.set_updated_at();
create trigger floors_set_updated_at before update on public.floors
for each row execute function public.set_updated_at();
create trigger doors_set_updated_at before update on public.doors
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_company_id uuid;
begin
  target_company_id := nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid;
  if target_company_id is null then
    raise exception 'company_id is required in user metadata';
  end if;

  insert into public.profiles (id, company_id, name, role, position, email)
  values (
    new.id,
    target_company_id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'itr'),
    new.raw_user_meta_data ->> 'position',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


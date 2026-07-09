create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  auth_user_id uuid,
  name text not null,
  role text not null check (role in ('creator', 'company_head', 'construction_director', 'itr')),
  position text,
  email text unique not null,
  phone text,
  avatar_url text,
  status text not null default 'active',
  assigned_object_ids uuid[] not null default '{}',
  assigned_building_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists objects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  address text,
  metro text,
  status text not null default 'В работе',
  responsible_director_id uuid references profiles(id),
  responsible_itr_ids uuid[] not null default '{}',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists buildings (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references objects(id) on delete cascade,
  name text not null,
  floors_count integer not null default 1,
  has_parking boolean not null default false,
  readiness integer not null default 0,
  responsible_itr_id uuid references profiles(id),
  floor_template jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  floor_number integer not null,
  plan_image_url text,
  template_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, floor_number)
);

create table if not exists doors (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid references floors(id) on delete cascade,
  object_id uuid references objects(id) on delete cascade,
  building_id uuid references buildings(id) on delete cascade,
  label text not null,
  mark text not null,
  type text not null,
  opening_number integer,
  status text not null default 'не начато',
  opening_status text not null default 'готов',
  issue_status text not null default 'нет',
  custody_act_status text not null default 'не передана',
  assigned_user_id uuid references profiles(id),
  x numeric not null default 50,
  y numeric not null default 50,
  width_fact text,
  height_fact text,
  model text,
  mounted_at timestamptz,
  tn_accepted_at timestamptz,
  custody_act_uploaded_at timestamptz,
  custody_act_closed_at timestamptz,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  object_id uuid references objects(id) on delete set null,
  building_id uuid references buildings(id) on delete set null,
  floor_id uuid references floors(id) on delete set null,
  door_id uuid references doors(id) on delete set null,
  title text not null,
  category text not null default 'document',
  url text not null,
  comment text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  title text not null,
  description text,
  type text not null,
  priority text not null default 'средний',
  status text not null default 'новая',
  created_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  object_id uuid references objects(id) on delete set null,
  building_id uuid references buildings(id) on delete set null,
  floor_id uuid references floors(id) on delete set null,
  door_id uuid references doors(id) on delete set null,
  due_date date,
  automatic_key text,
  comments jsonb not null default '[]',
  document_links jsonb not null default '[]',
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role_target text,
  type text not null,
  title text not null,
  message text,
  priority text not null default 'низкий',
  status text not null default 'unread',
  object_id uuid references objects(id) on delete set null,
  building_id uuid references buildings(id) on delete set null,
  floor_id uuid references floors(id) on delete set null,
  door_id uuid references doors(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  action_url text,
  created_at timestamptz not null default now()
);

create table if not exists custody_acts (
  id uuid primary key default gen_random_uuid(),
  door_id uuid references doors(id) on delete cascade,
  status text not null default 'не передана',
  url text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tn_issues (
  id uuid primary key default gen_random_uuid(),
  door_id uuid references doors(id) on delete cascade,
  title text not null,
  status text not null default 'открыто',
  priority text not null default 'средний',
  responsible_id uuid references profiles(id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  role text,
  status text not null default 'active',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete set null,
  name text not null,
  position text,
  phone text,
  status text not null default 'active',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_standards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  work_type text not null,
  team_composition text,
  daily_plan numeric not null default 0,
  unit_name text not null default 'двери',
  unit_price numeric not null default 0,
  daily_budget numeric not null default 0,
  is_active boolean not null default true,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists object_work_plans (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references objects(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  work_standard_id uuid references work_standards(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  planned_date date not null,
  planned_quantity numeric not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_work_reports (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references objects(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  work_standard_id uuid references work_standards(id) on delete set null,
  report_date date not null,
  plan_quantity numeric not null default 0,
  fact_quantity numeric not null default 0,
  completion_percent numeric not null default 0,
  delay_reason text,
  comment text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists manpower_requests (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references objects(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  requested_by uuid references profiles(id),
  request_date date not null,
  loaders_requested integer not null default 0,
  installers_requested integer not null default 0,
  approved_loaders integer not null default 0,
  approved_installers integer not null default 0,
  status text not null default 'отправлена',
  priority text not null default 'средний',
  comment text,
  director_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);


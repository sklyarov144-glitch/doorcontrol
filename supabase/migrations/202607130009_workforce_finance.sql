create table public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  team_type text not null default 'Монтаж',
  responsible_itr_id uuid references public.profiles(id) on delete set null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  nationality text,
  worker_type text not null default 'монтажник',
  position text,
  phone text,
  employment_type text not null default 'contractor',
  daily_rate numeric(12,2) not null default 0 check (daily_rate >= 0),
  status public.record_status not null default 'active',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  joined_at date not null default current_date,
  left_at date,
  primary key (team_id, employee_id, joined_at),
  check (left_at is null or left_at >= joined_at)
);

create table public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  object_id uuid not null references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.work_standards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  work_type text not null,
  category text,
  team_composition text,
  daily_plan numeric(12,2) not null default 0 check (daily_plan >= 0),
  unit_name text not null default 'двери',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  daily_budget numeric(12,2) not null default 0 check (daily_budget >= 0),
  is_active boolean not null default true,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, work_type)
);

create table public.object_work_plans (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  work_standard_id uuid references public.work_standards(id) on delete restrict,
  team_id uuid references public.teams(id) on delete set null,
  planned_date date not null,
  planned_quantity numeric(12,2) not null default 0 check (planned_quantity >= 0),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_work_reports (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  work_standard_id uuid references public.work_standards(id) on delete restrict,
  report_date date not null,
  plan_quantity numeric(12,2) not null default 0 check (plan_quantity >= 0),
  fact_quantity numeric(12,2) not null default 0 check (fact_quantity >= 0),
  delay_reason text,
  comment text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (object_id, building_id, team_id, work_standard_id, report_date)
);

create table public.manpower_requests (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  target_date date not null,
  work_type text not null,
  doors_planned integer not null default 0 check (doors_planned >= 0),
  loaders_requested integer not null default 0 check (loaders_requested >= 0),
  installers_requested integer not null default 0 check (installers_requested >= 0),
  approved_loaders integer not null default 0 check (approved_loaders >= 0),
  approved_installers integer not null default 0 check (approved_installers >= 0),
  status text not null default 'подана',
  priority text not null default 'средний',
  comment text,
  director_comment text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  object_id uuid not null references public.objects(id) on delete cascade,
  number text not null,
  customer_name text not null,
  amount numeric(16,2) not null check (amount >= 0),
  starts_on date,
  ends_on date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number)
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  object_id uuid not null references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  category text not null,
  planned_amount numeric(16,2) not null default 0 check (planned_amount >= 0),
  committed_amount numeric(16,2) not null default 0 check (committed_amount >= 0),
  actual_amount numeric(16,2) not null default 0 check (actual_amount >= 0),
  period_start date,
  period_end date,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start)
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  object_id uuid not null references public.objects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  category text not null,
  amount numeric(16,2) not null check (amount >= 0),
  occurred_on date not null,
  status text not null default 'confirmed',
  comment text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teams_company_idx on public.teams(company_id, status);
create index employees_company_idx on public.employees(company_id, status);
create index team_assignments_scope_idx on public.team_assignments(object_id, building_id, starts_on, ends_on);
create index work_plans_scope_idx on public.object_work_plans(object_id, building_id, planned_date);
create index work_reports_scope_idx on public.daily_work_reports(object_id, building_id, report_date);
create index manpower_scope_idx on public.manpower_requests(object_id, building_id, target_date, status);
create index contracts_object_idx on public.contracts(object_id, status);
create index budget_items_object_idx on public.budget_items(object_id, building_id, period_start);
create index transactions_object_idx on public.financial_transactions(object_id, occurred_on, transaction_type);

create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger work_standards_set_updated_at before update on public.work_standards for each row execute function public.set_updated_at();
create trigger object_work_plans_set_updated_at before update on public.object_work_plans for each row execute function public.set_updated_at();
create trigger daily_work_reports_set_updated_at before update on public.daily_work_reports for each row execute function public.set_updated_at();
create trigger manpower_requests_set_updated_at before update on public.manpower_requests for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger budget_items_set_updated_at before update on public.budget_items for each row execute function public.set_updated_at();
create trigger financial_transactions_set_updated_at before update on public.financial_transactions for each row execute function public.set_updated_at();

create view public.object_delivery_summary
with (security_invoker = true)
as
select
  o.id as object_id,
  o.company_id,
  o.name,
  count(distinct b.id) as buildings_count,
  count(d.id) as doors_total,
  count(d.id) filter (where d.status in ('смонтирована', 'принято технадзором', 'передано по акту')) as doors_mounted,
  count(d.id) filter (where d.tn_accepted_at is not null) as doors_tn_accepted,
  count(d.id) filter (where d.custody_act_closed_at is not null) as doors_by_act,
  count(i.id) filter (where i.status not in ('устранено', 'закрыто')) as open_tn_issues,
  round(100.0 * count(d.id) filter (where d.status in ('смонтирована', 'принято технадзором', 'передано по акту')) / nullif(count(d.id), 0), 2) as readiness_percent
from public.objects o
left join public.buildings b on b.object_id = o.id
left join public.floors f on f.building_id = b.id
left join public.doors d on d.floor_id = f.id
left join public.tn_issues i on i.door_id = d.id
group by o.id, o.company_id, o.name;

create view public.object_financial_summary
with (security_invoker = true)
as
with contract_totals as (
  select object_id, sum(amount) as contract_amount from public.contracts where status <> 'cancelled' group by object_id
), budget_totals as (
  select object_id, sum(planned_amount) as budget_plan, sum(actual_amount) as budget_actual from public.budget_items group by object_id
), transaction_totals as (
  select object_id,
    sum(amount) filter (where transaction_type = 'income' and status = 'confirmed') as income,
    sum(amount) filter (where transaction_type = 'expense' and status = 'confirmed') as expenses
  from public.financial_transactions group by object_id
)
select
  o.id as object_id,
  o.company_id,
  o.name,
  coalesce(c.contract_amount, 0) as contract_amount,
  coalesce(b.budget_plan, 0) as budget_plan,
  coalesce(b.budget_actual, 0) as budget_actual,
  coalesce(t.income, 0) as income,
  coalesce(t.expenses, 0) as expenses,
  coalesce(t.income, 0) - coalesce(t.expenses, 0) as cash_margin,
  coalesce(c.contract_amount, 0) - coalesce(b.budget_actual, 0) as projected_margin
from public.objects o
left join contract_totals c on c.object_id = o.id
left join budget_totals b on b.object_id = o.id
left join transaction_totals t on t.object_id = o.id;


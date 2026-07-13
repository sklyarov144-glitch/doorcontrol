alter table public.document_items enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_links enable row level security;
alter table public.notifications enable row level security;
alter table public.custody_acts enable row level security;
alter table public.tn_issues enable row level security;
alter table public.activity_logs enable row level security;

create policy document_items_select on public.document_items for select
using (company_id = public.current_company_id() and (object_id is null or public.can_access_object(object_id)));
create policy document_items_write on public.document_items for all
using (company_id = public.current_company_id() and (object_id is null or public.can_access_object(object_id)))
with check (company_id = public.current_company_id() and (object_id is null or public.can_access_object(object_id)));

create policy tasks_select on public.tasks for select using (public.can_access_task(id));
create policy tasks_insert on public.tasks for insert
with check (
  company_id = public.current_company_id()
  and (object_id is null or public.can_access_object(object_id))
  and (public.has_admin_access() or assigned_to = auth.uid())
);
create policy tasks_update on public.tasks for update
using (public.can_access_task(id))
with check (company_id = public.current_company_id() and (object_id is null or public.can_access_object(object_id)));
create policy tasks_delete on public.tasks for delete
using (public.can_access_task(id) and public.has_admin_access());

create policy task_comments_select on public.task_comments for select using (public.can_access_task(task_id));
create policy task_comments_insert on public.task_comments for insert
with check (public.can_access_task(task_id) and user_id = auth.uid());

create policy task_links_select on public.task_links for select using (public.can_access_task(task_id));
create policy task_links_insert on public.task_links for insert
with check (public.can_access_task(task_id) and created_by = auth.uid());

create policy notifications_select on public.notifications for select
using (
  company_id = public.current_company_id()
  and (user_id = auth.uid() or role_target = public.current_app_role() or public.current_app_role() = 'creator')
);
create policy notifications_update on public.notifications for update
using (user_id = auth.uid() or (role_target = public.current_app_role() and company_id = public.current_company_id()))
with check (company_id = public.current_company_id());
create policy notifications_insert on public.notifications for insert
with check (company_id = public.current_company_id() and public.has_admin_access());

create policy custody_acts_select on public.custody_acts for select
using (exists (
  select 1 from public.doors d join public.floors f on f.id = d.floor_id
  where d.id = door_id and public.can_access_building(f.building_id)
));
create policy custody_acts_write on public.custody_acts for all
using (exists (
  select 1 from public.doors d join public.floors f on f.id = d.floor_id
  where d.id = door_id and public.can_access_building(f.building_id)
))
with check (exists (
  select 1 from public.doors d join public.floors f on f.id = d.floor_id
  where d.id = door_id and public.can_access_building(f.building_id)
));

create policy tn_issues_select on public.tn_issues for select
using (exists (
  select 1 from public.doors d join public.floors f on f.id = d.floor_id
  where d.id = door_id and public.can_access_building(f.building_id)
));
create policy tn_issues_write on public.tn_issues for all
using (exists (
  select 1 from public.doors d join public.floors f on f.id = d.floor_id
  where d.id = door_id and public.can_access_building(f.building_id)
))
with check (exists (
  select 1 from public.doors d join public.floors f on f.id = d.floor_id
  where d.id = door_id and public.can_access_building(f.building_id)
));

create policy activity_logs_select on public.activity_logs for select
using (company_id = public.current_company_id() and public.has_admin_access());
create policy activity_logs_insert on public.activity_logs for insert
with check (company_id = public.current_company_id() and user_id = auth.uid());


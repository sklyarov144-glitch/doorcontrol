create index if not exists objects_responsible_director_idx
  on public.objects(responsible_director_id)
  where responsible_director_id is not null;

create index if not exists buildings_responsible_itr_idx
  on public.buildings(responsible_itr_id)
  where responsible_itr_id is not null;

create index if not exists doors_mounted_pending_idx
  on public.doors(mounted_at, floor_id)
  where status = 'смонтирована' and mounted_at is not null;

create index if not exists document_items_door_idx
  on public.document_items(door_id, created_at desc)
  where door_id is not null;

create index if not exists task_links_task_created_idx
  on public.task_links(task_id, created_at);

create index if not exists tn_issues_responsible_status_idx
  on public.tn_issues(responsible_id, status, due_date)
  where responsible_id is not null;

create index if not exists team_members_employee_idx
  on public.team_members(employee_id, team_id)
  where left_at is null;

create index if not exists team_assignments_team_idx
  on public.team_assignments(team_id, starts_on, ends_on);

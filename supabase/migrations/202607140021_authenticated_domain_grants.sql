grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.companies,
  public.profiles,
  public.objects,
  public.buildings,
  public.floors,
  public.doors,
  public.object_assignments,
  public.building_assignments,
  public.document_items,
  public.tasks,
  public.task_comments,
  public.task_links,
  public.notifications,
  public.custody_acts,
  public.tn_issues,
  public.teams,
  public.employees,
  public.team_members,
  public.team_assignments,
  public.work_standards,
  public.object_work_plans,
  public.daily_work_reports,
  public.manpower_requests,
  public.contracts,
  public.budget_items,
  public.financial_transactions
to authenticated;

grant select on table
  public.activity_logs,
  public.object_delivery_summary,
  public.object_financial_summary
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

revoke all on table
  public.companies,
  public.profiles,
  public.objects,
  public.buildings,
  public.floors,
  public.doors,
  public.object_assignments,
  public.building_assignments,
  public.document_items,
  public.tasks,
  public.task_comments,
  public.task_links,
  public.notifications,
  public.custody_acts,
  public.tn_issues,
  public.activity_logs,
  public.teams,
  public.employees,
  public.team_members,
  public.team_assignments,
  public.work_standards,
  public.object_work_plans,
  public.daily_work_reports,
  public.manpower_requests,
  public.contracts,
  public.budget_items,
  public.financial_transactions,
  public.object_delivery_summary,
  public.object_financial_summary
from anon;

revoke insert, update, delete on public.activity_logs from authenticated;

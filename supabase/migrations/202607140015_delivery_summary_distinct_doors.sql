create or replace view public.object_delivery_summary
with (security_invoker = true)
as
select
  o.id as object_id,
  o.company_id,
  o.name,
  count(distinct b.id) as buildings_count,
  count(distinct d.id) as doors_total,
  count(distinct d.id) filter (where d.status in ('смонтирована', 'принято технадзором', 'передано по акту')) as doors_mounted,
  count(distinct d.id) filter (where d.tn_accepted_at is not null) as doors_tn_accepted,
  count(distinct d.id) filter (where d.custody_act_closed_at is not null) as doors_by_act,
  count(distinct i.id) filter (where i.status not in ('устранено', 'закрыто')) as open_tn_issues,
  round(
    100.0 * count(distinct d.id) filter (where d.status in ('смонтирована', 'принято технадзором', 'передано по акту'))
    / nullif(count(distinct d.id), 0),
    2
  ) as readiness_percent
from public.objects o
left join public.buildings b on b.object_id = o.id
left join public.floors f on f.building_id = b.id
left join public.doors d on d.floor_id = f.id
left join public.tn_issues i on i.door_id = d.id
group by o.id, o.company_id, o.name;

comment on view public.object_delivery_summary is
  'Delivery KPIs per object. Door counters remain unique when a door has multiple TN issue history records.';

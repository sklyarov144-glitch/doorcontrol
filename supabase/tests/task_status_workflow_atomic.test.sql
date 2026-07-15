begin;

select plan(8);

insert into public.companies (id, name)
values ('60000000-0000-0000-0000-000000000001', 'Статусы задач');

insert into public.user_invitations (company_id, email, name, role)
values
  ('60000000-0000-0000-0000-000000000001', 'status-head@example.test', 'Руководитель', 'company_head'),
  ('60000000-0000-0000-0000-000000000001', 'status-itr@example.test', 'ИТР', 'itr'),
  ('60000000-0000-0000-0000-000000000001', 'status-other@example.test', 'Другой ИТР', 'itr');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('61000000-0000-0000-0000-000000000001', 'status-head@example.test', '{}'),
  ('61000000-0000-0000-0000-000000000002', 'status-itr@example.test', '{}'),
  ('61000000-0000-0000-0000-000000000003', 'status-other@example.test', '{}');

insert into public.tasks (id, company_id, title, created_by, assigned_to)
values (
  '62000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'Проверить дверь',
  '61000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000002'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000002', true);

select has_function('public', 'update_task_status_workflow', array['uuid', 'text'], 'atomic task status workflow exists');
select lives_ok(
  $$select public.update_task_status_workflow('62000000-0000-0000-0000-000000000001', 'в работе')$$,
  'assigned ITR starts the task'
);
select is((select status from public.tasks where id = '62000000-0000-0000-0000-000000000001'), 'в работе', 'task status is updated');
select lives_ok(
  $$select public.update_task_status_workflow('62000000-0000-0000-0000-000000000001', 'выполнена')$$,
  'assigned ITR completes the task'
);
select is((select count(*)::integer from public.notifications where task_id = '62000000-0000-0000-0000-000000000001'), 1, 'creator receives one completion notification');
set local role postgres;
select is((select count(*)::integer from public.activity_logs where entity_id = '62000000-0000-0000-0000-000000000001' and action = 'status_changed'), 2, 'both status changes are audited');

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$select public.update_task_status_workflow('62000000-0000-0000-0000-000000000001', 'в работе')$$,
  'P0001', 'Task status update is not allowed',
  'unassigned ITR cannot change the task'
);
set local role postgres;
select is((select status from public.tasks where id = '62000000-0000-0000-0000-000000000001'), 'выполнена', 'rejected update leaves task unchanged');

select * from finish();
rollback;

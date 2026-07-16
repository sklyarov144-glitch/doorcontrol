begin;

select plan(9);

insert into public.companies (id, name)
values ('50000000-0000-0000-0000-000000000001', 'Документы задач');

insert into public.user_invitations (company_id, email, name, role)
values
  ('50000000-0000-0000-0000-000000000001', 'task-doc-head@example.test', 'Руководитель', 'company_head'),
  ('50000000-0000-0000-0000-000000000001', 'task-doc-itr@example.test', 'ИТР', 'itr');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('51000000-0000-0000-0000-000000000001', 'task-doc-head@example.test', '{}'),
  ('51000000-0000-0000-0000-000000000002', 'task-doc-itr@example.test', '{}');

insert into public.objects (id, company_id, name)
values ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Объект');
insert into public.buildings (id, object_id, name, floors_count, responsible_itr_id)
values ('53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'Корпус', 1, '51000000-0000-0000-0000-000000000002');
insert into public.floors (id, building_id, floor_number)
values ('54000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 1);
insert into public.doors (id, floor_id, label, mark, type)
values ('55000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', 'Квартира 1', 'Д-1', 'apartment');
insert into public.tasks (id, company_id, title, created_by, assigned_to, object_id, building_id, floor_id, door_id)
values (
  '56000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'Добавить документ',
  '51000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000002',
  '52000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '55000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.aal', 'aal2', true);
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);

select has_function(
  'public',
  'add_task_document_workflow',
  array['uuid', 'jsonb', 'jsonb', 'jsonb', 'jsonb'],
  'atomic task document workflow exists'
);
select lives_ok(
  $$select public.add_task_document_workflow(
    '56000000-0000-0000-0000-000000000001',
    '{"title":"Инструкция","category":"document","url":"https://disk.example/instruction"}'::jsonb,
    '{"title":"Инструкция","category":"document"}'::jsonb
  )$$,
  'assigned ITR links a regular document'
);
select is((select count(*)::integer from public.document_items where company_id = '50000000-0000-0000-0000-000000000001'), 1, 'document is created');
select is((select count(*)::integer from public.task_links where task_id = '56000000-0000-0000-0000-000000000001'), 1, 'task link is created');

select lives_ok(
  $$select public.add_task_document_workflow(
    '56000000-0000-0000-0000-000000000001',
    '{"title":"Акт ОХ","category":"custody_act","url":"https://disk.example/act"}'::jsonb,
    '{"title":"Акт ОХ","category":"акт АОХ"}'::jsonb,
    '{"label":"Квартира 1","mark":"Д-1","type":"apartment","status":"смонтирована","opening_status":"готов","issue_status":"нет","custody_act_status":"акт загружен","tn_status":"не передано","x":20,"y":30,"meta":{}}'::jsonb,
    '{"status":"акт загружен","uploaded_at":"2026-07-15T00:00:00Z"}'::jsonb
  )$$,
  'custody document, link, door and act are saved together'
);
select is((select status from public.doors where id = '55000000-0000-0000-0000-000000000001'), 'смонтирована', 'door is updated');
select is((select status from public.custody_acts where door_id = '55000000-0000-0000-0000-000000000001'), 'акт загружен', 'act is updated');

select throws_ok(
  $$select public.add_task_document_workflow(
    '56000000-0000-0000-0000-000000000001',
    '{"title":"Ошибка","category":"custody_act","url":"https://disk.example/invalid"}'::jsonb,
    '{"title":"Ошибка"}'::jsonb,
    '{"label":"Квартира 1","mark":"Д-1","type":"invalid","status":"смонтирована","opening_status":"готов","issue_status":"нет","custody_act_status":"акт загружен","tn_status":"не передано","x":20,"y":30,"meta":{}}'::jsonb,
    '{"status":"акт загружен"}'::jsonb
  )$$,
  '23514',
  null,
  'invalid door rolls back document and task link'
);
select is((select count(*)::integer from public.document_items where company_id = '50000000-0000-0000-0000-000000000001'), 2, 'failed workflow leaves no orphan document');

select * from finish();

rollback;

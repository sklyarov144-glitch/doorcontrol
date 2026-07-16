begin;

select plan(19);

insert into public.companies (id, name) values
  ('70000000-0000-0000-0000-000000000001', 'Reference Company A'),
  ('70000000-0000-0000-0000-000000000002', 'Reference Company B');

insert into public.user_invitations (company_id, email, name, role) values
  ('70000000-0000-0000-0000-000000000001', 'ref-director-a@example.test', 'Director A', 'construction_director'),
  ('70000000-0000-0000-0000-000000000001', 'ref-itr-a@example.test', 'ITR A', 'itr'),
  ('70000000-0000-0000-0000-000000000002', 'ref-director-b@example.test', 'Director B', 'construction_director'),
  ('70000000-0000-0000-0000-000000000002', 'ref-itr-b@example.test', 'ITR B', 'itr');

insert into auth.users (id, email, raw_user_meta_data) values
  ('71000000-0000-0000-0000-000000000001', 'ref-director-a@example.test', '{"company_id":"70000000-0000-0000-0000-000000000001","name":"Director A","role":"construction_director"}'),
  ('71000000-0000-0000-0000-000000000002', 'ref-itr-a@example.test', '{"company_id":"70000000-0000-0000-0000-000000000001","name":"ITR A","role":"itr"}'),
  ('71000000-0000-0000-0000-000000000003', 'ref-director-b@example.test', '{"company_id":"70000000-0000-0000-0000-000000000002","name":"Director B","role":"construction_director"}'),
  ('71000000-0000-0000-0000-000000000004', 'ref-itr-b@example.test', '{"company_id":"70000000-0000-0000-0000-000000000002","name":"ITR B","role":"itr"}');

insert into public.objects (id, company_id, name) values
  ('72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Reference Object A'),
  ('72000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Reference Object B');
insert into public.buildings (id, object_id, name, floors_count) values
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Reference Building A', 1),
  ('73000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'Reference Building B', 1);
insert into public.floors (id, building_id, floor_number) values
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 1),
  ('74000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000002', 1);
insert into public.doors (id, floor_id, label, mark, type) values
  ('75000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 'Квартира 1', 'Д-1', 'apartment'),
  ('75000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000002', 'Квартира 1', 'Д-1', 'apartment');

insert into public.teams (id, company_id, name, responsible_itr_id) values
  ('76000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Team A', '71000000-0000-0000-0000-000000000002'),
  ('76000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Team B', '71000000-0000-0000-0000-000000000004');
insert into public.employees (id, company_id, name) values
  ('77000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Worker A'),
  ('77000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Worker B');
insert into public.work_standards (id, company_id, work_type) values
  ('78000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Standard A'),
  ('78000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Standard B');
insert into public.contracts (id, company_id, object_id, number, customer_name, amount) values
  ('79000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'A-1', 'Customer A', 1000),
  ('79000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'B-1', 'Customer B', 1000);

insert into public.document_items (
  id, company_id, object_id, building_id, floor_id, door_id, title, url, created_by
) values
  ('7a000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', 'Document A', 'https://example.test/a', '71000000-0000-0000-0000-000000000001'),
  ('7a000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000002', 'Document B', 'https://example.test/b', '71000000-0000-0000-0000-000000000003');

insert into public.tasks (id, company_id, title, assigned_to, object_id, building_id, floor_id, door_id)
values (
  '7b000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'Historical responsibility task',
  '71000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000001',
  '73000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000001'
);
insert into public.tn_issues (id, door_id, title, responsible_id)
values (
  '7c000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000001',
  'Historical responsibility issue',
  '71000000-0000-0000-0000-000000000002'
);

select lives_ok(
  $$update public.objects set responsible_director_id = '71000000-0000-0000-0000-000000000001' where id = '72000000-0000-0000-0000-000000000001';
    update public.buildings set responsible_itr_id = '71000000-0000-0000-0000-000000000002' where id = '73000000-0000-0000-0000-000000000001';
    update public.doors set assigned_user_id = '71000000-0000-0000-0000-000000000002' where id = '75000000-0000-0000-0000-000000000001'$$,
  'valid responsibility assignments are accepted'
);

select throws_ok(
  $$update public.objects set responsible_director_id = '71000000-0000-0000-0000-000000000003' where id = '72000000-0000-0000-0000-000000000001'$$,
  '23514', 'Object director must be an active construction director from the same company',
  'an object cannot reference a foreign-company director'
);
select throws_ok(
  $$update public.objects set responsible_director_id = '71000000-0000-0000-0000-000000000002' where id = '72000000-0000-0000-0000-000000000001'$$,
  '23514', 'Object director must be an active construction director from the same company',
  'an ITR cannot be assigned as object director'
);
select throws_ok(
  $$update public.buildings set responsible_itr_id = '71000000-0000-0000-0000-000000000004' where id = '73000000-0000-0000-0000-000000000001'$$,
  '23514', 'Building responsible user must be an active ITR from the same company',
  'a building cannot reference a foreign-company ITR'
);
select throws_ok(
  $$update public.buildings set responsible_itr_id = '71000000-0000-0000-0000-000000000001' where id = '73000000-0000-0000-0000-000000000001'$$,
  '23514', 'Building responsible user must be an active ITR from the same company',
  'a director cannot be assigned as building ITR'
);
select throws_ok(
  $$update public.doors set assigned_user_id = '71000000-0000-0000-0000-000000000004' where id = '75000000-0000-0000-0000-000000000001'$$,
  '23514', 'Door assignee must be an active ITR from the same company',
  'a door cannot reference a foreign-company ITR'
);
select throws_ok(
  $$insert into public.object_assignments (object_id, user_id) values ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000004')$$,
  '23514', 'Object assignment user must be active in the same company',
  'an object assignment cannot cross companies'
);
select throws_ok(
  $$insert into public.building_assignments (building_id, user_id) values ('73000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000004')$$,
  '23514', 'Building assignment user must be active in the same company',
  'a building assignment cannot cross companies'
);
select throws_ok(
  $$insert into public.team_members (team_id, employee_id) values ('76000000-0000-0000-0000-000000000001', '77000000-0000-0000-0000-000000000002')$$,
  '23514', 'Team member must belong to the team company',
  'a team cannot include a foreign-company employee'
);
select throws_ok(
  $$insert into public.team_assignments (team_id, object_id, building_id, starts_on, created_by) values ('76000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', current_date, '71000000-0000-0000-0000-000000000001')$$,
  '23514', 'Team assignment references must belong to the object company',
  'a foreign-company team cannot be assigned to an object'
);
select throws_ok(
  $$insert into public.object_work_plans (object_id, building_id, work_standard_id, team_id, planned_date, created_by) values ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000001', current_date, '71000000-0000-0000-0000-000000000001')$$,
  '23514', 'Work plan standard must belong to the object company',
  'a work plan cannot use a foreign-company standard'
);
select throws_ok(
  $$insert into public.daily_work_reports (object_id, building_id, team_id, report_date, created_by) values ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000002', current_date, '71000000-0000-0000-0000-000000000001')$$,
  '23514', 'Work report team must belong to the object company',
  'a work report cannot use a foreign-company team'
);
select throws_ok(
  $$insert into public.tasks (company_id, title, assigned_to, object_id) values ('70000000-0000-0000-0000-000000000001', 'Foreign assignee', '71000000-0000-0000-0000-000000000004', '72000000-0000-0000-0000-000000000001')$$,
  '23514', 'Task users must belong to the task company',
  'a task cannot be assigned across companies'
);
select throws_ok(
  $$insert into public.notifications (company_id, user_id, type, title, object_id) values ('70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000004', 'test', 'Foreign recipient', '72000000-0000-0000-0000-000000000001')$$,
  '23514', 'Notification recipient must belong to the notification company',
  'a notification cannot target a foreign-company user'
);
select throws_ok(
  $$insert into public.custody_acts (door_id, document_id, uploaded_by) values ('75000000-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002')$$,
  '23514', 'Custody act document must be linked to the same door',
  'a custody act cannot use a document from another door'
);
select throws_ok(
  $$insert into public.financial_transactions (company_id, object_id, contract_id, transaction_type, category, amount, occurred_on, created_by) values ('70000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '79000000-0000-0000-0000-000000000002', 'expense', 'Монтаж', 100, current_date, '71000000-0000-0000-0000-000000000001')$$,
  '23514', 'Financial transaction contract must belong to the same object',
  'a transaction cannot reference a foreign contract'
);
select lives_ok(
  $$insert into public.team_members (team_id, employee_id) values ('76000000-0000-0000-0000-000000000001', '77000000-0000-0000-0000-000000000001');
    insert into public.object_work_plans (object_id, building_id, work_standard_id, team_id, planned_date, created_by) values ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', current_date, '71000000-0000-0000-0000-000000000001')$$,
  'same-company workforce references are accepted'
);

update public.profiles
set status = 'disabled'
where id = '71000000-0000-0000-0000-000000000002';

select lives_ok(
  $$update public.buildings set readiness = 10 where id = '73000000-0000-0000-0000-000000000001';
    update public.doors set status = 'доставлена' where id = '75000000-0000-0000-0000-000000000001';
    update public.tasks set status = 'в работе' where id = '7b000000-0000-0000-0000-000000000001';
    update public.tn_issues set status = 'устранено' where id = '7c000000-0000-0000-0000-000000000001';
    update public.teams set name = 'Team A archived owner' where id = '76000000-0000-0000-0000-000000000001'$$,
  'disabled historical assignees do not block unrelated workflow updates'
);

select throws_ok(
  $$insert into public.tasks (company_id, title, assigned_to, object_id) values ('70000000-0000-0000-0000-000000000001', 'Disabled assignee', '71000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001')$$,
  '23514', 'Task assignee must be an active user from the task company',
  'a disabled user cannot receive a new task'
);

select * from finish();
rollback;

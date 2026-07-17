begin;

select plan(14);

insert into public.companies (id, name) values
  ('30000000-0000-0000-0000-000000000001', 'Storage Company A'),
  ('30000000-0000-0000-0000-000000000002', 'Storage Company B');

insert into public.user_invitations (company_id, email, name, role) values
  ('30000000-0000-0000-0000-000000000001', 'storage-head-a@example.test', 'Storage Head A', 'company_head'),
  ('30000000-0000-0000-0000-000000000001', 'storage-itr-a@example.test', 'Storage ITR A', 'itr'),
  ('30000000-0000-0000-0000-000000000002', 'storage-head-b@example.test', 'Storage Head B', 'company_head');

insert into auth.users (id, email, raw_user_meta_data) values
  ('31000000-0000-0000-0000-000000000001', 'storage-head-a@example.test', '{"company_id":"30000000-0000-0000-0000-000000000001","name":"Storage Head A","role":"company_head"}'),
  ('31000000-0000-0000-0000-000000000002', 'storage-itr-a@example.test', '{"company_id":"30000000-0000-0000-0000-000000000001","name":"Storage ITR A","role":"itr"}'),
  ('31000000-0000-0000-0000-000000000003', 'storage-head-b@example.test', '{"company_id":"30000000-0000-0000-0000-000000000002","name":"Storage Head B","role":"company_head"}');

insert into public.objects (id, company_id, name) values
  ('32000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Storage Object A'),
  ('32000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Storage Object B');
insert into public.buildings (id, object_id, name, floors_count, responsible_itr_id) values
  ('33000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', 'Storage Building A', 1, '31000000-0000-0000-0000-000000000002'),
  ('33000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000002', 'Storage Building B', 1, null),
  ('33000000-0000-0000-0000-000000000003', '32000000-0000-0000-0000-000000000001', 'Unassigned sibling building', 1, null);
insert into public.floors (id, building_id, floor_number) values
  ('34000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 1),
  ('34000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002', 1),
  ('34000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000003', 1);

insert into public.document_items (
  id, company_id, object_id, building_id, title, url
) values
  (
    '36000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    'Legacy assigned document',
    'storage://documents/30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/legacy.pdf'
  ),
  (
    '36000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000003',
    'Sibling building document',
    'storage://documents/30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/33000000-0000-0000-0000-000000000003/_/_/sibling.pdf'
  );

insert into storage.objects (id, bucket_id, name, owner_id) values
  (
    '35000000-0000-0000-0000-000000000008', 'documents',
    '30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/legacy.pdf',
    '31000000-0000-0000-0000-000000000001'
  ),
  (
    '35000000-0000-0000-0000-000000000009', 'documents',
    '30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/33000000-0000-0000-0000-000000000003/_/_/sibling.pdf',
    '31000000-0000-0000-0000-000000000001'
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.aal', 'aal1', true);
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000002', true);

select ok(public.can_access_floor_plan_storage_path(
  '30000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  '34000000-0000-0000-0000-000000000001'
), 'ITR can access a complete assigned floor-plan hierarchy');

select is(public.can_access_floor_plan_storage_path(
  '30000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  '34000000-0000-0000-0000-000000000002'
), false, 'mismatched floor hierarchy is rejected');

select lives_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values (
    '35000000-0000-0000-0000-000000000001', 'floor-plans',
    '30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/33000000-0000-0000-0000-000000000001/34000000-0000-0000-0000-000000000001/plan.png',
    '31000000-0000-0000-0000-000000000002'
  )$$,
  'assigned ITR can upload a correctly scoped floor plan'
);

select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values (
    '35000000-0000-0000-0000-000000000002', 'floor-plans',
    '30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/33000000-0000-0000-0000-000000000001/34000000-0000-0000-0000-000000000002/plan.png',
    '31000000-0000-0000-0000-000000000002'
  )$$,
  '42501', null,
  'a floor plan cannot point at a floor from another hierarchy'
);

select lives_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values (
    '35000000-0000-0000-0000-000000000003', 'documents',
    '30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/33000000-0000-0000-0000-000000000001/_/_/act.pdf',
    '31000000-0000-0000-0000-000000000002'
  )$$,
  'assigned ITR can upload an object document'
);

select is(
  (select count(*)::integer from storage.objects where id = '35000000-0000-0000-0000-000000000008'),
  1,
  'legacy document remains readable through its authorized metadata scope'
);

select is(
  (select count(*)::integer from storage.objects where id = '35000000-0000-0000-0000-000000000009'),
  0,
  'ITR cannot read a document binary from an unassigned sibling building'
);

select ok(
  (select qual from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_storage_delete')
    like '%owner_id%auth.uid%has_admin_access%',
  'document delete policy permits the uploader or an administrative role through the Storage API'
);

select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values (
    '35000000-0000-0000-0000-000000000004', 'documents',
    '30000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/extra/act.pdf',
    '31000000-0000-0000-0000-000000000002'
  )$$,
  '42501', null,
  'document paths with an unexpected scope segment are rejected'
);

reset role;
insert into storage.objects (id, bucket_id, name, owner_id) values
  ('35000000-0000-0000-0000-000000000005', 'avatars', '31000000-0000-0000-0000-000000000002/avatar.png', '31000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from storage.objects where id = '35000000-0000-0000-0000-000000000005'), 1, 'same-company colleague avatar is readable');

select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from storage.objects where id = '35000000-0000-0000-0000-000000000005'), 0, 'foreign-company avatar is hidden');
select ok(
  (select qual from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_storage_delete')
    like '%owner_id%auth.uid%',
  'avatar delete policy remains restricted to the file owner'
);

select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values (
    '35000000-0000-0000-0000-000000000006', 'avatars',
    '31000000-0000-0000-0000-000000000002/new-avatar.png',
    '31000000-0000-0000-0000-000000000002'
  )$$,
  'user can upload an avatar into the own folder'
);
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values (
    '35000000-0000-0000-0000-000000000007', 'avatars',
    '31000000-0000-0000-0000-000000000001/forged-avatar.png',
    '31000000-0000-0000-0000-000000000002'
  )$$,
  '42501', null,
  'user cannot upload an avatar into another profile folder'
);

select * from finish();
rollback;

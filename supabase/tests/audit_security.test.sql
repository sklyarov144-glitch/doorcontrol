begin;

select plan(4);

select has_column(
  'public',
  'activity_logs',
  'object_id',
  'activity log has object scope'
);

select ok(
  has_table_privilege('authenticated', 'public.activity_logs', 'select'),
  'authenticated users can read audit events allowed by RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.activity_logs', 'insert'),
  'authenticated browser users cannot forge audit events'
);

select ok(
  not has_function_privilege('authenticated', 'public.audit_object_id(text, jsonb)', 'execute'),
  'authenticated browser users cannot execute audit scope resolver'
);

select * from finish();

rollback;

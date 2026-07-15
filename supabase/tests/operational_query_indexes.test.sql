begin;

select plan(8);

select has_index('public', 'objects', 'objects_responsible_director_idx', 'object responsibility lookup is indexed');
select has_index('public', 'buildings', 'buildings_responsible_itr_idx', 'building responsibility lookup is indexed');
select has_index('public', 'doors', 'doors_mounted_pending_idx', 'overdue mounted doors lookup is indexed');
select has_index('public', 'document_items', 'document_items_door_idx', 'door documents lookup is indexed');
select has_index('public', 'task_links', 'task_links_task_created_idx', 'task links lookup is indexed');
select has_index('public', 'tn_issues', 'tn_issues_responsible_status_idx', 'responsible TN issues lookup is indexed');
select has_index('public', 'team_members', 'team_members_employee_idx', 'active employee membership lookup is indexed');
select has_index('public', 'team_assignments', 'team_assignments_team_idx', 'team assignment lookup is indexed');

select * from finish();
rollback;

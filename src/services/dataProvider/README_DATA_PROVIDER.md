# Data Provider

`dataProvider` is the boundary between UI modules and storage.

Implementations:
- `localProvider.js` keeps the isolated demo mode in browser `localStorage`;
- `supabaseProvider.js` is the required production provider for PostgreSQL, Auth,
  Storage and Edge Functions;
- provider selection is controlled by `VITE_DATA_PROVIDER` and production deploys
  require the Supabase configuration;
- the release verifier rejects the complete legacy `gross-lean-montage.*`
  browser-storage namespace and unfinished MVP UI markers in production bundles;
- production access checks are enforced by PostgreSQL RLS, not by UI filtering.

Business operations that span several tables must use transactional RPC functions.
For example, `doors.updateWorkflow()` updates the door and its active TN issue through
`update_door_workflow`, so a failed issue write cannot leave the door half-saved.

Main groups:
- `users`
- `objects`
- `buildings`
- `floors`
- `doors`
- `tasks`
- `notifications`
- `documentItems`
- `documents`
- `custodyActs`
- `teams`
- `workers`
- `employees`
- `workStandards`
- `objectWorkPlans`
- `dailyWorkReports`
- `manpowerRequests`
- `activityLogs`

Example:

```js
dataProvider.users.getAll();
dataProvider.users.create({ name, email, role });
dataProvider.users.update(id, values);
dataProvider.users.disable(id);
```

`users` are site accounts: ИТР, руководители, директора and creator. They have login, password, role and access rights.

`workers` are монтажники, грузчики and brigade staff without personal accounts. They are used only in brigades, daily facts, manpower planning and production reports. The local demo provider keeps them in its legacy `employees` key; production stores them only in PostgreSQL.

# Data Provider

`dataProvider` is the boundary between UI modules and storage.

Current implementation:
- `localProvider.js`
- browser `localStorage`
- synchronous CRUD methods for MVP speed

Future implementation:
- replace `localProvider` with a Supabase provider;
- keep the same method groups and method names;
- move access checks to backend policies / RLS.

Main groups:
- `users`
- `objects`
- `buildings`
- `doors`
- `tasks`
- `notifications`
- `documentItems`
- `teams`
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

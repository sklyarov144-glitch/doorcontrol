# Data Provider

`dataProvider` is the boundary between UI modules and storage.

Current implementation:
- `localProvider.js`
- browser `localStorage`
- synchronous CRUD methods for MVP speed
- application session through `dataProvider.auth`

Future implementation:
- replace `localProvider` with a Supabase provider;
- keep the same method groups and method names;
- move access checks to backend policies / RLS.

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

`workers` are монтажники, грузчики and brigade staff without personal accounts. They are used only in brigades, daily facts, manpower planning and production reports. For backward compatibility the MVP stores workers in the existing `employees` localStorage key too.

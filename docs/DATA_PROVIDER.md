# Data provider

Компоненты не должны знать, где физически хранятся данные. Для этого используется `src/services/dataProvider`.

Реализация `localProvider` работает с browser localStorage. `supabaseProvider`
реализует тот же публичный контракт для PostgreSQL через Supabase Data API.

Провайдер выбирается переменной `VITE_DATA_PROVIDER`:

- `local` (по умолчанию) сохраняет совместимый демо-режим;
- `supabase` требует `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.

Оба провайдера возвращают поля приложения в `camelCase`. Supabase-провайдер
преобразует их в `snake_case` на границе с базой. Его методы асинхронны; при
миграции экранов на backend вызовы должны выполняться через `await`.

## Контракт

- `auth`
- `users`
- `objects`
- `buildings`
- `floors`
- `doors`
- `tasks`
- `notifications`
- `documents` / `documentItems`
- `custodyActs`
- `teams`
- `workers` / `employees`
- `workStandards`
- `objectWorkPlans`
- `dailyWorkReports`
- `manpowerRequests`
- `activityLogs`

Коллекции поддерживают операции `getAll`, `getById`, `create`, `update` и
`disable`. `replaceAll` остаётся только в локальном провайдере для совместимости
с текущим MVP и не должен использоваться в production.

## Правила

1. Не обращаться к localStorage из новых React-компонентов.
2. Бизнес-логику размещать в domain или сервисах, а не в provider.
3. Provider отвечает за чтение, запись и преобразование транспортного формата.
4. Секретные backend-ключи никогда не должны попадать во frontend.
5. Production provider переключается конфигурацией окружения.

Экраны производственного планирования (`brigade_plan`, `manpower`) уже разделяют
runtime: при `supabase` они используют асинхронные CRUD-методы провайдера, а
legacy localStorage-компоненты остаются только для локальной демонстрации.

Старые ключи localStorage сохранены, поэтому пользовательские данные MVP продолжают загружаться после обновления архитектуры.

Подключение локального и облачного окружения описано в
[SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

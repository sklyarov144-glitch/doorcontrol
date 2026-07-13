# Data provider

Компоненты не должны знать, где физически хранятся данные. Для этого используется `src/services/dataProvider`.

Текущая реализация `localProvider` работает с browser localStorage. Будущий `supabaseProvider` должен сохранить тот же публичный контракт.

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

Коллекции поддерживают операции `getAll`, `getById`, `create`, `update`, `disable` и `replaceAll`, где это применимо.

## Правила

1. Не обращаться к localStorage из новых React-компонентов.
2. Бизнес-логику размещать в domain или сервисах, а не в provider.
3. Provider отвечает за чтение, запись и преобразование транспортного формата.
4. Секретные backend-ключи никогда не должны попадать во frontend.
5. Production provider переключается конфигурацией окружения.

Старые ключи localStorage сохранены, поэтому пользовательские данные MVP продолжают загружаться после обновления архитектуры.

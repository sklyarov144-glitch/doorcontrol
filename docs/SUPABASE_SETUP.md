# Supabase: локальный запуск и подключение

## Режимы данных

По умолчанию приложение работает в демо-режиме через `localStorage`.

```bash
cp .env.example .env.local
npm run dev
```

Для Supabase укажите публичные значения проекта:

```env
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
```

`service_role` нельзя хранить в `.env` фронтенда или использовать в браузере.

## Локальная база

Требуется запущенный Docker Desktop.

```bash
npm run supabase:start
npm run supabase:reset
```

Команда `supabase:reset` применяет миграции из `supabase/migrations` и seed.
Публичные локальные URL и anon key выводятся командой:

```bash
npm run supabase:status
```

## Облачный проект

1. Создайте отдельные Supabase-проекты для staging и production.
2. Свяжите локальный каталог: `npx supabase link --project-ref PROJECT_REF`.
3. Проверьте изменения: `npx supabase db diff`.
4. Примените миграции: `npx supabase db push`.
5. Примените миграции до создания первого аккаунта.
6. Первого `creator` создайте один раз командой `npm run auth:bootstrap`.
7. Всех последующих пользователей приглашайте из раздела «Пользователи».

Пример bootstrap без сохранения service key в файле:

```bash
SUPABASE_URL=https://PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY='service-role-key' \
APP_PUBLIC_URL=https://app.example.ru \
BOOTSTRAP_COMPANY_NAME='ГРОСС' \
BOOTSTRAP_CREATOR_EMAIL=owner@example.ru \
BOOTSTRAP_CREATOR_NAME='Иван Иванов' \
npm run auth:bootstrap
```

Команда откажется работать, если в `profiles` уже существует хотя бы один
пользователь. Service role используется только локальным операционным скриптом и
никогда не попадает во frontend или GitHub log.

Миграция `202607140017_scheduled_overdue_tasks.sql` включает `pg_cron` и создаёт
серверную проверку просрочек каждые 30 минут. После применения миграций проверьте
job и историю запусков по инструкции в [RUNBOOK.md](./RUNBOOK.md).

Приложение не переключается на облачную базу автоматически: это происходит только при `VITE_DATA_PROVIDER=supabase`.

Настройка реальных аккаунтов и серверного создания пользователей описана в
[AUTHENTICATION.md](./AUTHENTICATION.md).

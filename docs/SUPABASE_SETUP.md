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
5. Создавайте пользователей через Supabase Auth с metadata: `company_id`, `name`, `role`, `position`.

Приложение не переключается на облачную базу автоматически: это происходит только при `VITE_DATA_PROVIDER=supabase`.


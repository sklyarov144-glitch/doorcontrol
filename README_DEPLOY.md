# Развёртывание "ГРОСС Бережливый Монтаж"

Production-архитектура: Vercel (React/Vite), Supabase (PostgreSQL, Auth, Storage, Edge Functions), Sentry (ошибки и производительность).

## Локальная проверка

```bash
npm ci
cp .env.example .env.local
npm run ci
npm run dev
```

Для локального демо оставьте `VITE_DATA_PROVIDER=local`. Для подключения к Supabase установите `VITE_DATA_PROVIDER=supabase`, URL проекта и публичный anon key.

## Среды

- `local`: разработка, допускается local provider.
- `staging`: отдельные проекты Vercel и Supabase, тестовые данные.
- `production`: отдельные проекты и секреты, только Supabase provider.

Настройка сред и секретов описана в [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md). Порядок выпуска — в [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Автоматизация

- `CI`: lint, тесты, production build и аудит production-зависимостей.
- `Deploy staging`: автоматически после успешного push в `main`, также запускается вручную.
- `Deploy production`: только вручную, с подтверждением `DEPLOY` и защитой GitHub Environment.
- `Encrypted production database backup`: ежедневный зашифрованный логический backup; основной механизм восстановления — Supabase backups/PITR.

После каждого деплоя выполняется smoke-проверка `/` и `/login`. Операционные действия при сбое описаны в [docs/RUNBOOK.md](docs/RUNBOOK.md).

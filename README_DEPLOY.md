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

- `CI`: lint, тесты, local и Supabase production builds, проверка отсутствия
  demo/PII в production bundle, аудит production-зависимостей, применение
  всех миграций с нуля и database lint в локальном Supabase.
- `Deploy staging`: автоматически только после полностью успешной CI для push в `main`, также запускается вручную.
- `Deploy production`: только вручную, с подтверждением `DEPLOY` и защитой GitHub Environment.
- `Encrypted production database backup`: ежедневный зашифрованный логический backup; основной механизм восстановления — Supabase backups/PITR.
- `Production backup restore drill`: ручная проверка выбранного backup в одноразовом локальном Supabase с evidence-артефактом.

Staging и production workflow явно требуют Supabase URL/anon key и собирают
frontend только с `VITE_DATA_PROVIDER=supabase`; отсутствие runtime-конфигурации
останавливает staging/production до изменения базы или публикации сайта. Staging
также требует smoke-аккаунты всех четырёх ролей и не пропускает эту проверку молча.

После каждого деплоя выполняется smoke-проверка `/` и `/login`. Операционные действия при сбое описаны в [docs/RUNBOOK.md](docs/RUNBOOK.md).

Подготовка реальных данных и допуск пилота описаны в [docs/PILOT_PLAN.md](docs/PILOT_PLAN.md), [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md), [docs/PRODUCTION_HANDOFF.md](docs/PRODUCTION_HANDOFF.md) и [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md).

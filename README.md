# ГРОСС Бережливый Монтаж

Внутренняя цифровая система компании ГРОСС для управления монтажом дверей: от объекта и корпуса до конкретной двери, бригады, задачи, замечания и финансового показателя.

Публичный сайт-визитка не входит в текущий продуктовый контур и может быть реализован отдельно после стабилизации рабочей системы.

## Что уже реализовано

- визуальный маршрут `Объект -> Корпус -> Этаж -> Дверь`;
- роли `creator`, `company_head`, `construction_director`, `itr` и RLS-доступ по компании/назначениям;
- Supabase Auth, приглашения, восстановление пароля и управление активностью аккаунтов;
- PostgreSQL-модель объектов, дверей, задач, уведомлений, документов, актов ОХ и замечаний ТН;
- атомарное сохранение карточки двери, замечания ТН, акта ОХ, документов задач и структуры объекта;
- центр проблем, задачи, уведомления, контроль актов ОХ и замечаний ТН;
- бригады, нормы, план-факт, заявки на рабочую силу и управленческий дашборд;
- договоры, бюджеты, финансовые операции и финансовая сводка;
- приватное Supabase Storage для документов, планов и аватаров;
- аудит действий, Sentry, CI, миграции, pgTAP/RLS-тесты, backup и restore drill;
- отдельный local demo provider для разработки и презентаций без backend.

## Технологии

- React 19, Vite;
- Supabase PostgreSQL, Auth, Storage и Edge Functions;
- Vercel для frontend-развёртывания;
- Vitest, ESLint, pgTAP и Supabase database lint;
- GitHub Actions для CI, staging, production и резервного копирования.

## Локальный demo-режим

Требуется Node.js из [`.nvmrc`](.nvmrc).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

В `.env.local` оставьте `VITE_DATA_PROVIDER=local`. Demo-аккаунты показываются на странице входа; данные сохраняются только в браузере и не предназначены для эксплуатации.

## Локальный Supabase-режим

```bash
npm ci
npx supabase start
npx supabase db reset --local
```

Укажите полученные локальные URL и anon key в `.env.local`, затем установите:

```text
VITE_DATA_PROVIDER=supabase
```

Создание первого владельца и проверка ролей описаны в [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) и [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Проверка

```bash
npm run ci
```

Команда выполняет lint, проверку служебных скриптов, unit/component-тесты, production build и аудит production-зависимостей. GitHub CI дополнительно поднимает чистый Supabase, применяет все миграции, запускает database lint и pgTAP/RLS-тесты.

## Развёртывание

Production-сборка обязана использовать `VITE_DATA_PROVIDER=supabase`. Публикация без Supabase-конфигурации блокируется проверками workflow.

- краткий порядок: [README_DEPLOY.md](README_DEPLOY.md);
- среды и секреты: [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md);
- полный выпуск: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md);
- запуск пилота: [docs/PILOT_PLAN.md](docs/PILOT_PLAN.md);
- go-live: [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md);
- действия при сбое: [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Текущий статус

Проект находится на переходе от функционального MVP к пилотной рабочей системе. Технический production-контур подготовлен, но реальный запуск требует настроенных проектов Supabase/Vercel, домена, SMTP, Sentry, backup/PITR, импорта данных и подписанного UAT.

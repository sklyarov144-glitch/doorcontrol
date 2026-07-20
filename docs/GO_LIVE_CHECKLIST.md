# Go-live checklist

## Обязательные условия

- [x] CI зелёный на release SHA.
- [ ] `main` защищена и `npm run deployment:audit-branch -- --strict` успешен.
- [ ] Изменения в `main` проходят только через PR с обязательными `verify`, `database`, `e2e`.
- [ ] Staging deployment и smoke успешны.
  Текущий запуск остановлен до публикации frontend: в staging отсутствуют
  `VITE_SENTRY_DSN`, а последний Vercel token был отклонён. Нужен новый полный
  staging release и immutable evidence.
- [x] Staging workflow сохраняет immutable release evidence и связывает его с CI run того же SHA; production повторно скачивает и валидирует artifact.
- [ ] Все migrations применены к staging.
- [ ] Структура production сверена со staging перед выпуском.
- [ ] UAT evidence прошёл `npm run pilot:uat` и подписан владельцем продукта и представителем ИТР.
- [ ] Production secret `UAT_EVIDENCE_JSON` содержит протокол именно для выпускаемого staging SHA.
- [ ] `PILOT_RECONCILIATION_EVIDENCE_JSON` содержит точную сверку импортированных
  объектов, корпусов, этажей и дверей для выпускаемого staging SHA.
- [ ] `RESTORE_EVIDENCE_JSON` подтверждает restore drill не старше 30 дней и RTO
  не более 4 часов.
- [ ] `PRODUCTION_HANDOFF_JSON` связан с release SHA, production-доменом и
  reconciliation evidence; владельцы и окно выпуска подтверждены.
- [ ] UAT использует staging evidence с `productionEligible: true`.
- [x] RLS автоматически проверен в CI минимум двумя компаниями и четырьмя ролями.
- [ ] RLS повторно проверен на staging реальными Auth JWT минимум двумя компаниями и четырьмя ролями.
- [ ] Staging `auth:smoke` прошёл четырьмя отдельными тестовыми аккаунтами.
  В CI role-smoke покрыт тестами, но полный staging workflow ещё не дошёл до
  этого шага на актуальном release SHA.
- [ ] Импорт прошёл preflight, а post-import reconciliation сохранён и не содержит расхождений.
- [ ] Production secrets заданы, MFA включена у администраторов.
- [ ] Auth Site URL и redirect allowlist содержат production-домен.
- [ ] Публичная регистрация Auth отключена, приглашение и восстановление пароля проверены через production SMTP.
- [ ] `APP_PUBLIC_URL` и `APP_ALLOWED_ORIGINS` функций совпадают с production-доменом.
- [ ] Supabase native backup/PITR включён.
- [ ] Supabase Cron включён, job `gross-sync-overdue-door-tasks` активен и имеет успешный запуск.
- [ ] Restore drill выполнен не более 30 дней назад.
- [x] Restore drill автоматизирован и создаёт проверяемый evidence-артефакт в изолированном окружении.
- [ ] Последний encrypted backup содержит роли, схему, данные и приватные Storage-объекты и прошёл обе manifest verification.
- [ ] Authenticated domain load smoke под ИТР прошёл с p95 не более 2,5 секунд.
- [ ] Sentry alert и контакт ответственного проверены.
- [ ] Runbook доступен техническому и бизнес-ответственному и подтверждён в handoff.
- [ ] План отката и окно выпуска согласованы.

Подтверждения текущего staging-релиза: [STAGING_EVIDENCE.md](STAGING_EVIDENCE.md).

## После выпуска

- [ ] Smoke `/` и `/login` успешен.
- [ ] Канонический production-домен прошёл автоматический HTTPS/security smoke, release evidence сохранён.
- [ ] Вход каждой роли проверен.
- [ ] Автоматический production role-smoke и authenticated ITR domain load прошли.
- [ ] Основной ИТР-маршрут проверен на production тестовом объекте.
- [ ] Создание/изменение/чтение реальной двери проверено.
- [ ] Загрузка и открытие приватного документа проверены.
- [ ] Метрики ошибок и latency наблюдаются первые 2 часа.
- [ ] Пользователям отправлена инструкция и контакт поддержки.

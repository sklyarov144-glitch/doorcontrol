# Безопасность, аудит и мониторинг

## Контроль доступа

- Supabase Auth отвечает за сессии и пароли.
- PostgreSQL RLS ограничивает компанию, объекты и корпуса.
- Service role key не используется во frontend.
- Минимальный пароль: 10 символов, верхний/нижний регистр и цифры.
- Роль, компания и статус профиля защищены отдельным trigger guard.
- Связки `company → object → building → floor → door` проверяются PostgreSQL
  перед записью документов, задач, уведомлений, план-факта и финансовых строк.
  Неполный scope или идентификаторы из разных веток отклоняются независимо от UI.
- Назначение ИТР на один корпус открывает родительский объект для навигации, но
  не даёт доступ к соседним корпусам без отдельного назначения на объект/корпус.

## Двухфакторная защита

Supabase TOTP используется для ролей `creator`, `company_head` и
`construction_director`. ИТР входит по паролю без обязательного второго фактора.
Регистрация фактора и его отключение доступны в личном кабинете. При включённом
`VITE_REQUIRE_PRIVILEGED_MFA=true` приложение после пароля требует шестизначный
код и не загружает доменные данные до достижения сессией уровня `aal2`.
После первой регистрации фактора проверка становится обязательной и на staging.
PostgreSQL trigger guard независимо от frontend запрещает insert/update/delete
для привилегированных ролей с `aal1`; рабочие операции роли ИТР остаются доступны.

Staging сохраняет `VITE_REQUIRE_PRIVILEGED_MFA=false`, пока три привилегированных
smoke-аккаунта не зарегистрируют TOTP. Production workflow всегда собирает
приложение с `VITE_REQUIRE_PRIVILEGED_MFA=true` и требует отдельные GitHub secrets:

- `AUTH_SMOKE_CREATOR_TOTP_SECRET`;
- `AUTH_SMOKE_COMPANY_HEAD_TOTP_SECRET`;
- `AUTH_SMOKE_CONSTRUCTION_DIRECTOR_TOTP_SECRET`.

Эти секреты нужны только автоматическому production smoke и не попадают во
frontend bundle. Staging и production используют разные аккаунты и разные
факторы; переносить TOTP secret между средами запрещено.

Первичное подключение факторов выполняется fail-closed командой отдельно для
каждой среды. Путь вывода обязан быть абсолютным и находиться вне репозитория:

```bash
MFA_BOOTSTRAP_CONFIRM=STAGING \
MFA_BOOTSTRAP_OUTPUT="$HOME/.gross-secrets/staging-smoke-mfa.json" \
npm run auth:mfa:bootstrap
```

Команда входит тремя привилегированными smoke-аккаунтами, регистрирует TOTP,
достигает `aal2` и проверяет PostgreSQL-функцию `privileged_mfa_satisfied()`.
Секреты не печатаются; JSON создаётся с правами `0600` и не перезаписывается без
`MFA_BOOTSTRAP_OVERWRITE=1`. Значения из поля `secrets` нужно поместить в
соответствующий GitHub Environment и корпоративный password manager, после чего
проверить их без создания новых факторов:

```bash
MFA_BOOTSTRAP_CONFIRM=STAGING npm run auth:mfa:verify
```

Для production повторяется та же процедура с `MFA_BOOTSTRAP_CONFIRM=PRODUCTION`
и production URL, аккаунтами и anon key. Если у аккаунта уже есть verified-factor,
а его secret утрачен, bootstrap останавливается: фактор сбрасывает только
уполномоченный администратор Supabase после проверки личности пользователя.

## Аудит

`activity_logs` автоматически фиксирует insert/update/delete для профилей,
объектов, корпусов, этажей, дверей, задач, комментариев, документов, актов,
замечаний ТН, бригад, сотрудников, план-факта, заявок на рабочих и финансовых
операций.

Импорт реальной иерархии дополнительно требует точного подтверждения среды,
company UUID и SHA-256 источника. Hosted URL обязан совпасть с явным
`SUPABASE_PROJECT_ID`. Уже импортированные `legacy_id` и родительские связи
Объект → Корпус → Этаж → Дверь неизменяемы PostgreSQL-триггером, поэтому ошибка
в повторном файле не может незаметно перенести сущность в другой контур.

Из payload исключаются `email`, `phone`, `avatar_url` и `url`. Журнал неизменяем:
update/delete блокируются PostgreSQL-триггером, а прямой insert из браузера
запрещён. В интерфейсе журнал доступен создателю и руководителю по всей компании,
директору строительства — только по назначенным объектам. ИТР журнал не видит.

## Ошибки

Sentry включается только при наличии `VITE_SENTRY_DSN`. По умолчанию PII не
отправляется; request headers/cookies удаляются, пользователь представлен только
`id` и `role`.

Каждый deployment выполняет отдельный ingestion smoke через Sentry Envelope API.
Событие содержит только environment, release SHA и технический тег
`smoke_test=deployment`. Результат сохраняется артефактом
`*-sentry-smoke-<release SHA>` с `eventId` и HTTP-статусом. Staging до подключения
DSN сохраняет evidence с `configured=false` и явное предупреждение; production
без принятого Sentry события не выпускается.

Локальная проверка тем же механизмом:

```bash
VITE_SENTRY_DSN=https://... \
SENTRY_ENVIRONMENT=staging \
SENTRY_RELEASE=$(git rev-parse HEAD) \
npm run monitoring:smoke
```

Успешный ingestion smoke подтверждает приём события, но не заменяет ручную
проверку alert rule и контакта ответственного в Sentry.

## Production bundle

После `vercel build`, но до публикации, workflow запускает `verify:bundle`.
Проверка подтверждает наличие настроенного Supabase origin и останавливает релиз
при обнаружении legacy demo/PII-маркеров. Реальные ФИО, телефоны и demo-пароли
не должны храниться в исходном mock-наборе или попадать в frontend bundle.

## HTTP

Vercel добавляет CSP, запрет iframe, `nosniff`, строгий referrer policy и запрет
камеры/микрофона/геолокации. Перед добавлением нового внешнего сервиса его домен
нужно явно включить в CSP.

## Health check

Edge Function `health` проверяет доступность PostgreSQL и возвращает только
технический статус и latency, без бизнес-данных.

```bash
npx supabase functions deploy health
curl \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  https://PROJECT.supabase.co/functions/v1/health
```

Health остаётся под JWT-проверкой Supabase gateway. Uptime monitor должен
передавать anon key в обоих заголовках; service role для мониторинга запрещён.

## Перед production

1. Зарегистрировать TOTP у привилегированных пользователей приложения и включить MFA владельцам Supabase/Vercel/GitHub.
2. Настроить Sentry alerts и uptime monitor на health endpoint.
3. Провести RLS integration tests реальными JWT всех ролей.
4. Зафиксировать процедуру отзыва пользователя и ротации ключей.
5. Проверить восстановление backup на отдельном staging-проекте.

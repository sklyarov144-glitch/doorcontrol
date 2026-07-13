# Безопасность, аудит и мониторинг

## Контроль доступа

- Supabase Auth отвечает за сессии и пароли.
- PostgreSQL RLS ограничивает компанию, объекты и корпуса.
- Service role key не используется во frontend.
- Минимальный пароль: 10 символов, верхний/нижний регистр и цифры.
- Роль, компания и статус профиля защищены отдельным trigger guard.

## Аудит

`activity_logs` автоматически фиксирует insert/update/delete для профилей,
объектов, корпусов, этажей, дверей, задач, комментариев, документов, актов и
замечаний ТН.

Из payload исключаются `email`, `phone`, `avatar_url` и `url`. Журнал неизменяем:
update/delete блокируются PostgreSQL-триггером. Просмотр доступен только
управленческим ролям своей компании.

## Ошибки

Sentry включается только при наличии `VITE_SENTRY_DSN`. По умолчанию PII не
отправляется; request headers/cookies удаляются, пользователь представлен только
`id` и `role`.

## HTTP

Vercel добавляет CSP, запрет iframe, `nosniff`, строгий referrer policy и запрет
камеры/микрофона/геолокации. Перед добавлением нового внешнего сервиса его домен
нужно явно включить в CSP.

## Health check

Edge Function `health` проверяет доступность PostgreSQL и возвращает только
технический статус и latency, без бизнес-данных.

```bash
npx supabase functions deploy health
curl https://PROJECT.supabase.co/functions/v1/health
```

## Перед production

1. Включить MFA для владельцев Supabase/Vercel/GitHub.
2. Настроить Sentry alerts и uptime monitor на health endpoint.
3. Провести RLS integration tests реальными JWT всех ролей.
4. Зафиксировать процедуру отзыва пользователя и ротации ключей.
5. Проверить восстановление backup на отдельном staging-проекте.


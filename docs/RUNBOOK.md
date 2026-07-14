# Операционный runbook

## Frontend не открывается

1. Проверить Vercel deployment status и smoke step.
2. Открыть предыдущий deployment; если он исправен, выполнить rollback/promotion.
3. Проверить DNS и TLS только если не открываются оба deployment URL.
4. Проверить Sentry release на массовую frontend-ошибку.

## Вход не работает

1. Проверить Supabase status и health Edge Function.
2. Проверить Auth URL allowlist и время/дату клиента.
3. Проверить, что профиль пользователя активен и связан с Auth user.
4. Не сбрасывать пароль и не менять роль без подтверждения личности и записи в аудит.

## Данные недоступны

1. Проверить health endpoint и Supabase Database status.
2. Проверить ошибки RLS в browser network log без публикации токенов.
3. Проверить последнюю migration и audit log.
4. При ошибке схемы выпускать forward-fix; не выполнять destructive rollback.

## Автоматические задачи не создаются

1. Проверить, что cron-задача активна:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'gross-sync-overdue-door-tasks';
```

2. Проверить последние запуски и текст ошибки:

```sql
select status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (
  select jobid from cron.job where jobname = 'gross-sync-overdue-door-tasks'
)
order by start_time desc
limit 10;
```

3. Запустить `select public.sync_all_overdue_door_tasks();` из SQL Editor под
   серверной ролью и проверить новые строки в `tasks` и `notifications`.
4. Убедиться, что у двери заполнены `mounted_at`, назначен ИТР и срок действительно
   превышает два дня для ТН или три дня для акта АОХ.

## Инцидент безопасности

1. Отозвать скомпрометированные токены/сессии.
2. Ограничить доступ к проектам Vercel/Supabase/GitHub.
3. Сохранить audit и deployment logs.
4. Оценить затронутые компании и записи.
5. Уведомить владельца данных, выпустить исправление и сменить секреты.

## Контроль после релиза

- `/` и `/login` отвечают 200;
- health function возвращает `status=ok`;
- вход creator/company_head/construction_director/itr работает;
- ИТР видит только назначенные объекты;
- загрузка приватного документа выдаёт signed URL, а не публичный URL;
- Sentry не получает email, телефон, cookie или Authorization headers.

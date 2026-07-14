# Файловое хранилище

Production использует приватные Supabase Storage buckets:

- `documents`: акты, документы и рабочие вложения до 50 МБ;
- `floor-plans`: изображения/PDF планов этажей до 20 МБ;
- `avatars`: JPEG/PNG/WebP до 5 МБ.

Публичный доступ отключён. Клиент получает signed URL с коротким сроком жизни.
В таблицах хранится URI вида `storage://bucket/path`, а не signed URL и не base64.

## Структура путей

```text
documents/{companyId}/{objectId}/{uuid}.{ext}
floor-plans/{companyId}/{objectId}/{buildingId}/{floorId}/{uuid}.{ext}
avatars/{userId}/{uuid}.{ext}
```

RLS проверяет компанию и доступ к объекту по сегментам пути. Пользователь видит
только собственный аватар. Удаление проектных документов и планов ограничено
административными ролями.

## Правила

1. Не хранить service role key во frontend.
2. Не сохранять signed URL как постоянную ссылку.
3. Не загружать файлы в localStorage в production.
4. Проверять MIME и размер одновременно в клиенте и настройках bucket.
5. При удалении бизнес-сущности удалять связанный файл отдельной фоновой задачей.

Админ-панель загружает подложку типового этажа напрямую в `floor-plans`. В
`buildings.floor_template` сохраняется постоянный `storage://floor-plans/...`
URI; при чтении дерева объектов provider выдаёт временную signed-ссылку для
отрисовки. Base64-планы в production не сохраняются.

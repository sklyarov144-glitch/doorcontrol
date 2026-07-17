import { useCallback, useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";
import { fileService } from "../../services/files";
import { storageLocationFromUri } from "../../services/files/filePolicy";
import { persistUploadedFile } from "../../services/files/uploadLifecycle";

export default function RemoteDocumentsPage({
  objects,
  user,
  provider = dataProvider,
  files = fileService,
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstObject = objects[0];
  const [form, setForm] = useState({
    objectId: firstObject?.id ?? "",
    buildingId: firstObject?.buildings[0]?.id ?? "",
    title: "",
    category: "document",
    url: "",
    comment: "",
    file: null,
  });
  const selectedObject = objects.find((item) => item.id === form.objectId) ?? firstObject;
  const names = useMemo(() => ({
    objects: new Map(objects.map((item) => [item.id, item.name])),
    buildings: new Map(objects.flatMap((object) => object.buildings.map((building) => [building.id, building.name]))),
  }), [objects]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDocuments(await provider.documents.getAll());
    } catch (loadError) {
      setError(loadError?.message ?? "Не удалось загрузить документы");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!form.objectId && objects[0]) {
      setForm((current) => ({ ...current, objectId: objects[0].id, buildingId: objects[0].buildings[0]?.id ?? "" }));
    }
  }, [form.objectId, objects]);

  const submit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!form.objectId || (!form.url && !form.file)) return;
    setSaving(true);
    setError("");
    try {
      const persist = (url) => provider.documents.create({
        companyId: user.companyId,
        objectId: form.objectId,
        buildingId: form.buildingId || null,
        title: form.title.trim() || form.file?.name || "Документ",
        category: form.category,
        url,
        comment: form.comment.trim() || null,
        createdBy: user.id,
      });
      if (form.file) {
        await persistUploadedFile({
          upload: () => files.uploadDocument({ companyId: user.companyId, objectId: form.objectId }, form.file),
          persist: (uploaded) => persist(uploaded.uri),
          remove: (uploaded) => files.remove(uploaded.bucket, [uploaded.path]),
        });
      } else {
        await persist(form.url.trim());
      }
      setForm((current) => ({ ...current, title: "", url: "", comment: "", file: null }));
      formElement.reset();
      await load();
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось сохранить документ");
    } finally {
      setSaving(false);
    }
  };

  const openDocument = async (document) => {
    setError("");
    try {
      const location = storageLocationFromUri(document.url);
      const url = location ? await files.createSignedUrl(location.bucket, location.path) : document.url;
      if (!url) throw new Error("У документа не указана ссылка");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(openError?.message ?? "Не удалось открыть документ");
    }
  };

  return <section className="documents-page">
    <div className="documents-hero"><div><span>Документы объектов</span><h2>Единый реестр документов</h2><p>Ссылки и файлы доступны назначенным сотрудникам и сохраняются в контуре компании.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <form className="brigade-card object-plan-form" onSubmit={submit}>
      <label>Объект<select value={form.objectId} onChange={(event) => setForm({ ...form, objectId: event.target.value, buildingId: objects.find((item) => item.id === event.target.value)?.buildings[0]?.id ?? "" })} required>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Корпус<select value={form.buildingId} onChange={(event) => setForm({ ...form, buildingId: event.target.value })}><option value="">Весь объект</option>{selectedObject?.buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Название<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Шахматка корпуса 4.1" /></label>
      <label>Категория<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="matrix">Шахматка</option><option value="custody_act">Акт ОХ</option><option value="floor_plan">План этажа</option><option value="photo">Фото</option><option value="document">Документ</option></select></label>
      <label className="wide">Ссылка<input type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://disk.yandex.ru/..." disabled={Boolean(form.file)} /></label>
      <label className="wide">Или загрузить файл<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] ?? null, url: "" })} /></label>
      <label className="wide">Комментарий<textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label>
      <button className="primary-button" disabled={saving || !objects.length}>{saving ? "Сохраняем..." : "Добавить документ"}</button>
    </form>
    {loading ? <div className="empty-plan">Загружаем документы...</div> : <div className="documents-grid">
      {documents.map((document) => <article className="document-card" key={document.id}><div className="document-icon">Г</div><div className="document-card-body"><h3>{document.title}</h3><dl><div><dt>Объект</dt><dd>{names.objects.get(document.objectId) ?? "—"}</dd></div><div><dt>Корпус</dt><dd>{names.buildings.get(document.buildingId) ?? "Весь объект"}</dd></div><div><dt>Категория</dt><dd>{document.category}</dd></div></dl>{document.comment && <p>{document.comment}</p>}<button className="primary-button document-link" type="button" onClick={() => openDocument(document)}>Открыть документ</button></div></article>)}
      {!documents.length && <div className="empty-plan">Документы пока не добавлены.</div>}
    </div>}
  </section>;
}

import React, { useState } from "react";
import { Detail, StatusBadge } from "../components/UiPrimitives";

const doorStatusOptions = [
  "не начато",
  "доставлена",
  "смонтирована",
  "замечание",
  "принято технадзором",
  "передано по акту",
];

const openingStatusOptions = [
  "готов",
  "требует корректировки",
  "передан на исправление",
  "исправлен",
];

const issueOptions = ["нет", "есть замечание", "устранено"];
const storageActOptions = ["не передана", "акт подготовлен", "акт загружен", "передано по акту"];

export default function DoorDetails({
  object,
  building,
  floor,
  door,
  onSave,
  onBack,
  onCreateTask,
  canCreateTask = false,
}) {
  const [form, setForm] = useState({
    doorStatus: door.doorStatus,
    openingStatus: door.openingStatus,
    issue: door.issue,
    storageAct: door.storageAct,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [actModalOpen, setActModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  React.useEffect(() => {
    setForm({
      doorStatus: door.doorStatus,
      openingStatus: door.openingStatus,
      issue: door.issue,
      storageAct: door.storageAct,
    });
    setSaved(false);
    setSaveError("");
  }, [door.id]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const persist = async (values) => {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      await onSave(door.id, values);
      setSaved(true);
      return true;
    } catch {
      setSaveError("Не удалось сохранить изменения. Проверьте соединение и повторите попытку.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await persist(form);
  };

  const saveFastAction = async (patch, message) => {
    const nextForm = {
      ...form,
      doorStatus: patch.doorStatus ?? form.doorStatus,
      openingStatus: patch.openingStatus ?? form.openingStatus,
      issue: patch.issue ?? form.issue,
      storageAct: patch.storageAct ?? form.storageAct,
    };
    setForm(nextForm);
    return persist({ ...nextForm, ...patch, quickHistory: message });
  };

  const saveActLink = async ({ title, url, comment }) => {
    const link = {
      id: `door-act-${door.id}-${Date.now()}`,
      title: title || "Акт АОХ",
      url,
      category: "акт АОХ",
      comment,
      createdAt: new Date().toLocaleString("ru-RU"),
    };
    const success = await saveFastAction(
      {
        storageAct: "акт загружен",
        custodyActUrl: url,
        actTitle: link.title,
        actComment: comment,
        documentLinks: [link, ...(door.documentLinks ?? [])],
      },
      `Добавлена ссылка на акт АОХ${comment ? `: ${comment}` : ""}`
    );
    if (success) setActModalOpen(false);
  };

  const saveComment = async (text) => {
    if (await saveFastAction({}, `Комментарий: ${text}`)) setCommentModalOpen(false);
  };

  return (
    <section className="door-layout">
      <form className="panel door-form" onSubmit={handleSubmit}>
        <div className="panel-title">
          <div>
            <h2>{door.number}</h2>
            <p>
              {object.name} / {building.name} / Этаж {floor.number}
            </p>
          </div>
          <div className="heading-actions">
            <StatusBadge value={form.doorStatus} />
            {canCreateTask && (
              <button
                className="secondary-button slim"
                type="button"
                onClick={() => onCreateTask({
                  objectId: object.id,
                  buildingId: building.id,
                  floorId: floor.id,
                  doorId: door.id,
                })}
              >
                Поставить задачу
              </button>
            )}
          </div>
        </div>
        <div className="detail-grid">
          <Detail label="Номер двери" value={door.number} />
          <Detail label="Марка двери" value={door.mark ?? door.number} />
          <Detail label="Тип двери" value={door.type} />
          <Detail
            label="Ссылка на акт ОХ"
            value={door.custodyActUrl
              ? <a href={door.custodyActUrl} target="_blank" rel="noreferrer">Открыть акт</a>
              : "Не добавлена"}
          />
          <SelectField
            label="Статус двери"
            value={form.doorStatus}
            options={doorStatusOptions}
            onChange={(value) => handleChange("doorStatus", value)}
          />
          <SelectField
            label="Статус проема"
            value={form.openingStatus}
            options={openingStatusOptions}
            onChange={(value) => handleChange("openingStatus", value)}
          />
          <SelectField
            label="Замечания"
            value={form.issue}
            options={issueOptions}
            onChange={(value) => handleChange("issue", value)}
          />
          <SelectField
            label="Акт ответственного хранения"
            value={form.storageAct}
            options={storageActOptions}
            onChange={(value) => handleChange("storageAct", value)}
          />
        </div>
        <div className="itr-fast-panel">
          <div>
            <h3>Быстрые действия ИТР</h3>
            <p>Частые операции без переходов и лишних экранов.</p>
          </div>
          <div className="itr-fast-actions">
            <button type="button" disabled={saving} onClick={() => saveFastAction({ doorStatus: "доставлена", ordered: "Да", arrived: "Да" }, "Дверь отмечена как пришедшая")}>Пришло</button>
            <button type="button" disabled={saving} onClick={() => saveFastAction({ lifted: "Да" }, "Дверь поднята на этаж")}>Поднято</button>
            <button type="button" disabled={saving} onClick={() => saveFastAction({ doorStatus: "смонтирована", installed: "Да" }, "Дверь смонтирована")}>Смонтировано</button>
            <button type="button" disabled={saving} onClick={() => saveFastAction({ tnTransferredAt: new Date().toISOString().slice(0, 10) }, "Дверь передана ТН")}>Передать ТН</button>
            <button type="button" disabled={saving} onClick={() => saveFastAction({ doorStatus: "принято технадзором", acceptedTN: "Да" }, "Дверь принята ТН")}>Принято ТН</button>
            <button type="button" disabled={saving} onClick={() => setActModalOpen(true)}>Добавить акт ОХ</button>
            <button type="button" disabled={saving} onClick={() => saveFastAction({ storageAct: "передано по акту", custodyAct: "Да" }, "Дверь передана по акту ОХ")}>Передано по акту</button>
            <button type="button" disabled={saving} onClick={() => saveFastAction({ issue: "есть замечание", tnIssues: "Да" }, "Есть замечание ТН")}>Есть замечание ТН</button>
            <button type="button" disabled={saving} onClick={() => saveFastAction({ issue: "устранено", tnIssues: "Нет" }, "Замечание устранено")}>Устранено</button>
            <button type="button" disabled={saving} onClick={() => setCommentModalOpen(true)}>Добавить комментарий</button>
          </div>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Назад к плану
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Сохраняем..." : "Сохранить изменения"}
          </button>
        </div>
        {saveError && <div className="form-error" role="alert">{saveError}</div>}
        {saved && <div className="save-notice">Изменения сохранены</div>}
        {door.documentLinks?.length > 0 && (
          <div className="linked-documents">
            <h3>Связанные документы</h3>
            {door.documentLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                {link.title} · {link.category}
              </a>
            ))}
          </div>
        )}
      </form>
      {actModalOpen && <DoorActModal onClose={() => setActModalOpen(false)} onSave={saveActLink} />}
      {commentModalOpen && <DoorCommentModal onClose={() => setCommentModalOpen(false)} onSave={saveComment} />}
      <aside className="panel history-panel">
        <div className="panel-title">
          <div>
            <h2>История изменений</h2>
            <p>История по двери</p>
          </div>
        </div>
        <div className="history-list">
          {(door.history ?? []).map((item) => (
            <div className="history-item" key={item.id}>
              <strong>{item.date}</strong>
              <small>{item.user}</small>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function DoorActModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: "Акт АОХ", url: "", comment: "" });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-title">
          <div>
            <h2>Добавить акт ОХ</h2>
            <p>Ссылка сохранится в карточке двери и документах двери.</p>
          </div>
          <button type="button" aria-label="Закрыть добавление акта" onClick={onClose}>×</button>
        </div>
        <label>Название<input value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
        <label>Ссылка на Яндекс.Диск<input required value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://disk.yandex.ru/..." /></label>
        <label>Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} placeholder="Например: акт подписан, файл загружен" /></label>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Отмена</button>
          <button className="primary-button">Сохранить акт</button>
        </div>
      </form>
    </div>
  );
}

function DoorCommentModal({ onClose, onSave }) {
  const [text, setText] = useState("");

  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); if (text.trim()) onSave(text.trim()); }}>
        <div className="modal-title">
          <div>
            <h2>Комментарий по двери</h2>
            <p>Комментарий попадёт в историю изменений.</p>
          </div>
          <button type="button" aria-label="Закрыть комментарий" onClick={onClose}>×</button>
        </div>
        <div className="quick-comments">
          {["Сделано", "Нет доступа", "Акт загрузил", "Ждём технадзор"].map((item) => (
            <button type="button" key={item} onClick={() => setText(item)}>{item}</button>
          ))}
        </div>
        <label>Комментарий<textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} /></label>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Отмена</button>
          <button className="primary-button">Добавить</button>
        </div>
      </form>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

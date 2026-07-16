import React, { useState } from "react";
import { canSeeManualTask, getTaskContext, isManualTaskOverdue } from "../domain/tasks";

const taskLinkCategories = ["акт АОХ", "фото", "документ", "прочее"];

function TaskCommentModal({ task, onClose, onSave }) {
  const [text, setText] = useState("");

  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); if (text.trim()) onSave(text.trim()); }}>
        <div className="modal-title"><div><h2>Комментарий</h2><p>{task.title}</p></div><button type="button" onClick={onClose}>×</button></div>
        <textarea aria-label="Комментарий к задаче" value={text} onChange={(event) => setText(event.target.value)} placeholder="Сделано, нет доступа, акт загрузил..." />
        <div className="quick-comments">{["Сделано", "Нет доступа", "Акт загрузил", "Ждём технадзор"].map((item) => <button type="button" key={item} onClick={() => setText(item)}>{item}</button>)}</div>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" type="submit">Добавить</button></div>
      </form>
    </div>
  );
}

export function TaskLinkModal({ task, defaultCategory = "документ", onClose, onSave }) {
  const [form, setForm] = useState({
    title: defaultCategory === "акт АОХ" ? "Акт АОХ" : "",
    url: "",
    category: defaultCategory,
    comment: "",
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); if (form.title.trim() && form.url.trim()) onSave({ ...form, title: form.title.trim(), url: form.url.trim() }); }}>
        <div className="modal-title"><div><h2>Добавить ссылку</h2><p>{task.title}</p></div><button type="button" onClick={onClose}>×</button></div>
        <label>Название ссылки<input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Акт АОХ / фото / документ" /></label>
        <label>Ссылка на Яндекс.Диск<input type="url" value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://disk.yandex.ru/..." /></label>
        <label>Категория<select value={form.category} onChange={(event) => update("category", event.target.value)}>{taskLinkCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" type="submit">Сохранить ссылку</button></div>
      </form>
    </div>
  );
}

export default function TasksPage({ tasks, objects, user, users, onOpen, onCreateTask, onUpdateTask, onAddComment, onAddLink }) {
  const isItr = user.role === "itr";
  const tabs = isItr
    ? ["Мои задачи", "Новые", "В работе", "Просроченные", "Выполненные"]
    : ["Все задачи", "Созданные мной", "Просроченные", "Выполненные"];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [commentTask, setCommentTask] = useState(null);
  const [linkTask, setLinkTask] = useState(null);
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const visibleTasks = tasks.filter((task) => canSeeManualTask(task, user));
  const filteredTasks = visibleTasks.filter((task) => {
    if (activeTab === "Созданные мной") return task.createdBy === user.id;
    if (activeTab === "Новые") return task.status === "новая";
    if (activeTab === "В работе") return task.status === "в работе";
    if (activeTab === "Просроченные") return isManualTaskOverdue(task);
    if (activeTab === "Выполненные") return task.status === "выполнена";
    return true;
  });
  const stats = {
    total: visibleTasks.length,
    new: visibleTasks.filter((task) => task.status === "новая").length,
    progress: visibleTasks.filter((task) => task.status === "в работе").length,
    overdue: visibleTasks.filter(isManualTaskOverdue).length,
    done: visibleTasks.filter((task) => task.status === "выполнена").length,
  };
  const openTaskTarget = (task) => {
    if (task.doorId || task.floorId || task.buildingId || task.objectId) onOpen(task);
  };

  return (
    <section className="manual-tasks-page">
      <div className="tasks-hero">
        <div>
          <span>Ручное управление</span>
          <h2>{isItr ? "Мои задачи" : "Задачи команды"}</h2>
          <p>Руководитель ставит задачи по объекту, корпусу, этажу или двери. ИТР закрывает их прямо в карточке задачи.</p>
        </div>
        {!isItr && <button className="primary-button" onClick={onCreateTask}>Поставить задачу</button>}
      </div>
      <div className="tasks-summary">
        <div><span>Всего задач</span><strong>{stats.total}</strong></div>
        <div><span>Новые</span><strong>{stats.new}</strong></div>
        <div><span>В работе</span><strong>{stats.progress}</strong></div>
        <div className="danger"><span>Просроченные</span><strong>{stats.overdue}</strong></div>
        <div className="success"><span>Выполненные</span><strong>{stats.done}</strong></div>
      </div>
      <div className="task-tabs">
        {tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </div>
      <div className={isItr ? "manual-task-card-grid itr-task-grid" : "manual-task-card-grid"}>
        {filteredTasks.map((task) => {
          const context = getTaskContext(objects, task);
          return (
            <article className={`manual-task-card priority-${task.priority} ${isManualTaskOverdue(task) ? "overdue" : ""}`} key={task.id}>
              <div className="manual-task-card-head">
                <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                <span className={`manual-task-status status-${task.status.replaceAll(" ", "-")}`}>{task.status}</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.description || "Без описания"}</p>
              <dl className="task-context-grid">
                <div><dt>Объект</dt><dd>{context.objectName}</dd></div>
                <div><dt>Корпус</dt><dd>{context.buildingName}</dd></div>
                <div><dt>Этаж</dt><dd>{context.floorName}</dd></div>
                <div><dt>Дверь</dt><dd>{context.doorName}</dd></div>
                <div><dt>Срок</dt><dd>{task.dueDate || "—"}</dd></div>
                <div><dt>Исполнитель</dt><dd>{userNames.get(task.assignedTo) ?? "—"}</dd></div>
              </dl>
              {task.comments?.[0] && <div className="task-last-comment"><strong>{task.comments[0].userName}</strong><span>{task.comments[0].text}</span></div>}
              {task.documentLinks?.length > 0 && <div className="task-links-list">{task.documentLinks.slice(0, 2).map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.title}</a>)}</div>}
              <div className="manual-task-actions">
                <button className="secondary-button slim" onClick={() => openTaskTarget(task)}>Открыть</button>
                {task.status !== "выполнена" && <button className="secondary-button slim" onClick={() => onUpdateTask(task.id, { status: "в работе" })}>В работу</button>}
                {task.status !== "выполнена" && <button className="primary-button slim" onClick={() => onUpdateTask(task.id, { status: "выполнена" })}>Выполнено</button>}
                <button className="secondary-button slim" onClick={() => setCommentTask(task)}>Комментарий</button>
                <button className="secondary-button slim" onClick={() => setLinkTask(task)}>Ссылка</button>
                {!isItr && task.status !== "отменена" && <button className="secondary-button slim" onClick={() => onUpdateTask(task.id, { status: "отменена" })}>Отменить</button>}
              </div>
            </article>
          );
        })}
      </div>
      {filteredTasks.length === 0 && <div className="empty-plan">Задач в этом режиме нет.</div>}
      {commentTask && <TaskCommentModal task={commentTask} onClose={() => setCommentTask(null)} onSave={(text) => { onAddComment(commentTask.id, text); setCommentTask(null); }} />}
      {linkTask && <TaskLinkModal task={linkTask} onClose={() => setLinkTask(null)} onSave={(link) => { onAddLink(linkTask, link); setLinkTask(null); }} />}
    </section>
  );
}

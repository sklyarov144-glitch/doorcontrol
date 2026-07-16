import React, { useState } from "react";

export default function NotificationsPage({ notifications, onOpen, onMarkRead, onMarkAll, onQuickAct, onQuickTn }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const priorityWeight = { высокий: 0, средний: 1, низкий: 2 };
  const filtered = notifications
    .filter((item) => {
      const haystack = `${item.title} ${item.message}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      if (!matchesSearch) return false;
      if (filter === "unread") return item.status === "unread";
      if (filter === "overdue") return item.type.includes("просроч") || item.priority === "высокий";
      if (filter === "tasks") return item.taskId || item.type.includes("задач");
      if (filter === "acts") return item.type.includes("АОХ") || item.title.includes("АОХ") || item.message.includes("акт");
      if (filter === "tn") return item.type.includes("ТН") || item.title.includes("ТН");
      return true;
    })
    .sort((a, b) => (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2) || new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <section className="notifications-page">
      <div className="tasks-hero">
        <div>
          <span>Центр уведомлений</span>
          <h2>Уведомления</h2>
          <p>Автоматические просрочки, новые задачи, комментарии и быстрые действия по ТН и актам АОХ.</p>
        </div>
        <button className="secondary-button" onClick={onMarkAll}>Отметить все как прочитанные</button>
      </div>
      <div className="notification-filters">
        {[["all", "Все"], ["unread", "Непрочитанные"], ["overdue", "Просроченные"], ["tasks", "Задачи"], ["acts", "Акты"], ["tn", "ТН"]]
          .map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}
        <input aria-label="Поиск уведомлений" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по объекту / корпусу" />
      </div>
      <div className="notifications-grid">
        {filtered.map((item) => (
          <article className={`notification-card ${item.status} priority-${item.priority}`} key={item.id}>
            <div className="notification-card-head">
              <span className={`priority-badge priority-${item.priority}`}>{item.priority}</span>
              <small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small>
            </div>
            <h3>{item.title}</h3>
            <p>{item.message}</p>
            <div className="manual-task-actions">
              <button className="secondary-button slim" onClick={() => onOpen(item)}>Открыть</button>
              {item.status === "unread" && <button className="secondary-button slim" onClick={() => onMarkRead(item.id)}>Прочитано</button>}
              {(item.type.includes("АОХ") || item.title.includes("АОХ")) && item.doorId && <button className="primary-button slim" onClick={() => onQuickAct(item)}>Добавить акт</button>}
              {(item.type.includes("ТН") || item.title.includes("ТН")) && item.doorId && <button className="primary-button slim" onClick={() => onQuickTn(item)}>Передано ТН</button>}
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-plan">Уведомлений по выбранному фильтру нет.</div>}
    </section>
  );
}

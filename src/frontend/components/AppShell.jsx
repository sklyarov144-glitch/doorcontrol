import { useState } from "react";
import BrandMark from "./BrandMark";
import { roleLabels } from "../domain/roles";

const roleMenus = {
  creator: [["company_dashboard", "Дашборд"], ["companies", "Компания"], ["objects", "Объекты"], ["admin", "Админ-панель"], ["problem_center", "Центр проблем"], ["tasks", "Задачи"], ["manpower", "Расстановка"], ["notifications", "Уведомления"], ["custody_acts", "Акты ОХ"], ["tn_issues", "Замечания ТН"], ["brigade_plan", "План бригад"], ["reports", "Отчёты"], ["finance", "Финансы"], ["documents", "Документы"], ["users", "Пользователи"], ["roles", "Роли"], ["audit", "Журнал действий"], ["profile", "Личный кабинет"]],
  company_head: [["company_dashboard", "Дашборд"], ["objects", "Объекты"], ["admin", "Админ-панель"], ["problem_center", "Центр проблем"], ["tasks", "Задачи"], ["manpower", "Расстановка"], ["notifications", "Уведомления"], ["custody_acts", "Акты ОХ"], ["tn_issues", "Замечания ТН"], ["brigade_plan", "План бригад"], ["reports", "Отчёты"], ["finance", "Финансы"], ["documents", "Документы"], ["users", "Пользователи"], ["audit", "Журнал действий"], ["profile", "Личный кабинет"]],
  construction_director: [["company_dashboard", "Дашборд"], ["objects", "Мои объекты"], ["admin", "Админ-панель"], ["problem_center", "Центр проблем"], ["tasks", "Задачи"], ["manpower", "Расстановка"], ["notifications", "Уведомления"], ["custody_acts", "Акты ОХ"], ["tn_issues", "Замечания ТН"], ["brigade_plan", "План бригад"], ["reports", "Отчёты"], ["finance", "Финансы"], ["documents", "Документы"], ["users", "Пользователи"], ["audit", "Журнал действий"], ["profile", "Личный кабинет"]],
  itr: [["tasks", "Мои задачи"], ["objects", "Мои объекты"], ["manpower", "Заявка на рабочих"], ["brigade_plan", "План бригад"], ["documents", "Документы"], ["notifications", "Уведомления"], ["profile", "Личный кабинет"]],
};

export function menuForRole(role) {
  return roleMenus[role] ?? roleMenus.itr;
}

export function Sidebar({ role, activeScreen, setScreen, onLogout, taskNoticeCount, collapsed, onToggleCollapsed }) {
  const items = menuForRole(role);
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div>
        <div className="sidebar-topline">
          <BrandMark />
          <button className="sidebar-toggle" type="button" onClick={onToggleCollapsed} aria-label={collapsed ? "Развернуть меню" : "Скрыть меню"}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <div className="brand-subtitle">Цифровое управление монтажом</div>
        <nav className="nav">
          {items.map(([id, label]) => (
            <button aria-label={label} className={activeScreen === id ? "active" : ""} key={id} onClick={() => setScreen(id)} title={label}>
              {collapsed && <b>{label.slice(0, 1)}</b>}
              <span>{label}</span>
              {id === "tasks" && taskNoticeCount > 0 && <em>{taskNoticeCount}</em>}
            </button>
          ))}
        </nav>
        {taskNoticeCount > 0 && <div className="sidebar-task-indicator">Новые задачи: {taskNoticeCount}</div>}
      </div>
      <button className="ghost-button" onClick={onLogout} title="Выйти">{collapsed ? "↩" : "Выйти"}</button>
    </aside>
  );
}

function labelsFor(user) {
  return {
    objects: "Мои объекты", object: "Корпуса объекта", building: "Визуализация корпуса",
    floor: "План этажа", door: "Карточка двери", admin: "Админ-панель", profile: "Личный кабинет",
    companies: "Компания", users: "Пользователи", roles: "Роли и доступы", reports: "Отчёты",
    finance: "Финансы", documents: "Документы", brigade_plan: "План бригад",
    manpower: user.role === "itr" ? "Заявка на рабочих" : "Расстановка рабочей силы",
    tasks: "Задачи", notifications: "Уведомления", tn_issues: "Замечания ТН",
    today_tasks: "Задачи на сегодня", problem_center: "Центр проблем", custody_acts: "Акты ОХ",
    company_dashboard: "Дашборд компании", itr_team: "Команда ИТР", audit: "Журнал действий",
  };
}

const screensWithoutBreadcrumbs = new Set([
  "admin", "profile", "companies", "users", "roles", "reports", "finance", "documents",
  "brigade_plan", "manpower", "tasks", "notifications", "tn_issues", "today_tasks",
  "problem_center", "custody_acts", "company_dashboard", "itr_team", "audit",
]);

export function Header({
  screen, setScreen, selectedObject, selectedBuilding, selectedFloor, selectedDoor, user, users,
  notifications, unreadNotifications, onOpenNotification, onMarkNotificationRead, onMarkAllNotificationsRead,
  onOpenNotificationsPage, onUserChange, allowUserSwitch,
}) {
  const labels = labelsFor(user);
  return (
    <header className="page-header">
      <div>
        {!screensWithoutBreadcrumbs.has(screen) && <div className="breadcrumbs">
          <button onClick={() => setScreen("objects")}>Мои объекты</button>
          {screen !== "objects" && <><span>/</span><button onClick={() => setScreen("object")}>{selectedObject?.name ?? "Объект"}</button></>}
          {["building", "floor", "door"].includes(screen) && <><span>/</span><button onClick={() => setScreen("building")}>{selectedBuilding?.name}</button></>}
          {["floor", "door"].includes(screen) && <><span>/</span><button onClick={() => setScreen("floor")}>{selectedFloor?.type === "floor" ? `Этаж ${selectedFloor.number}` : selectedFloor?.label}</button></>}
          {screen === "door" && selectedDoor && <><span>/</span><span>{selectedDoor.number}</span></>}
        </div>}
        <h1>{labels[screen]}</h1>
      </div>
      <div className="header-user-control">
        <NotificationBell notifications={notifications} unreadCount={unreadNotifications} onOpen={onOpenNotification} onMarkRead={onMarkNotificationRead} onMarkAll={onMarkAllNotificationsRead} onOpenPage={onOpenNotificationsPage} />
        <div className="user-chip"><strong>{user.name}</strong><span>{roleLabels[user.role]}</span></div>
        {allowUserSwitch && <select aria-label="Текущий пользователь" value={user.id} onChange={(event) => onUserChange(event.target.value)}>{users.map((item) => <option key={item.id} value={item.id}>{item.name} — {roleLabels[item.role]}</option>)}</select>}
      </div>
    </header>
  );
}

export function NotificationBell({ notifications, unreadCount, onOpen, onMarkRead, onMarkAll, onOpenPage }) {
  const [open, setOpen] = useState(false);
  const latest = [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  return (
    <div className="notification-shell">
      <button className="notification-bell" type="button" onClick={() => setOpen((value) => !value)} aria-label="Уведомления"><span>⌁</span>{unreadCount > 0 && <em>{unreadCount}</em>}</button>
      {open && <div className="notification-dropdown">
        <div className="notification-dropdown-head"><strong>Уведомления</strong><button type="button" onClick={onMarkAll}>Все прочитаны</button></div>
        <div className="notification-list">
          {latest.map((item) => <article className={`notification-item ${item.status} priority-${item.priority}`} key={item.id}>
            <div><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small></div>
            <div className="notification-actions"><button type="button" onClick={() => onOpen(item)}>Открыть</button>{item.status === "unread" && <button type="button" onClick={() => onMarkRead(item.id)}>Прочитано</button>}</div>
          </article>)}
          {latest.length === 0 && <div className="empty-plan">Уведомлений нет.</div>}
        </div>
        <button className="notification-page-link" type="button" onClick={() => { setOpen(false); onOpenPage(); }}>Открыть все уведомления</button>
      </div>}
    </div>
  );
}

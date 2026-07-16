import React from "react";
import {
  canSeeManualTask,
  getTaskContext,
  isManualTaskOverdue,
  manualTaskStatusLabel,
} from "../domain/tasks";

export default function TodayTasksPage({ tasks, objects, user, users, onOpen, onUpdateTask }) {
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const today = new Date().toISOString().slice(0, 10);
  const visibleTasks = tasks.filter((task) => canSeeManualTask(task, user));
  const activeTasks = visibleTasks.filter((task) => !["выполнена", "отменена"].includes(task.status));
  const urgentTasks = activeTasks.filter((task) => task.priority === "высокий");
  const stats = {
    total: visibleTasks.length,
    urgent: urgentTasks.length,
    today: activeTasks.filter((task) => task.dueDate && task.dueDate <= today).length,
    overdue: activeTasks.filter(isManualTaskOverdue).length,
    done: visibleTasks.filter((task) => task.status === "выполнена").length,
  };
  const sortedTasks = [...visibleTasks].sort((a, b) => {
    const statusWeight = { новая: 0, "в работе": 1, выполнена: 2, отменена: 3 };
    const priorityWeight = { высокий: 0, средний: 1, низкий: 2 };
    return Number(isManualTaskOverdue(b)) - Number(isManualTaskOverdue(a))
      || (statusWeight[a.status] ?? 0) - (statusWeight[b.status] ?? 0)
      || (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2);
  });
  const openTaskTarget = (task) => {
    if (task.doorId || task.floorId || task.buildingId || task.objectId) onOpen(task);
  };

  return (
    <section className="tasks-page">
      <div className="tasks-hero">
        <div>
          <span>Ежедневный список</span>
          <h2>Задачи на сегодня</h2>
          <p>Единый список ручных и автоматических задач из рабочего backend-контура.</p>
        </div>
      </div>
      <div className="tasks-summary">
        <div><span>Всего задач</span><strong>{stats.total}</strong></div>
        <div className="danger"><span>Срочные</span><strong>{stats.urgent}</strong></div>
        <div><span>На сегодня</span><strong>{stats.today}</strong></div>
        <div className="danger"><span>Просроченные</span><strong>{stats.overdue}</strong></div>
        <div className="success"><span>Выполненные</span><strong>{stats.done}</strong></div>
      </div>
      {urgentTasks.length > 0 && (
        <div className="urgent-task-strip">
          <strong>Срочные задачи</strong>
          <div>{urgentTasks.slice(0, 4).map((task) => {
            const context = getTaskContext(objects, task);
            return <button key={task.id} onClick={() => openTaskTarget(task)}>{task.title}<span>{context.objectName}</span></button>;
          })}</div>
        </div>
      )}
      <div className="tasks-table-card">
        <table className="tasks-table">
          <thead><tr><th>Приоритет</th><th>Задача</th><th>Объект</th><th>Корпус</th><th>Этаж</th><th>Дверь</th><th>Срок</th><th>Исполнитель</th><th>Статус</th><th>Действие</th></tr></thead>
          <tbody>
            {sortedTasks.map((task) => {
              const context = getTaskContext(objects, task);
              const completed = task.status === "выполнена";
              return (
                <tr className={`${completed ? "is-done" : ""} ${isManualTaskOverdue(task) ? "is-overdue" : ""}`} key={task.id}>
                  <td><span className={`priority-badge priority-${task.priority}`}>{task.priority}</span></td>
                  <td><strong>{task.title}</strong><small>{task.description || "Без описания"}</small></td>
                  <td>{context.objectName}</td><td>{context.buildingName}</td><td>{context.floorName}</td><td>{context.doorName}</td>
                  <td>{task.dueDate || "—"}</td><td>{userNames.get(task.assignedTo) ?? "—"}</td>
                  <td><span className={`task-status status-${task.status.replaceAll(" ", "-")}`}>{manualTaskStatusLabel(task.status)}</span></td>
                  <td><div className="task-actions">
                    <button className="secondary-button slim" onClick={() => openTaskTarget(task)}>Открыть</button>
                    <button className="secondary-button slim" disabled={completed} onClick={() => onUpdateTask(task.id, { status: "в работе" })}>В работу</button>
                    <button className="primary-button slim" disabled={completed} onClick={() => onUpdateTask(task.id, { status: "выполнена" })}>Выполнено</button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedTasks.length === 0 && <div className="empty-plan">На сегодня задач нет.</div>}
      </div>
    </section>
  );
}

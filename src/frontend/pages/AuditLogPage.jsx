import React, { useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";

const entityLabels = {
  profiles: "Пользователь",
  objects: "Объект",
  buildings: "Корпус",
  floors: "Этаж",
  doors: "Дверь",
  tasks: "Задача",
  task_comments: "Комментарий",
  task_links: "Ссылка задачи",
  document_items: "Документ",
  custody_acts: "Акт ОХ",
  tn_issues: "Замечание ТН",
  teams: "Бригада",
  employees: "Сотрудник",
  work_standards: "Норматив",
  object_work_plans: "План работ",
  daily_work_reports: "Отчёт ИТР",
  manpower_requests: "Заявка на рабочих",
  contracts: "Договор",
  budget_items: "Статья бюджета",
  financial_transactions: "Финансовая операция",
};

const actionLabels = {
  insert: "Создано",
  update: "Изменено",
  delete: "Удалено",
};

const ignoredFields = new Set(["created_at", "updated_at", "createdAt", "updatedAt"]);

export function changedFields(log) {
  const before = log?.payload?.before ?? {};
  const after = log?.payload?.after ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((key) => !ignoredFields.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .sort();
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AuditLogPage({ objects = [], users = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(dataProvider.activityLogs.getRecent(300))
      .then((rows) => {
        if (active) setLogs(rows ?? []);
      })
      .catch((loadError) => {
        console.error("Unable to load activity log", loadError);
        if (active) setError("Не удалось загрузить журнал действий.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const objectNames = useMemo(() => new Map(objects.map((item) => [item.id, item.name])), [objects]);
  const userNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const entityOptions = useMemo(() => [...new Set(logs.map((item) => item.entityType))].filter(Boolean).sort(), [logs]);
  const visibleLogs = useMemo(() => logs.filter((item) => (
    (entityFilter === "all" || item.entityType === entityFilter)
    && (actionFilter === "all" || item.action === actionFilter)
  )), [logs, entityFilter, actionFilter]);

  return (
    <section className="audit-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Контроль и безопасность</span>
          <h1>Журнал действий</h1>
          <p>Неизменяемая история операций в доступных вам объектах.</p>
        </div>
        <div className="summary-chip">{visibleLogs.length} событий</div>
      </div>

      <div className="audit-filters">
        <label>
          Раздел
          <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
            <option value="all">Все разделы</option>
            {entityOptions.map((entity) => <option key={entity} value={entity}>{entityLabels[entity] ?? entity}</option>)}
          </select>
        </label>
        <label>
          Действие
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="all">Все действия</option>
            {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {loading && <div className="empty-state">Загружаем журнал...</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      {!loading && !error && (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead><tr><th>Дата</th><th>Пользователь</th><th>Объект</th><th>Раздел</th><th>Действие</th><th>Изменённые поля</th></tr></thead>
            <tbody>
              {visibleLogs.map((log) => {
                const fields = changedFields(log);
                return (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{userNames.get(log.userId) ?? "Системная операция"}</td>
                    <td>{objectNames.get(log.objectId) ?? "Вся компания"}</td>
                    <td>{entityLabels[log.entityType] ?? log.entityType}</td>
                    <td><span className={`audit-action ${log.action}`}>{actionLabels[log.action] ?? log.action}</span></td>
                    <td>{fields.length ? fields.join(", ") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visibleLogs.length && <div className="empty-state">По выбранным фильтрам событий нет.</div>}
        </div>
      )}
    </section>
  );
}

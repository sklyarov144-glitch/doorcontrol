import React, { useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";
import { calculateRemoteProblems, problemStats } from "../domain/problemCenter";

const problemTypes = [
  "Просроченные двери",
  "Смонтировано без акта ОХ",
  "Замечания ТН",
  "Проёмы под риск",
  "Нет ответственного",
  "Нет документов",
  "Зависшие статусы",
];

export default function RemoteProblemCenterPage({ objects, user, users, onOpen, onCreateTask }) {
  const [source, setSource] = useState({ documents: [], acts: [], issues: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      dataProvider.documents.getAll(),
      dataProvider.custodyActs.getAll(),
      dataProvider.tnIssues.getAll(),
    ]).then(([documents, acts, issues]) => {
      if (active) setSource({ documents, acts, issues });
    }).catch((loadError) => {
      if (active) setError(loadError?.message ?? "Не удалось загрузить риски");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const userNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const problems = useMemo(() => calculateRemoteProblems({
    objects,
    documents: source.documents,
    custodyActs: source.acts,
    tnIssues: source.issues,
  }).map((item) => ({ ...item, responsible: userNames.get(item.responsible) ?? item.responsible })), [objects, source, userNames]);
  const stats = problemStats(problems);
  const summary = [
    ["Всего проблем", stats.total, "critical"],
    ["Просрочено", stats.overdue, "critical"],
    ["Замечания ТН", stats.tnIssues, "critical"],
    ["Без акта ОХ", stats.noCustodyAct, "warning"],
    ["Проёмы под риск", stats.riskyOpenings, "warning"],
  ];
  const canCreateTask = ["creator", "company_head", "construction_director"].includes(user.role);

  return <section className="problem-center">
    <div className="problem-hero"><div><span>Контроль рисков</span><h2>Центр проблем</h2><p>Риски рассчитаны из фактических статусов, дат, замечаний, актов и документов PostgreSQL.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="empty-plan">Загружаем проблемные зоны...</div> : <>
      <div className="problem-summary">{summary.map(([label, value, tone]) => <div className={`problem-summary-card ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="problem-type-grid">{problemTypes.map((type) => <div className="problem-type-card" key={type}><span>{type}</span><strong>{problems.filter((item) => item.type === type).length}</strong></div>)}</div>
      <div className="problem-table-card">
        <table className="problem-table"><thead><tr><th>Тип проблемы</th><th>Объект</th><th>Корпус</th><th>Этаж</th><th>Дверь / проём</th><th>Ответственный</th><th>Дней</th><th>Приоритет</th><th>Действие</th></tr></thead>
          <tbody>{problems.map((item) => <tr key={item.id}><td><strong>{item.type}</strong></td><td>{item.object}</td><td>{item.building}</td><td>{item.floor}</td><td>{item.door}</td><td>{item.responsible || "Не назначен"}</td><td>{item.days}</td><td><span className={`priority-badge priority-${item.priority}`}>{item.priority}</span></td><td><div className="task-actions"><button className="secondary-button slim" onClick={() => onOpen(item)}>Открыть</button>{canCreateTask && <button className="primary-button slim" onClick={() => onCreateTask({
            title: item.action,
            description: `${item.type}: ${item.object} / ${item.building} / ${item.door}`,
            type: item.type === "Смонтировано без акта ОХ" ? "Добавить акт АОХ" : item.type === "Замечания ТН" ? "Проверить замечание ТН" : "Другое",
            priority: item.priority,
            objectId: item.objectId,
            buildingId: item.buildingId,
            floorId: item.floorId,
            doorId: item.doorId,
          })}>Задача</button>}</div></td></tr>)}</tbody>
        </table>
        {!problems.length && <div className="empty-plan">Проблем по доступным объектам нет.</div>}
      </div>
    </>}
  </section>;
}

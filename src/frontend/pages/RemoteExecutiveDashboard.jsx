import React, { useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";

const dateKey = (date) => date.toISOString().slice(0, 10);
const weekStart = (source) => {
  const date = new Date(source);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
};

function riskTone(count) {
  if (count >= 10) return "критично";
  if (count > 0) return "под контролем";
  return "норма";
}

export default function RemoteExecutiveDashboard({ objects, users, onOpen }) {
  const [referenceDate] = useState(() => new Date());
  const [data, setData] = useState({ delivery: [], tasks: [], issues: [], acts: [], plans: [], reports: [], manpower: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      dataProvider.analytics.getDeliverySummary(),
      dataProvider.tasks.getAll(),
      dataProvider.tnIssues.getAll(),
      dataProvider.custodyActs.getAll(),
      dataProvider.objectWorkPlans.getAll(),
      dataProvider.dailyWorkReports.getAll(),
      dataProvider.manpowerRequests.getAll(),
    ]).then(([delivery, tasks, issues, acts, plans, reports, manpower]) => {
      setData({ delivery, tasks, issues, acts, plans, reports, manpower });
    }).catch((loadError) => setError(loadError?.message ?? "Не удалось загрузить управленческую сводку"))
      .finally(() => setLoading(false));
  }, []);

  const objectNames = useMemo(() => new Map(objects.map((item) => [item.id, item.name])), [objects]);
  const userNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const doorContext = useMemo(() => new Map(objects.flatMap((object) => object.buildings.flatMap((building) => building.floors.flatMap((floor) => floor.doors.map((door) => [door.id, { object, building, floor, door }]))))), [objects]);
  const activeIssues = data.issues.filter((item) => !["устранено", "закрыто"].includes(item.status));
  const overdueTasks = data.tasks.filter((item) => !["выполнена", "отменена"].includes(item.status) && item.dueDate && item.dueDate < dateKey(referenceDate));
  const openActs = data.acts.filter((item) => !["передано по акту", "закрыто"].includes(item.status));
  const totals = data.delivery.reduce((sum, row) => ({
    doors: sum.doors + Number(row.doorsTotal ?? 0),
    mounted: sum.mounted + Number(row.doorsMounted ?? 0),
    acts: sum.acts + Number(row.doorsByAct ?? 0),
  }), { doors: 0, mounted: 0, acts: 0 });
  const readiness = totals.doors ? Math.round(totals.mounted / totals.doors * 100) : 0;
  const problematicBuildings = new Set([...activeIssues, ...openActs].map((item) => doorContext.get(item.doorId)?.building.id).filter(Boolean)).size;
  const cards = [
    ["Объектов в работе", objects.filter((item) => item.status === "В работе" || item.status === "active").length, "neutral"],
    ["Общая готовность", `${readiness}%`, "success"],
    ["Дверей смонтировано", totals.mounted, "success"],
    ["Смонтировано без акта", openActs.length, "danger"],
    ["Открытых замечаний ТН", activeIssues.length, "danger"],
    ["Просроченных задач", overdueTasks.length, "danger"],
    ["Проблемных корпусов", problematicBuildings, "warning"],
  ];
  const objectRows = objects.map((object) => {
    const delivery = data.delivery.find((row) => row.objectId === object.id) ?? {};
    const issueCount = activeIssues.filter((issue) => doorContext.get(issue.doorId)?.object.id === object.id).length;
    const actCount = openActs.filter((act) => doorContext.get(act.doorId)?.object.id === object.id).length;
    const taskCount = data.tasks.filter((task) => task.objectId === object.id && !["выполнена", "отменена"].includes(task.status)).length;
    const riskCount = issueCount + actCount + taskCount;
    return { object, delivery, issueCount, actCount, taskCount, risk: riskTone(riskCount), responsible: userNames.get(object.responsibleDirectorId ?? object.responsibleId) ?? "Не назначен" };
  });
  const risks = [
    ...activeIssues.map((issue) => ({ id: `issue-${issue.id}`, type: "Замечание ТН", priority: issue.priority, days: Math.max(0, Math.floor((referenceDate.getTime() - new Date(issue.createdAt).getTime()) / 86400000)), ...doorContext.get(issue.doorId) })),
    ...overdueTasks.map((task) => ({ id: `task-${task.id}`, type: task.title, priority: task.priority, days: Math.max(0, Math.floor((referenceDate.getTime() - new Date(task.dueDate).getTime()) / 86400000)), object: objects.find((item) => item.id === task.objectId), building: objects.flatMap((item) => item.buildings).find((item) => item.id === task.buildingId), floor: objects.flatMap((item) => item.buildings).flatMap((item) => item.floors).find((item) => item.id === task.floorId), door: doorContext.get(task.doorId)?.door })),
  ].filter((item) => item.object).sort((left, right) => right.days - left.days).slice(0, 5);
  const start = weekStart(referenceDate);
  const weeklyPlans = data.plans.filter((item) => item.plannedDate >= start);
  const weeklyReports = data.reports.filter((item) => item.reportDate >= start);
  const plan = weeklyPlans.reduce((sum, item) => sum + Number(item.plannedQuantity ?? 0), 0);
  const fact = weeklyReports.reduce((sum, item) => sum + Number(item.factQuantity ?? 0), 0);
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = dateKey(tomorrow);
  const tomorrowRequests = data.manpower.filter((item) => item.targetDate === tomorrowDate);

  return <section className="executive-dashboard">
    <div className="executive-hero"><div><span>Центр управления компанией</span><h2>Состояние объектов за 30 секунд</h2><p>Все показатели рассчитаны из производственного контура PostgreSQL.</p></div><div className="executive-score"><span>Общая готовность</span><strong>{readiness}%</strong></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="empty-plan">Загружаем управленческую сводку...</div> : <>
      <div className="executive-kpi-grid">{cards.map(([label, value, tone]) => <div className={`executive-kpi ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="executive-grid">
        <section className="executive-card wide"><div className="executive-card-title"><h3>Объекты</h3><p>Фактическая готовность и риски.</p></div><div className="executive-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Корпуса</th><th>Готовность</th><th>Проблем</th><th>Замечаний ТН</th><th>Без актов</th><th>Ответственный</th><th>Риск</th></tr></thead><tbody>{objectRows.map((row) => <tr key={row.object.id}><td><button onClick={() => onOpen({ objectId: row.object.id })}>{row.object.name}</button></td><td>{row.delivery.buildingsCount ?? row.object.buildings.length}</td><td><b>{Math.round(Number(row.delivery.readinessPercent ?? 0))}%</b></td><td>{row.taskCount}</td><td>{row.issueCount}</td><td>{row.actCount}</td><td>{row.responsible}</td><td><span className={`risk-pill risk-${row.risk}`}>{row.risk}</span></td></tr>)}</tbody></table></div></section>
        <section className="executive-card"><div className="executive-card-title"><h3>Риски</h3><p>Топ-5 по сроку.</p></div><div className="risk-list">{risks.map((risk) => <button key={risk.id} onClick={() => onOpen({ objectId: risk.object.id, buildingId: risk.building?.id, floorId: risk.floor?.id, doorId: risk.door?.id })}><strong>{risk.type}</strong><span>{risk.object.name} / {risk.building?.name ?? "—"}</span><small>{risk.priority} · {risk.days} дн.</small></button>)}{!risks.length && <div className="empty-plan">Критичных рисков нет.</div>}</div></section>
        <section className="executive-card"><div className="executive-card-title"><h3>План-факт недели</h3><p>Фактические производственные данные.</p></div><div className="plan-fact"><div><span>План</span><strong>{plan}</strong></div><div><span>Факт</span><strong>{fact}</strong></div><div><span>Отклонение</span><strong className={fact - plan < 0 ? "danger-text" : "success-text"}>{fact - plan}</strong></div><div><span>Выполнение</span><strong>{plan ? Math.round(fact / plan * 100) : 0}%</strong></div></div></section>
        <section className="executive-card wide"><div className="executive-card-title"><h3>Рабочая сила на завтра</h3><p>Заявки ИТР и решения руководителей.</p></div><div className="plan-fact manpower-dashboard"><div><span>Заявок</span><strong>{tomorrowRequests.length}</strong></div><div><span>Утверждено</span><strong>{tomorrowRequests.filter((item) => item.status === "утверждена").length}</strong></div><div><span>Без решения</span><strong>{tomorrowRequests.filter((item) => ["подана", "на рассмотрении"].includes(item.status)).length}</strong></div><div><span>Монтажников</span><strong>{tomorrowRequests.reduce((sum, item) => sum + Number(item.approvedInstallers || item.installersRequested || 0), 0)}</strong></div></div><div className="risk-list compact">{tomorrowRequests.slice(0, 5).map((request) => <button key={request.id}><strong>{objectNames.get(request.objectId) ?? "Объект"}</strong><span>{request.workType} · {request.priority}</span><small>{request.status} · монтажников {request.approvedInstallers || request.installersRequested || 0}</small></button>)}{!tomorrowRequests.length && <div className="empty-plan">Заявок на завтра пока нет.</div>}</div></section>
      </div>
    </>}
  </section>;
}

import {
  calculateTodayTasks,
  getManpowerRequests,
  getManpowerSummaryByDate,
  getProblems,
} from "../storage";
import { allObjectDoors } from "../domain/objectAccess";
import { roleLabels } from "../domain/roles";

function riskLabel(count) {
  if (count >= 30) return "критично";
  if (count >= 10) return "под контролем";
  return "норма";
}

function isoDateOffset(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function CompanyDashboard({ objects, users, onOpen, manpowerObjects = objects }) {
  const doors = objects.flatMap((object) => allObjectDoors(object));
  const problems = getProblems(objects);
  const tasks = calculateTodayTasks(objects);
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const mounted = doors.filter((door) => ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus)).length;
  const withoutCustodyAct = doors.filter((door) => door.doorStatus === "смонтирована" && !["передано по акту", "закрыто"].includes(door.storageAct)).length;
  const issues = doors.filter((door) => door.issue === "есть замечание").length;
  const overdueTasks = tasks.filter((task) => task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== "done").length;
  const readiness = doors.length ? Math.round((mounted / doors.length) * 100) : 0;
  const problematicBuildings = new Set(problems.filter((problem) => problem.buildingId).map((problem) => problem.buildingId)).size;
  const cards = [
    ["Объектов в работе", objects.filter((object) => object.status === "В работе").length, "neutral"],
    ["Общая готовность", `${readiness}%`, "success"],
    ["Дверей смонтировано", mounted, "success"],
    ["Смонтировано без акта", withoutCustodyAct, "danger"],
    ["Открытых замечаний ТН", issues, "danger"],
    ["Просроченных задач", overdueTasks, "danger"],
    ["Проблемных корпусов", problematicBuildings, "warning"],
  ];
  const objectRows = objects.map((object) => {
    const objectDoors = allObjectDoors(object);
    const objectMounted = objectDoors.filter((door) => ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus)).length;
    const objectProblems = problems.filter((problem) => problem.objectId === object.id);
    const objectIssues = objectDoors.filter((door) => door.issue === "есть замечание").length;
    const objectWithoutActs = objectDoors.filter((door) => door.doorStatus === "смонтирована" && !["передано по акту", "закрыто"].includes(door.storageAct)).length;
    return {
      object,
      readiness: objectDoors.length ? Math.round((objectMounted / objectDoors.length) * 100) : 0,
      problems: objectProblems.length,
      issues: objectIssues,
      withoutActs: objectWithoutActs,
      risk: riskLabel(objectProblems.length + objectIssues + objectWithoutActs),
      responsible: userNames.get(object.responsibleId) ?? object.responsibleId ?? "Не назначен",
    };
  });
  const topRisks = [...problems].sort((left, right) => {
    const weight = { высокий: 0, средний: 1, низкий: 2 };
    return (weight[left.priority] ?? 2) - (weight[right.priority] ?? 2) || right.days - left.days;
  }).slice(0, 5);
  const responsibleRows = users.filter((item) => item.role !== "creator").map((person) => {
    const ownedObjects = objects.filter((object) => object.responsibleId === person.id);
    const ownedProblems = problems.filter((problem) => ownedObjects.some((object) => object.id === problem.objectId) || problem.responsible === person.id || problem.responsible === person.name);
    const ownedTasks = tasks.filter((task) => task.assignedTo === person.id || task.assignedTo === person.name);
    return {
      person,
      objects: ownedObjects.length,
      tasks: ownedTasks.length,
      overdue: ownedTasks.filter((task) => task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== "done").length,
      issues: ownedProblems.filter((problem) => problem.type === "Замечания ТН").length,
      withoutActs: ownedProblems.filter((problem) => problem.type === "Смонтировано без акта ОХ").length,
    };
  });
  const planFact = { plan: 420, fact: 356 };
  const deviation = planFact.fact - planFact.plan;
  const completion = Math.round((planFact.fact / planFact.plan) * 100);
  const tomorrow = isoDateOffset(1);
  const manpowerTomorrow = getManpowerSummaryByDate(tomorrow);
  const manpowerTomorrowRows = getManpowerRequests()
    .filter((request) => (request.targetDate ?? request.date) === tomorrow)
    .slice(0, 5);
  const manpowerObjectName = (id) => manpowerObjects.find((object) => object.id === id)?.name ?? id;

  return <section className="executive-dashboard">
    <div className="executive-hero"><div><span>Центр управления компанией</span><h2>Состояние объектов за 30 секунд</h2><p>Готовность, риски, акты ОХ, замечания ТН, отставания и ответственные собраны на одном управленческом экране.</p></div><div className="executive-score"><span>Общая готовность</span><strong>{readiness}%</strong></div></div>
    <div className="executive-kpi-grid">{cards.map(([label, value, tone]) => <div className={`executive-kpi ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="executive-grid">
      <section className="executive-card wide"><div className="executive-card-title"><h3>Объекты</h3><p>Сводка по каждому объекту и статус риска.</p></div><div className="executive-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Корпуса</th><th>Готовность</th><th>Проблем</th><th>Замечаний ТН</th><th>Без актов</th><th>Ответственный директор</th><th>Статус риска</th></tr></thead><tbody>{objectRows.map((row) => <tr key={row.object.id}><td><button onClick={() => onOpen({ objectId: row.object.id })}>{row.object.name}</button></td><td>{row.object.buildings.length}</td><td><div className="mini-progress"><span style={{ width: `${row.readiness}%` }} /></div><b>{row.readiness}%</b></td><td>{row.problems}</td><td>{row.issues}</td><td>{row.withoutActs}</td><td>{row.responsible}</td><td><span className={`risk-pill risk-${row.risk}`}>{row.risk}</span></td></tr>)}</tbody></table></div></section>
      <section className="executive-card"><div className="executive-card-title"><h3>Риски</h3><p>Топ-5 зон внимания.</p></div><div className="risk-list">{topRisks.map((risk) => <button key={risk.id} onClick={() => onOpen(risk)}><strong>{risk.type}</strong><span>{risk.object} / {risk.building}</span><small>{risk.priority} · {risk.days} дн.</small></button>)}</div></section>
      <section className="executive-card"><div className="executive-card-title"><h3>План-факт</h3><p>Mock-показатель недели.</p></div><div className="plan-fact"><div><span>План недели</span><strong>{planFact.plan}</strong></div><div><span>Факт недели</span><strong>{planFact.fact}</strong></div><div><span>Отклонение</span><strong className={deviation < 0 ? "danger-text" : "success-text"}>{deviation}</strong></div><div><span>Выполнение</span><strong>{completion}%</strong></div></div></section>
      <section className="executive-card"><div className="executive-card-title"><h3>Расстановка на завтра</h3><p>Заявки ИТР, решения директора и итоговые количества.</p></div><div className="plan-fact manpower-dashboard"><div><span>Заявок</span><strong>{manpowerTomorrow.total}</strong></div><div><span>Утверждено</span><strong>{manpowerTomorrow.approved}</strong></div><div><span>Без решения</span><strong className={manpowerTomorrow.unresolved ? "danger-text" : ""}>{manpowerTomorrow.unresolved}</strong></div><div><span>Скорректировано</span><strong>{manpowerTomorrow.adjusted}</strong></div><div><span>Запрошено груз.</span><strong>{manpowerTomorrow.requestedLoaders}</strong></div><div><span>Утверждено груз.</span><strong>{manpowerTomorrow.approvedLoaders}</strong></div><div><span>Запрошено монт.</span><strong>{manpowerTomorrow.requestedInstallers}</strong></div><div><span>Утверждено монт.</span><strong>{manpowerTomorrow.approvedInstallers}</strong></div></div><div className="risk-list compact">{manpowerTomorrowRows.map((request) => <button key={request.id}><strong>{manpowerObjectName(request.objectId)}</strong><span>{request.requestedByName} · {request.workType ?? request.reason} · {request.priority}</span><small>дверей {request.doorsPlanned || "—"} · запрос {request.loadersRequested}/{request.installersRequested} · утверждено {request.approvedLoaders || 0}/{request.approvedInstallers || 0}</small></button>)}{manpowerTomorrowRows.length === 0 && <div className="empty-plan">Заявок на завтра пока нет.</div>}</div></section>
      <section className="executive-card wide"><div className="executive-card-title"><h3>Ответственные</h3><p>Нагрузка и проблемные зоны по людям.</p></div><div className="executive-table-wrap"><table className="executive-table"><thead><tr><th>ФИО</th><th>Роль</th><th>Объекты</th><th>Задач</th><th>Просрочено</th><th>Замечаний</th><th>Без актов</th></tr></thead><tbody>{responsibleRows.map((row) => <tr key={row.person.id}><td>{row.person.name}</td><td>{roleLabels[row.person.role]}</td><td>{row.objects}</td><td>{row.tasks}</td><td>{row.overdue}</td><td>{row.issues}</td><td>{row.withoutActs}</td></tr>)}</tbody></table></div></section>
    </div>
  </section>;
}

export default CompanyDashboard;

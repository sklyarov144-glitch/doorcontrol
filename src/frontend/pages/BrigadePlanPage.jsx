import React, { useState } from "react";
import {
  addDailyAutoReport,
  addDailyWorkReport,
  addEmployee,
  addNotification,
  addObjectWorkPlan,
  addTask,
  addTeam,
  addWorkStandard,
  assignWorkerToTeam,
  disableEmployee,
  disableWorkStandard,
  generateDailyAutoReport,
  getDailyAutoReports,
  getDailyWorkReports,
  getDelayReasonStats,
  getEmployeeOutput,
  getEmployees,
  getItrRating,
  getManpowerRequests,
  getObjectWorkPlans,
  getPlanFactMoneyStats,
  getPlanFactStats,
  getTeamEfficiency,
  getTeamRating,
  getTeams,
  getWorkStandards,
  getWorkersByTeam,
  removeWorkerFromTeam,
  updateEmployee,
  updateWorkStandard,
} from "../storage";

const delayReasonOptions = [
  "Не готов проём",
  "Нет доступа",
  "Не подняты двери",
  "Нет фурнитуры",
  "Замечания ТН",
  "Ожидание заказчика",
  "Не вышла бригада",
  "Погодные условия",
  "Другое",
];

function BrigadePlanPage({ objects, user, users }) {
  const [tab, setTab] = useState("current");
  const [version, setVersion] = useState(0);
  const [standardEdit, setStandardEdit] = useState(null);
  const [factOpen, setFactOpen] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  const refresh = () => setVersion((value) => value + 1);
  const standards = getWorkStandards();
  const activeStandards = standards.filter((item) => item.isActive);
  const plans = getObjectWorkPlans();
  const teams = getTeams();
  const workers = getEmployees();
  const reports = getDailyWorkReports();
  const stats = getPlanFactStats();
  const moneyStats = getPlanFactMoneyStats();
  const delayStats = getDelayReasonStats();
  const objectNames = new Map(objects.map((object) => [object.id, object.name]));
  const buildingNames = new Map(objects.flatMap((object) => object.buildings.map((building) => [building.id, building.name])));
  const standardNames = new Map(standards.map((item) => [item.id, item.workType]));
  const teamNames = new Map(teams.map((item) => [item.id, item.name]));
  const workerNames = new Map(workers.map((item) => [item.id, item.name]));
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const canEditStandards = ["creator", "company_head"].includes(user.role);
  const canAssignPlan = ["creator", "company_head", "construction_director"].includes(user.role);

  const saveStandard = (values) => {
    values.id ? updateWorkStandard(values.id, values) : addWorkStandard(values);
    setStandardEdit(null);
    refresh();
  };
  const saveFact = (values) => {
    const report = addDailyWorkReport({ ...values, createdBy: user.id });
    if (report.completionPercent < 80) {
      addNotification({ type: "отставание бригады", title: "Выполнение ниже 80%", message: `${teamNames.get(report.teamId) ?? "Бригада"}: ${report.completionPercent}%`, priority: "средний", roleTarget: "construction_director", objectId: report.objectId, buildingId: report.buildingId });
      const lowRows = getDailyWorkReports().filter((row) => row.teamId === report.teamId && row.completionPercent < 80).slice(0, 2);
      if (lowRows.length >= 2) {
        addTask({ title: "Проверить отставание бригады", description: `${teamNames.get(report.teamId) ?? "Бригада"} два дня подряд ниже 80%.`, type: "Другое", priority: "высокий", status: "новая", createdBy: "system", assignedTo: report.createdBy, objectId: report.objectId, buildingId: report.buildingId, dueDate: new Date().toISOString().slice(0, 10), automatic: true, automaticKey: `team-lag-${report.teamId}` });
      }
    }
    refresh();
  };

  return <section className="brigade-page" key={version}>
    <div className="tasks-hero"><div><span>План бригад / План-факт работ</span><h2>Контроль выработки по объектам</h2><p>Регламент компании, план по корпусам и ежедневный факт ИТР в одном модуле.</p></div><div className="heading-actions"><button className="primary-button" onClick={() => setFactOpen(true)}>Добавить факт за день</button><button className="secondary-button" onClick={() => setMultiOpen(true)}>Факт по рабочим</button></div></div>
    <div className="task-tabs brigade-tabs">{[["current", "Текущий план"], ["standards", "Регламент работ"], ["object", "План на объект"], ["daily", "Ежедневный факт"], ["fact", "План-факт"], ["ratings", "Рейтинги"], ["auto-report", "Автоотчёт"], ["teams", "Бригады / рабочие"]].map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</div>
    {["current", "standards"].includes(tab) && <div className="brigade-card"><div className="panel-title"><div><h2>{tab === "current" ? "Утверждённый текущий план" : "Регламент работ"}</h2><p>Основа для переноса текущего Excel-плана компании.</p></div>{canEditStandards && <button className="primary-button slim" onClick={() => setStandardEdit({})}>Добавить вид работ</button>}</div><StandardsTable rows={standards} canEdit={canEditStandards} onEdit={setStandardEdit} onDisable={(id) => { disableWorkStandard(id); refresh(); }} /></div>}
    {tab === "object" && <ObjectPlanPanel objects={objects} users={users} standards={activeStandards} teams={teams} plans={plans} canAssign={canAssignPlan} onSave={(values) => { addObjectWorkPlan({ ...values, createdBy: user.id }); refresh(); }} />}
    {tab === "daily" && <div className="brigade-card"><div className="panel-title"><div><h2>Журнал ежедневного факта</h2><p>Факт по бригадам и рабочим. Вносит ИТР, рабочий не получает личный кабинет.</p></div><button className="primary-button slim" onClick={() => setFactOpen(true)}>Добавить факт</button></div><ReportsTable reports={reports} objectNames={objectNames} buildingNames={buildingNames} standardNames={standardNames} teamNames={teamNames} employeeNames={workerNames} userNames={userNames} /></div>}
    {tab === "fact" && <div className="brigade-planfact"><div className="tasks-summary"><div><span>План</span><strong>{stats.plan}</strong></div><div><span>Факт</span><strong>{stats.fact}</strong></div><div className={stats.completionPercent >= 100 ? "success" : stats.completionPercent < 80 ? "danger" : ""}><span>Выполнение</span><strong>{stats.completionPercent}%</strong></div><div><span>Отклонение</span><strong>{stats.deviation}</strong></div><div className="success"><span>Перевыполнение</span><strong>{stats.overrun}</strong></div><div className="danger"><span>Отставание</span><strong>{stats.lag}</strong></div><div><span>Бригад</span><strong>{stats.activeTeams}</strong></div></div><MoneySummary stats={moneyStats} /><div className="brigade-card"><h2>План-факт</h2><ReportsTable reports={stats.reports} objectNames={objectNames} buildingNames={buildingNames} standardNames={standardNames} teamNames={teamNames} employeeNames={workerNames} userNames={userNames} /></div><DelayReasonsBlock rows={delayStats} /><div className="brigade-analytics-grid"><TeamEfficiencyTable rows={getTeamEfficiency()} objectNames={objectNames} /><EmployeeOutputTable rows={getEmployeeOutput()} teamNames={teamNames} /></div></div>}
    {tab === "ratings" && <div className="brigade-analytics-grid"><TeamRatingTable rows={getTeamRating()} objectNames={objectNames} buildingNames={buildingNames} /><ItrRatingTable rows={getItrRating()} /></div>}
    {tab === "auto-report" && <AutoReportTab objects={objects} users={users} objectNames={objectNames} buildingNames={buildingNames} user={user} />}
    {tab === "teams" && <TeamsPanel teams={teams} employees={workers} objects={objects} users={users} refresh={refresh} />}
    {standardEdit && <StandardModal standard={standardEdit} onClose={() => setStandardEdit(null)} onSave={saveStandard} />}
    {factOpen && <DailyFactModal objects={objects} standards={activeStandards} teams={teams} employees={workers} user={user} onClose={() => setFactOpen(false)} onSave={(values) => { saveFact(values); setFactOpen(false); }} />}
    {multiOpen && <MultiFactModal objects={objects} standards={activeStandards} teams={teams} employees={workers} user={user} onClose={() => setMultiOpen(false)} onSave={(rows) => { rows.forEach(saveFact); setMultiOpen(false); }} />}
  </section>;
}

function StandardsTable({ rows, canEdit, onEdit, onDisable }) {
  return <div className="brigade-table-wrap"><table className="executive-table brigade-table"><thead><tr><th>Вид работ</th><th>Состав</th><th>План/день</th><th>Ед.</th><th>Сумма</th><th>Цена</th><th>Категория</th><th>Комментарий</th><th>Статус</th>{canEdit && <th>Действие</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={!row.isActive ? "is-muted" : ""}><td><strong>{row.workType}</strong></td><td>{row.teamComposition}</td><td>{row.dailyPlan}</td><td>{row.unitName}</td><td>{row.dailyBudget || "—"}</td><td>{row.unitPrice || "—"}</td><td>{row.category}</td><td>{row.comment || "—"}</td><td><span className={`act-status ${row.isActive ? "closed" : "pending"}`}>{row.isActive ? "Активен" : "Отключен"}</span></td>{canEdit && <td><div className="task-actions"><button className="secondary-button slim" onClick={() => onEdit(row)}>Редактировать</button><button className="secondary-button slim" onClick={() => onDisable(row.id)}>Отключить</button></div></td>}</tr>)}</tbody></table></div>;
}

function StandardModal({ standard, onClose, onSave }) {
  const [form, setForm] = useState({ workType: "", teamComposition: "", dailyPlan: 0, unitName: "двери", dailyBudget: 0, unitPrice: 0, category: "Монтаж", comment: "", isActive: true, ...standard });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <div className="modal-backdrop"><form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="modal-title"><div><h2>{form.id ? "Редактировать вид работ" : "Добавить вид работ"}</h2><p>Регламент работ компании.</p></div><button type="button" onClick={onClose}>×</button></div><div className="task-form-grid"><label className="wide">Вид работ<input value={form.workType} onChange={(event) => update("workType", event.target.value)} /></label><label>Состав группы<input value={form.teamComposition} onChange={(event) => update("teamComposition", event.target.value)} /></label><label>План в день<input type="number" value={form.dailyPlan} onChange={(event) => update("dailyPlan", event.target.value)} /></label><label>Единица<select value={form.unitName} onChange={(event) => update("unitName", event.target.value)}>{["двери", "комплекты", "этажи", "операции", "часы", "рейсы"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Сумма в день<input type="number" value={form.dailyBudget} onChange={(event) => update("dailyBudget", event.target.value)} /></label><label>Цена за единицу<input type="number" value={form.unitPrice} onChange={(event) => update("unitPrice", event.target.value)} /></label><label>Категория<input value={form.category} onChange={(event) => update("category", event.target.value)} /></label><label className="wide">Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label></div><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить</button></div></form></div>;
}

function formatRub(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("ru-RU")} ₽`;
}

function MoneySummary({ stats }) {
  return <div className="money-summary"><div><span>План в деньгах</span><strong>{formatRub(stats.plannedAmount)}</strong></div><div><span>Факт в деньгах</span><strong>{formatRub(stats.actualAmount)}</strong></div><div className={stats.moneyDeviation < 0 ? "danger" : "success"}><span>Отклонение в деньгах</span><strong>{formatRub(stats.moneyDeviation)}</strong></div><div className="danger"><span>Недовыполнение</span><strong>{formatRub(stats.moneyUnderperformance)}</strong></div><div className="success"><span>Перевыполнение</span><strong>{formatRub(stats.moneyOverperformance)}</strong></div></div>;
}

function DelayReasonsBlock({ rows }) {
  return <div className="brigade-card"><h2>Причины отставания</h2><div className="delay-reason-grid">{rows.map((row) => <div key={row.reason}><strong>{row.reason}</strong><span>{row.quantityLag} ед. · {formatRub(row.moneyLag)} · {row.percent}%</span></div>)}{rows.length === 0 && <div className="empty-plan">Отставаний за период нет.</div>}</div></div>;
}

function scoreTone(score) {
  if (score >= 100) return "good";
  if (score >= 80) return "warn";
  return "bad";
}

function TeamRatingTable({ rows, objectNames }) {
  return <div className="brigade-card"><h2>Рейтинг бригад</h2><table className="executive-table"><thead><tr><th>Бригада</th><th>Объект</th><th>План</th><th>Факт</th><th>%</th><th>План ₽</th><th>Факт ₽</th><th>Откл. ₽</th><th>Дней</th><th>Ниже 80%</th><th>Балл</th></tr></thead><tbody>{rows.map((row) => <tr key={row.teamId}><td>{row.team}</td><td>{objectNames.get(row.objectId)}</td><td>{row.plan}</td><td>{row.fact}</td><td>{row.completionPercent}%</td><td>{formatRub(row.plannedAmount)}</td><td>{formatRub(row.actualAmount)}</td><td className={row.moneyDeviation < 0 ? "danger-text" : "success-text"}>{formatRub(row.moneyDeviation)}</td><td>{row.daysCount}</td><td>{row.lowDays}</td><td><span className={`completion-pill ${scoreTone(row.score)}`}>{row.score}</span></td></tr>)}</tbody></table></div>;
}

function ItrRatingTable({ rows }) {
  return <div className="brigade-card"><h2>Рейтинг ИТР</h2><table className="executive-table"><thead><tr><th>ФИО</th><th>Объекты</th><th>Корпуса</th><th>Отчётов</th><th>Дней без отчёта</th><th>План</th><th>Факт</th><th>%</th><th>План ₽</th><th>Факт ₽</th><th>Откл. ₽</th><th>Бригад ниже 80%</th><th>Балл</th></tr></thead><tbody>{rows.map((row) => <tr key={row.userId}><td>{row.name}</td><td>{row.objectsCount}</td><td>{row.buildingsCount}</td><td>{row.reportsCount}</td><td>{row.daysWithoutReport}</td><td>{row.plan}</td><td>{row.fact}</td><td>{row.completionPercent}%</td><td>{formatRub(row.plannedAmount)}</td><td>{formatRub(row.actualAmount)}</td><td className={row.moneyDeviation < 0 ? "danger-text" : "success-text"}>{formatRub(row.moneyDeviation)}</td><td>{row.lowTeams}</td><td><span className={`completion-pill ${scoreTone(row.score)}`}>{row.score}</span></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-plan">Пока нет данных для рейтинга ИТР.</div>}</div>;
}

function AutoReportTab({ objects, users, objectNames, buildingNames, user }) {
  const [filters, setFilters] = useState({ date: new Date().toISOString().slice(0, 10), objectId: objects[0]?.id ?? "", buildingId: objects[0]?.buildings[0]?.id ?? "", itrId: "" });
  const [copied, setCopied] = useState(false);
  const selectedObject = objects.find((object) => object.id === filters.objectId) ?? objects[0];
  const reportText = generateDailyAutoReport(filters, { objectNames, buildingNames });
  const history = getDailyAutoReports();
  const update = (field, value) => setFilters((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((object) => object.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return <div className="auto-report-layout"><div className="brigade-card"><div className="panel-title"><div><h2>Автоотчёт за день</h2><p>Формируется автоматически из ежедневного факта.</p></div></div><div className="object-plan-form"><label>Дата<input type="date" value={filters.date} onChange={(event) => update("date", event.target.value)} /></label><label>Объект<select value={filters.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label><label>Корпус<select value={filters.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>ИТР<select value={filters.itrId} onChange={(event) => update("itrId", event.target.value)}><option value="">Все ИТР</option>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><pre className="auto-report-text">{reportText}</pre><div className="form-actions"><button className="primary-button" onClick={copyReport}>{copied ? "Скопировано" : "Скопировать отчёт"}</button><button className="secondary-button" onClick={() => addDailyAutoReport({ ...filters, createdBy: user.id, reportText })}>Сохранить в историю</button></div></div><div className="brigade-card"><h2>История автоотчётов</h2><div className="team-list">{history.map((item) => <div key={item.id}><strong>{item.date}</strong><span>{objectNames.get(item.objectId) ?? "Все объекты"} · {new Date(item.createdAt).toLocaleString("ru-RU")}</span></div>)}{history.length === 0 && <div className="empty-plan">История пока пустая.</div>}</div></div></div>;
}

function ObjectPlanPanel({ objects, users, standards, teams, plans, canAssign, onSave }) {
  const firstObject = objects[0];
  const [form, setForm] = useState(() => ({ objectId: firstObject?.id ?? "", buildingId: firstObject?.buildings[0]?.id ?? "", workTypeId: standards[0]?.id ?? "", plannedQuantity: 240, startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), assignedItrId: users.find((item) => item.role === "itr")?.id ?? "", assignedTeamId: teams[0]?.id ?? "", comment: "" }));
  const selectedObject = objects.find((object) => object.id === form.objectId) ?? firstObject;
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((object) => object.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  return <div className="brigade-card"><div className="panel-title"><div><h2>План на объект / корпус</h2><p>Назначение плана по объектам и ответственным ИТР.</p></div></div>{canAssign && <form className="object-plan-form" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Вид работ<select value={form.workTypeId} onChange={(event) => update("workTypeId", event.target.value)}>{standards.map((standard) => <option key={standard.id} value={standard.id}>{standard.workType}</option>)}</select></label><label>План<input type="number" value={form.plannedQuantity} onChange={(event) => update("plannedQuantity", event.target.value)} /></label><label>Начало<input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></label><label>Окончание<input type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} /></label><label>Ответственный ИТР<select value={form.assignedItrId} onChange={(event) => update("assignedItrId", event.target.value)}>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Бригада<select value={form.assignedTeamId} onChange={(event) => update("assignedTeamId", event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="wide">Комментарий<input value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label><button className="primary-button">Назначить план</button></form>}<div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Корпус</th><th>Вид работ</th><th>План</th><th>Период</th><th>ИТР</th><th>Бригада</th><th>Комментарий</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td>{objects.find((object) => object.id === plan.objectId)?.name}</td><td>{objects.flatMap((object) => object.buildings).find((building) => building.id === plan.buildingId)?.name}</td><td>{standards.find((standard) => standard.id === plan.workTypeId)?.workType}</td><td>{plan.plannedQuantity}</td><td>{plan.startDate} — {plan.endDate}</td><td>{users.find((item) => item.id === plan.assignedItrId)?.name}</td><td>{teams.find((team) => team.id === plan.assignedTeamId)?.name}</td><td>{plan.comment}</td></tr>)}</tbody></table></div></div>;
}

function DailyFactModal({ objects, standards, teams, employees, user, onClose, onSave }) {
  const object = objects[0];
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), objectId: object?.id ?? "", buildingId: object?.buildings[0]?.id ?? "", teamId: teams[0]?.id ?? "", workerId: "", workTypeId: standards[0]?.id ?? "", actualQuantity: 0, delayReason: "", comment: "" });
  const selectedObject = objects.find((item) => item.id === form.objectId) ?? object;
  const standard = standards.find((item) => item.id === form.workTypeId);
  const isBehindPlan = Number(form.actualQuantity) < Number(standard?.dailyPlan ?? 0);
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((item) => item.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  const teamWorkers = getWorkersByTeam(form.teamId);
  const approvedSchedule = getManpowerRequests().filter((request) =>
    (request.targetDate ?? request.date) === form.date &&
    request.objectId === form.objectId &&
    request.buildingId === form.buildingId &&
    ["утверждена", "скорректирована"].includes(request.status)
  );
  return <div className="modal-backdrop"><form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, employeeId: form.workerId, plannedQuantity: standard?.dailyPlan ?? 0, createdBy: user.id }); }}><div className="modal-title"><div><h2>Добавить факт за день</h2><p>Короткая форма для ИТР. Рабочий не получает личный кабинет.</p></div><button type="button" onClick={onClose}>×</button></div><label>Дата<input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Бригада<select value={form.teamId} onChange={(event) => update("teamId", event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Рабочий<select value={form.workerId} onChange={(event) => update("workerId", event.target.value)}><option value="">Бригада целиком</option>{teamWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} — {worker.workerType}</option>)}</select></label>{approvedSchedule.length > 0 && <div className="approved-manpower-box"><span>Утверждённая расстановка на выбранный день</span>{approvedSchedule.map((request) => <div className="approved-manpower-row" key={request.id}><strong>{request.workType}</strong><small>{request.approvedLoaders ?? request.loadersRequested ?? 0} грузч. / {request.approvedInstallers ?? request.installersRequested ?? 0} монт. · {request.doorsPlanned ?? 0} дверей · {request.status}</small></div>)}</div>}<label>Вид работ<select value={form.workTypeId} onChange={(event) => update("workTypeId", event.target.value)}>{standards.map((item) => <option key={item.id} value={item.id}>{item.workType}</option>)}</select></label><div className="auto-plan-box">План: <strong>{standard?.dailyPlan ?? 0} {standard?.unitName}</strong></div><label>Факт<input type="number" value={form.actualQuantity} onChange={(event) => update("actualQuantity", event.target.value)} /></label>{isBehindPlan && <div className="soft-warning">Укажите причину отставания, чтобы руководитель видел, что мешает работе.</div>}<label className={isBehindPlan && !form.delayReason ? "needs-attention" : ""}>Причина отставания<select value={form.delayReason} onChange={(event) => update("delayReason", event.target.value)}><option value="">Не выбрана</option>{delayReasonOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить факт</button></div></form></div>;
}

function MultiFactModal({ objects, standards, teams, employees, user, onClose, onSave }) {
  const object = objects[0];
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), objectId: object?.id ?? "", buildingId: object?.buildings[0]?.id ?? "", teamId: teams[0]?.id ?? "", workTypeId: standards[0]?.id ?? "", comment: "" });
  const [facts, setFacts] = useState({});
  const selectedObject = objects.find((item) => item.id === form.objectId) ?? object;
  const standard = standards.find((item) => item.id === form.workTypeId);
  const teamEmployees = getWorkersByTeam(form.teamId);
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((item) => item.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  return <div className="modal-backdrop"><form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(teamEmployees.filter((worker) => Number(facts[worker.id]) > 0).map((worker) => ({ ...form, workerId: worker.id, employeeId: worker.id, plannedQuantity: standard?.dailyPlan ?? 0, actualQuantity: Number(facts[worker.id]) || 0, createdBy: user.id }))); }}><div className="modal-title"><div><h2>Факт по рабочим</h2><p>Внесите выработку сразу по рабочим выбранной бригады.</p></div><button type="button" onClick={onClose}>×</button></div><div className="task-form-grid"><label>Дата<input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Бригада<select value={form.teamId} onChange={(event) => update("teamId", event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="wide">Вид работ<select value={form.workTypeId} onChange={(event) => update("workTypeId", event.target.value)}>{standards.map((item) => <option key={item.id} value={item.id}>{item.workType}</option>)}</select></label></div><div className="employee-fact-list">{teamEmployees.map((worker) => <label key={worker.id}>{worker.name}<input type="number" value={facts[worker.id] ?? ""} onChange={(event) => setFacts((current) => ({ ...current, [worker.id]: event.target.value }))} placeholder={`План ${standard?.dailyPlan ?? 0}`} /></label>)}</div><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить</button></div></form></div>;
}

function ReportsTable({ reports, objectNames, buildingNames, standardNames, teamNames, employeeNames, userNames }) {
  return <div className="brigade-table-wrap"><table className="executive-table brigade-table"><thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>Бригада</th><th>Рабочий</th><th>Вид работ</th><th>План</th><th>Факт</th><th>%</th><th>Откл.</th><th>План, ₽</th><th>Факт, ₽</th><th>Откл., ₽</th><th>Причина</th><th>Комментарий</th><th>Внёс</th></tr></thead><tbody>{reports.map((row) => <tr key={row.id}><td>{row.date}</td><td>{objectNames.get(row.objectId)}</td><td>{buildingNames.get(row.buildingId)}</td><td>{teamNames.get(row.teamId)}</td><td>{employeeNames.get(row.workerId ?? row.employeeId) ?? "Бригада"}</td><td>{standardNames.get(row.workTypeId)}</td><td>{row.plannedQuantity}</td><td>{row.actualQuantity}</td><td><span className={`completion-pill ${row.completionPercent >= 100 ? "good" : row.completionPercent >= 80 ? "warn" : "bad"}`}>{row.completionPercent}%</span></td><td>{row.deviation}</td><td>{formatRub(row.plannedAmount)}</td><td>{formatRub(row.actualAmount)}</td><td className={row.moneyDeviation < 0 ? "danger-text" : "success-text"}>{formatRub(row.moneyDeviation)}</td><td>{row.delayReason || "—"}</td><td>{row.comment || "—"}</td><td>{userNames.get(row.createdBy) ?? row.createdBy}</td></tr>)}</tbody></table>{reports.length === 0 && <div className="empty-plan">Факты пока не внесены.</div>}</div>;
}

function TeamEfficiencyTable({ rows, objectNames }) {
  return <div className="brigade-card"><h2>Эффективность бригад</h2><table className="executive-table"><thead><tr><th>Бригада</th><th>Объект</th><th>План</th><th>Факт</th><th>%</th><th>Отставание</th><th>Дней</th></tr></thead><tbody>{rows.map((row) => <tr key={row.teamId}><td>{row.team}</td><td>{objectNames.get(row.objectId)}</td><td>{row.plan}</td><td>{row.fact}</td><td><span className={`completion-pill ${row.completionPercent >= 100 ? "good" : row.completionPercent >= 80 ? "warn" : "bad"}`}>{row.completionPercent}%</span></td><td>{row.lag}</td><td>{row.daysCount}</td></tr>)}</tbody></table></div>;
}

function EmployeeOutputTable({ rows, teamNames }) {
  return <div className="brigade-card"><h2>Выработка рабочих</h2><table className="executive-table"><thead><tr><th>Рабочий</th><th>Бригада</th><th>Вид работ</th><th>Факт день</th><th>Факт неделя</th><th>% плана</th><th>Комментарии</th></tr></thead><tbody>{rows.map((row) => <tr key={row.employeeId}><td>{row.employee}</td><td>{teamNames.get(row.teamId)}</td><td>{row.workType}</td><td>{row.todayFact}</td><td>{row.weekFact}</td><td>{row.completionPercent}%</td><td>{row.comments.slice(0, 2).join("; ") || "—"}</td></tr>)}</tbody></table></div>;
}

function TeamsPanel({ teams, employees, objects, users, refresh }) {
  const [teamForm, setTeamForm] = useState({ name: "", teamType: "Монтаж", objectId: objects[0]?.id ?? "", buildingId: objects[0]?.buildings[0]?.id ?? "", responsibleItrId: users.find((user) => user.role === "itr")?.id ?? "" });
  const [employeeForm, setEmployeeForm] = useState({ name: "", group: "", nationality: "", workerType: "монтажник", teamId: teams[0]?.id ?? "", phone: "", comment: "" });
  const selectedObject = objects.find((object) => object.id === teamForm.objectId) ?? objects[0];
  const teamStats = new Map(getTeamEfficiency().map((row) => [row.teamId, row]));
  const assignableWorkers = employees.filter((worker) => worker.status === "active");
  const addWorkerToTeam = (workerId, teamId) => { assignWorkerToTeam(workerId, teamId); refresh(); };
  const removeFromTeam = (workerId) => { removeWorkerFromTeam(workerId); refresh(); };
  const disable = (workerId) => { disableEmployee(workerId); refresh(); };
  return <div className="brigade-analytics-grid">
    <div className="brigade-card wide">
      <h2>Бригады</h2>
      <form className="compact-admin-form" onSubmit={(event) => { event.preventDefault(); addTeam({ ...teamForm, memberWorkerIds: [] }); setTeamForm({ ...teamForm, name: "" }); refresh(); }}>
        <input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} placeholder="Название бригады" />
        <input value={teamForm.teamType} onChange={(event) => setTeamForm({ ...teamForm, teamType: event.target.value })} placeholder="Тип" />
        <select value={teamForm.objectId} onChange={(event) => setTeamForm({ ...teamForm, objectId: event.target.value, buildingId: objects.find((object) => object.id === event.target.value)?.buildings[0]?.id ?? "" })}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select>
        <select value={teamForm.buildingId} onChange={(event) => setTeamForm({ ...teamForm, buildingId: event.target.value })}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select>
        <select value={teamForm.responsibleItrId} onChange={(event) => setTeamForm({ ...teamForm, responsibleItrId: event.target.value })}>{users.filter((user) => user.role === "itr").map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <button className="primary-button slim">Добавить бригаду</button>
      </form>
      <div className="team-cards-grid">{teams.map((team) => {
        const workers = getWorkersByTeam(team.id);
        const stats = teamStats.get(team.id);
        return <article className="team-card" key={team.id}><div><strong>{team.name}</strong><span>{team.teamType} · {objects.find((object) => object.id === team.objectId)?.name ?? "объект не указан"} · {users.find((person) => person.id === team.responsibleItrId)?.name ?? "ИТР не назначен"}</span></div><div className="team-card-metrics"><span>Рабочих: {workers.length}</span><span>План: {stats?.plan ?? 0}</span><span>Факт: {stats?.fact ?? 0}</span><span>Эффективность: {stats?.completionPercent ?? 0}%</span></div><div className="worker-tags">{workers.map((worker) => <button key={worker.id} onClick={() => removeFromTeam(worker.id)} title="Убрать из бригады">{worker.name}</button>)}</div><select onChange={(event) => event.target.value && addWorkerToTeam(event.target.value, team.id)} value=""><option value="">Добавить рабочего в бригаду</option>{assignableWorkers.filter((worker) => !workers.some((item) => item.id === worker.id)).map((worker) => <option key={worker.id} value={worker.id}>{worker.name} — {worker.group}</option>)}</select></article>;
      })}</div>
    </div>
    <div className="brigade-card wide">
      <h2>Рабочие без личных кабинетов</h2>
      <p className="card-note">Это монтажники, грузчики и сотрудники бригад. Они не входят в users и не могут войти на сайт.</p>
      <form className="compact-admin-form" onSubmit={(event) => { event.preventDefault(); const worker = addEmployee(employeeForm); if (employeeForm.teamId) assignWorkerToTeam(worker.id, employeeForm.teamId); setEmployeeForm({ ...employeeForm, name: "", phone: "", comment: "" }); refresh(); }}>
        <input value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} placeholder="ФИО рабочего" />
        <input value={employeeForm.group} onChange={(event) => setEmployeeForm({ ...employeeForm, group: event.target.value })} placeholder="Группа" />
        <input value={employeeForm.nationality} onChange={(event) => setEmployeeForm({ ...employeeForm, nationality: event.target.value })} placeholder="Гражданство" />
        <select value={employeeForm.workerType} onChange={(event) => setEmployeeForm({ ...employeeForm, workerType: event.target.value })}>{["монтажник", "грузчик", "разнорабочий", "фурнитурщик", "бригадир", "другое"].map((type) => <option key={type}>{type}</option>)}</select>
        <select value={employeeForm.teamId} onChange={(event) => setEmployeeForm({ ...employeeForm, teamId: event.target.value })}><option value="">Без бригады</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
        <button className="primary-button slim">Добавить рабочего</button>
      </form>
      <div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>ФИО</th><th>Группа</th><th>Гражданство</th><th>Тип</th><th>Бригада</th><th>Статус</th><th>Комментарий</th><th>Действия</th></tr></thead><tbody>{employees.map((worker) => <tr key={worker.id} className={worker.status === "inactive" ? "is-muted" : ""}><td>{worker.name}</td><td>{worker.group || "—"}</td><td>{worker.nationality || "—"}</td><td>{worker.workerType}</td><td>{teams.find((team) => team.id === worker.teamId)?.name ?? "—"}</td><td>{worker.status}</td><td><input className="table-input" value={worker.comment || ""} onChange={(event) => { updateEmployee(worker.id, { comment: event.target.value }); refresh(); }} /></td><td><div className="task-actions"><select value={worker.teamId || ""} onChange={(event) => event.target.value ? addWorkerToTeam(worker.id, event.target.value) : removeFromTeam(worker.id)}><option value="">Без бригады</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button className="secondary-button slim" onClick={() => disable(worker.id)}>Отключить</button></div></td></tr>)}</tbody></table></div>
    </div>
  </div>;
}

export default BrigadePlanPage;

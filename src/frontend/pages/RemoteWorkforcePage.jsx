import React, { useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};
const managementRoles = new Set(["creator", "company_head", "construction_director"]);

function ErrorNotice({ error }) {
  return error ? <div className="form-error" role="alert">{error}</div> : null;
}

function LoadingState() {
  return <div className="empty-plan" aria-live="polite">Загружаем данные...</div>;
}

function objectName(objects, id) {
  return objects.find((item) => item.id === id)?.name ?? "—";
}

function buildingName(objects, objectId, buildingId) {
  return objects.find((item) => item.id === objectId)?.buildings.find((item) => item.id === buildingId)?.name ?? "—";
}

export function RemoteManpowerPage({ objects, user, onNotify }) {
  const isManager = managementRoles.has(user.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    objectId: objects[0]?.id ?? "",
    buildingId: objects[0]?.buildings[0]?.id ?? "",
    targetDate: tomorrow(),
    workType: "монтаж дверей",
    doorsPlanned: 0,
    loadersRequested: 0,
    installersRequested: 0,
    priority: "средний",
    comment: "",
  });
  const selectedObject = objects.find((item) => item.id === form.objectId) ?? objects[0];

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await dataProvider.manpowerRequests.getAll());
    } catch (loadError) {
      setError(loadError?.message ?? "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!form.objectId && objects[0]) setForm((current) => ({ ...current, objectId: objects[0].id, buildingId: objects[0].buildings[0]?.id ?? "" }));
  }, [objects, form.objectId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.objectId) return;
    setSaving(true);
    setError("");
    try {
      await dataProvider.manpowerRequests.create({
        ...form,
        requestedBy: user.id,
        status: "подана",
        doorsPlanned: Number(form.doorsPlanned),
        loadersRequested: Number(form.loadersRequested),
        installersRequested: Number(form.installersRequested),
      });
      setForm((current) => ({ ...current, doorsPlanned: 0, loadersRequested: 0, installersRequested: 0, comment: "" }));
      await load();
      await onNotify?.();
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось сохранить заявку");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (request, status) => {
    setSaving(true);
    setError("");
    try {
      await dataProvider.manpowerRequests.update(request.id, {
        status,
        approvedLoaders: status === "утверждена" ? request.loadersRequested : 0,
        approvedInstallers: status === "утверждена" ? request.installersRequested : 0,
        decidedBy: user.id,
        decidedAt: new Date().toISOString(),
      });
      await load();
      await onNotify?.();
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось обновить заявку");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((item) => ["подана", "на рассмотрении"].includes(item.status)).length,
    approved: rows.filter((item) => item.status === "утверждена").length,
    installers: rows.filter((item) => item.status === "утверждена").reduce((sum, item) => sum + Number(item.approvedInstallers ?? 0), 0),
  }), [rows]);

  return <section className="manpower-page">
    <div className="tasks-hero"><div><span>Расстановка рабочей силы</span><h2>{isManager ? "Заявки ИТР и решения" : "Заявка на рабочих"}</h2><p>Данные сохраняются в едином контуре компании и доступны согласно назначениям.</p></div></div>
    <ErrorNotice error={error} />
    <div className="problem-stats">
      <div><span>Всего заявок</span><strong>{stats.total}</strong></div>
      <div><span>Ожидают решения</span><strong>{stats.pending}</strong></div>
      <div><span>Утверждено</span><strong>{stats.approved}</strong></div>
      <div><span>Монтажников утверждено</span><strong>{stats.installers}</strong></div>
    </div>
    {!isManager && <form className="brigade-card object-plan-form" onSubmit={submit}>
      <label>Объект<select value={form.objectId} onChange={(event) => setForm({ ...form, objectId: event.target.value, buildingId: objects.find((item) => item.id === event.target.value)?.buildings[0]?.id ?? "" })}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Корпус<select value={form.buildingId} onChange={(event) => setForm({ ...form, buildingId: event.target.value })}>{selectedObject?.buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Дата<input type="date" min={today()} value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} required /></label>
      <label>Вид работ<input value={form.workType} onChange={(event) => setForm({ ...form, workType: event.target.value })} required /></label>
      <label>Дверей в плане<input type="number" min="0" value={form.doorsPlanned} onChange={(event) => setForm({ ...form, doorsPlanned: event.target.value })} /></label>
      <label>Грузчиков<input type="number" min="0" value={form.loadersRequested} onChange={(event) => setForm({ ...form, loadersRequested: event.target.value })} /></label>
      <label>Монтажников<input type="number" min="0" value={form.installersRequested} onChange={(event) => setForm({ ...form, installersRequested: event.target.value })} /></label>
      <label>Приоритет<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>низкий</option><option>средний</option><option>высокий</option><option>критичный</option></select></label>
      <label className="wide">Комментарий<textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label>
      <button className="primary-button" disabled={saving || !objects.length}>Подать заявку</button>
    </form>}
    {loading ? <LoadingState /> : <div className="users-table-wrap"><table className="executive-table"><thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>Работы</th><th>Двери</th><th>Грузчики</th><th>Монтажники</th><th>Приоритет</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{rows.map((request) => <tr key={request.id}><td>{request.targetDate}</td><td>{objectName(objects, request.objectId)}</td><td>{buildingName(objects, request.objectId, request.buildingId)}</td><td>{request.workType}</td><td>{request.doorsPlanned}</td><td>{request.approvedLoaders || request.loadersRequested}</td><td>{request.approvedInstallers || request.installersRequested}</td><td>{request.priority}</td><td><span className="status-badge">{request.status}</span></td><td>{isManager && ["подана", "на рассмотрении"].includes(request.status) ? <div className="task-actions"><button className="primary-button slim" disabled={saving} onClick={() => decide(request, "утверждена")}>Утвердить</button><button className="secondary-button slim" disabled={saving} onClick={() => decide(request, "отклонена")}>Отклонить</button></div> : "—"}</td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-plan">Заявок пока нет.</div>}</div>}
  </section>;
}

export function RemoteBrigadePlanPage({ objects, user, users }) {
  const isManager = managementRoles.has(user.role);
  const [data, setData] = useState({ teams: [], standards: [], plans: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("plan");
  const firstObject = objects[0];
  const [teamForm, setTeamForm] = useState({ name: "", teamType: "Монтаж", responsibleItrId: users.find((item) => item.role === "itr")?.id ?? "" });
  const [standardForm, setStandardForm] = useState({ workType: "Монтаж дверей", category: "Монтаж", dailyPlan: 0, unitName: "дверей", unitPrice: 0, dailyBudget: 0, comment: "" });
  const [planForm, setPlanForm] = useState({ objectId: firstObject?.id ?? "", buildingId: firstObject?.buildings[0]?.id ?? "", workStandardId: "", teamId: "", plannedDate: today(), plannedQuantity: 0 });
  const [reportForm, setReportForm] = useState({ objectId: firstObject?.id ?? "", buildingId: firstObject?.buildings[0]?.id ?? "", workStandardId: "", teamId: "", reportDate: today(), planQuantity: 0, factQuantity: 0, delayReason: "", comment: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [teams, standards, plans, reports] = await Promise.all([
        dataProvider.teams.getAll(), dataProvider.workStandards.getAll(), dataProvider.objectWorkPlans.getAll(), dataProvider.dailyWorkReports.getAll(),
      ]);
      setData({ teams, standards, plans, reports });
      setPlanForm((current) => ({ ...current, workStandardId: current.workStandardId || standards[0]?.id || "", teamId: current.teamId || teams[0]?.id || "" }));
      setReportForm((current) => ({ ...current, workStandardId: current.workStandardId || standards[0]?.id || "", teamId: current.teamId || teams[0]?.id || "" }));
    } catch (loadError) {
      setError(loadError?.message ?? "Не удалось загрузить план бригад");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const run = async (action) => {
    setSaving(true);
    setError("");
    try { await action(); await load(); } catch (saveError) { setError(saveError?.message ?? "Не удалось сохранить данные"); } finally { setSaving(false); }
  };
  const selectedPlanObject = objects.find((item) => item.id === planForm.objectId) ?? firstObject;
  const selectedReportObject = objects.find((item) => item.id === reportForm.objectId) ?? firstObject;
  const totals = useMemo(() => ({
    planned: data.plans.reduce((sum, item) => sum + Number(item.plannedQuantity ?? 0), 0),
    fact: data.reports.reduce((sum, item) => sum + Number(item.factQuantity ?? 0), 0),
  }), [data]);

  if (loading) return <LoadingState />;
  return <section className="brigade-plan-page">
    <div className="tasks-hero"><div><span>План бригад / план-факт</span><h2>Единый производственный план</h2><p>Бригады, задания и ежедневный факт из PostgreSQL.</p></div></div>
    <ErrorNotice error={error} />
    <div className="problem-stats"><div><span>Активных бригад</span><strong>{data.teams.filter((item) => item.status === "active").length}</strong></div><div><span>План</span><strong>{totals.planned}</strong></div><div><span>Факт</span><strong>{totals.fact}</strong></div><div><span>Выполнение</span><strong>{totals.planned ? Math.round(totals.fact / totals.planned * 100) : 0}%</strong></div></div>
    <div className="tasks-tabs"><button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}>План</button><button className={tab === "fact" ? "active" : ""} onClick={() => setTab("fact")}>Факт</button><button className={tab === "teams" ? "active" : ""} onClick={() => setTab("teams")}>Бригады</button>{isManager && <button className={tab === "standards" ? "active" : ""} onClick={() => setTab("standards")}>Нормы</button>}</div>

    {tab === "standards" && isManager && <><div className="users-table-wrap"><table className="executive-table"><thead><tr><th>Вид работ</th><th>Категория</th><th>План в день</th><th>Единица</th><th>Цена</th><th>Бюджет в день</th></tr></thead><tbody>{data.standards.map((standard) => <tr key={standard.id}><td>{standard.workType}</td><td>{standard.category || "—"}</td><td>{standard.dailyPlan}</td><td>{standard.unitName}</td><td>{Number(standard.unitPrice ?? 0).toLocaleString("ru-RU")}</td><td>{Number(standard.dailyBudget ?? 0).toLocaleString("ru-RU")}</td></tr>)}</tbody></table>{!data.standards.length && <div className="empty-plan">Создайте первую норму, чтобы открыть планирование и ввод факта.</div>}</div><form className="brigade-card object-plan-form" onSubmit={(event) => { event.preventDefault(); run(() => dataProvider.workStandards.create({ ...standardForm, companyId: user.companyId, dailyPlan: Number(standardForm.dailyPlan), unitPrice: Number(standardForm.unitPrice), dailyBudget: Number(standardForm.dailyBudget), isActive: true })); }}><label>Вид работ<input value={standardForm.workType} onChange={(event) => setStandardForm({ ...standardForm, workType: event.target.value })} required /></label><label>Категория<input value={standardForm.category} onChange={(event) => setStandardForm({ ...standardForm, category: event.target.value })} /></label><label>План в день<input type="number" min="0" step="0.01" value={standardForm.dailyPlan} onChange={(event) => setStandardForm({ ...standardForm, dailyPlan: event.target.value })} /></label><label>Единица<input value={standardForm.unitName} onChange={(event) => setStandardForm({ ...standardForm, unitName: event.target.value })} required /></label><label>Цена за единицу<input type="number" min="0" step="0.01" value={standardForm.unitPrice} onChange={(event) => setStandardForm({ ...standardForm, unitPrice: event.target.value })} /></label><label>Бюджет в день<input type="number" min="0" step="0.01" value={standardForm.dailyBudget} onChange={(event) => setStandardForm({ ...standardForm, dailyBudget: event.target.value })} /></label><label className="wide">Комментарий<textarea value={standardForm.comment} onChange={(event) => setStandardForm({ ...standardForm, comment: event.target.value })} /></label><button className="primary-button" disabled={saving}>Добавить норму</button></form></>}

    {tab === "teams" && <><div className="team-list">{data.teams.map((team) => <div key={team.id}><strong>{team.name}</strong><span>{team.teamType} · {users.find((item) => item.id === team.responsibleItrId)?.name ?? "Ответственный не назначен"}</span></div>)}{!data.teams.length && <div className="empty-plan">Бригады пока не созданы.</div>}</div>{isManager && <form className="brigade-card object-plan-form" onSubmit={(event) => { event.preventDefault(); run(() => dataProvider.teams.create({ ...teamForm, companyId: user.companyId, status: "active" })); setTeamForm({ ...teamForm, name: "" }); }}><label>Название<input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} required /></label><label>Тип<input value={teamForm.teamType} onChange={(event) => setTeamForm({ ...teamForm, teamType: event.target.value })} /></label><label>Ответственный<select value={teamForm.responsibleItrId} onChange={(event) => setTeamForm({ ...teamForm, responsibleItrId: event.target.value })}><option value="">Не назначен</option>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary-button" disabled={saving}>Добавить бригаду</button></form>}</>}

    {tab === "plan" && <><div className="users-table-wrap"><table className="executive-table"><thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>Бригада</th><th>Вид работ</th><th>План</th></tr></thead><tbody>{data.plans.map((plan) => <tr key={plan.id}><td>{plan.plannedDate}</td><td>{objectName(objects, plan.objectId)}</td><td>{buildingName(objects, plan.objectId, plan.buildingId)}</td><td>{data.teams.find((item) => item.id === plan.teamId)?.name ?? "—"}</td><td>{data.standards.find((item) => item.id === plan.workStandardId)?.workType ?? "—"}</td><td>{plan.plannedQuantity}</td></tr>)}</tbody></table></div>{isManager && <form className="brigade-card object-plan-form" onSubmit={(event) => { event.preventDefault(); run(() => dataProvider.objectWorkPlans.create({ ...planForm, plannedQuantity: Number(planForm.plannedQuantity), createdBy: user.id })); }}><label>Объект<select value={planForm.objectId} onChange={(event) => setPlanForm({ ...planForm, objectId: event.target.value, buildingId: objects.find((item) => item.id === event.target.value)?.buildings[0]?.id ?? "" })}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Корпус<select value={planForm.buildingId} onChange={(event) => setPlanForm({ ...planForm, buildingId: event.target.value })}>{selectedPlanObject?.buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Дата<input type="date" value={planForm.plannedDate} onChange={(event) => setPlanForm({ ...planForm, plannedDate: event.target.value })} /></label><label>Бригада<select value={planForm.teamId} onChange={(event) => setPlanForm({ ...planForm, teamId: event.target.value })}>{data.teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Вид работ<select value={planForm.workStandardId} onChange={(event) => setPlanForm({ ...planForm, workStandardId: event.target.value })}>{data.standards.map((item) => <option key={item.id} value={item.id}>{item.workType}</option>)}</select></label><label>Объём<input type="number" min="0" value={planForm.plannedQuantity} onChange={(event) => setPlanForm({ ...planForm, plannedQuantity: event.target.value })} /></label><button className="primary-button" disabled={saving || !data.teams.length || !data.standards.length}>Добавить в план</button></form>}</>}

    {tab === "fact" && <><div className="users-table-wrap"><table className="executive-table"><thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>Бригада</th><th>План</th><th>Факт</th><th>Причина</th></tr></thead><tbody>{data.reports.map((report) => <tr key={report.id}><td>{report.reportDate}</td><td>{objectName(objects, report.objectId)}</td><td>{buildingName(objects, report.objectId, report.buildingId)}</td><td>{data.teams.find((item) => item.id === report.teamId)?.name ?? "—"}</td><td>{report.planQuantity}</td><td>{report.factQuantity}</td><td>{report.delayReason || "—"}</td></tr>)}</tbody></table></div><form className="brigade-card object-plan-form" onSubmit={(event) => { event.preventDefault(); run(() => dataProvider.dailyWorkReports.create({ ...reportForm, planQuantity: Number(reportForm.planQuantity), factQuantity: Number(reportForm.factQuantity), createdBy: user.id })); }}><label>Объект<select value={reportForm.objectId} onChange={(event) => setReportForm({ ...reportForm, objectId: event.target.value, buildingId: objects.find((item) => item.id === event.target.value)?.buildings[0]?.id ?? "" })}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Корпус<select value={reportForm.buildingId} onChange={(event) => setReportForm({ ...reportForm, buildingId: event.target.value })}>{selectedReportObject?.buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Дата<input type="date" value={reportForm.reportDate} onChange={(event) => setReportForm({ ...reportForm, reportDate: event.target.value })} /></label><label>Бригада<select value={reportForm.teamId} onChange={(event) => setReportForm({ ...reportForm, teamId: event.target.value })}>{data.teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Вид работ<select value={reportForm.workStandardId} onChange={(event) => setReportForm({ ...reportForm, workStandardId: event.target.value })}>{data.standards.map((item) => <option key={item.id} value={item.id}>{item.workType}</option>)}</select></label><label>План<input type="number" min="0" value={reportForm.planQuantity} onChange={(event) => setReportForm({ ...reportForm, planQuantity: event.target.value })} /></label><label>Факт<input type="number" min="0" value={reportForm.factQuantity} onChange={(event) => setReportForm({ ...reportForm, factQuantity: event.target.value })} /></label><label>Причина отставания<input value={reportForm.delayReason} onChange={(event) => setReportForm({ ...reportForm, delayReason: event.target.value })} /></label><button className="primary-button" disabled={saving || !data.teams.length || !data.standards.length}>Сохранить факт</button></form></>}
  </section>;
}

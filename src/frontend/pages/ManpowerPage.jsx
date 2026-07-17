import React, { useState } from "react";
import {
  addManpowerRequest,
  adjustManpowerRequest,
  addNotification,
  approveManpowerRequest,
  cancelManpowerRequest,
  getDailyItrManpowerTask,
  getManpowerRequests,
  getManpowerSummaryByDate,
  getWeeklyManpowerPlan,
  rejectManpowerRequest,
  updateManpowerRequest,
} from "../storage";

const manpowerPriorities = ["низкий", "средний", "высокий", "критичный"];
const manpowerStatuses = ["черновик", "подана", "на рассмотрении", "утверждена", "скорректирована", "отклонена", "отменена"];
const manpowerDemoObjects = [
  "СК 25", "СК 18", "Дзен 4", "Дзен 6.1", "БК 5", "БК 6",
  "Родные кварталы", "Прокшино 7", "Зорге", "Деснаречье 7",
  "ПИК Яуза", "ПИК Волжский", "Матвеевский парк", "СЦ", "Социалка",
  "Сервис", "Муха", "Выставкин",
];

function getManpowerObjectOptions(objects) {
  const fromObjects = objects.map((object) => ({ id: object.id, name: object.name, buildings: object.buildings ?? [] }));
  const existingNames = new Set(fromObjects.map((object) => object.name));
  const demoObjects = manpowerDemoObjects
    .filter((name) => !existingNames.has(name))
    .map((name) => ({ id: `manpower-${name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "-")}`, name, buildings: [] }));
  return [...fromObjects, ...demoObjects];
}

function isoDateOffset(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(dateIso) {
  return new Date(dateIso).toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function cssToken(value) {
  return String(value ?? "").replaceAll(" ", "-");
}

function ManpowerPage({ objects, user, users, onNotify }) {
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState(user.role === "itr" ? "request" : "requests");
  const [date, setDate] = useState(isoDateOffset(1));
  const [filters, setFilters] = useState({ objectId: "", itrId: "", status: "", priority: "" });
  const [adjustRequest, setAdjustRequest] = useState(null);
  const [editRequest, setEditRequest] = useState(null);
  const [weekDetails, setWeekDetails] = useState(null);
  const objectOptions = getManpowerObjectOptions(objects);
  const requests = getManpowerRequests();
  const visibleRequests = requests.filter((request) => {
    if ((request.targetDate ?? request.date) !== date) return false;
    if (filters.objectId && request.objectId !== filters.objectId) return false;
    if (filters.itrId && request.requestedBy !== filters.itrId) return false;
    if (filters.status && request.status !== filters.status) return false;
    if (filters.priority && request.priority !== filters.priority) return false;
    return true;
  });
  const stats = getManpowerSummaryByDate(date);
  const dailyTask = getDailyItrManpowerTask(user.id);
  const refresh = () => setVersion((value) => value + 1);
  const objectName = (id) => objectOptions.find((object) => object.id === id)?.name ?? id;
  const buildingName = (objectId, buildingId) => objectOptions.find((object) => object.id === objectId)?.buildings?.find((building) => building.id === buildingId)?.name ?? "—";
  const canApprove = ["creator", "company_head", "construction_director"].includes(user.role);

  const notifyUser = (payload) => {
    addNotification(payload);
    onNotify?.();
  };

  const saveRequest = (values, status = "подана") => {
    const payload = { ...values, status, requestedBy: user.id, requestedByName: user.name, requestedByRole: user.role };
    const created = values.id ? updateManpowerRequest(values.id, payload) : addManpowerRequest(payload);
    if (status === "подана") {
      notifyUser({
        type: "заявка на рабочих",
        title: "ИТР подал заявку на рабочих",
        message: `${user.name}: ${objectName(created.objectId)} на ${created.targetDate ?? created.date}`,
        priority: created.priority,
        roleTarget: "construction_director",
        objectId: created.objectId,
        buildingId: created.buildingId,
      });
    }
    setEditRequest(null);
    refresh();
  };

  const approve = (request) => {
    const updated = approveManpowerRequest(request.id, user.id);
    notifyUser({
      type: "расстановка утверждена",
      title: "Заявка утверждена",
      message: `${objectName(request.objectId)}: утверждено ${updated.approvedLoaders} груз. и ${updated.approvedInstallers} монт.`,
      priority: request.priority,
      userId: request.requestedBy,
      objectId: request.objectId,
      buildingId: request.buildingId,
    });
    refresh();
  };

  const reject = (request) => {
    const comment = window.prompt("Комментарий директора", request.directorComment || "Решение директора") ?? "";
    const updated = rejectManpowerRequest(request.id, comment, user.id);
    notifyUser({
      type: "расстановка отклонена",
      title: "Заявка отклонена",
      message: `${objectName(request.objectId)}: ${updated.directorComment || "без комментария"}`,
      priority: request.priority,
      userId: request.requestedBy,
      objectId: request.objectId,
      buildingId: request.buildingId,
    });
    refresh();
  };

  const adjust = (request, values) => {
    const updated = adjustManpowerRequest(request.id, values, user.id);
    notifyUser({
      type: "расстановка скорректирована",
      title: "Заявка скорректирована",
      message: `${objectName(request.objectId)}: скорректировано директором, утверждено ${updated.approvedLoaders} груз. и ${updated.approvedInstallers} монт.`,
      priority: updated.priority,
      userId: request.requestedBy,
      objectId: request.objectId,
      buildingId: request.buildingId,
    });
    setAdjustRequest(null);
    refresh();
  };

  const commentRequest = (request) => {
    const comment = window.prompt("Комментарий директора", request.directorComment || "") ?? request.directorComment ?? "";
    updateManpowerRequest(request.id, { directorComment: comment, status: request.status === "подана" ? "на рассмотрении" : request.status });
    refresh();
  };

  const cancel = (request) => {
    cancelManpowerRequest(request.id);
    refresh();
  };
  const canEditRequest = (request) => request.requestedBy === user.id && !["утверждена", "скорректирована", "отклонена"].includes(request.status);
  const finalRows = visibleRequests.filter((request) => ["утверждена", "скорректирована"].includes(request.status));

  return (
    <section className="manpower-page" key={version}>
      <div className="tasks-hero">
        <div>
          <span>{user.role === "itr" ? "Заявка на рабочих" : "Расстановка рабочей силы"}</span>
          <h2>{user.role === "itr" ? "Заявка на рабочих на завтра" : "Заявки ИТР и итоговый график"}</h2>
          <p>ИТР подают потребность до 15:00, директор утверждает итоговую расстановку на следующий день.</p>
        </div>
        <div className="heading-actions">
          <input className="date-filter" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      <div className="task-tabs brigade-tabs">
        {user.role === "itr" && <button className={tab === "request" ? "active" : ""} onClick={() => setTab("request")}>Подать заявку</button>}
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>{canApprove ? "Утверждение расстановки" : "Общая таблица заявок"}</button>
        <button className={tab === "final" ? "active" : ""} onClick={() => setTab("final")}>Итоговый график</button>
        <button className={tab === "week" ? "active" : ""} onClick={() => setTab("week")}>План на неделю</button>
      </div>

      <div className="manpower-kpis">
        <MetricCard title="Всего заявок" value={stats.total} />
        <MetricCard title="Без решения" value={stats.unresolved} tone={stats.unresolved ? "warning" : "neutral"} />
        <MetricCard title="Утверждено" value={stats.approved} tone="success" />
        <MetricCard title="Скорректировано" value={stats.adjusted} tone="warning" />
        <MetricCard title="Отклонено" value={stats.rejected} />
        <MetricCard title="Запрошено грузчиков" value={stats.requestedLoaders} />
        <MetricCard title="Запрошено монтажников" value={stats.requestedInstallers} />
        <MetricCard title="Утверждено грузчиков" value={stats.approvedLoaders} tone="success" />
        <MetricCard title="Утверждено монтажников" value={stats.approvedInstallers} tone="success" />
      </div>

      {tab === "request" && user.role === "itr" && <><ManpowerDailyTask task={dailyTask} onOpen={() => setEditRequest({})} /><ManpowerRequestForm objects={objectOptions} user={user} request={editRequest} onSave={saveRequest} onClose={() => setEditRequest(null)} /></>}

      {tab === "requests" && (
        <div className="brigade-card">
          <div className="panel-title">
            <div><h2>{canApprove ? "Утверждение расстановки" : "Общая таблица заявок"}</h2><p>Все заявки на выбранную дату: объект, объём, приоритет и решение директора.</p></div>
          </div>
          <div className="manpower-filters">
            <select value={filters.objectId} onChange={(event) => setFilters({ ...filters, objectId: event.target.value })}><option value="">Все объекты</option>{objectOptions.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select>
            {canApprove && <select value={filters.itrId} onChange={(event) => setFilters({ ...filters, itrId: event.target.value })}><option value="">Все ИТР</option>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Все статусы</option>{manpowerStatuses.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="">Все приоритеты</option>{manpowerPriorities.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="brigade-table-wrap">
            <table className="executive-table manpower-table">
              <thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>ИТР</th><th>Вид работ</th><th>Дверей</th><th>Груз. запрос</th><th>Монт. запрос</th><th>Приоритет</th><th>Комментарий ИТР</th><th>Статус</th><th>Решение</th><th>Утв. груз.</th><th>Утв. монт.</th><th>Комментарий директора</th><th>Действие</th></tr></thead>
              <tbody>{visibleRequests.map((request) => <tr key={request.id} className={`priority-row priority-${request.priority}`}>
                <td>{request.targetDate ?? request.date}</td><td>{objectName(request.objectId)}</td><td>{buildingName(request.objectId, request.buildingId)}</td><td>{request.requestedByName}</td><td>{request.workType ?? request.reason}</td><td>{request.doorsPlanned || "—"}</td><td>{request.loadersRequested}</td><td>{request.installersRequested}</td><td><span className={`priority-pill priority-${cssToken(request.priority)}`}>{request.priority}</span></td><td>{request.comment || request.workVolume || "—"}</td><td><span className={`manpower-status status-${cssToken(request.status)}`}>{request.status}</span></td><td>{request.directorDecision ?? "без решения"}</td><td>{request.approvedLoaders || "—"}</td><td>{request.approvedInstallers || "—"}</td><td>{request.directorComment || "—"}</td><td><div className="task-actions">{canApprove ? <><button className="secondary-button slim" onClick={() => approve(request)}>Утвердить как запрошено</button><button className="secondary-button slim" onClick={() => setAdjustRequest(request)}>Скорректировать</button><button className="secondary-button slim" onClick={() => reject(request)}>Отклонить</button><button className="secondary-button slim" onClick={() => commentRequest(request)}>Комментарий</button></> : canEditRequest(request) ? <><button className="secondary-button slim" onClick={() => { setEditRequest(request); setTab("request"); }}>Редактировать</button><button className="secondary-button slim" onClick={() => cancel(request)}>Отменить</button></> : "Просмотр"}</div></td>
              </tr>)}</tbody>
            </table>
            {visibleRequests.length === 0 && <div className="empty-plan">Заявок на выбранную дату нет.</div>}
          </div>
        </div>
      )}

      {tab === "final" && <ManpowerFinalSchedule requests={finalRows} objectName={objectName} buildingName={buildingName} />}
      {tab === "week" && <ManpowerWeekPlan startDate={date} objects={objectOptions} onDetails={setWeekDetails} />}
      {adjustRequest && <ManpowerAdjustModal request={adjustRequest} objectName={objectName(adjustRequest.objectId)} onClose={() => setAdjustRequest(null)} onSave={(values) => adjust(adjustRequest, values)} />}
      {weekDetails && <ManpowerWeekDetails details={weekDetails} objectName={objectName} buildingName={buildingName} onClose={() => setWeekDetails(null)} />}
    </section>
  );
}

function MetricCard({ title, value, tone = "neutral" }) {
  return <div className={`executive-kpi ${tone}`}><span>{title}</span><strong>{value}</strong></div>;
}

function ManpowerDailyTask({ task, onOpen }) {
  return <div className={`manpower-daily-task status-${cssToken(task.status)}`}><div><strong>{task.title}</strong><span>Срок: {task.dueText} · статус: {task.status}</span></div><button className="primary-button slim" onClick={onOpen}>Подать заявку</button></div>;
}

const manpowerWorkTypes = ["монтаж дверей", "разгрузка", "подъём дверей", "разнос дверей", "установка фурнитуры", "устранение замечаний", "подготовка проёмов", "прочее"];

function ManpowerRequestForm({ objects, user, request, onSave, onClose }) {
  const [form, setForm] = useState({ id: request?.id ?? "", targetDate: request?.targetDate ?? request?.date ?? isoDateOffset(1), objectId: request?.objectId ?? objects[0]?.id ?? "", buildingId: request?.buildingId ?? "", workType: request?.workType ?? "монтаж дверей", doorsPlanned: request?.doorsPlanned ?? 0, workVolume: request?.workVolume ?? "", loadersRequested: request?.loadersRequested ?? 0, installersRequested: request?.installersRequested ?? 0, priority: request?.priority ?? "средний", comment: request?.comment ?? "" });
  const selectedObject = objects.find((object) => object.id === form.objectId) ?? objects[0];
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: "", teamId: "" } : { ...current, [field]: value });
  return <form className="brigade-card manpower-request-form" onSubmit={(event) => { event.preventDefault(); onSave(form, "подана"); }}><div className="panel-title"><div><h2>{form.id ? "Редактировать заявку" : "Новая заявка"}</h2><p>{user.name}, укажите потребность на выбранный объект.</p></div>{form.id && <button className="secondary-button slim" type="button" onClick={onClose}>Закрыть</button>}</div><div className="object-plan-form"><label>Дата, на которую нужны рабочие<input type="date" value={form.targetDate} onChange={(event) => update("targetDate", event.target.value)} /></label><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}><option value="">Без корпуса</option>{selectedObject?.buildings?.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Вид работ<select value={form.workType} onChange={(event) => update("workType", event.target.value)}>{manpowerWorkTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Количество дверей<input type="number" min="0" value={form.doorsPlanned} onChange={(event) => update("doorsPlanned", event.target.value)} /></label><label>Грузчики<input type="number" min="0" value={form.loadersRequested} onChange={(event) => update("loadersRequested", event.target.value)} /></label><label>Монтажники<input type="number" min="0" value={form.installersRequested} onChange={(event) => update("installersRequested", event.target.value)} /></label><label>Приоритет<select value={form.priority} onChange={(event) => update("priority", event.target.value)}>{manpowerPriorities.map((item) => <option key={item}>{item}</option>)}</select></label><label className="wide">Объём / комментарий по объёму<input value={form.workVolume} onChange={(event) => update("workVolume", event.target.value)} placeholder="Например: 18 дверей, корпус 4.1, этажи 8-10" /></label><label className="wide">Комментарий ИТР<input value={form.comment} onChange={(event) => update("comment", event.target.value)} placeholder="Что важно знать директору" /></label><button className="secondary-button" type="button" onClick={() => onSave(form, "черновик")}>Сохранить черновик</button><button className="primary-button">Подать заявку</button></div></form>;
}

function ManpowerFinalSchedule({ requests, objectName, buildingName }) {
  return <div className="brigade-card"><div className="panel-title"><div><h2>Итоговый график</h2><p>Только утверждённые и скорректированные заявки.</p></div></div><div className="brigade-table-wrap"><table className="executive-table manpower-table"><thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>ИТР</th><th>Вид работ</th><th>Дверей</th><th>Грузчики утверждено</th><th>Монтажники утверждено</th><th>Комментарий директора</th><th>Статус</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td>{request.targetDate ?? request.date}</td><td>{objectName(request.objectId)}</td><td>{buildingName(request.objectId, request.buildingId)}</td><td>{request.requestedByName}</td><td>{request.workType ?? request.reason}</td><td>{request.doorsPlanned || "—"}</td><td>{request.approvedLoaders}</td><td>{request.approvedInstallers}</td><td>{request.directorComment || "—"}</td><td>{request.status}</td></tr>)}</tbody></table>{requests.length === 0 && <div className="empty-plan">Итоговый график на выбранную дату пока пуст.</div>}</div></div>;
}

function ManpowerWeekPlan({ startDate, objects, onDetails }) {
  const { days, requests } = getWeeklyManpowerPlan(startDate);
  const rows = objects.map((object) => ({ object, requests: requests.filter((request) => request.objectId === object.id) })).filter((row) => row.requests.length > 0 || ["СК 25", "СК 18", "ПИК Яуза", "Матвеевский парк", "Родные кварталы"].includes(row.object.name));
  const cell = (object, day) => {
    const dayRequests = requests.filter((request) => request.objectId === object.id && (request.targetDate ?? request.date) === day);
    const approved = dayRequests.filter((request) => ["утверждена", "скорректирована"].includes(request.status));
    const loaders = approved.reduce((sum, request) => sum + Number(request.approvedLoaders || 0), 0);
    const installers = approved.reduce((sum, request) => sum + Number(request.approvedInstallers || 0), 0);
    const top = dayRequests.find((request) => request.priority === "критичный") ?? dayRequests.find((request) => request.priority === "высокий") ?? dayRequests[0];
    return <button className={`week-cell ${approved.length ? "approved" : dayRequests.length ? "pending" : ""} ${top?.priority === "критичный" ? "critical" : top?.priority === "высокий" ? "high" : ""}`} onClick={() => dayRequests.length && onDetails({ object, day, requests: dayRequests })}><strong>{dayRequests.length ? `Г: ${loaders} / М: ${installers}` : "—"}</strong>{top && <small>{top.workType ?? top.reason}</small>}{top?.doorsPlanned ? <small>{top.doorsPlanned} дверей</small> : null}{top && <em>{top.priority}</em>}</button>;
  };
  return <div className="brigade-card"><div className="panel-title"><div><h2>План на неделю</h2><p>Excel-подобный вид утверждённой расстановки по объектам и дням.</p></div></div><div className="manpower-week-wrap"><table className="manpower-week-table"><thead><tr><th>Объект</th>{days.map((day) => <th key={day}>{formatShortDate(day)}</th>)}</tr></thead><tbody>{rows.map(({ object }) => <tr key={object.id}><td>{object.name}</td>{days.map((day) => <td key={`${object.id}-${day}`}>{cell(object, day)}</td>)}</tr>)}</tbody></table></div></div>;
}

function ManpowerWeekDetails({ details, objectName, buildingName, onClose }) {
  return <div className="modal-backdrop"><div className="task-modal"><div className="modal-title"><div><h2>{details.object.name} / {details.day}</h2><p>Детали заявок на дату.</p></div><button type="button" onClick={onClose}>×</button></div><div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Корпус</th><th>ИТР</th><th>Вид работ</th><th>Дверей</th><th>Груз.</th><th>Монт.</th><th>Статус</th></tr></thead><tbody>{details.requests.map((request) => <tr key={request.id}><td>{objectName(request.objectId)}</td><td>{buildingName(request.objectId, request.buildingId)}</td><td>{request.requestedByName}</td><td>{request.workType}</td><td>{request.doorsPlanned || "—"}</td><td>{request.approvedLoaders || request.loadersRequested}</td><td>{request.approvedInstallers || request.installersRequested}</td><td>{request.status}</td></tr>)}</tbody></table></div></div></div>;
}

function ManpowerAdjustModal({ request, objectName, onClose, onSave }) {
  const [form, setForm] = useState({ approvedLoaders: request.approvedLoaders || request.loadersRequested, approvedInstallers: request.approvedInstallers || request.installersRequested, directorComment: request.directorComment || "", priority: request.priority });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <div className="modal-backdrop"><form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="modal-title"><div><h2>Скорректировать заявку</h2><p>{objectName}: запрошено {request.loadersRequested} груз. и {request.installersRequested} монт.</p></div><button type="button" onClick={onClose}>×</button></div><label>Утвердить грузчиков<input type="number" min="0" value={form.approvedLoaders} onChange={(event) => update("approvedLoaders", event.target.value)} /></label><label>Утвердить монтажников<input type="number" min="0" value={form.approvedInstallers} onChange={(event) => update("approvedInstallers", event.target.value)} /></label><label>Приоритет<select value={form.priority} onChange={(event) => update("priority", event.target.value)}>{manpowerPriorities.map((item) => <option key={item}>{item}</option>)}</select></label><label>Комментарий директора<textarea value={form.directorComment} onChange={(event) => update("directorComment", event.target.value)} /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить решение</button></div></form></div>;
}

export default ManpowerPage;

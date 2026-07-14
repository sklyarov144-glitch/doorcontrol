import React, { useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";

function issueContext(objects, doorId) {
  for (const object of objects) {
    for (const building of object.buildings) {
      for (const floor of building.floors) {
        const door = floor.doors.find((item) => item.id === doorId);
        if (door) return { object, building, floor, door };
      }
    }
  }
  return null;
}

function ageInDays(date) {
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / 86400000)) : 0;
}

export default function RemoteTnIssuesPage({ objects, users, onOpen, onResolve }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const userNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);

  const load = async () => {
    setLoading(true);
    setError("");
    try { setIssues(await dataProvider.tnIssues.getAll()); }
    catch (loadError) { setError(loadError?.message ?? "Не удалось загрузить замечания ТН"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => issues.map((issue) => {
    const context = issueContext(objects, issue.doorId);
    if (!context) return null;
    return { ...issue, ...context, days: ageInDays(issue.createdAt) };
  }).filter(Boolean), [issues, objects]);
  const openRows = rows.filter((row) => row.status !== "устранено");
  const stats = [
    ["Всего замечаний", rows.length, "neutral"],
    ["Открытые", openRows.length, "warning"],
    ["Просроченные", openRows.filter((row) => row.days > 3).length, "danger"],
    ["Устранённые", rows.filter((row) => row.status === "устранено").length, "success"],
  ];

  const resolve = async (row) => {
    setSavingId(row.id);
    setError("");
    try {
      await onResolve(row.doorId);
      await load();
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось закрыть замечание");
    } finally {
      setSavingId("");
    }
  };

  return <section className="custody-page">
    <div className="custody-hero"><div><span>Качество и технадзор</span><h2>Замечания ТН</h2><p>Единый журнал замечаний с фактическими датами и ответственными.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="custody-stats">{stats.map(([label, value, tone]) => <div className={`custody-stat ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {loading ? <div className="empty-plan">Загружаем замечания...</div> : <div className="custody-table-card"><table className="custody-table"><thead><tr><th>Объект</th><th>Корпус</th><th>Этаж</th><th>Дверь</th><th>Замечание</th><th>Ответственный</th><th>Дней</th><th>Приоритет</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{rows.map((row) => <tr className={row.status === "устранено" ? "is-closed" : row.days > 3 ? "is-overdue" : "is-warning"} key={row.id}><td>{row.object.name}</td><td>{row.building.name}</td><td>{row.floor.number}</td><td>{row.door.number ?? row.door.label}</td><td>{row.description || row.title}</td><td>{userNames.get(row.responsibleId) ?? "Не назначен"}</td><td>{row.days}</td><td>{row.priority}</td><td>{row.status}</td><td><div className="custody-actions"><button className="secondary-button slim" onClick={() => onOpen({ objectId: row.object.id, buildingId: row.building.id, floorId: row.floor.id, doorId: row.door.id })}>Открыть дверь</button>{row.status !== "устранено" && <button className="primary-button slim" disabled={savingId === row.id} onClick={() => resolve(row)}>Устранено</button>}</div></td></tr>)}</tbody></table>{!rows.length && <div className="empty-plan">Замечаний ТН пока нет.</div>}</div>}
  </section>;
}

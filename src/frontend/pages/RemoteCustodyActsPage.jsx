import React, { useCallback, useEffect, useMemo, useState } from "react";
import { dataProvider } from "../../services/dataProvider";
import { buildCustodyRows, custodyStats } from "../domain/custodyControl";

const formatDate = (value) => value ? new Intl.DateTimeFormat("ru-RU").format(new Date(value)) : "—";

export default function RemoteCustodyActsPage({ objects, users, onOpen, onUpdateAct }) {
  const [source, setSource] = useState({ acts: [], documents: [] });
  const [draftLinks, setDraftLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingDoorId, setSavingDoorId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [acts, documents] = await Promise.all([
        dataProvider.custodyActs.getAll(),
        dataProvider.documents.getAll(),
      ]);
      setSource({ acts, documents });
    } catch (loadError) {
      setError(loadError?.message ?? "Не удалось загрузить акты ОХ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const rows = useMemo(() => buildCustodyRows({ ...source, objects, users }), [objects, source, users]);
  const metrics = custodyStats(rows);
  const stats = [
    ["Смонтировано дверей", metrics.mounted, "neutral"],
    ["Передано по акту", metrics.closed, "success"],
    ["Без акта", metrics.open, "warning"],
    ["Просрочено без акта", metrics.overdue, "danger"],
    ["Закрытие актов", `${metrics.closeRate}%`, "success"],
  ];
  const visibleRows = rows.filter((row) => !row.closed || row.custodyActUrl);

  const updateAct = async (row, close = false) => {
    const url = (draftLinks[row.doorId] ?? row.custodyActUrl ?? "").trim();
    if (!url && !close) return;
    setSavingDoorId(row.doorId);
    setError("");
    try {
      await onUpdateAct(row.doorId, {
        custodyActUrl: url,
        storageAct: close ? "передано по акту" : "акт загружен",
        documentId: url === row.custodyActUrl ? row.documentId : null,
        actTitle: `Акт ОХ · ${row.door}`,
      });
      await load();
    } catch (saveError) {
      setError(saveError?.message ?? "Не удалось сохранить акт ОХ");
    } finally {
      setSavingDoorId("");
    }
  };

  return <section className="custody-page">
    <div className="custody-hero"><div><span>Документы передачи</span><h2>Контроль актов ОХ</h2><p>Сроки рассчитаны от фактической даты монтажа, а ссылки хранятся в едином реестре документов.</p></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="custody-stats">{stats.map(([label, value, tone]) => <div className={`custody-stat ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {loading ? <div className="empty-plan">Загружаем акты ОХ...</div> : <div className="custody-table-card">
      <table className="custody-table"><thead><tr><th>Объект</th><th>Корпус</th><th>Этаж</th><th>Дверь / проём</th><th>Дата монтажа</th><th>Дней без акта</th><th>Ответственный</th><th>Статус акта</th><th>Ссылка на акт</th><th>Действие</th></tr></thead>
        <tbody>{visibleRows.map((row) => {
          const actUrl = draftLinks[row.doorId] ?? row.custodyActUrl ?? "";
          const saving = savingDoorId === row.doorId;
          return <tr className={row.closed ? "is-closed" : row.overdue ? "is-overdue" : "is-warning"} key={row.id}><td>{row.object}</td><td>{row.building}</td><td>{row.floor}</td><td>{row.door}</td><td>{formatDate(row.mountedAt)}</td><td>{row.days}</td><td>{row.responsible}</td><td><span className={`act-status ${row.closed ? "closed" : row.overdue ? "overdue" : "pending"}`}>{row.closed ? "Закрыто" : row.storageAct}</span></td><td><input type="url" value={actUrl} onChange={(event) => setDraftLinks((current) => ({ ...current, [row.doorId]: event.target.value }))} placeholder="https://disk.yandex.ru/..." /></td><td><div className="custody-actions"><button className="secondary-button slim" onClick={() => onOpen(row)}>Открыть дверь</button><button className="secondary-button slim" disabled={saving || !actUrl.trim()} onClick={() => updateAct(row)}>{saving ? "Сохраняем..." : "Добавить ссылку"}</button><button className="primary-button slim" disabled={saving} onClick={() => updateAct(row, true)}>Закрыть акт</button></div></td></tr>;
        })}</tbody>
      </table>
      {!visibleRows.length && <div className="empty-plan">Смонтированных дверей без актов нет.</div>}
    </div>}
  </section>;
}

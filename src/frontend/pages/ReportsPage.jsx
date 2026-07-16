import React, { useState } from "react";
import { groupReportRows, reportMetrics, reportRowsFromObjects } from "../domain/reports";

export default function ReportsPage({ objects }) {
  const [groupBy, setGroupBy] = useState("object");
  const [objectId, setObjectId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const rows = reportRowsFromObjects(objects);
  const objectOptions = objects.map((object) => [object.id, object.name]);
  const buildingOptions = objects
    .filter((object) => !objectId || object.id === objectId)
    .flatMap((object) => (object.buildings ?? []).map((building) => [building.id, building.name]));
  const scopedRows = rows.filter((row) => (!objectId || row.objectId === objectId) && (!buildingId || row.buildingId === buildingId));
  const metrics = reportMetrics(scopedRows);
  const grouped = groupReportRows(scopedRows, groupBy);

  return (
    <section className="reports-page">
      <div className="report-toolbar">
        <div>
          <h2>Отчёты по монтажу</h2>
          <p>Показатели рассчитываются по фактическим статусам дверей из рабочего backend-контура.</p>
        </div>
        <div className="report-scope">
          <label>Объект<select aria-label="Объект отчёта" value={objectId} onChange={(event) => { setObjectId(event.target.value); setBuildingId(""); }}><option value="">Все объекты</option>{objectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Корпус<select aria-label="Корпус отчёта" value={buildingId} onChange={(event) => setBuildingId(event.target.value)}><option value="">Все корпуса</option>{buildingOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Группировка<select aria-label="Группировка отчёта" value={groupBy} onChange={(event) => setGroupBy(event.target.value)}><option value="object">По объекту</option><option value="building">По корпусу</option><option value="floor">По этажу</option></select></label>
        </div>
      </div>
      <div className="matrix-stats">
        <div><span>Всего дверей</span><strong>{metrics.total}</strong></div>
        <div><span>Смонтировано</span><strong>{metrics.mounted}</strong></div>
        <div><span>Передано по актам</span><strong>{metrics.custody}</strong></div>
        <div><span>Принято ТН</span><strong>{metrics.accepted}</strong></div>
        <div><span>Замечаний</span><strong>{metrics.issues}</strong></div>
        <div><span>Готовность</span><strong>{metrics.readiness}%</strong></div>
      </div>
      <div className="report-groups">
        {grouped.map(([name, groupRows]) => {
          const groupMetrics = reportMetrics(groupRows);
          return <div className="report-group" key={name}><div><strong>{name}</strong><span>{groupMetrics.total} дверей</span></div><div className="progress-bar"><span style={{ width: `${groupMetrics.readiness}%` }} /></div><b>{groupMetrics.readiness}%</b><span>Смонтировано: {groupMetrics.mounted}</span><span>Замечаний: {groupMetrics.issues}</span></div>;
        })}
      </div>
      {scopedRows.length === 0 && <div className="empty-plan">В выбранной области пока нет дверей.</div>}
    </section>
  );
}

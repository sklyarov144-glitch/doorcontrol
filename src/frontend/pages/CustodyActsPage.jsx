import React, { useState } from "react";

function custodyAge(floor, doorIndex) {
  return ((Number(floor.number) || 1) + doorIndex * 2) % 10 + 1;
}

function getCustodyActRows(objects, users) {
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  return objects.flatMap((object) =>
    object.buildings.flatMap((building) =>
      building.floors
        .filter((floor) => floor.type === "floor")
        .flatMap((floor) =>
          floor.doors.map((door, doorIndex) => {
            const mounted = ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus);
            const closed = ["передано по акту", "закрыто"].includes(door.storageAct);
            const days = mounted ? custodyAge(floor, doorIndex) : 0;
            return {
              id: `custody-${door.id}`,
              objectId: object.id,
              object: object.name,
              buildingId: building.id,
              building: building.name,
              floorId: floor.id,
              floor: floor.number,
              doorId: door.id,
              door: door.number,
              mounted,
              closed,
              days,
              mountedAt: mounted ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : "",
              responsible: userNames.get(door.assignedUserId ?? object.responsibleId) ?? door.assignedUserId ?? object.responsibleId ?? "Не назначен",
              responsibleId: door.assignedUserId ?? object.responsibleId ?? "",
              storageAct: door.storageAct,
              custodyActUrl: door.custodyActUrl ?? "",
              overdue: mounted && !closed && days > 3,
            };
          })
        )
    )
  );
}

function canSeeCustodyRow(row, user) {
  if (["creator", "company_head", "construction_director"].includes(user.role)) return true;
  if (user.role === "itr") return !row.responsibleId || row.responsibleId === user.id || row.responsible === user.name;
  return false;
}

function CustodyActsPage({ objects, user, users, onOpen, onUpdateAct }) {
  const [draftLinks, setDraftLinks] = useState({});
  const rows = getCustodyActRows(objects, users).filter((row) => canSeeCustodyRow(row, user));
  const mountedRows = rows.filter((row) => row.mounted);
  const closedRows = mountedRows.filter((row) => row.closed);
  const withoutAct = mountedRows.filter((row) => !row.closed);
  const overdueRows = withoutAct.filter((row) => row.overdue);
  const closeRate = mountedRows.length ? Math.round((closedRows.length / mountedRows.length) * 100) : 0;
  const stats = [
    ["Смонтировано дверей", mountedRows.length, "neutral"],
    ["Передано по акту", closedRows.length, "success"],
    ["Без акта", withoutAct.length, "warning"],
    ["Просрочено без акта", overdueRows.length, "danger"],
    ["Закрытие актов", `${closeRate}%`, "success"],
  ];
  const visibleRows = mountedRows.filter((row) => !row.closed || row.custodyActUrl);

  const saveLink = (row) => {
    const url = draftLinks[row.doorId] ?? row.custodyActUrl ?? "";
    onUpdateAct(row.doorId, { custodyActUrl: url, storageAct: url ? "акт подготовлен" : row.storageAct });
  };

  return (
    <section className="custody-page">
      <div className="custody-hero">
        <div>
          <span>Документы передачи</span>
          <h2>Контроль актов ОХ</h2>
          <p>Все смонтированные двери без закрытого акта ответственного хранения собраны в одном рабочем списке.</p>
        </div>
      </div>
      <div className="custody-stats">
        {stats.map(([label, value, tone]) => <div className={`custody-stat ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="custody-table-card">
        <table className="custody-table">
          <thead>
            <tr>
              <th>Объект</th>
              <th>Корпус</th>
              <th>Этаж</th>
              <th>Дверь / проём</th>
              <th>Дата монтажа</th>
              <th>Дней без акта</th>
              <th>Ответственный</th>
              <th>Статус акта</th>
              <th>Ссылка на акт</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const actUrl = draftLinks[row.doorId] ?? row.custodyActUrl ?? "";
              return (
                <tr className={row.closed ? "is-closed" : row.overdue ? "is-overdue" : "is-warning"} key={row.id}>
                  <td>{row.object}</td>
                  <td>{row.building}</td>
                  <td>{row.floor}</td>
                  <td>{row.door}</td>
                  <td>{row.mountedAt}</td>
                  <td>{row.closed ? 0 : row.days}</td>
                  <td>{row.responsible}</td>
                  <td><span className={`act-status ${row.closed ? "closed" : row.overdue ? "overdue" : "pending"}`}>{row.closed ? "Закрыто" : row.storageAct}</span></td>
                  <td><input type="url" value={actUrl} onChange={(event) => setDraftLinks((current) => ({ ...current, [row.doorId]: event.target.value }))} placeholder="https://disk.yandex.ru/..." /></td>
                  <td><div className="custody-actions"><button className="secondary-button slim" onClick={() => onOpen(row)}>Открыть дверь</button><button className="secondary-button slim" onClick={() => saveLink(row)}>Добавить ссылку</button><button className="primary-button slim" onClick={() => onUpdateAct(row.doorId, { custodyActUrl: actUrl, storageAct: "передано по акту" })}>Отметить акт закрытым</button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && <div className="empty-plan">Смонтированных дверей без актов нет.</div>}
      </div>
    </section>
  );
}

export default CustodyActsPage;

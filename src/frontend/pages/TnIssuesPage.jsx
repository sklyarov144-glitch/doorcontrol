import React from "react";

function getTnIssueRows(objects, users) {
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  return objects.flatMap((object) =>
    object.buildings.flatMap((building) =>
      building.floors
        .filter((floor) => floor.type === "floor")
        .flatMap((floor) =>
          floor.doors
            .filter((door) => door.issue === "есть замечание" || door.tnIssues === "Да")
            .map((door, index) => {
              const days = ((Number(floor.number) || 1) + index * 3) % 9 + 1;
              const resolved = door.issue === "устранено" || door.doorStatus === "принято технадзором";
              return {
                id: `tn-${door.id}`,
                objectId: object.id,
                object: object.name,
                buildingId: building.id,
                building: building.name,
                floorId: floor.id,
                floor: floor.number,
                doorId: door.id,
                door: door.number,
                mark: door.mark,
                status: resolved ? "устранено" : days > 3 ? "просрочено" : "новое",
                days,
                responsible: userNames.get(door.assignedUserId ?? object.responsibleId) ?? "Не назначен",
                comment: door.openingComment || door.comment || "Проверить замечание технадзора",
              };
            })
        )
    )
  );
}

export default function TnIssuesPage({ objects, user, users, onOpen }) {
  const rows = getTnIssueRows(objects, users).filter((row) => {
    if (["creator", "company_head", "construction_director"].includes(user.role)) return true;
    return row.responsible === user.name || row.responsible === "Не назначен";
  });
  const stats = [
    ["Всего замечаний", rows.length, "neutral"],
    ["Открытые", rows.filter((row) => row.status === "новое").length, "warning"],
    ["Просроченные", rows.filter((row) => row.status === "просрочено").length, "danger"],
    ["Устранённые", rows.filter((row) => row.status === "устранено").length, "success"],
    ["Принятые ТН", rows.filter((row) => row.status === "устранено").length, "success"],
  ];

  return (
    <section className="custody-page">
      <div className="custody-hero">
        <div>
          <span>Качество и технадзор</span>
          <h2>Замечания ТН</h2>
          <p>Короткий рабочий список замечаний технадзора по дверям, чтобы ИТР быстро видел, что нужно закрыть.</p>
        </div>
      </div>
      <div className="custody-stats">
        {stats.map(([label, value, tone]) => <div className={`custody-stat ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="custody-table-card">
        <table className="custody-table">
          <thead><tr><th>Объект</th><th>Корпус</th><th>Этаж</th><th>Дверь</th><th>Марка</th><th>Статус</th><th>Дней</th><th>Ответственный</th><th>Комментарий</th><th>Действие</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.status === "просрочено" ? "is-overdue" : row.status === "устранено" ? "is-closed" : "is-warning"}>
                <td>{row.object}</td><td>{row.building}</td><td>{row.floor}</td><td>{row.door}</td><td>{row.mark}</td><td><span className={`act-status ${row.status === "устранено" ? "closed" : row.status === "просрочено" ? "overdue" : "pending"}`}>{row.status}</span></td><td>{row.days}</td><td>{row.responsible}</td><td>{row.comment}</td><td><button className="secondary-button slim" onClick={() => onOpen(row)}>Открыть дверь</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty-plan">Открытых замечаний ТН нет.</div>}
      </div>
    </section>
  );
}

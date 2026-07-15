const mountedStatuses = new Set(["смонтирована", "принято технадзором", "передано по акту"]);
const closedStatuses = new Set(["передано по акту", "закрыто"]);

function daysSince(value, now) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
}

export function buildCustodyRows({ objects = [], acts = [], documents = [], users = [], now = new Date() }) {
  const actsByDoor = new Map(acts.map((act) => [act.doorId, act]));
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const userNames = new Map(users.map((user) => [user.id, user.name]));
  return objects.flatMap((object) => (object.buildings ?? []).flatMap((building) =>
    (building.floors ?? []).filter((floor) => floor.type === "floor").flatMap((floor) =>
      (floor.doors ?? []).filter((door) => mountedStatuses.has(door.doorStatus)).map((door) => {
        const act = actsByDoor.get(door.id);
        const document = documentsById.get(act?.documentId);
        const status = act?.status ?? door.storageAct ?? door.custodyActStatus ?? "не передана";
        const closed = closedStatuses.has(status);
        const days = closed ? 0 : daysSince(door.mountedAt, now);
        const responsibleId = door.assignedUserId ?? building.responsibleItrId ?? object.responsibleDirectorId ?? object.responsibleId ?? "";
        return {
          id: act?.id ?? `custody-${door.id}`,
          objectId: object.id,
          object: object.name,
          buildingId: building.id,
          building: building.name,
          floorId: floor.id,
          floor: floor.number ?? floor.label,
          doorId: door.id,
          door: door.number ?? door.label ?? door.mark,
          mountedAt: door.mountedAt ?? "",
          days,
          responsibleId,
          responsible: userNames.get(responsibleId) ?? "Не назначен",
          storageAct: status,
          custodyActUrl: document?.url ?? door.custodyActUrl ?? "",
          documentId: document?.id ?? act?.documentId ?? null,
          closed,
          overdue: !closed && days > 3,
        };
      })
    )
  ));
}

export function custodyStats(rows = []) {
  const closed = rows.filter((row) => row.closed).length;
  const open = rows.length - closed;
  return {
    mounted: rows.length,
    closed,
    open,
    overdue: rows.filter((row) => row.overdue).length,
    closeRate: rows.length ? Math.round(closed / rows.length * 100) : 0,
  };
}

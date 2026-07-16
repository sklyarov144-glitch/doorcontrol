const mountedStatuses = new Set(["смонтирована", "принято технадзором", "передано по акту"]);
const acceptedStatuses = new Set(["принято технадзором", "передано по акту"]);

export function reportRowsFromObjects(objects) {
  return objects.flatMap((object) =>
    (object.buildings ?? []).flatMap((building) =>
      (building.floors ?? [])
        .filter((floor) => floor.type === "floor")
        .flatMap((floor) =>
          (floor.doors ?? []).map((door) => ({
            doorId: door.id,
            objectId: object.id,
            object: object.name,
            buildingId: building.id,
            building: building.name,
            floor: floor.number,
            mounted: mountedStatuses.has(door.doorStatus),
            accepted: acceptedStatuses.has(door.doorStatus) || Boolean(door.tnAcceptedAt),
            custody: door.storageAct === "передано по акту" || Boolean(door.custodyActClosedAt),
            issue: door.issue === "есть замечание",
          }))
        )
    )
  );
}

export function reportMetrics(rows) {
  const mounted = rows.filter((row) => row.mounted).length;
  return {
    total: rows.length,
    mounted,
    accepted: rows.filter((row) => row.accepted).length,
    custody: rows.filter((row) => row.custody).length,
    issues: rows.filter((row) => row.issue).length,
    readiness: rows.length ? Math.round((mounted / rows.length) * 100) : 0,
  };
}

export function groupReportRows(rows, groupBy) {
  return Object.entries(rows.reduce((result, row) => {
    const key = String(row[groupBy] ?? "—");
    result[key] = [...(result[key] ?? []), row];
    return result;
  }, {}));
}

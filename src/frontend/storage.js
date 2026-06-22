const DOOR_MATRIX_KEY = "gross-lean-montage.door-matrix.v1";

export function getDoorMatrix() {
  try {
    return JSON.parse(localStorage.getItem(DOOR_MATRIX_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveDoorMatrix(rows) {
  localStorage.setItem(DOOR_MATRIX_KEY, JSON.stringify(rows));
}

export function normalizeDoorMatrix(rows) {
  const counters = new Map();
  return rows.map((row) => {
    const key = `${row.objectId}|${row.buildingId}|${row.floorId ?? row.floor}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return { ...row, openingNumber: String(next) };
  });
}

export function createDoorMatrix(objects) {
  const rows = [];
  objects.forEach((object) => {
    object.buildings
      .filter((building) => ["Корпус 4.1", "Корпус 4.2", "Корпус 4.3"].includes(building.name))
      .forEach((building) => {
        building.floors
          .filter((floor) => floor.type === "floor" && floor.number <= 3)
          .forEach((floor) => {
            floor.doors.slice(0, 6).forEach((door, index) => {
              const offset = building.name.endsWith(".1") ? 0 : building.name.endsWith(".2") ? 1 : 2;
              rows.push({
                id: `matrix-${building.id}-${floor.id}-${door.id}`,
                doorId: door.id,
                objectId: object.id,
                buildingId: building.id,
                floorId: floor.id,
                object: object.name,
                building: building.name,
                floor: floor.number,
                date: `2026-06-${String(10 + floor.number).padStart(2, "0")}`,
                openingNumber: String(index + 1),
                apartment: door.number,
                mark: door.mark,
                model: door.type === "МОП" ? "ГРОСС-МОП" : `ГРОСС-${101 + index}`,
                arOpening: `${900 + index * 10}×${2100 + offset * 10}`,
                actualHeight: String(2095 + index),
                actualWidth: String(895 + index),
                note: index === 2 ? "Проверить геометрию проёма" : "",
                ordered: index < 5 ? "Да" : "Нет",
                arrived: index < 4 ? "Да" : "Нет",
                lifted: index < 3 ? "Да" : "Нет",
                distributed: index < 3 ? "Да" : "Нет",
                installed: index < 2 ? "Да" : "Нет",
                installationTeam: index < 2 ? "Бригада 1" : "",
                custodyAct: index === 0 ? "Да" : "Нет",
                keys: index === 0 ? "Да" : "Нет",
                acceptedTN: index === 0 ? "Да" : "Нет",
                tnIssues: index === 2 ? "Да" : "Нет",
                ptoDate: index === 0 ? "2026-06-18" : "",
                hidden: false,
              });
            });
          });
      });
  });
  return rows;
}

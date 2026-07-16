export const defaultStair = { x: 43, y: 39, width: 18, height: 22 };
export const defaultDirectionArrow = { x: 51, y: 49, size: 46, angle: -90 };

export function createTemplateDoor(buildingId, index, type, x, y) {
  const isMop = type === "МОП";
  const number = index + 1;
  const label = isMop ? `${number} МОП` : `Квартира ${number}`;
  const mark = isMop ? `${number} МОП` : `Д-${number}`;
  return {
    id: `${buildingId}-${isMop ? "mop" : "apt"}-${number}`,
    label,
    number: label,
    mark,
    type,
    status: "не начато",
    doorStatus: "не начато",
    openingStatus: "готов",
    issueStatus: "нет",
    issue: "нет",
    custodyActStatus: "не передана",
    storageAct: "не передана",
    x,
    y,
    swing: y < 50 ? "down-right" : "up-left",
    history: [{
      id: `${buildingId}-${type}-${number}-init`,
      text: "Создано администратором",
      date: "сегодня",
      user: "admin",
    }],
  };
}

export function createTemplateRooms(count) {
  const apartments = Math.max(1, Number(count) || 1);
  return Array.from({ length: apartments }, (_, index) => {
    const topCount = Math.ceil(apartments / 2);
    const top = index < topCount;
    const rowIndex = top ? index : index - topCount;
    const rowCount = top ? topCount : Math.max(1, apartments - topCount);
    return {
      id: `room-${index + 1}`,
      label: `Квартира ${index + 1}`,
      x: 8 + (rowIndex * 84) / rowCount,
      y: top ? 8 : 66,
      width: Math.min(24, 80 / rowCount),
      height: 26,
    };
  });
}

export function generateFloorTemplateDraft(buildingId, apartmentCount, mopCount) {
  const apartments = Math.max(1, Number(apartmentCount) || 1);
  const mopDoors = Math.max(0, Number(mopCount) || 0);
  const doors = [];
  const rooms = createTemplateRooms(apartments);
  const topCount = Math.ceil(apartments / 2);

  for (let index = 0; index < apartments; index += 1) {
    const top = index < topCount;
    const rowIndex = top ? index : index - topCount;
    const rowCount = top ? topCount : Math.max(1, apartments - topCount);
    doors.push(createTemplateDoor(
      buildingId,
      index,
      "Квартирная",
      14 + ((rowIndex + 0.5) * 72) / rowCount,
      top ? 32 : 68
    ));
  }
  for (let index = 0; index < mopDoors; index += 1) {
    doors.push(createTemplateDoor(buildingId, index, "МОП", 48 + index * 7, 50));
  }

  return {
    apartments,
    mopDoors,
    rooms,
    doors,
    stair: { ...defaultStair },
    arrow: { ...defaultDirectionArrow },
  };
}

export function applyTemplateToBuilding(building, template) {
  return {
    ...building,
    floorTemplate: template,
    doorsPerFloor: template.doors.length,
    floors: (building.floors ?? []).map((floor) => {
      if (floor.type !== "floor") return floor;
      return {
        ...floor,
        doors: template.doors.map((door) => ({
          ...door,
          id: `${building.id}-${floor.id}-${door.id}`,
          history: [...(door.history ?? [])],
        })),
      };
    }),
  };
}

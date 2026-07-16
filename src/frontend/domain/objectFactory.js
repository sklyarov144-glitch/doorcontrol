export function createFloorStructure(count, { includeParking = false } = {}) {
  const floorCount = Math.max(1, Number(count) || 1);
  return [
    ...(includeParking
      ? [{ id: "parking", label: "Паркинг", type: "parking", doors: [] }]
      : []),
    ...Array.from({ length: floorCount }, (_, index) => ({
      id: `floor-${index + 1}`,
      label: String(index + 1),
      number: index + 1,
      type: "floor",
      doors: [],
    })),
    { id: "roof", label: "Кровля", type: "service", doors: [] },
  ];
}

export function createEmptyBuilding(values, now = new Date()) {
  const floorsCount = Math.max(1, Number(values.floorsCount) || 1);
  return {
    id: values.id,
    objectId: values.objectId,
    name: values.name,
    floorsCount,
    doorsPerFloor: Math.max(0, Number(values.doorsPerFloor) || 0),
    responsibleItrId: values.responsibleItrId || "",
    assignedTeamIds: values.assignedTeamIds ?? [],
    status: values.status ?? "в работе",
    comment: values.comment ?? "",
    createdAt: values.createdAt ?? now.toISOString(),
    updatedAt: values.updatedAt ?? now.toISOString(),
    floorTemplate: null,
    floors: createFloorStructure(floorsCount, { includeParking: values.includeParking }),
  };
}

export function resizeBuildingFloors(building, floorCount) {
  const count = Math.max(1, Number(floorCount) || 1);
  const existingFloors = building.floors ?? [];
  const parking = existingFloors.find(
    (floor) => floor.id === "parking" || floor.type === "parking"
  );
  const roof = existingFloors.find((floor) => floor.id === "roof") ?? {
    id: "roof",
    label: "Кровля",
    type: "service",
    doors: [],
  };

  return [
    ...(parking ? [parking] : []),
    ...Array.from({ length: count }, (_, index) => {
      const id = `floor-${index + 1}`;
      return existingFloors.find((floor) => floor.id === id) ?? {
        id,
        label: String(index + 1),
        number: index + 1,
        type: "floor",
        doors: [],
      };
    }),
    roof,
  ];
}

const managementRoles = new Set(["creator", "company_head"]);
const readyDoorStatuses = new Set(["смонтирована", "принято технадзором", "передано по акту"]);
const correctionStatuses = new Set(["требует корректировки", "передан на исправление"]);

export function visibleObjectsForUser(user, objects = []) {
  if (!user || managementRoles.has(user.role)) return objects;
  if (user.role === "construction_director") {
    return objects.filter((object) =>
      [object.responsibleDirectorId, object.responsibleId].includes(user.id)
      || user.assignedObjectIds?.includes(object.id)
    );
  }
  if (user.role === "itr") {
    return objects
      .map((object) => ({
        ...object,
        buildings: (object.buildings ?? []).filter((building) =>
          user.assignedObjectIds?.includes(object.id)
          || user.assignedBuildingIds?.includes(building.id)
          || object.responsibleItrIds?.includes(user.id)
          || building.responsibleItrId === user.id
        ),
      }))
      .filter((object) => user.assignedObjectIds?.includes(object.id) || object.buildings.length > 0);
  }
  return [];
}

export function visibleUsersForManager(currentUser, users = [], objects = []) {
  if (!currentUser) return [];
  if (managementRoles.has(currentUser.role)) return users;
  if (currentUser.role === "construction_director") {
    const objectIds = new Set(
      objects
        .filter((object) =>
          [object.responsibleDirectorId, object.responsibleId].includes(currentUser.id)
          || currentUser.assignedObjectIds?.includes(object.id)
        )
        .map((object) => object.id)
    );
    return users.filter((user) =>
      user.id === currentUser.id
      || user.role === "itr" && user.assignedObjectIds?.some((id) => objectIds.has(id))
    );
  }
  return users.filter((user) => user.id === currentUser.id);
}

export function allObjectDoors(object) {
  return (object?.buildings ?? []).flatMap((building) =>
    (building.floors ?? []).flatMap((floor) => floor.doors ?? [])
  );
}

export function objectMetrics(object) {
  const doors = allObjectDoors(object);
  const ready = doors.filter((door) => readyDoorStatuses.has(door.doorStatus)).length;
  return {
    readiness: doors.length ? Math.round(ready / doors.length * 100) : 0,
    issues: doors.filter((door) => door.issue === "есть замечание").length,
    openingsOnCorrection: doors.filter((door) => correctionStatuses.has(door.openingStatus)).length,
  };
}

export function buildingReadiness(building) {
  const doors = (building?.floors ?? []).flatMap((floor) => floor.doors ?? []);
  const ready = doors.filter((door) => readyDoorStatuses.has(door.doorStatus)).length;
  return doors.length ? Math.round(ready / doors.length * 100) : 0;
}

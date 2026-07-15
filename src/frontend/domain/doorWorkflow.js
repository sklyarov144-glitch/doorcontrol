export function deriveDoorValues(values) {
  return {
    ...values,
    doorStatus: values.acceptedTN === "Да"
      ? "принято технадзором"
      : values.installed === "Да" && values.doorStatus === "не начато"
        ? "смонтирована"
        : values.doorStatus,
    issue: values.tnIssues === "Да" ? "есть замечание" : values.issue,
    storageAct: values.custodyAct === "Да" ? "передано по акту" : values.storageAct,
  };
}

function changeDescription(door, values, quickHistory) {
  const changes = [];
  if (door.doorStatus !== values.doorStatus) {
    changes.push(`Статус двери: ${door.doorStatus} -> ${values.doorStatus}`);
  }
  if (door.openingStatus !== values.openingStatus) {
    changes.push(`Статус проема: ${door.openingStatus} -> ${values.openingStatus}`);
  }
  if (door.issue !== values.issue) {
    changes.push(`Замечания: ${door.issue} -> ${values.issue}`);
  }
  if (door.storageAct !== values.storageAct) {
    changes.push(`Акт: ${door.storageAct} -> ${values.storageAct}`);
  }
  if (quickHistory) changes.push(quickHistory);
  return changes;
}

export function applyDoorWorkflow(objects, doorId, values, actorName, now = new Date()) {
  const effectiveValues = deriveDoorValues(values);
  const { quickHistory, ...doorValues } = effectiveValues;
  const today = now.toISOString().slice(0, 10);
  let updatedDoor = null;

  const nextObjects = objects.map((object) => ({
    ...object,
    buildings: object.buildings.map((building) => ({
      ...building,
      floors: building.floors.map((floor) => ({
        ...floor,
        doors: floor.doors.map((door) => {
          if (door.id !== doorId) return door;
          const changes = changeDescription(door, effectiveValues, quickHistory);
          updatedDoor = {
            ...door,
            ...doorValues,
            mountedAt: effectiveValues.doorStatus === "смонтирована" && !door.mountedAt
              ? today
              : effectiveValues.mountedAt ?? door.mountedAt,
            tnAcceptedAt: effectiveValues.doorStatus === "принято технадзором" && !door.tnAcceptedAt
              ? today
              : effectiveValues.tnAcceptedAt ?? door.tnAcceptedAt,
            custodyActUploadedAt: (effectiveValues.storageAct === "акт загружен" || effectiveValues.custodyActUrl) && !door.custodyActUploadedAt
              ? today
              : effectiveValues.custodyActUploadedAt ?? door.custodyActUploadedAt,
            custodyActClosedAt: effectiveValues.storageAct === "передано по акту" && !door.custodyActClosedAt
              ? today
              : effectiveValues.custodyActClosedAt ?? door.custodyActClosedAt,
            history: changes.length > 0
              ? [{
                  id: `${door.id}-${now.getTime()}`,
                  text: changes.join("; "),
                  date: now.toLocaleString("ru-RU"),
                  user: actorName,
                }, ...(door.history ?? [])]
              : door.history ?? [],
          };
          return updatedDoor;
        }),
      })),
    })),
  }));

  return { nextObjects, updatedDoor, effectiveValues };
}

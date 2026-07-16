export function isManualTaskOverdue(task, today = new Date().toISOString().slice(0, 10)) {
  const comparisonDate = typeof today === "string" ? today : new Date().toISOString().slice(0, 10);
  return Boolean(task.dueDate && task.dueDate < comparisonDate && !["выполнена", "отменена"].includes(task.status));
}

export function canSeeManualTask(task, user) {
  if (["creator", "company_head", "construction_director"].includes(user.role)) return true;
  if (user.role === "itr") return task.assignedTo === user.id;
  return false;
}

export function getManualTaskNoticeCount(tasks, user) {
  return tasks.filter((task) => canSeeManualTask(task, user) && (task.status === "новая" || isManualTaskOverdue(task))).length;
}

export function manualTaskStatusLabel(status) {
  return {
    новая: "Новая",
    "в работе": "В работе",
    выполнена: "Выполнена",
    отменена: "Отменена",
  }[status] ?? status ?? "Новая";
}

export function getTaskContext(objects, task) {
  const object = objects.find((item) => item.id === task.objectId);
  const building = object?.buildings?.find((item) => item.id === task.buildingId);
  const floor = building?.floors?.find((item) => item.id === task.floorId);
  const door = floor?.doors?.find((item) => item.id === task.doorId);

  return {
    objectName: object?.name ?? "—",
    buildingName: building?.name ?? "—",
    floorName: floor?.number ? `Этаж ${floor.number}` : "—",
    doorName: door?.number ?? door?.mark ?? "—",
  };
}

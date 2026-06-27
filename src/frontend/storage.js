const DOOR_MATRIX_KEY = "gross-lean-montage.door-matrix.v1";
const MATRIX_DOCUMENTS_KEY = "gross-lean-montage.matrix-documents.v1";
const TODAY_TASKS_KEY = "gross-lean-montage.today-tasks.v1";
const MANUAL_TASKS_KEY = "gross-lean-montage.manual-tasks.v1";
const NOTIFICATIONS_KEY = "gross-lean-montage.notifications.v1";
const DEFAULT_MATRIX_DOCUMENTS = [
  { building: "Корпус 4.1", url: "https://disk.yandex.ru/" },
  { building: "Корпус 4.2", url: "https://disk.yandex.ru/" },
  { building: "Корпус 4.3", url: "https://disk.yandex.ru/" },
];

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
    const isCommonDoor = row.doorType === "МОП" || String(row.mark ?? "").includes("МОП");
    if (isCommonDoor) {
      return { ...row, openingNumber: row.openingNumber || row.mark || "МОП" };
    }
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return { ...row, openingNumber: String(next) };
  });
}

export function createDoorMatrix(objects) {
  const rows = [];
  objects.forEach((object) => {
    object.buildings
      .forEach((building) => {
        building.floors
          .filter((floor) => floor.type === "floor")
          .forEach((floor) => {
            floor.doors.forEach((door, index) => {
              const offset = building.name.endsWith(".1") ? 0 : building.name.endsWith(".2") ? 1 : 2;
              const isCommonDoor = door.type === "МОП";
              rows.push({
                id: `matrix-${door.id}`,
                doorId: door.id,
                doorType: door.type,
                objectId: object.id,
                buildingId: building.id,
                floorId: floor.id,
                object: object.name,
                building: building.name,
                floor: floor.number,
                date: `2026-06-${String(10 + floor.number).padStart(2, "0")}`,
                openingNumber: isCommonDoor ? door.mark : String(index + 1),
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

export function mergeDoorMatrixWithObjects(rows, objects) {
  const existing = new Map(rows.map((row) => [row.doorId, row]));
  const generated = createDoorMatrix(objects);
  return generated.map((row) => ({ ...row, ...(existing.get(row.doorId) ?? {}) }));
}

function getDoorStatusAge(floor, doorIndex) {
  return ((Number(floor.number) || 1) + doorIndex * 2) % 14 + 1;
}

function getPriority(type, days) {
  if (type === "Замечания ТН") return "высокий";
  if (type === "Смонтировано без акта ОХ" && days > 3) return "высокий";
  if (type === "Зависшие статусы" && days > 7) return "высокий";
  if (["Проёмы под риск", "Нет документов", "Нет ответственного"].includes(type)) return "средний";
  return "низкий";
}

function createProblem({ type, object, building, floor, door, days, action = "Проверить" }) {
  return {
    id: `${type}-${door?.id ?? building?.id ?? object.id}-${floor?.id ?? "object"}`,
    type,
    objectId: object.id,
    object: object.name,
    buildingId: building?.id ?? "",
    building: building?.name ?? "—",
    floorId: floor?.id ?? "",
    floor: floor?.number ?? "—",
    doorId: door?.id ?? "",
    door: door?.number ?? door?.mark ?? "—",
    responsible: object.responsibleName ?? object.responsibleId ?? "Не назначен",
    days,
    priority: getPriority(type, days),
    action,
  };
}

export function calculateDoorProblems(objects, documents = []) {
  const documentBuildings = new Set(documents.filter((item) => item.url).map((item) => item.building));
  const problems = [];

  objects.forEach((object) => {
    if (!object.responsibleId) {
      problems.push(createProblem({ type: "Нет ответственного", object, days: 0, action: "Назначить" }));
    }

    object.buildings.forEach((building) => {
      if (!documentBuildings.has(building.name)) {
        problems.push(createProblem({ type: "Нет документов", object, building, days: 0, action: "Добавить документ" }));
      }

      building.floors
        .filter((floor) => floor.type === "floor")
        .forEach((floor) => {
          floor.doors.forEach((door, doorIndex) => {
            const days = getDoorStatusAge(floor, doorIndex);
            const hasOpeningComment = door.openingComment || door.comment || door.note;

            if (days > 7) {
              problems.push(createProblem({ type: "Просроченные двери", object, building, floor, door, days }));
            }
            if (door.doorStatus === "смонтирована" && !["передано по акту", "закрыто"].includes(door.storageAct)) {
              problems.push(createProblem({ type: "Смонтировано без акта ОХ", object, building, floor, door, days }));
            }
            if (door.issue === "есть замечание") {
              problems.push(createProblem({ type: "Замечания ТН", object, building, floor, door, days, action: "Устранить" }));
            }
            if (door.openingStatus === "требует корректировки" || hasOpeningComment) {
              problems.push(createProblem({ type: "Проёмы под риск", object, building, floor, door, days, action: "Проверить проём" }));
            }
            if (!door.assignedUserId && !object.responsibleId) {
              problems.push(createProblem({ type: "Нет ответственного", object, building, floor, door, days, action: "Назначить" }));
            }
            if (door.doorStatus === "доставлена" && days > 7) {
              problems.push(createProblem({ type: "Зависшие статусы", object, building, floor, door, days, action: "Поднять дверь" }));
            }
            if (door.doorStatus === "смонтирована" && days > 7) {
              problems.push(createProblem({ type: "Зависшие статусы", object, building, floor, door, days, action: "Передать ТН" }));
            }
          });
        });
    });
  });

  return problems;
}

export function getProblemStats(problems) {
  return {
    total: problems.length,
    overdue: problems.filter((item) => item.type === "Просроченные двери").length,
    tnIssues: problems.filter((item) => item.type === "Замечания ТН").length,
    noCustodyAct: problems.filter((item) => item.type === "Смонтировано без акта ОХ").length,
    riskyOpenings: problems.filter((item) => item.type === "Проёмы под риск").length,
  };
}

export function getProblems(objects) {
  let documents = DEFAULT_MATRIX_DOCUMENTS;
  try {
    const saved = JSON.parse(localStorage.getItem(MATRIX_DOCUMENTS_KEY));
    documents = Array.isArray(saved) ? saved : DEFAULT_MATRIX_DOCUMENTS;
  } catch {
    documents = DEFAULT_MATRIX_DOCUMENTS;
  }
  return calculateDoorProblems(objects, Array.isArray(documents) ? documents : []);
}

function taskTypeFromProblem(problem) {
  const map = {
    "Смонтировано без акта ОХ": "Закрыть акт ОХ",
    "Замечания ТН": "Проверить замечание ТН",
    "Проёмы под риск": "Проверить проём",
    "Просроченные двери": "Обновить статус двери",
    "Нет документов": "Добавить документ",
    "Нет ответственного": "Назначить ответственного",
    "Зависшие статусы": "Проверить зависшую дверь",
  };
  return map[problem.type] ?? "Обновить статус двери";
}

function taskTitleFromProblem(problem) {
  if (problem.type === "Замечания ТН" && problem.days > 5) return "Устранить замечание";
  return taskTypeFromProblem(problem);
}

function toIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso, toDate = new Date()) {
  if (!fromIso) return 0;
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return 0;
  return Math.floor((toDate.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0)) / 86400000);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayTaskState() {
  try {
    return JSON.parse(localStorage.getItem(TODAY_TASKS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTodayTaskState(tasks) {
  localStorage.setItem(TODAY_TASKS_KEY, JSON.stringify(tasks));
}

export function calculateTodayTasks(objects) {
  const saved = getTodayTaskState();
  const savedById = new Map(saved.map((task) => [task.id, task]));
  const problems = getProblems(objects);
  const tasks = problems.map((problem) => {
    const id = `task-${problem.id}`;
    const savedTask = savedById.get(id);
    const urgent = problem.priority === "высокий";
    return {
      id,
      title: taskTitleFromProblem(problem),
      description: `${problem.type}: ${problem.object} / ${problem.building} / ${problem.door}`,
      type: taskTypeFromProblem(problem),
      priority: problem.priority,
      status: savedTask?.status ?? "new",
      objectId: problem.objectId,
      object: problem.object,
      buildingId: problem.buildingId,
      building: problem.building,
      floorId: problem.floorId,
      floor: problem.floor,
      doorId: problem.doorId,
      door: problem.door,
      assignedTo: problem.responsible,
      createdAt: savedTask?.createdAt ?? toIsoDate(-Math.max(0, Number(problem.days) || 0)),
      dueDate: savedTask?.dueDate ?? toIsoDate(urgent ? 0 : 1),
      problemId: problem.id,
      days: problem.days,
    };
  });
  const activeIds = new Set(tasks.map((task) => task.id));
  const completed = saved.filter((task) => task.status === "done" && !activeIds.has(task.id));
  const nextTasks = [...tasks, ...completed];
  saveTodayTaskState(nextTasks);
  return nextTasks;
}

export function updateTaskStatus(taskId, status) {
  const tasks = getTodayTaskState();
  const next = tasks.map((task) => task.id === taskId ? { ...task, status } : task);
  saveTodayTaskState(next);
  return next;
}

export function getTasks() {
  try {
    return JSON.parse(localStorage.getItem(MANUAL_TASKS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(MANUAL_TASKS_KEY, JSON.stringify(tasks));
}

export function addTask(task) {
  const now = new Date().toISOString();
  const nextTask = {
    id: task.id ?? `manual-task-${Date.now()}`,
    title: task.title ?? "Новая задача",
    description: task.description ?? "",
    type: task.type ?? "Другое",
    priority: task.priority ?? "средний",
    status: task.status ?? "новая",
    createdBy: task.createdBy ?? "",
    assignedTo: task.assignedTo ?? "",
    objectId: task.objectId ?? "",
    buildingId: task.buildingId ?? "",
    floorId: task.floorId ?? "",
    doorId: task.doorId ?? "",
    dueDate: task.dueDate ?? toIsoDate(1),
    createdAt: task.createdAt ?? now,
    updatedAt: now,
    comments: task.comments ?? [],
    documentLinks: task.documentLinks ?? [],
    automatic: task.automatic ?? false,
    automaticKey: task.automaticKey ?? "",
    directorId: task.directorId ?? "",
    history: task.history ?? [{ id: `history-${Date.now()}`, text: "Задача создана", at: now, userId: task.createdBy ?? "" }],
  };
  const tasks = getTasks();
  const next = [nextTask, ...tasks];
  saveTasks(next);
  return nextTask;
}

export function updateTask(taskId, values) {
  const now = new Date().toISOString();
  const tasks = getTasks();
  const next = tasks.map((task) => task.id === taskId ? {
    ...task,
    ...values,
    updatedAt: now,
    history: values.history ?? [
      { id: `history-${Date.now()}`, text: values.status ? `Статус изменён: ${values.status}` : "Задача обновлена", at: now, userId: values.updatedBy ?? "" },
      ...(task.history ?? []),
    ],
  } : task);
  saveTasks(next);
  return next;
}

export function deleteTask(taskId) {
  const next = getTasks().filter((task) => task.id !== taskId);
  saveTasks(next);
  return next;
}

export function getTasksByUser(userId) {
  return getTasks().filter((task) => task.assignedTo === userId || task.createdBy === userId);
}

export function getTasksByObject(objectId) {
  return getTasks().filter((task) => task.objectId === objectId);
}

export function addTaskComment(taskId, comment) {
  const now = new Date().toISOString();
  const prepared = {
    id: comment.id ?? `comment-${Date.now()}`,
    userId: comment.userId ?? "",
    userName: comment.userName ?? "",
    text: comment.text ?? "",
    createdAt: comment.createdAt ?? now,
  };
  const tasks = getTasks();
  const next = tasks.map((task) => task.id === taskId ? {
    ...task,
    updatedAt: now,
    comments: [prepared, ...(task.comments ?? [])],
    history: [
      { id: `history-${Date.now()}`, text: "Добавлен комментарий", at: now, userId: prepared.userId },
      ...(task.history ?? []),
    ],
  } : task);
  saveTasks(next);
  return prepared;
}

export function addTaskLink(taskId, link) {
  const now = new Date().toISOString();
  const prepared = {
    id: link.id ?? `link-${Date.now()}`,
    title: link.title ?? "Ссылка",
    url: link.url ?? "",
    category: link.category ?? "документ",
    comment: link.comment ?? "",
    createdAt: link.createdAt ?? now,
    createdBy: link.createdBy ?? "",
  };
  const tasks = getTasks();
  const next = tasks.map((task) => task.id === taskId ? {
    ...task,
    updatedAt: now,
    documentLinks: [prepared, ...(task.documentLinks ?? [])],
    history: [
      { id: `history-${Date.now()}`, text: "Добавлена ссылка", at: now, userId: prepared.createdBy },
      ...(task.history ?? []),
    ],
  } : task);
  saveTasks(next);
  return prepared;
}

export function getNotifications() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addNotification(notification) {
  const now = new Date().toISOString();
  const prepared = {
    id: notification.id ?? `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: notification.type ?? "новая задача",
    title: notification.title ?? "Уведомление",
    message: notification.message ?? "",
    priority: notification.priority ?? "средний",
    status: notification.status ?? "unread",
    createdAt: notification.createdAt ?? now,
    userId: notification.userId ?? "",
    roleTarget: notification.roleTarget ?? "",
    objectId: notification.objectId ?? "",
    buildingId: notification.buildingId ?? "",
    floorId: notification.floorId ?? "",
    doorId: notification.doorId ?? "",
    taskId: notification.taskId ?? "",
    actionUrl: notification.actionUrl ?? "",
  };
  const exists = getNotifications().some((item) =>
    item.type === prepared.type &&
    item.userId === prepared.userId &&
    item.taskId === prepared.taskId &&
    item.doorId === prepared.doorId &&
    item.status === "unread"
  );
  if (exists) return prepared;
  const next = [prepared, ...getNotifications()];
  saveNotifications(next);
  return prepared;
}

export function markNotificationRead(notificationId) {
  const next = getNotifications().map((item) => item.id === notificationId ? { ...item, status: "read" } : item);
  saveNotifications(next);
  return next;
}

export function markAllNotificationsRead(user) {
  const next = getNotifications().map((item) => canNotificationReachUser(item, user) ? { ...item, status: "read" } : item);
  saveNotifications(next);
  return next;
}

function canNotificationReachUser(notification, user) {
  if (!user) return false;
  if (user.role === "creator") return true;
  if (notification.userId && notification.userId === user.id) return true;
  if (notification.roleTarget && notification.roleTarget === user.role) return true;
  if (user.role === "company_head" && notification.priority === "высокий") return true;
  return false;
}

export function getNotificationsByUser(user) {
  return getNotifications().filter((item) => canNotificationReachUser(item, user));
}

export function getUnreadNotificationsCount(user) {
  return getNotificationsByUser(user).filter((item) => item.status === "unread").length;
}

function taskAssigneeForDoor(object, door, users) {
  if (door.assignedUserId) return door.assignedUserId;
  const objectResponsible = users.find((user) => user.id === object.responsibleId);
  if (objectResponsible?.role === "itr") return objectResponsible.id;
  return users.find((user) => user.role === "itr")?.id ?? "";
}

function objectDirectorId(object, users) {
  if (object.responsibleId) return object.responsibleId;
  return users.find((user) => user.role === "construction_director")?.id ?? users.find((user) => user.role === "company_head")?.id ?? "";
}

export function calculateOverdueDoorTasks(objects, users = []) {
  const tasks = [];
  objects.forEach((object) => {
    object.buildings.forEach((building) => {
      building.floors.filter((floor) => floor.type === "floor").forEach((floor) => {
        floor.doors.forEach((door) => {
          const mounted = door.doorStatus === "смонтирована" || door.mountedAt;
          if (!mounted) return;
          const mountedAt = door.mountedAt ?? todayIso();
          const mountedDays = daysBetween(mountedAt);
          const assignedTo = taskAssigneeForDoor(object, door, users);
          const common = {
            priority: "высокий",
            status: "новая",
            createdBy: "system",
            assignedTo,
            objectId: object.id,
            buildingId: building.id,
            floorId: floor.id,
            doorId: door.id,
            automatic: true,
          };
          if (mountedDays > 2 && door.doorStatus !== "принято технадзором" && !door.tnAcceptedAt) {
            tasks.push({
              ...common,
              id: `auto-tn-${door.id}-${mountedAt}`,
              automaticKey: `auto-tn-${door.id}`,
              title: "Передать дверь ТН",
              type: "Проверить замечание ТН",
              description: `${object.name} / ${building.name} / этаж ${floor.number} / ${door.number}: дверь смонтирована ${mountedDays} дн. назад, ТН не принят.`,
              dueDate: todayIso(),
              days: mountedDays,
              directorId: objectDirectorId(object, users),
            });
          }
          const actClosed = ["акт загружен", "передано по акту", "закрыто"].includes(door.storageAct) || door.custodyActUploadedAt || door.custodyActClosedAt;
          if (mountedDays > 3 && !actClosed) {
            tasks.push({
              ...common,
              id: `auto-act-${door.id}-${mountedAt}`,
              automaticKey: `auto-act-${door.id}`,
              title: "Добавить акт АОХ",
              type: "Добавить акт АОХ",
              description: `${object.name} / ${building.name} / этаж ${floor.number} / ${door.number}: акт АОХ не загружен ${mountedDays} дн. после монтажа.`,
              dueDate: todayIso(),
              days: mountedDays,
              directorId: objectDirectorId(object, users),
            });
          }
        });
      });
    });
  });
  return tasks;
}

export function createAutomaticTaskIfNeeded(task) {
  const tasks = getTasks();
  const hasActiveDuplicate = tasks.some((item) =>
    item.automaticKey === task.automaticKey &&
    item.doorId === task.doorId &&
    !["выполнена", "отменена"].includes(item.status)
  );
  if (hasActiveDuplicate) return null;
  return addTask(task);
}

export function syncAutomaticTasksAndNotifications(objects, users = []) {
  const candidates = calculateOverdueDoorTasks(objects, users);
  const created = [];
  candidates.forEach((candidate) => {
    const task = createAutomaticTaskIfNeeded(candidate);
    if (!task) return;
    created.push(task);
    addNotification({
      type: candidate.title === "Передать дверь ТН" ? "дверь не передана ТН в срок" : "акт АОХ не загружен в срок",
      title: candidate.title,
      message: candidate.description,
      priority: "высокий",
      userId: task.assignedTo,
      objectId: task.objectId,
      buildingId: task.buildingId,
      floorId: task.floorId,
      doorId: task.doorId,
      taskId: task.id,
    });
    if (candidate.directorId && candidate.directorId !== task.assignedTo) {
      addNotification({
        type: "новая задача",
        title: `Автозадача: ${candidate.title}`,
        message: candidate.description,
        priority: "высокий",
        userId: candidate.directorId,
        roleTarget: "construction_director",
        objectId: task.objectId,
        buildingId: task.buildingId,
        floorId: task.floorId,
        doorId: task.doorId,
        taskId: task.id,
      });
    }
    addNotification({
      type: "задача просрочена",
      title: `Высокая просрочка: ${candidate.title}`,
      message: candidate.description,
      priority: "высокий",
      roleTarget: "company_head",
      objectId: task.objectId,
      buildingId: task.buildingId,
      floorId: task.floorId,
      doorId: task.doorId,
      taskId: task.id,
    });
  });
  return created;
}

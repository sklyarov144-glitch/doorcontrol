const DOOR_MATRIX_KEY = "gross-lean-montage.door-matrix.v1";
const MATRIX_DOCUMENTS_KEY = "gross-lean-montage.matrix-documents.v1";
const TODAY_TASKS_KEY = "gross-lean-montage.today-tasks.v1";
const MANUAL_TASKS_KEY = "gross-lean-montage.manual-tasks.v1";
const NOTIFICATIONS_KEY = "gross-lean-montage.notifications.v1";
const WORK_STANDARDS_KEY = "gross-lean-montage.work-standards.v1";
const OBJECT_WORK_PLANS_KEY = "gross-lean-montage.object-work-plans.v1";
const TEAMS_KEY = "gross-lean-montage.teams.v1";
const EMPLOYEES_KEY = "gross-lean-montage.employees.v1";
const DAILY_WORK_REPORTS_KEY = "gross-lean-montage.daily-work-reports.v1";
const DEFAULT_MATRIX_DOCUMENTS = [
  { building: "Корпус 4.1", url: "https://disk.yandex.ru/" },
  { building: "Корпус 4.2", url: "https://disk.yandex.ru/" },
  { building: "Корпус 4.3", url: "https://disk.yandex.ru/" },
];

const initialWorkStandards = [
  { workType: "Монтаж квартирных дверей", teamComposition: "2 монтажника", dailyPlan: 18, unitName: "двери", dailyBudget: 54000, unitPrice: 3000, category: "Монтаж", comment: "Базовый план по квартирным дверям" },
  { workType: "Монтаж квартирных дверей с фурнитурой", teamComposition: "2 монтажника + подсобник", dailyPlan: 14, unitName: "комплекты", dailyBudget: 49000, unitPrice: 3500, category: "Монтаж", comment: "Сложная фурнитура / доборные операции" },
  { workType: "Монтаж МОП", teamComposition: "2 монтажника", dailyPlan: 10, unitName: "двери", dailyBudget: 36000, unitPrice: 3600, category: "Монтаж", comment: "Двери мест общего пользования" },
  { workType: "Монтаж ДШ", teamComposition: "2 монтажника", dailyPlan: 8, unitName: "комплекты", dailyBudget: 32000, unitPrice: 4000, category: "Монтаж", comment: "Двери шахт / спецпомещения" },
  { workType: "Монтаж НХП", teamComposition: "2 монтажника", dailyPlan: 8, unitName: "комплекты", dailyBudget: 32000, unitPrice: 4000, category: "Монтаж", comment: "НХП и технические двери" },
  { workType: "Монтаж доборов", teamComposition: "2 отделочника", dailyPlan: 24, unitName: "комплекты", dailyBudget: 24000, unitPrice: 1000, category: "Доборы", comment: "" },
  { workType: "Наличники", teamComposition: "2 отделочника", dailyPlan: 30, unitName: "комплекты", dailyBudget: 24000, unitPrice: 800, category: "Отделка", comment: "" },
  { workType: "Фрамуги", teamComposition: "2 монтажника", dailyPlan: 12, unitName: "операции", dailyBudget: 18000, unitPrice: 1500, category: "Отделка", comment: "" },
  { workType: "Разгрузка дверей", teamComposition: "4 грузчика", dailyPlan: 120, unitName: "двери", dailyBudget: 18000, unitPrice: 150, category: "Логистика", comment: "" },
  { workType: "Подъём дверей", teamComposition: "2 грузчика", dailyPlan: 80, unitName: "двери", dailyBudget: 16000, unitPrice: 200, category: "Логистика", comment: "" },
  { workType: "Разнос дверей", teamComposition: "2 грузчика", dailyPlan: 70, unitName: "двери", dailyBudget: 14000, unitPrice: 200, category: "Логистика", comment: "" },
  { workType: "Подготовка дверей к монтажу", teamComposition: "2 сотрудника", dailyPlan: 36, unitName: "операции", dailyBudget: 18000, unitPrice: 500, category: "Подготовка", comment: "" },
  { workType: "Вывоз мусора", teamComposition: "2 сотрудника", dailyPlan: 1, unitName: "операции", dailyBudget: 6000, unitPrice: 6000, category: "Сервис", comment: "По заявке ИТР" },
  { workType: "Подвоз погрузчиком", teamComposition: "Водитель погрузчика", dailyPlan: 6, unitName: "рейсы", dailyBudget: 12000, unitPrice: 2000, category: "Логистика", comment: "" },
].map((item, index) => ({
  id: `standard-${index + 1}`,
  ...item,
  isActive: true,
  createdAt: "2026-06-01T08:00:00.000Z",
  updatedAt: "2026-06-01T08:00:00.000Z",
}));

const initialTeams = [
  { id: "team-1", name: "Бригада Матвеевский 1", teamType: "Монтаж", members: ["employee-1", "employee-2", "employee-3"], objectId: "matveevsky-park", buildingId: "building-4-1", responsibleItrId: "itr-1", isActive: true },
  { id: "team-2", name: "Бригада Логистика", teamType: "Логистика", members: ["employee-4", "employee-5"], objectId: "matveevsky-park", buildingId: "building-4-2", responsibleItrId: "itr-1", isActive: true },
];

const initialEmployees = [
  { id: "employee-1", name: "Иванов Сергей", role: "Монтажник", teamId: "team-1", isActive: true },
  { id: "employee-2", name: "Петров Алексей", role: "Монтажник", teamId: "team-1", isActive: true },
  { id: "employee-3", name: "Сидоров Павел", role: "Подсобник", teamId: "team-1", isActive: true },
  { id: "employee-4", name: "Кузнецов Денис", role: "Грузчик", teamId: "team-2", isActive: true },
  { id: "employee-5", name: "Орлов Максим", role: "Грузчик", teamId: "team-2", isActive: true },
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

function readStorageList(key, fallback = []) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

function writeStorageList(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function stamp(values = {}) {
  const now = new Date().toISOString();
  return { ...values, updatedAt: now, createdAt: values.createdAt ?? now };
}

export function getWorkStandards() {
  return readStorageList(WORK_STANDARDS_KEY, initialWorkStandards);
}

export function saveWorkStandards(rows) {
  writeStorageList(WORK_STANDARDS_KEY, rows);
}

export function addWorkStandard(values) {
  const row = stamp({ id: `standard-${Date.now()}`, isActive: true, ...values });
  saveWorkStandards([row, ...getWorkStandards()]);
  return row;
}

export function updateWorkStandard(id, values) {
  const next = getWorkStandards().map((row) => row.id === id ? { ...row, ...values, updatedAt: new Date().toISOString() } : row);
  saveWorkStandards(next);
  return next;
}

export function disableWorkStandard(id) {
  return updateWorkStandard(id, { isActive: false });
}

export function getObjectWorkPlans() {
  return readStorageList(OBJECT_WORK_PLANS_KEY, []);
}

export function saveObjectWorkPlans(rows) {
  writeStorageList(OBJECT_WORK_PLANS_KEY, rows);
}

export function addObjectWorkPlan(values) {
  const row = stamp({ id: `object-plan-${Date.now()}`, ...values });
  saveObjectWorkPlans([row, ...getObjectWorkPlans()]);
  return row;
}

export function updateObjectWorkPlan(id, values) {
  const next = getObjectWorkPlans().map((row) => row.id === id ? { ...row, ...values, updatedAt: new Date().toISOString() } : row);
  saveObjectWorkPlans(next);
  return next;
}

export function getTeams() {
  return readStorageList(TEAMS_KEY, initialTeams);
}

export function saveTeams(rows) {
  writeStorageList(TEAMS_KEY, rows);
}

export function addTeam(values) {
  const row = { id: `team-${Date.now()}`, members: [], isActive: true, ...values };
  saveTeams([row, ...getTeams()]);
  return row;
}

export function updateTeam(id, values) {
  const next = getTeams().map((row) => row.id === id ? { ...row, ...values } : row);
  saveTeams(next);
  return next;
}

export function disableTeam(id) {
  return updateTeam(id, { isActive: false });
}

export function getEmployees() {
  return readStorageList(EMPLOYEES_KEY, initialEmployees);
}

export function saveEmployees(rows) {
  writeStorageList(EMPLOYEES_KEY, rows);
}

export function addEmployee(values) {
  const row = { id: `employee-${Date.now()}`, isActive: true, ...values };
  saveEmployees([row, ...getEmployees()]);
  return row;
}

export function updateEmployee(id, values) {
  const next = getEmployees().map((row) => row.id === id ? { ...row, ...values } : row);
  saveEmployees(next);
  return next;
}

export function disableEmployee(id) {
  return updateEmployee(id, { isActive: false });
}

export function getDailyWorkReports() {
  return readStorageList(DAILY_WORK_REPORTS_KEY, []);
}

export function saveDailyWorkReports(rows) {
  writeStorageList(DAILY_WORK_REPORTS_KEY, rows);
}

export function addDailyWorkReport(values) {
  const planned = Number(values.plannedQuantity) || 0;
  const actual = Number(values.actualQuantity) || 0;
  const row = stamp({
    id: `daily-report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    completionPercent: planned > 0 ? Math.round((actual / planned) * 100) : 0,
    deviation: actual - planned,
    ...values,
    plannedQuantity: planned,
    actualQuantity: actual,
  });
  saveDailyWorkReports([row, ...getDailyWorkReports()]);
  return row;
}

export function updateDailyWorkReport(id, values) {
  const next = getDailyWorkReports().map((row) => {
    if (row.id !== id) return row;
    const planned = Number(values.plannedQuantity ?? row.plannedQuantity) || 0;
    const actual = Number(values.actualQuantity ?? row.actualQuantity) || 0;
    return { ...row, ...values, plannedQuantity: planned, actualQuantity: actual, completionPercent: planned > 0 ? Math.round((actual / planned) * 100) : 0, deviation: actual - planned, updatedAt: new Date().toISOString() };
  });
  saveDailyWorkReports(next);
  return next;
}

function filterReports(reports, filters = {}) {
  return reports.filter((row) => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    if (filters.objectId && row.objectId !== filters.objectId) return false;
    if (filters.buildingId && row.buildingId !== filters.buildingId) return false;
    if (filters.teamId && row.teamId !== filters.teamId) return false;
    if (filters.employeeId && row.employeeId !== filters.employeeId) return false;
    if (filters.workTypeId && row.workTypeId !== filters.workTypeId) return false;
    if (filters.createdBy && row.createdBy !== filters.createdBy) return false;
    return true;
  });
}

export function getPlanFactStats(filters = {}) {
  const reports = filterReports(getDailyWorkReports(), filters);
  const plan = reports.reduce((sum, row) => sum + (Number(row.plannedQuantity) || 0), 0);
  const fact = reports.reduce((sum, row) => sum + (Number(row.actualQuantity) || 0), 0);
  return {
    reports,
    plan,
    fact,
    completionPercent: plan > 0 ? Math.round((fact / plan) * 100) : 0,
    deviation: fact - plan,
    overrun: Math.max(0, fact - plan),
    lag: Math.max(0, plan - fact),
    activeTeams: new Set(reports.map((row) => row.teamId).filter(Boolean)).size,
  };
}

export function getTeamEfficiency(filters = {}) {
  const teams = getTeams();
  const stats = getPlanFactStats(filters).reports.reduce((map, row) => {
    const key = row.teamId || "no-team";
    const current = map.get(key) ?? { teamId: key, plan: 0, fact: 0, days: new Set(), objectId: row.objectId };
    current.plan += Number(row.plannedQuantity) || 0;
    current.fact += Number(row.actualQuantity) || 0;
    current.days.add(row.date);
    map.set(key, current);
    return map;
  }, new Map());
  return Array.from(stats.values()).map((row) => ({
    ...row,
    team: teams.find((team) => team.id === row.teamId)?.name ?? "Без бригады",
    completionPercent: row.plan > 0 ? Math.round((row.fact / row.plan) * 100) : 0,
    lag: Math.max(0, row.plan - row.fact),
    daysCount: row.days.size,
  }));
}

export function getEmployeeOutput(filters = {}) {
  const employees = getEmployees();
  const standards = getWorkStandards();
  const reports = filterReports(getDailyWorkReports(), filters);
  const today = todayIso();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekIso = weekStart.toISOString().slice(0, 10);
  const byEmployee = reports.reduce((map, row) => {
    const key = row.employeeId || "team-report";
    const current = map.get(key) ?? { employeeId: key, teamId: row.teamId, workTypeId: row.workTypeId, todayFact: 0, weekFact: 0, plan: 0, fact: 0, comments: [] };
    const actual = Number(row.actualQuantity) || 0;
    current.fact += actual;
    current.plan += Number(row.plannedQuantity) || 0;
    if (row.date === today) current.todayFact += actual;
    if (row.date >= weekIso) current.weekFact += actual;
    if (row.comment) current.comments.push(row.comment);
    map.set(key, current);
    return map;
  }, new Map());
  return Array.from(byEmployee.values()).map((row) => ({
    ...row,
    employee: employees.find((employee) => employee.id === row.employeeId)?.name ?? "Бригада целиком",
    workType: standards.find((standard) => standard.id === row.workTypeId)?.workType ?? "—",
    completionPercent: row.plan > 0 ? Math.round((row.fact / row.plan) * 100) : 0,
  }));
}

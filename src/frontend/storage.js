const DOOR_MATRIX_KEY = "gross-lean-montage.door-matrix.v1";
const MATRIX_DOCUMENTS_KEY = "gross-lean-montage.matrix-documents.v1";
const TASKS_KEY = "gross-lean-montage.today-tasks.v1";
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

export function getTasks() {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function calculateTodayTasks(objects) {
  const saved = getTasks();
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
  saveTasks(nextTasks);
  return nextTasks;
}

export function updateTaskStatus(taskId, status) {
  const tasks = getTasks();
  const next = tasks.map((task) => task.id === taskId ? { ...task, status } : task);
  saveTasks(next);
  return next;
}

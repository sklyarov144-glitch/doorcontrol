const terminalDoorStatuses = new Set(["принято технадзором", "передано по акту"]);
const closedActStatuses = new Set(["передано по акту", "закрыто"]);
const resolvedIssueStatuses = new Set(["устранено", "закрыто"]);

function daysSince(value, now) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
}

function priorityFor(type, days) {
  if (type === "Замечания ТН" || days > 7 || type === "Смонтировано без акта ОХ" && days > 3) return "высокий";
  if (["Проёмы под риск", "Нет документов", "Нет ответственного"].includes(type)) return "средний";
  return "низкий";
}

function problem(type, context, days, action) {
  const { object, building, floor, door } = context;
  return {
    id: `${type}:${door?.id ?? building?.id ?? object.id}`,
    type,
    objectId: object.id,
    object: object.name,
    buildingId: building?.id ?? "",
    building: building?.name ?? "—",
    floorId: floor?.id ?? "",
    floor: floor?.number ?? floor?.label ?? "—",
    doorId: door?.id ?? "",
    door: door?.number ?? door?.label ?? door?.mark ?? "—",
    responsible: door?.assignedUserId ?? building?.responsibleItrId ?? object.responsibleDirectorId ?? object.responsibleId ?? "",
    days,
    priority: priorityFor(type, days),
    action,
  };
}

function hasDocument(documents, context) {
  return documents.some((document) =>
    document.doorId === context.door?.id
    || document.floorId === context.floor?.id
    || document.buildingId === context.building?.id
    || document.objectId === context.object.id && !document.buildingId
  );
}

export function calculateRemoteProblems({ objects = [], documents = [], custodyActs = [], tnIssues = [], now = new Date() }) {
  const problems = [];
  const actsByDoor = new Map(custodyActs.map((act) => [act.doorId, act]));
  const issuesByDoor = new Map();
  tnIssues.filter((issue) => !resolvedIssueStatuses.has(issue.status)).forEach((issue) => {
    const current = issuesByDoor.get(issue.doorId) ?? [];
    current.push(issue);
    issuesByDoor.set(issue.doorId, current);
  });

  objects.forEach((object) => {
    if (!object.responsibleDirectorId && !object.responsibleId) {
      problems.push(problem("Нет ответственного", { object }, 0, "Назначить ответственного"));
    }
    (object.buildings ?? []).forEach((building) => {
      const buildingContext = { object, building };
      if (!building.responsibleItrId) {
        problems.push(problem("Нет ответственного", buildingContext, 0, "Назначить ИТР"));
      }
      if (!hasDocument(documents, buildingContext)) {
        problems.push(problem("Нет документов", buildingContext, 0, "Добавить документ"));
      }
      (building.floors ?? []).filter((floor) => floor.type === "floor").forEach((floor) => {
        (floor.doors ?? []).forEach((door) => {
          const context = { object, building, floor, door };
          const age = daysSince(door.updatedAt ?? door.history?.at(-1)?.at ?? door.createdAt, now);
          const mountedAge = daysSince(door.mountedAt, now);
          const act = actsByDoor.get(door.id);
          const actStatus = act?.status ?? door.storageAct ?? door.custodyActStatus;
          const activeIssues = issuesByDoor.get(door.id) ?? [];

          if (age > 7 && !terminalDoorStatuses.has(door.doorStatus)) {
            problems.push(problem("Просроченные двери", context, age, "Обновить статус"));
          }
          if (door.doorStatus === "смонтирована" && !closedActStatuses.has(actStatus)) {
            problems.push(problem("Смонтировано без акта ОХ", context, mountedAge, "Добавить акт ОХ"));
          }
          if (activeIssues.length || door.issue === "есть замечание") {
            const issueAge = activeIssues.length ? Math.max(...activeIssues.map((issue) => daysSince(issue.createdAt, now))) : age;
            problems.push(problem("Замечания ТН", context, issueAge, "Устранить замечание"));
          }
          if (door.openingStatus === "требует корректировки" || door.openingComment) {
            problems.push(problem("Проёмы под риск", context, age, "Проверить проём"));
          }
          if (["доставлена", "смонтирована"].includes(door.doorStatus) && age > 7) {
            problems.push(problem("Зависшие статусы", context, age, "Проверить дверь"));
          }
        });
      });
    });
  });

  return problems;
}

export function problemStats(problems = []) {
  return {
    total: problems.length,
    overdue: problems.filter((item) => item.type === "Просроченные двери").length,
    tnIssues: problems.filter((item) => item.type === "Замечания ТН").length,
    noCustodyAct: problems.filter((item) => item.type === "Смонтировано без акта ОХ").length,
    riskyOpenings: problems.filter((item) => item.type === "Проёмы под риск").length,
  };
}

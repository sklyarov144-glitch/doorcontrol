import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import matveevskyParkImage from "../assets/matveevsky-park.png";
import loginDoorHero from "../assets/login-door-hero.png";
import {
  addTask,
  addTaskComment,
  addTaskLink,
  addNotification,
  addDailyWorkReport,
  addEmployee,
  addWorkersToTeam,
  addDailyAutoReport,
  addManpowerRequest,
  updateManpowerRequest,
  addObjectWorkPlan,
  addTeam,
  addWorkStandard,
  adjustManpowerRequest,
  approveManpowerRequest,
  calculateTodayTasks,
  cancelManpowerRequest,
  createDoorMatrix,
  getManpowerRequests,
  getManpowerStats,
  getManpowerSummaryByDate,
  getDailyItrManpowerTask,
  getWeeklyManpowerPlan,
  getDoorMatrix,
  getDailyWorkReports,
  getDailyAutoReports,
  getDelayReasonStats,
  getEmployeeOutput,
  getEmployees,
  getWorkersByTeam,
  getNotificationsByUser,
  getUnreadNotificationsCount,
  getObjectWorkPlans,
  getPlanFactStats,
  getPlanFactMoneyStats,
  getProblems,
  getProblemStats,
  getTasks,
  getTeamEfficiency,
  getTeamRating,
  getItrRating,
  getTeams,
  getWorkStandards,
  generateDailyAutoReport,
  markAllNotificationsRead,
  markNotificationRead,
  mergeDoorMatrixWithObjects,
  normalizeDoorMatrix,
  saveDoorMatrix,
  saveEmployees,
  saveTeams,
  submitManpowerRequest,
  updateEmployee,
  disableEmployee,
  assignWorkerToTeam,
  removeWorkerFromTeam,
  rejectManpowerRequest,
  syncAutomaticTasksAndNotifications,
  updateTask,
  updateTaskStatus,
  updateWorkStandard,
  disableWorkStandard,
} from "../storage";
import { dataProvider } from "../../services/dataProvider";
import { AuthProvider } from "../contexts/AuthContext";
import { permissionsFor } from "../domain/permissions";
import { buildAppPath, parseAppRoute } from "./routes";
import "../styles.css";

const MATRIX_DOCUMENTS_KEY = "gross-lean-montage.matrix-documents.v1";

const doorStatusOptions = [
  "не начато",
  "доставлена",
  "смонтирована",
  "замечание",
  "принято технадзором",
  "передано по акту",
];

const openingStatusOptions = [
  "готов",
  "требует корректировки",
  "передан на исправление",
  "исправлен",
];

const issueOptions = ["нет", "есть замечание", "устранено"];
const storageActOptions = ["не передана", "акт подготовлен", "акт загружен", "передано по акту"];
const matrixStatusOptions = ["Да", "Нет", "Не требуется"];
const manualTaskTypes = [
  "Добавить акт АОХ",
  "Проверить замечание ТН",
  "Устранить замечание",
  "Проверить проём",
  "Обновить статус двери",
  "Добавить документ",
  "Проверить этаж",
  "Проверить корпус",
  "Другое",
];
const manualTaskPriorities = ["низкий", "средний", "высокий"];
const manualTaskStatuses = ["новая", "в работе", "выполнена", "отменена"];
const taskLinkCategories = ["акт АОХ", "фото", "документ", "прочее"];
const manpowerPriorities = ["низкий", "средний", "высокий", "критичный"];
const manpowerReasons = ["монтаж дверей", "разгрузка", "подъём дверей", "разнос дверей", "установка фурнитуры", "устранение замечаний", "подготовка проёмов", "прочее"];
const manpowerStatuses = ["черновик", "подана", "на рассмотрении", "утверждена", "скорректирована", "отклонена", "отменена"];
const delayReasonOptions = [
  "Не готов проём",
  "Нет доступа",
  "Не подняты двери",
  "Нет фурнитуры",
  "Замечания ТН",
  "Ожидание заказчика",
  "Не вышла бригада",
  "Погодные условия",
  "Другое",
];

const statusMeta = {
  "не начато": { tone: "gray", label: "не начато" },
  доставлена: { tone: "blue", label: "доставлена" },
  смонтирована: { tone: "green", label: "смонтирована" },
  замечание: { tone: "red", label: "замечание" },
  "принято технадзором": { tone: "teal", label: "принято технадзором" },
  "передано по акту": { tone: "purple", label: "передано по акту" },
  готов: { tone: "green", label: "готов" },
  "требует корректировки": { tone: "orange", label: "требует корректировки" },
  "передан на исправление": { tone: "orange", label: "передан на исправление" },
  исправлен: { tone: "teal", label: "исправлен" },
  нет: { tone: "gray", label: "нет" },
  "есть замечание": { tone: "red", label: "есть замечание" },
  устранено: { tone: "green", label: "устранено" },
  "не передана": { tone: "gray", label: "не передана" },
  "акт подготовлен": { tone: "blue", label: "акт подготовлен" },
  "акт загружен": { tone: "teal", label: "акт загружен" },
};

const baseDoors = [
  {
    id: "apt-1501",
    number: "Квартира 1",
    mark: "Д-1",
    type: "Квартирная",
    doorStatus: "смонтирована",
    openingStatus: "готов",
    issue: "нет",
    storageAct: "не передана",
    x: 22,
    y: 41.4,
    swing: "down-right",
  },
  {
    id: "apt-1502",
    number: "Квартира 2",
    mark: "Д-2",
    type: "Квартирная",
    doorStatus: "доставлена",
    openingStatus: "требует корректировки",
    issue: "есть замечание",
    storageAct: "не передана",
    x: 38,
    y: 41.4,
    swing: "down-right",
  },
  {
    id: "apt-1503",
    number: "Квартира 3",
    mark: "Д-3",
    type: "Квартирная",
    doorStatus: "замечание",
    openingStatus: "передан на исправление",
    issue: "есть замечание",
    storageAct: "не передана",
    x: 74,
    y: 41.4,
    swing: "down-left",
  },
  {
    id: "apt-1504",
    number: "Квартира 4",
    mark: "Д-4",
    type: "Квартирная",
    doorStatus: "не начато",
    openingStatus: "готов",
    issue: "нет",
    storageAct: "не передана",
    x: 22,
    y: 59.4,
    swing: "up-right",
  },
  {
    id: "apt-1505",
    number: "Квартира 5",
    mark: "Д-5",
    type: "Квартирная",
    doorStatus: "доставлена",
    openingStatus: "готов",
    issue: "нет",
    storageAct: "не передана",
    x: 48,
    y: 59.4,
    swing: "up-left",
  },
  {
    id: "apt-1506",
    number: "Квартира 6",
    mark: "Д-6",
    type: "Квартирная",
    doorStatus: "не начато",
    openingStatus: "готов",
    issue: "нет",
    storageAct: "не передана",
    x: 74,
    y: 59.4,
    swing: "up-left",
  },
  {
    id: "mop-15-01",
    number: "1 МОП",
    mark: "1 МОП",
    type: "МОП",
    doorStatus: "принято технадзором",
    openingStatus: "исправлен",
    issue: "устранено",
    storageAct: "акт подготовлен",
    x: 55,
    y: 47.8,
    swing: "down-right",
  },
  {
    id: "mop-15-02",
    number: "2 МОП",
    mark: "2 МОП",
    type: "МОП",
    doorStatus: "передано по акту",
    openingStatus: "готов",
    issue: "нет",
    storageAct: "передано по акту",
    x: 61,
    y: 53.4,
    swing: "up-right",
  },
];

function createFloorOptions(count = 25, includeParking = false) {
  return [
  ...(includeParking ? [{ id: "parking", label: "Паркинг", type: "service" }] : []),
  ...Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return { id: `floor-${number}`, label: String(number), number, type: "floor" };
  }),
  { id: "roof", label: "Кровля", type: "service" },
];
}

function createBuilding(id, name, readinessOffset = 0, options = {}) {
  const floorsCount = Number(options.floorsCount) || 25;
  const doorsPerFloor = Number(options.doorsPerFloor) || 6;
  const floorDoors = baseDoors.slice(0, Math.max(1, Math.min(baseDoors.length, doorsPerFloor + 2)));
  const now = "2026-06-01T08:00:00.000Z";
  return {
    id,
    objectId: options.objectId ?? "",
    name,
    floorsCount,
    doorsPerFloor,
    responsibleItrId: options.responsibleItrId ?? "itr-1",
    assignedTeamIds: options.assignedTeamIds ?? [],
    status: options.status ?? "в работе",
    comment: options.comment ?? "",
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
    floorTemplate: null,
    floors: createFloorOptions(floorsCount, options.includeParking).map((floor) => ({
      ...floor,
      doors:
        floor.type === "floor"
          ? floorDoors.map((door) => ({
              ...door,
              id: `${id}-${floor.id}-${door.id}`,
              history: [
                {
                  id: `${id}-${floor.id}-${door.id}-init`,
                  text: "Создана мок-карточка двери",
                  date: "сегодня",
                  user: "system",
                },
              ],
            }))
          : [],
    })),
    readinessOffset,
  };
}

function createManagedObject({ id, name, address, developer, description, buildingNames, readinessOffset = 0 }) {
  const now = "2026-06-01T08:00:00.000Z";
  return {
    id,
    name,
    address,
    developer,
    status: "в работе",
    responsibleId: "director-1",
    responsibleDirectorId: "director-1",
    responsibleItrIds: ["itr-1"],
    description,
    startDate: "2026-06-01",
    plannedEndDate: "2026-12-30",
    createdAt: now,
    updatedAt: now,
    isActive: true,
    buildings: buildingNames.map((namePart, index) =>
      createBuilding(`${id}-building-${String(namePart).replaceAll(".", "-")}`, `Корпус ${namePart}`, readinessOffset - index * 3, {
        objectId: id,
        floorsCount: index % 2 === 0 ? 25 : 18,
        doorsPerFloor: 6,
        responsibleItrId: "itr-1",
        assignedTeamIds: index === 0 ? ["team-1"] : [],
      })
    ),
  };
}

function createInitialObjects() {
  return [
    createManagedObject({ id: "matveevsky-park", name: "ЖК Матвеевский парк", address: "Очаково-Матвеевское, ближайшая станция метро «Аминьевская»", developer: "ПИК", description: "Флагманский объект для демонстрации монтажного контура.", buildingNames: ["4.1", "4.2", "4.3", "4.7", "4.8"] }),
    createManagedObject({ id: "salaryevo-park", name: "ЖК Саларьево парк", address: "Новая Москва, метро «Саларьево»", developer: "ПИК", description: "Монтаж дверей по очередям заселения.", buildingNames: ["1.1", "1.2", "2.1"], readinessOffset: -12 }),
    createManagedObject({ id: "prokshino", name: "ЖК Прокшино", address: "Новая Москва, метро «Прокшино»", developer: "А101", description: "Объект с несколькими активными корпусами.", buildingNames: ["6.1", "6.2", "7.1"], readinessOffset: -20 }),
    createManagedObject({ id: "buninskie-allei", name: "ЖК Бунинские аллеи", address: "Новая Москва, Бунинские луга", developer: "ГК Самолет", description: "Объект в подготовке к массовому монтажу.", buildingNames: ["1", "2", "3"], readinessOffset: -28 }),
    createManagedObject({ id: "rodnye-kvartaly", name: "Родные кварталы", address: "адрес уточняется", developer: "ГРОСС Партнёр", description: "Перспективный объект в планировании.", buildingNames: ["1.1", "1.2", "2.1"], readinessOffset: -35 }),
    createManagedObject({ id: "yauza", name: "ЖК Яуза", address: "Москва, район Яуза", developer: "ГРОСС Партнёр", description: "Компактный объект для пилотного контроля.", buildingNames: ["1", "2"], readinessOffset: -18 }),
  ];
}

function normalizeBuilding(building, objectId) {
  const floorCount = building.floorsCount ?? building.floors?.filter((floor) => floor.type === "floor").length ?? 25;
  return {
    objectId,
    floorsCount: floorCount,
    doorsPerFloor: building.doorsPerFloor ?? 6,
    responsibleItrId: building.responsibleItrId ?? "itr-1",
    assignedTeamIds: building.assignedTeamIds ?? [],
    status: building.status ?? "в работе",
    comment: building.comment ?? "",
    createdAt: building.createdAt ?? "2026-06-01T08:00:00.000Z",
    updatedAt: building.updatedAt ?? new Date().toISOString(),
    ...building,
  };
}

function normalizeObject(object) {
  const now = new Date().toISOString();
  const normalizedId = object.id === "object-north" ? "matveevsky-park" : object.id;
  return {
    ...object,
    id: normalizedId,
    name: object.name,
    address: object.address ?? "адрес уточняется",
    developer: object.developer ?? "ГРОСС Партнёр",
    status: String(object.status ?? "в работе").toLowerCase() === "в работе" ? "в работе" : object.status ?? "в работе",
    responsibleId: object.responsibleId ?? object.responsibleDirectorId ?? "director-1",
    responsibleDirectorId: object.responsibleDirectorId ?? object.responsibleId ?? "director-1",
    responsibleItrIds: object.responsibleItrIds ?? ["itr-1"],
    description: object.description ?? "Внутренний объект монтажного контроля.",
    startDate: object.startDate ?? "2026-06-01",
    plannedEndDate: object.plannedEndDate ?? "2026-12-30",
    createdAt: object.createdAt ?? "2026-06-01T08:00:00.000Z",
    updatedAt: object.updatedAt ?? now,
    isActive: object.isActive ?? object.status !== "архив",
    buildings: (object.buildings ?? []).map((building) => normalizeBuilding(building, normalizedId)),
  };
}

function mergeInitialObjects(savedObjects) {
  const normalizedSaved = (savedObjects ?? []).map(normalizeObject);
  const byName = new Map(normalizedSaved.map((object) => [object.name, object]));
  const byId = new Map(normalizedSaved.map((object) => [object.id, object]));
  const merged = createInitialObjects().map((defaultObject) => {
    const saved = byId.get(defaultObject.id) ?? byName.get(defaultObject.name);
    if (!saved) return defaultObject;
    const savedBuildingNames = new Set((saved.buildings ?? []).map((building) => building.name));
    return {
      ...defaultObject,
      ...saved,
      buildings: [
        ...(saved.buildings ?? []),
        ...defaultObject.buildings.filter((building) => !savedBuildingNames.has(building.name)),
      ].map((building) => normalizeBuilding(building, saved.id)),
    };
  });
  const defaultIds = new Set(merged.map((object) => object.id));
  const defaultNames = new Set(merged.map((object) => object.name));
  return [...merged, ...normalizedSaved.filter((object) => !defaultIds.has(object.id) && !defaultNames.has(object.name))];
}

function loadObjects() {
  try {
    const saved = dataProvider.objects.getAll();
    return saved.length ? mergeInitialObjects(saved) : createInitialObjects();
  } catch {
    return createInitialObjects();
  }
}

function saveObjects(objects) {
  dataProvider.objects.replaceAll(objects);
}

const mockUsers = [
  { id: "creator-1", name: "Создатель системы", role: "creator", position: "Создатель системы", email: "creator@gross.ru", phone: "+7 900 100-00-01", avatarUrl: "", status: "active", assignedObjectIds: [], assignedBuildingIds: [], password: "123456" },
  { id: "head-1", name: "Руководитель компании", role: "company_head", position: "Руководитель компании", email: "head@gross.ru", phone: "+7 900 100-00-02", avatarUrl: "", status: "active", assignedObjectIds: [], assignedBuildingIds: [], password: "123456" },
  { id: "director-1", name: "Директор строительства", role: "construction_director", position: "Директор по строительству", email: "director@gross.ru", phone: "+7 900 100-00-03", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park", "prokshino", "salaryevo-park"], assignedBuildingIds: [], password: "123456" },
  { id: "itr-1", name: "ИТР Матвеевский парк", role: "itr", position: "Инженер ИТР", email: "itr.matveevsky@gross.ru", phone: "+7 900 100-00-04", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: ["matveevsky-park-building-4-1", "matveevsky-park-building-4-2"], password: "123456" },
  { id: "itr-2", name: "ИТР Прокшино", role: "itr", position: "Инженер ИТР", email: "itr.prokshino@gross.ru", phone: "+7 900 100-00-05", avatarUrl: "", status: "active", assignedObjectIds: ["prokshino"], assignedBuildingIds: ["prokshino-building-6-1", "prokshino-building-6-2"], password: "123456" },
  { id: "user-garanin-sergey", name: "Гаранин Сергей", role: "construction_director", position: "Заместитель директора по строительству", email: "s.garanin@gk-gross.ru", phone: "+7(985)833 35 14", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park", "prokshino"], assignedBuildingIds: [], password: "123456" },
  { id: "user-tkachenko-artemy", name: "Ткаченко Артемий", role: "construction_director", position: "Директор по строительству", email: "a.tkachenko@gk-gross.ru", phone: "+7 903 042 01 42", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park", "salaryevo-park"], assignedBuildingIds: [], password: "123456" },
  { id: "user-meshkov-alexander", name: "Мешков Александр", role: "construction_director", position: "Руководитель проектов", email: "a.meshkov@gk-gross.ru", phone: "+7 906 968-99-03", avatarUrl: "", status: "active", assignedObjectIds: ["prokshino"], assignedBuildingIds: [], password: "123456" },
  { id: "user-kostenko-sergey", name: "Костенко Сергей", role: "itr", position: "Начальник участка", email: "kostenko.sergey@gk-gross.local", phone: "+7 (901) 340-33-76", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: ["matveevsky-park-building-4-1"], password: "123456" },
  { id: "user-popov-sergey", name: "Попов Сергей", role: "itr", position: "ИТР", email: "gk-gross@yandex.ru", phone: "+7(915) 584 10 97", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: ["matveevsky-park-building-4-2"], password: "123456" },
  { id: "user-eremin-alexander", name: "Еремин Александр", role: "itr", position: "ИТР", email: "eremin@gk-gross.ru", phone: "+7(905) 703 65 28", avatarUrl: "", status: "active", assignedObjectIds: ["prokshino"], assignedBuildingIds: ["prokshino-building-6-1"], password: "123456" },
  { id: "user-kuznetsov-alexander", name: "Кузнецов Александр", role: "itr", position: "ИТР", email: "a.kuznetsov@gk-gross.ru", phone: "+7 926 278-03-03", avatarUrl: "", status: "active", assignedObjectIds: ["prokshino"], assignedBuildingIds: ["prokshino-building-6-2"], password: "123456" },
  { id: "user-sapozhnikov-alexander", name: "Сапожников Александр", role: "itr", position: "ИТР", email: "a.sapozhnikov@gk-gross.ru", phone: "+7 915 342 34 84", avatarUrl: "", status: "active", assignedObjectIds: ["salaryevo-park"], assignedBuildingIds: ["salaryevo-building-1"], password: "123456" },
  { id: "user-tishin-ivan", name: "Тишин Иван", role: "itr", position: "ИТР", email: "i.tishin@gk-gross.ru", phone: "+7 916 828 13 59", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: ["matveevsky-park-building-4-3"], password: "123456" },
  { id: "user-sklyarov-ivan", name: "Скляров Иван", role: "itr", position: "ИТР", email: "i.sklyarov@gk-gross.ru", phone: "+7 917 175 43 16", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: [], password: "123456" },
  { id: "user-yampolsky-dmitry", name: "Ямпольский Дмитрий", role: "itr", position: "ИТР", email: "d.yampolsky@gk-gross.ru", phone: "+7 999 885 99 91", avatarUrl: "", status: "active", assignedObjectIds: ["prokshino"], assignedBuildingIds: [], password: "123456" },
  { id: "user-razmakhin-gennady", name: "Размахнин Геннадий", role: "itr", position: "ИТР", email: "g.razmakhin@gk-gross.ru", phone: "+7 924 474 64 17", avatarUrl: "", status: "active", assignedObjectIds: ["salaryevo-park"], assignedBuildingIds: [], password: "123456" },
  { id: "user-sharaev-vladimir", name: "Шараев Владимир", role: "construction_director", position: "Руководитель строительства", email: "v.sharaev@gk-gross.ru", phone: "+7 937 196-13-31", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: [], password: "123456" },
  { id: "user-zhidkov-nikita", name: "Жидков Никита", role: "itr", position: "ИТР", email: "n.zhidkov@gk-gross.ru", phone: "+7 910 984 61 29", avatarUrl: "", status: "active", assignedObjectIds: ["matveevsky-park"], assignedBuildingIds: [], password: "123456" },
  { id: "user-fattykhov-renat", name: "Фаттыхов Ренат", role: "itr", position: "ИТР", email: "r.fattykhov@gk-gross.ru", phone: "+7 996 402-84-77", avatarUrl: "", status: "active", assignedObjectIds: ["prokshino"], assignedBuildingIds: [], password: "123456" },
];

const roleLabels = {
  creator: "Создатель сайта",
  company_head: "Руководитель компании",
  construction_director: "Директор по строительству",
  itr: "ИТР",
};

const manpowerDemoObjects = [
  "СК 25",
  "СК 18",
  "Дзен 4",
  "Дзен 6.1",
  "БК 5",
  "БК 6",
  "Родные кварталы",
  "Прокшино 7",
  "Зорге",
  "Деснаречье 7",
  "ПИК Яуза",
  "ПИК Волжский",
  "Матвеевский парк",
  "СЦ",
  "Социалка",
  "Сервис",
  "Муха",
  "Выставкин",
];

function getManpowerObjectOptions(objects) {
  const fromObjects = objects.map((object) => ({ id: object.id, name: object.name, buildings: object.buildings ?? [] }));
  const existingNames = new Set(fromObjects.map((object) => object.name));
  const demoObjects = manpowerDemoObjects
    .filter((name) => !existingNames.has(name))
    .map((name) => ({ id: `manpower-${name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "-")}`, name, buildings: [] }));
  return [...fromObjects, ...demoObjects];
}

function loadUsers() {
  try {
    const saved = dataProvider.users.getAll();
    const activateUser = (user) => normalizeUser({ ...user, status: "active" });
    const savedById = new Map(saved.map((user) => [user.id, activateUser(user)]));
    const merged = mockUsers.map((user) => activateUser({ ...user, ...(savedById.get(user.id) ?? {}) }));
    const mockIds = new Set(mockUsers.map((user) => user.id));
    return [...merged, ...saved.map(activateUser).filter((user) => !mockIds.has(user.id))];
  } catch {
    return mockUsers.map((user) => normalizeUser({ ...user, status: "active" }));
  }
}

function normalizeUser(user) {
  const now = "2026-06-01T08:00:00.000Z";
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    phone: user.phone ?? "",
    role: user.role ?? "itr",
    position: user.position ?? "",
    avatarUrl: user.avatarUrl ?? user.avatar ?? "",
    avatar: user.avatarUrl ?? user.avatar ?? "",
    status: user.status ?? "active",
    assignedObjectIds: user.assignedObjectIds ?? [],
    assignedBuildingIds: user.assignedBuildingIds ?? [],
    createdAt: user.createdAt ?? now,
    updatedAt: user.updatedAt ?? now,
    lastLoginAt: user.lastLoginAt ?? "",
    password: user.password ?? "123456",
  };
}

function saveUsers(users) {
  dataProvider.users.replaceAll(users.map((user) => normalizeUser({ ...user, status: "active" })));
}

function canManageUsers(user) {
  return ["creator", "company_head", "construction_director"].includes(user.role);
}

function canAssignRole(managerRole, targetRole) {
  if (managerRole === "creator") return true;
  if (managerRole === "company_head") return ["company_head", "construction_director", "itr"].includes(targetRole);
  if (managerRole === "construction_director") return targetRole === "itr";
  return false;
}

function getVisibleUsersForManager(currentUser, users, objects) {
  if (["creator", "company_head"].includes(currentUser.role)) return users;
  if (currentUser.role === "construction_director") {
    const ownObjectIds = new Set(objects.filter((object) => [object.responsibleDirectorId, object.responsibleId].includes(currentUser.id) || currentUser.assignedObjectIds?.includes(object.id)).map((object) => object.id));
    return users.filter((user) => user.id === currentUser.id || user.role === "itr" && user.assignedObjectIds?.some((id) => ownObjectIds.has(id)));
  }
  return users.filter((user) => user.id === currentUser.id);
}

function getVisibleObjectsForUser(user, objects) {
  if (!user || ["creator", "company_head"].includes(user.role)) return objects;
  if (user.role === "construction_director") {
    return objects.filter((object) => [object.responsibleDirectorId, object.responsibleId].includes(user.id) || user.assignedObjectIds?.includes(object.id));
  }
  if (user.role === "itr") {
    return objects
      .map((object) => ({
        ...object,
        buildings: object.buildings.filter((building) =>
          user.assignedObjectIds?.includes(object.id) ||
          user.assignedBuildingIds?.includes(building.id) ||
          object.responsibleItrIds?.includes(user.id) ||
          building.responsibleItrId === user.id
        ),
      }))
      .filter((object) => user.assignedObjectIds?.includes(object.id) || object.buildings.length > 0);
  }
  return objects;
}

function getAllDoors(object) {
  return object.buildings.flatMap((building) =>
    building.floors.flatMap((floor) => floor.doors)
  );
}

function getMetrics(object) {
  const doors = getAllDoors(object);
  const ready = doors.filter((door) =>
    ["смонтирована", "принято технадзором", "передано по акту"].includes(
      door.doorStatus
    )
  ).length;

  return {
    readiness: doors.length ? Math.round((ready / doors.length) * 100) : 0,
    issues: doors.filter((door) => door.issue === "есть замечание").length,
    openingsOnCorrection: doors.filter((door) =>
      ["требует корректировки", "передан на исправление"].includes(
        door.openingStatus
      )
    ).length,
  };
}

function getBuildingReadiness(building) {
  const doors = building.floors.flatMap((floor) => floor.doors);
  const ready = doors.filter((door) =>
    ["смонтирована", "принято технадзором", "передано по акту"].includes(
      door.doorStatus
    )
  ).length;
  return doors.length ? Math.round((ready / doors.length) * 100) : 0;
}

function matrixPatchFromDoor(values) {
  const patch = {};
  if ("doorStatus" in values) {
    patch.installed = ["смонтирована", "принято технадзором", "передано по акту"].includes(values.doorStatus) ? "Да" : "Нет";
    patch.acceptedTN = values.doorStatus === "принято технадзором" ? "Да" : undefined;
  }
  if ("storageAct" in values) {
    patch.custodyAct = values.storageAct === "передано по акту" ? "Да" : values.storageAct === "акт подготовлен" ? "Не требуется" : "Нет";
  }
  if ("issue" in values) {
    patch.tnIssues = values.issue === "есть замечание" ? "Да" : "Нет";
  }
  if ("installed" in values) patch.installed = values.installed;
  if ("custodyAct" in values) patch.custodyAct = values.custodyAct;
  if ("acceptedTN" in values) patch.acceptedTN = values.acceptedTN;
  if ("tnIssues" in values) patch.tnIssues = values.tnIssues;
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}

function doorPatchFromMatrix(row, field, value) {
  const nextRow = { ...row, [field]: value };
  const next = {};
  if (field === "mark") next.mark = value;
  if (nextRow.tnIssues === "Да") next.issue = "есть замечание";
  if (nextRow.tnIssues === "Нет") next.issue = "нет";
  if (nextRow.custodyAct === "Да") next.storageAct = "передано по акту";
  if (nextRow.custodyAct === "Не требуется") next.storageAct = "акт подготовлен";
  if (nextRow.custodyAct === "Нет") next.storageAct = "не передана";
  if (nextRow.acceptedTN === "Да") next.doorStatus = "принято технадзором";
  else if (nextRow.installed === "Да") next.doorStatus = "смонтирована";
  else if (nextRow.ordered === "Да") next.doorStatus = "доставлена";
  else if (["installed", "acceptedTN", "ordered"].includes(field)) next.doorStatus = "не начато";
  return next;
}

function getDoorPlanTone(door, matrixRow) {
  if (matrixRow?.tnIssues === "Да" || door.issue === "есть замечание") return "red";
  if (matrixRow?.custodyAct === "Да" || door.storageAct === "передано по акту") return "graphite";
  if (matrixRow?.acceptedTN === "Да" || door.doorStatus === "принято технадзором") return "darkgreen";
  if (matrixRow?.installed === "Да" || door.doorStatus === "смонтирована") return "green";
  if (matrixRow?.lifted === "Да") return "purple";
  if (matrixRow?.arrived === "Да") return "cyan";
  if (matrixRow?.ordered === "Да" || door.doorStatus === "доставлена") return "blue";
  if (door.openingStatus === "требует корректировки") return "orange";
  return statusMeta[door.doorStatus]?.tone ?? "gray";
}

export function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const routeSyncing = React.useRef(false);
  const [objects, setObjects] = useState(loadObjects);
  const [doorMatrix, setDoorMatrix] = useState(() => {
    const saved = getDoorMatrix();
    const currentObjects = loadObjects();
    const source = saved.length > 0 ? mergeDoorMatrixWithObjects(saved, currentObjects) : createDoorMatrix(currentObjects);
    const normalized = normalizeDoorMatrix(source);
    saveDoorMatrix(normalized);
    return normalized;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(dataProvider.auth.getSession()?.userId));
  const [users, setUsers] = useState(loadUsers);
  const [currentUserId, setCurrentUserId] = useState(() => dataProvider.auth.getSession()?.userId || "creator-1");
  const user = users.find((item) => item.id === currentUserId) ?? users[0];
  const [screen, setScreen] = useState("objects");
  const [selectedObjectId, setSelectedObjectId] = useState(objects[0].id);
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    objects[0].buildings[0].id
  );
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedDoorId, setSelectedDoorId] = useState("");
  const [taskVersion, setTaskVersion] = useState(0);
  const [taskContext, setTaskContext] = useState(null);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const [actNotificationTask, setActNotificationTask] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const visibleObjects = useMemo(() => getVisibleObjectsForUser(user, objects), [user, objects]);

  const selectedObject = useMemo(
    () => visibleObjects.find((object) => object.id === selectedObjectId) ?? visibleObjects[0] ?? objects[0],
    [visibleObjects, objects, selectedObjectId]
  );
  const selectedBuilding = useMemo(
    () =>
      selectedObject.buildings.find((building) => building.id === selectedBuildingId) ??
      selectedObject.buildings[0] ?? null,
    [selectedObject, selectedBuildingId]
  );
  const selectedFloor = useMemo(
    () =>
      selectedBuilding?.floors.find((floor) => floor.id === selectedFloorId) ??
      selectedBuilding?.floors.find((floor) => floor.id === "floor-15") ??
      selectedBuilding?.floors[0] ?? null,
    [selectedBuilding, selectedFloorId]
  );
  const selectedDoor = useMemo(
    () =>
      selectedFloor?.doors.find((door) => door.id === selectedDoorId) ??
      selectedFloor?.doors[0] ?? null,
    [selectedDoorId, selectedFloor]
  );

  const manualTasks = useMemo(() => getTasks(), [taskVersion]);
  const notifications = useMemo(() => getNotificationsByUser(user), [notificationVersion, user]);
  const unreadNotifications = useMemo(() => getUnreadNotificationsCount(user), [notificationVersion, user]);
  const taskNoticeCount = useMemo(() => getManualTaskNoticeCount(manualTasks, user), [manualTasks, user]);
  const canCreateManualTask = ["creator", "company_head", "construction_director"].includes(user.role);
  const permissions = useMemo(() => permissionsFor(user), [user]);
  const refreshManualTasks = () => setTaskVersion((value) => value + 1);
  const refreshNotifications = () => setNotificationVersion((value) => value + 1);
  const syncAutomation = (sourceObjects = objects) => {
    const created = syncAutomaticTasksAndNotifications(sourceObjects, users);
    const today = new Date().toISOString().slice(0, 10);
    getTasks()
      .filter((task) => task.dueDate && task.dueDate < today && !["выполнена", "отменена"].includes(task.status))
      .forEach((task) => {
        addNotification({
          type: "задача просрочена",
          title: "Задача просрочена",
          message: task.title,
          priority: task.priority === "высокий" ? "высокий" : "средний",
          userId: task.assignedTo,
          roleTarget: task.priority === "высокий" ? "company_head" : "",
          objectId: task.objectId,
          buildingId: task.buildingId,
          floorId: task.floorId,
          doorId: task.doorId,
          taskId: task.id,
        });
      });
    if (created.length > 0) {
      refreshManualTasks();
    }
    refreshNotifications();
  };
  const openTaskModal = (context = {}) => {
    if (!canCreateManualTask) return;
    setTaskContext(context);
  };

  const createManualTask = (task) => {
    const created = addTask({ ...task, createdBy: user.id });
    addNotification({
      type: "руководитель поставил задачу",
      title: "Новая задача",
      message: created.title,
      priority: created.priority,
      userId: created.assignedTo,
      objectId: created.objectId,
      buildingId: created.buildingId,
      floorId: created.floorId,
      doorId: created.doorId,
      taskId: created.id,
    });
    refreshManualTasks();
    refreshNotifications();
    setTaskContext(null);
  };

  const changeManualTask = (taskId, values) => {
    const currentTask = manualTasks.find((task) => task.id === taskId);
    updateTask(taskId, { ...values, updatedBy: user.id });
    if (values.status === "выполнена" && currentTask?.createdBy && currentTask.createdBy !== "system") {
      addNotification({
        type: "ИТР выполнил задачу",
        title: "Задача выполнена",
        message: currentTask.title,
        priority: currentTask.priority,
        userId: currentTask.createdBy,
        objectId: currentTask.objectId,
        buildingId: currentTask.buildingId,
        floorId: currentTask.floorId,
        doorId: currentTask.doorId,
        taskId,
      });
    }
    if (values.status === "выполнена" && currentTask?.createdBy === "system") {
      addNotification({
        type: "ИТР выполнил задачу",
        title: "Автозадача выполнена",
        message: currentTask.title,
        priority: currentTask.priority,
        userId: currentTask.directorId ?? "",
        roleTarget: "construction_director",
        objectId: currentTask.objectId,
        buildingId: currentTask.buildingId,
        floorId: currentTask.floorId,
        doorId: currentTask.doorId,
        taskId,
      });
    }
    refreshManualTasks();
    refreshNotifications();
  };

  const commentManualTask = (taskId, text) => {
    if (!text.trim()) return;
    addTaskComment(taskId, { userId: user.id, userName: user.name, text: text.trim() });
    const task = manualTasks.find((item) => item.id === taskId);
    if (task?.createdBy && task.createdBy !== user.id && task.createdBy !== "system") {
      addNotification({
        type: "добавлен комментарий к задаче",
        title: "Комментарий к задаче",
        message: `${user.name}: ${text.trim()}`,
        priority: task.priority,
        userId: task.createdBy,
        objectId: task.objectId,
        buildingId: task.buildingId,
        floorId: task.floorId,
        doorId: task.doorId,
        taskId,
      });
    }
    refreshManualTasks();
    refreshNotifications();
  };

  const linkManualTask = (task, link) => {
    if (!link.url.trim()) return;
    const savedLink = addTaskLink(task.id, { ...link, createdBy: user.id });
    if (task.doorId) {
      const currentDoor = objects
        .flatMap((object) => object.buildings)
        .flatMap((building) => building.floors)
        .flatMap((floor) => floor.doors)
        .find((door) => door.id === task.doorId);
      if (currentDoor) {
        updateDoor(task.doorId, {
          doorStatus: currentDoor.doorStatus,
          openingStatus: currentDoor.openingStatus,
          issue: currentDoor.issue,
          storageAct: savedLink.category === "акт АОХ" ? "акт загружен" : currentDoor.storageAct,
          custodyActUrl: savedLink.category === "акт АОХ" ? savedLink.url : currentDoor.custodyActUrl,
          custodyActUploadedAt: savedLink.category === "акт АОХ" ? new Date().toISOString().slice(0, 10) : currentDoor.custodyActUploadedAt,
          documentLinks: [savedLink, ...(currentDoor.documentLinks ?? [])],
        });
      }
    }
    refreshManualTasks();
    refreshNotifications();
  };

  const completeAutomaticTask = (taskId) => {
    if (!taskId) return;
    updateTask(taskId, { status: "выполнена", updatedBy: user.id });
    const task = manualTasks.find((item) => item.id === taskId);
    if (task?.directorId || task?.createdBy === "system") {
      addNotification({
        type: "ИТР выполнил задачу",
        title: "Автозадача выполнена",
        message: task.title,
        priority: task.priority,
        userId: task.directorId ?? "",
        roleTarget: "construction_director",
        objectId: task.objectId,
        buildingId: task.buildingId,
        floorId: task.floorId,
        doorId: task.doorId,
        taskId: task.id,
      });
    }
    refreshManualTasks();
    refreshNotifications();
  };

  const quickAcceptTn = (notification) => {
    if (!notification.doorId) return;
    const currentDoor = objects
      .flatMap((object) => object.buildings)
      .flatMap((building) => building.floors)
      .flatMap((floor) => floor.doors)
      .find((door) => door.id === notification.doorId);
    if (!currentDoor) return;
    updateDoor(notification.doorId, {
      doorStatus: "принято технадзором",
      openingStatus: currentDoor.openingStatus,
      issue: currentDoor.issue,
      storageAct: currentDoor.storageAct,
      tnAcceptedAt: new Date().toISOString().slice(0, 10),
    });
    completeAutomaticTask(notification.taskId);
    markNotificationRead(notification.id);
    refreshNotifications();
  };

  const updateDoor = (doorId, values) => {
    const today = new Date().toISOString().slice(0, 10);
    const effectiveValues = {
      ...values,
      doorStatus: values.acceptedTN === "Да" ? "принято технадзором" : values.installed === "Да" && values.doorStatus === "не начато" ? "смонтирована" : values.doorStatus,
      issue: values.tnIssues === "Да" ? "есть замечание" : values.issue,
      storageAct: values.custodyAct === "Да" ? "передано по акту" : values.storageAct,
    };
    const { quickHistory, ...doorValues } = effectiveValues;
    const nextObjects = objects.map((object) => ({
      ...object,
      buildings: object.buildings.map((building) => ({
        ...building,
        floors: building.floors.map((floor) => ({
          ...floor,
          doors: floor.doors.map((door) => {
            if (door.id !== doorId) {
              return door;
            }

            const changed = [];
            if (door.doorStatus !== effectiveValues.doorStatus) {
              changed.push(`Статус двери: ${door.doorStatus} -> ${effectiveValues.doorStatus}`);
            }
            if (door.openingStatus !== effectiveValues.openingStatus) {
              changed.push(
                `Статус проема: ${door.openingStatus} -> ${effectiveValues.openingStatus}`
              );
            }
            if (door.issue !== effectiveValues.issue) {
              changed.push(`Замечания: ${door.issue} -> ${effectiveValues.issue}`);
            }
            if (door.storageAct !== effectiveValues.storageAct) {
              changed.push(`Акт: ${door.storageAct} -> ${effectiveValues.storageAct}`);
            }
            if (quickHistory) {
              changed.push(quickHistory);
            }

            return {
              ...door,
              ...doorValues,
              mountedAt: effectiveValues.doorStatus === "смонтирована" && !door.mountedAt ? today : effectiveValues.mountedAt ?? door.mountedAt,
              tnAcceptedAt: effectiveValues.doorStatus === "принято технадзором" && !door.tnAcceptedAt ? today : effectiveValues.tnAcceptedAt ?? door.tnAcceptedAt,
              custodyActUploadedAt: (effectiveValues.storageAct === "акт загружен" || effectiveValues.custodyActUrl) && !door.custodyActUploadedAt ? today : effectiveValues.custodyActUploadedAt ?? door.custodyActUploadedAt,
              custodyActClosedAt: effectiveValues.storageAct === "передано по акту" && !door.custodyActClosedAt ? today : effectiveValues.custodyActClosedAt ?? door.custodyActClosedAt,
              history:
                changed.length > 0
                  ? [
                      {
                        id: `${door.id}-${Date.now()}`,
                        text: changed.join("; "),
                        date: new Date().toLocaleString("ru-RU"),
                        user: user.name,
                      },
                      ...door.history,
                    ]
                  : door.history,
            };
          }),
        })),
      })),
    }));

    setObjects(nextObjects);
    saveObjects(nextObjects);
    const nextMatrix = normalizeDoorMatrix(doorMatrix.map((row) => row.doorId !== doorId ? row : { ...row, ...matrixPatchFromDoor(effectiveValues) }));
    setDoorMatrix(nextMatrix);
    saveDoorMatrix(nextMatrix);
    syncAutomation(nextObjects);
  };

  const updateMatrixCell = (rowId, field, value) => {
    const row = doorMatrix.find((item) => item.id === rowId);
    if (!row) return;
    const nextMatrix = normalizeDoorMatrix(doorMatrix.map((item) => item.id === rowId ? { ...item, [field]: value } : item));
    setDoorMatrix(nextMatrix);
    saveDoorMatrix(nextMatrix);

    if (["mark", "installed", "custodyAct", "tnIssues", "acceptedTN"].includes(field)) {
      const nextObjects = objects.map((object) => ({
        ...object,
        buildings: object.buildings.map((building) => ({
          ...building,
          floors: building.floors.map((floor) => ({
            ...floor,
            doors: floor.doors.map((door) => {
              if (door.id !== row.doorId) return door;
              return { ...door, ...doorPatchFromMatrix(row, field, value) };
            }),
          })),
        })),
      }));
      setObjects(nextObjects);
      saveObjects(nextObjects);
    }
  };

  const replaceDoorMatrix = (nextRows) => {
    const normalizedRows = normalizeDoorMatrix(nextRows);
    setDoorMatrix(normalizedRows);
    saveDoorMatrix(normalizedRows);
    const byDoorId = new Map(normalizedRows.map((row) => [row.doorId, row]));
    const nextObjects = objects.map((object) => ({
      ...object,
      buildings: object.buildings.map((building) => ({
        ...building,
        floors: building.floors.map((floor) => ({
          ...floor,
          doors: floor.doors.map((door) => {
            const row = byDoorId.get(door.id);
            if (!row) return door;
            return {
              ...door,
              mark: row.mark || door.mark,
              doorStatus: row.acceptedTN === "Да" ? "принято технадзором" : row.installed === "Да" ? "смонтирована" : row.installed === "Нет" ? "не начато" : door.doorStatus,
              storageAct: row.custodyAct === "Да" ? "передано по акту" : row.custodyAct === "Нет" ? "не передана" : door.storageAct,
              issue: row.tnIssues === "Да" ? "есть замечание" : row.tnIssues === "Нет" ? "нет" : door.issue,
            };
          }),
        })),
      })),
    }));
    setObjects(nextObjects);
    saveObjects(nextObjects);
  };

  const goToObject = (objectId) => {
    const nextObject = visibleObjects.find((object) => object.id === objectId) ?? visibleObjects[0] ?? objects[0];
    setSelectedObjectId(nextObject.id);
    setSelectedBuildingId(nextObject.buildings[0]?.id ?? "");
    setScreen("object");
  };

  const goToBuilding = (buildingId) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId("");
    setSelectedDoorId("");
    setScreen("building");
  };

  const selectFloor = (floorId) => {
    const floor = selectedBuilding?.floors.find((item) => item.id === floorId);
    setSelectedFloorId(floorId);
    setSelectedDoorId(floor?.doors[0]?.id ?? "");
  };

  const goToFloor = (floorId) => {
    selectFloor(floorId);
    setScreen("floor");
  };

  const goToDoor = (doorId) => {
    setSelectedDoorId(doorId);
    setScreen("door");
  };

  const updateCustodyAct = (doorId, values) => {
    const currentDoor = objects
      .flatMap((object) => object.buildings)
      .flatMap((building) => building.floors)
      .flatMap((floor) => floor.doors)
      .find((door) => door.id === doorId);
    if (!currentDoor) return;
    updateDoor(doorId, {
      doorStatus: currentDoor.doorStatus,
      openingStatus: currentDoor.openingStatus,
      issue: currentDoor.issue,
      storageAct: values.storageAct ?? currentDoor.storageAct,
      custodyActUrl: values.custodyActUrl ?? currentDoor.custodyActUrl ?? "",
      custodyActUploadedAt: values.custodyActUrl ? new Date().toISOString().slice(0, 10) : currentDoor.custodyActUploadedAt,
      custodyActClosedAt: values.storageAct === "передано по акту" ? new Date().toISOString().slice(0, 10) : currentDoor.custodyActClosedAt,
    });
  };

  const openProblem = (problem) => {
    const nextObject = objects.find((object) => object.id === problem.objectId);
    if (!nextObject) return;
    setSelectedObjectId(nextObject.id);
    if (problem.buildingId) setSelectedBuildingId(problem.buildingId);
    if (problem.floorId) setSelectedFloorId(problem.floorId);
    if (problem.doorId) {
      setSelectedDoorId(problem.doorId);
      setScreen("door");
      return;
    }
    if (problem.floorId) {
      setScreen("floor");
      return;
    }
    if (problem.buildingId) {
      setScreen("building");
      return;
    }
    setScreen("object");
  };

  React.useEffect(() => {
    if (isLoggedIn) {
      syncAutomation(objects);
    }
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (isLoggedIn && ["tasks", "today_tasks", "problem_center", "custody_acts"].includes(screen)) {
      syncAutomation(objects);
    }
  }, [screen]);

  const navigate = (nextScreen) => {
    setScreen(nextScreen);
  };

  const defaultScreenForRole = (role) => role === "itr" ? "tasks" : "company_dashboard";

  React.useEffect(() => {
    if (!isLoggedIn) {
      if (location.pathname !== "/login") routerNavigate("/login", { replace: true });
      return;
    }
    if (location.pathname === "/login" || location.pathname === "/") {
      routerNavigate(buildAppPath(defaultScreenForRole(user.role)), { replace: true });
      return;
    }
    const route = parseAppRoute(location.pathname);
    const routeChanged = route.screen !== screen ||
      Boolean(route.objectId && route.objectId !== selectedObjectId) ||
      Boolean(route.buildingId && route.buildingId !== selectedBuildingId) ||
      Boolean(route.floorId && route.floorId !== selectedFloorId) ||
      Boolean(route.doorId && route.doorId !== selectedDoorId);
    if (!routeChanged) return;
    routeSyncing.current = true;
    setScreen(route.screen);
    if (route.objectId) setSelectedObjectId(route.objectId);
    if (route.buildingId) setSelectedBuildingId(route.buildingId);
    if (route.floorId) setSelectedFloorId(route.floorId);
    if (route.doorId) setSelectedDoorId(route.doorId);
  }, [isLoggedIn, location.pathname]);

  React.useEffect(() => {
    if (!isLoggedIn || location.pathname === "/login") return;
    if (routeSyncing.current) {
      routeSyncing.current = false;
      return;
    }
    const nextPath = buildAppPath(screen, {
      objectId: selectedObject?.id,
      buildingId: selectedBuilding?.id,
      floorId: selectedFloor?.id,
      doorId: selectedDoor?.id,
    });
    if (location.pathname !== nextPath) routerNavigate(nextPath);
  }, [screen, selectedObject?.id, selectedBuilding?.id, selectedFloor?.id, selectedDoor?.id, isLoggedIn]);

  const loginUser = (email, password) => {
    const nextUser = users.find((item) => item.email.toLowerCase() === email.toLowerCase().trim() && item.password === password);
    if (!nextUser) return { ok: false, message: "Неверный email или пароль" };
    const updated = users.map((item) => item.id === nextUser.id ? { ...item, lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item);
    setUsers(updated);
    saveUsers(updated);
    setCurrentUserId(nextUser.id);
    dataProvider.auth.saveSession({ userId: nextUser.id, createdAt: new Date().toISOString() });
    const nextScreen = defaultScreenForRole(nextUser.role);
    setScreen(nextScreen);
    setIsLoggedIn(true);
    routerNavigate(buildAppPath(nextScreen), { replace: true });
    return { ok: true };
  };

  const logoutUser = () => {
    dataProvider.auth.clearSession();
    setIsLoggedIn(false);
    routerNavigate("/login", { replace: true });
  };

  const authValue = {
    currentUser: user,
    isAuthenticated: isLoggedIn,
    login: loginUser,
    logout: logoutUser,
    role: user?.role,
    permissions,
  };

  if (!isLoggedIn) {
    return <AuthProvider value={authValue}><LoginPage users={users} onLogin={loginUser} /></AuthProvider>;
  }

  return (
    <AuthProvider value={authValue}><div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        role={user.role}
        activeScreen={screen}
        setScreen={navigate}
        onLogout={logoutUser}
        taskNoticeCount={taskNoticeCount}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      />
      <main className="content">
        <Header
          screen={screen}
          setScreen={setScreen}
          selectedObject={selectedObject}
          selectedBuilding={selectedBuilding}
          selectedFloor={selectedFloor}
          selectedDoor={selectedDoor}
          user={user}
          users={users}
          notifications={notifications}
          unreadNotifications={unreadNotifications}
          onOpenNotification={(notification) => {
            markNotificationRead(notification.id);
            refreshNotifications();
            if (notification.taskId) {
              setScreen("tasks");
              return;
            }
            openProblem(notification);
          }}
          onMarkNotificationRead={(id) => {
            markNotificationRead(id);
            refreshNotifications();
          }}
          onMarkAllNotificationsRead={() => {
            markAllNotificationsRead(user);
            refreshNotifications();
          }}
          onOpenNotificationsPage={() => setScreen("notifications")}
          onUserChange={(userId) => {
            setCurrentUserId(userId);
            dataProvider.auth.saveSession({ userId, createdAt: new Date().toISOString() });
            const nextUser = users.find((item) => item.id === userId);
            const nextScreen = defaultScreenForRole(nextUser?.role);
            setScreen(nextScreen);
            routerNavigate(buildAppPath(nextScreen));
          }}
        />
        <div className="page-transition" key={screen}>
          {screen === "admin" && (
            <AdminPanel
              objects={objects}
              user={user}
              users={users}
              onChange={(nextObjects) => {
                setObjects(nextObjects);
                saveObjects(nextObjects);
              }}
            />
          )}
          {screen === "profile" && (
            <ProfilePage
              user={user}
              objects={objects}
              onSave={(nextUser) => {
                const nextUsers = users.map((item) => item.id === nextUser.id ? nextUser : item);
                setUsers(nextUsers);
                saveUsers(nextUsers);
              }}
            />
          )}
          {screen === "documents" && <DocumentsPage />}
          {screen === "brigade_plan" && <BrigadePlanPage objects={visibleObjects} user={user} users={users} />}
          {screen === "manpower" && <ManpowerPage objects={visibleObjects} user={user} users={users} onNotify={refreshNotifications} />}
          {screen === "notifications" && (
            <NotificationsPage
              notifications={notifications}
              onOpen={(notification) => {
                markNotificationRead(notification.id);
                refreshNotifications();
                notification.taskId ? setScreen("tasks") : openProblem(notification);
              }}
              onMarkRead={(id) => {
                markNotificationRead(id);
                refreshNotifications();
              }}
              onMarkAll={() => {
                markAllNotificationsRead(user);
                refreshNotifications();
              }}
              onQuickAct={(notification) => {
                const task = manualTasks.find((item) => item.id === notification.taskId);
                if (task) setActNotificationTask({ task, notificationId: notification.id });
              }}
              onQuickTn={(notification) => {
                quickAcceptTn(notification);
              }}
            />
          )}
          {screen === "tasks" && (
            <ManualTasksPage
              tasks={manualTasks}
              objects={visibleObjects}
              user={user}
              users={users}
              onOpen={openProblem}
              onCreateTask={() => openTaskModal({})}
              onUpdateTask={changeManualTask}
              onAddComment={commentManualTask}
              onAddLink={linkManualTask}
            />
          )}
          {screen === "custody_acts" && <CustodyActsPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} onUpdateAct={updateCustodyAct} />}
          {screen === "tn_issues" && <TnIssuesPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} />}
          {screen === "today_tasks" && <TodayTasksPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} />}
          {screen === "problem_center" && <ProblemCenterPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} onCreateTask={openTaskModal} />}
          {screen === "reports" && <ReportsPage objects={visibleObjects} />}
          {screen === "company_dashboard" && <CompanyDashboard objects={visibleObjects} user={user} users={users} onOpen={openProblem} />}
          {screen === "users" && <UsersPage users={users} objects={objects} currentUser={user} onSave={(nextUsers) => { setUsers(nextUsers); saveUsers(nextUsers); }} />}
          {["companies", "roles", "itr_team"].includes(screen) && <PlaceholderPage screen={screen} />}
          {screen === "objects" && <ObjectsPage objects={visibleObjects} onOpen={goToObject} />}
          {screen === "object" && (
            <ObjectPage
              object={selectedObject}
              objects={objects}
              users={users}
              user={user}
              onOpenBuilding={goToBuilding}
              onCreateTask={openTaskModal}
              canCreateTask={canCreateManualTask}
              onChange={(nextObjects) => {
                setObjects(nextObjects);
                saveObjects(nextObjects);
              }}
            />
          )}
          {screen === "building" && selectedBuilding && (
            <section className="building-dashboard">
              <BuildingVisualization
                building={selectedBuilding}
                objectId={selectedObject.id}
                selectedFloorId={selectedFloorId}
                onSelectFloor={goToFloor}
                onCreateTask={openTaskModal}
                canCreateTask={canCreateManualTask}
              />
            </section>
          )}
          {screen === "floor" && selectedBuilding && selectedFloor && (
            <FloorPlan
              object={selectedObject}
              building={selectedBuilding}
              floor={selectedFloor}
              onOpenDoor={goToDoor}
              onBack={() => setScreen("building")}
              onCreateTask={openTaskModal}
              canCreateTask={canCreateManualTask}
            />
          )}
          {screen === "door" && selectedDoor && (
            <DoorDetails
              object={selectedObject}
              building={selectedBuilding}
              floor={selectedFloor}
              door={selectedDoor}
              user={user}
              onSave={updateDoor}
              onBack={() => setScreen("floor")}
              onCreateTask={openTaskModal}
              canCreateTask={canCreateManualTask}
            />
          )}
        </div>
      </main>
      {taskContext && (
        <TaskCreateModal
          context={taskContext}
          objects={objects}
          users={users}
          onClose={() => setTaskContext(null)}
          onCreate={createManualTask}
        />
      )}
      {actNotificationTask && (
        <TaskLinkModal
          task={actNotificationTask.task}
          defaultCategory="акт АОХ"
          onClose={() => setActNotificationTask(null)}
          onSave={(link) => {
            linkManualTask(actNotificationTask.task, { ...link, category: "акт АОХ" });
            completeAutomaticTask(actNotificationTask.task.id);
            markNotificationRead(actNotificationTask.notificationId);
            refreshNotifications();
            setActNotificationTask(null);
          }}
        />
      )}
    </div></AuthProvider>
  );
}

function LoginPage({ users, onLogin }) {
  const [email, setEmail] = useState("creator@gross.ru");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const activeUsers = users;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand-zone">
          <BrandMark variant="login" />
          <h1>ГРОСС Бережливый Монтаж</h1>
          <p>Цифровое управление монтажом</p>
          <div className="login-hero-preview" aria-hidden="true">
            <img src={loginDoorHero} alt="" />
          </div>
        </div>
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            const result = onLogin(email, password);
            if (result.ok) {
              setError("");
              return;
            }
            setError(result.message);
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="creator@gross.ru"
            />
          </label>
          <label>
            Демо-пользователь
            <select value={email} onChange={(event) => setEmail(event.target.value)}>
              {activeUsers.map((user) => <option key={user.id} value={user.email}>{user.name} — {roleLabels[user.role]}</option>)}
            </select>
          </label>
          <label>
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="123456"
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button type="submit">Войти</button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({ role, activeScreen, setScreen, onLogout, taskNoticeCount, collapsed, onToggleCollapsed }) {
  const menus = {
    creator: [["company_dashboard", "Дашборд"], ["objects", "Объекты"], ["admin", "Админ-панель"], ["problem_center", "Центр проблем"], ["tasks", "Задачи"], ["manpower", "Расстановка"], ["notifications", "Уведомления"], ["custody_acts", "Акты ОХ"], ["tn_issues", "Замечания ТН"], ["brigade_plan", "План бригад"], ["reports", "Отчёты"], ["documents", "Документы"], ["users", "Пользователи"], ["roles", "Роли"], ["profile", "Личный кабинет"]],
    company_head: [["company_dashboard", "Дашборд"], ["objects", "Объекты"], ["admin", "Админ-панель"], ["problem_center", "Центр проблем"], ["tasks", "Задачи"], ["manpower", "Расстановка"], ["notifications", "Уведомления"], ["custody_acts", "Акты ОХ"], ["tn_issues", "Замечания ТН"], ["brigade_plan", "План бригад"], ["reports", "Отчёты"], ["documents", "Документы"], ["users", "Пользователи"], ["profile", "Личный кабинет"]],
    construction_director: [["company_dashboard", "Дашборд"], ["objects", "Мои объекты"], ["admin", "Админ-панель"], ["problem_center", "Центр проблем"], ["tasks", "Задачи"], ["manpower", "Расстановка"], ["notifications", "Уведомления"], ["custody_acts", "Акты ОХ"], ["tn_issues", "Замечания ТН"], ["brigade_plan", "План бригад"], ["reports", "Отчёты"], ["documents", "Документы"], ["users", "Пользователи"], ["profile", "Личный кабинет"]],
    itr: [["tasks", "Мои задачи"], ["objects", "Мои объекты"], ["manpower", "Заявка на рабочих"], ["brigade_plan", "План бригад"], ["documents", "Документы"], ["notifications", "Уведомления"], ["profile", "Личный кабинет"]],
  };
  const items = menus[role] ?? menus.itr;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div>
        <div className="sidebar-topline">
          <BrandMark />
          <button className="sidebar-toggle" type="button" onClick={onToggleCollapsed} aria-label={collapsed ? "Развернуть меню" : "Скрыть меню"}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <div className="brand-subtitle">Цифровое управление монтажом</div>
        <nav className="nav">
          {items.map(([id, label]) => (
            <button
              className={activeScreen === id ? "active" : ""}
              key={id}
              onClick={() => setScreen(id)}
              title={label}
            >
              {collapsed && <b>{label.slice(0, 1)}</b>}
              <span>{label}</span>
              {id === "tasks" && taskNoticeCount > 0 && <em>{taskNoticeCount}</em>}
            </button>
          ))}
        </nav>
        {taskNoticeCount > 0 && <div className="sidebar-task-indicator">Новые задачи: {taskNoticeCount}</div>}
      </div>
      <button className="ghost-button" onClick={onLogout} title="Выйти">
        {collapsed ? "↩" : "Выйти"}
      </button>
    </aside>
  );
}

function BrandMark({ variant = "default" }) {
  return (
    <div className={`brand-lockup ${variant === "login" ? "login-brand" : ""}`}>
      <img className="company-mark" src="/assets/gross-logo.png" alt="" aria-hidden="true" />
      <div>
        <div className="company-name">ГРОСС</div>
        <div className="product-name">Бережливый Монтаж</div>
      </div>
    </div>
  );
}

function Header({
  screen,
  setScreen,
  selectedObject,
  selectedBuilding,
  selectedFloor,
  selectedDoor,
  user,
  users,
  notifications,
  unreadNotifications,
  onOpenNotification,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenNotificationsPage,
  onUserChange,
}) {
  const labels = {
    objects: "Мои объекты",
    object: "Корпуса объекта",
    building: "Визуализация корпуса",
    floor: "План этажа",
    door: "Карточка двери",
    admin: "Админ-панель",
    profile: "Личный кабинет",
    companies: "Компании",
    users: "Пользователи",
    roles: "Роли и доступы",
    reports: "Отчёты",
    documents: "Документы",
    brigade_plan: "План бригад",
    manpower: user.role === "itr" ? "Заявка на рабочих" : "Расстановка рабочей силы",
    tasks: "Задачи",
    notifications: "Уведомления",
    tn_issues: "Замечания ТН",
    today_tasks: "Задачи на сегодня",
    problem_center: "Центр проблем",
    custody_acts: "Акты ОХ",
    company_dashboard: "Дашборд компании",
    itr_team: "Команда ИТР",
  };

  return (
    <header className="page-header">
      <div>
        {!(["admin", "profile", "companies", "users", "roles", "reports", "documents", "brigade_plan", "manpower", "tasks", "notifications", "tn_issues", "today_tasks", "problem_center", "custody_acts", "company_dashboard", "itr_team"].includes(screen)) && <div className="breadcrumbs">
          <button onClick={() => setScreen("objects")}>Мои объекты</button>
          {screen !== "objects" && (
            <>
              <span>/</span>
              <button onClick={() => setScreen("object")}>{selectedObject.name}</button>
            </>
          )}
          {["building", "floor", "door"].includes(screen) && (
            <>
              <span>/</span>
              <button onClick={() => setScreen("building")}>{selectedBuilding?.name}</button>
            </>
          )}
          {["floor", "door"].includes(screen) && (
            <>
              <span>/</span>
              <button onClick={() => setScreen("floor")}>
                {selectedFloor?.type === "floor" ? `Этаж ${selectedFloor.number}` : selectedFloor?.label}
              </button>
            </>
          )}
          {screen === "door" && selectedDoor && (
            <>
              <span>/</span>
              <span>{selectedDoor.number}</span>
            </>
          )}
        </div>}
        <h1>{labels[screen]}</h1>
      </div>
      <div className="header-user-control">
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadNotifications}
          onOpen={onOpenNotification}
          onMarkRead={onMarkNotificationRead}
          onMarkAll={onMarkAllNotificationsRead}
          onOpenPage={onOpenNotificationsPage}
        />
        <div className="user-chip"><strong>{user.name}</strong><span>{roleLabels[user.role]}</span></div>
        <select aria-label="Текущий пользователь" value={user.id} onChange={(event) => onUserChange(event.target.value)}>{users.map((item) => <option key={item.id} value={item.id}>{item.name} — {roleLabels[item.role]}</option>)}</select>
      </div>
    </header>
  );
}

function NotificationBell({ notifications, unreadCount, onOpen, onMarkRead, onMarkAll, onOpenPage }) {
  const [open, setOpen] = useState(false);
  const latest = [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  return (
    <div className="notification-shell">
      <button className="notification-bell" type="button" onClick={() => setOpen((value) => !value)} aria-label="Уведомления">
        <span>⌁</span>
        {unreadCount > 0 && <em>{unreadCount}</em>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-head">
            <strong>Уведомления</strong>
            <button type="button" onClick={onMarkAll}>Все прочитаны</button>
          </div>
          <div className="notification-list">
            {latest.map((item) => (
              <article className={`notification-item ${item.status} priority-${item.priority}`} key={item.id}>
                <div><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small></div>
                <div className="notification-actions">
                  <button type="button" onClick={() => onOpen(item)}>Открыть</button>
                  {item.status === "unread" && <button type="button" onClick={() => onMarkRead(item.id)}>Прочитано</button>}
                </div>
              </article>
            ))}
            {latest.length === 0 && <div className="empty-plan">Уведомлений нет.</div>}
          </div>
          <button className="notification-page-link" type="button" onClick={() => { setOpen(false); onOpenPage(); }}>Открыть все уведомления</button>
        </div>
      )}
    </div>
  );
}

function ObjectsPage({ objects, onOpen }) {
  return (
    <section className="visual-panel">
      <div className="view-heading">
        <div>
          <h2>Объекты в работе</h2>
          <p>Выберите объект, чтобы перейти к корпусам и визуальному плану.</p>
        </div>
        <span>{objects.length} объект</span>
      </div>
      <div className="object-grid">
        {objects.map((object) => (
          <ObjectCard key={object.id} object={object} onOpen={() => onOpen(object.id)} />
        ))}
      </div>
    </section>
  );
}

function ObjectCard({ object, onOpen }) {
  const metrics = getMetrics(object);

  return (
    <button
      className="object-card visual-card"
      aria-label={`Открыть объект ${object.name}`}
      onClick={onOpen}
    >
      <div className="object-image">
        <img src={matveevskyParkImage} alt="" />
        <div className="object-image-overlay">
          <StatusBadge value={object.status} />
          <div>
            <strong>{object.name}</strong>
            <p>{object.address}</p>
          </div>
        </div>
      </div>
      <div className="object-card-body">
        <div className="object-card-main">
          <div>
            <span className="metric-label">Готовность</span>
            <strong className="readiness-value">{metrics.readiness}%</strong>
          </div>
          <span className="open-arrow">Перейти</span>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${metrics.readiness}%` }} />
        </div>
        <div className="metric-grid">
          <Metric label="Замечания" value={metrics.issues} tone="warning" />
          <Metric
            label="Проемы на корректировке"
            value={metrics.openingsOnCorrection}
            tone="alert"
          />
        </div>
      </div>
    </button>
  );
}

function ObjectPage({ object, objects, users, user, onOpenBuilding, onCreateTask, canCreateTask, onChange }) {
  const [objectEditOpen, setObjectEditOpen] = useState(false);
  const [buildingEdit, setBuildingEdit] = useState(null);
  const canManageObject =
    ["creator", "company_head"].includes(user.role) ||
    (user.role === "construction_director" && [object.responsibleDirectorId, object.responsibleId].includes(user.id));
  const activeBuildings = object.buildings.filter((building) => building.status !== "архив");
  const updateObject = (values) => {
    const nextObjects = objects.map((item) =>
      item.id === object.id
        ? {
            ...item,
            ...values,
            responsibleId: values.responsibleDirectorId,
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    onChange(nextObjects);
    setObjectEditOpen(false);
  };
  const saveBuilding = (values) => {
    const now = new Date().toISOString();
    const floorCount = Math.max(1, Number(values.floorsCount) || 1);
    const normalizedName = `Корпус ${String(values.name).replace(/^Корпус\s*/i, "")}`;
    const existingFloors = values.floors ?? [];
    const adjustedFloors = [
      ...Array.from({ length: floorCount }, (_, index) => {
        const id = `floor-${index + 1}`;
        return existingFloors.find((floor) => floor.id === id) ?? { id, label: String(index + 1), number: index + 1, type: "floor", doors: [] };
      }),
      ...(existingFloors.some((floor) => floor.id === "roof") ? [existingFloors.find((floor) => floor.id === "roof")] : [{ id: "roof", label: "Кровля", type: "service", doors: [] }]),
    ].filter(Boolean);
    const building = values.id
      ? { ...values, name: normalizedName, floors: adjustedFloors, floorsCount: floorCount, doorsPerFloor: Number(values.doorsPerFloor) || 0, updatedAt: now }
      : createBuilding(`building-${Date.now()}`, normalizedName, 0, {
          objectId: object.id,
          floorsCount: floorCount,
          doorsPerFloor: Number(values.doorsPerFloor) || 6,
          responsibleItrId: values.responsibleItrId,
          assignedTeamIds: values.assignedTeamIds,
          status: values.status,
          comment: values.comment,
          createdAt: now,
          updatedAt: now,
        });
    const nextObjects = objects.map((item) => {
      if (item.id !== object.id) return item;
      return {
        ...item,
        buildings: values.id
          ? item.buildings.map((current) => current.id === values.id ? { ...current, ...building } : current)
          : [...item.buildings, building],
        updatedAt: now,
      };
    });
    onChange(nextObjects);
    setBuildingEdit(null);
  };

  return (
    <section className="visual-panel">
      <div className="view-heading">
        <div>
          <h2>{object.name}</h2>
          <p>{object.address} · {object.developer ?? "застройщик уточняется"}</p>
        </div>
        <div className="heading-actions">
          <StatusBadge value={object.status} />
          {canManageObject && <button className="secondary-button slim" onClick={() => setObjectEditOpen(true)}>Редактировать объект</button>}
          {canManageObject && <button className="primary-button slim" onClick={() => setBuildingEdit({})}>Добавить корпус</button>}
          {canCreateTask && <button className="secondary-button slim" onClick={() => onCreateTask({ objectId: object.id })}>Поставить задачу</button>}
        </div>
      </div>
      <div className="object-management-strip">
        <div><span>Ответственный директор</span><strong>{users.find((item) => item.id === object.responsibleDirectorId)?.name ?? "Не назначен"}</strong></div>
        <div><span>ИТР</span><strong>{(object.responsibleItrIds ?? []).map((id) => users.find((item) => item.id === id)?.name).filter(Boolean).join(", ") || "Не назначены"}</strong></div>
        <div><span>План окончания</span><strong>{object.plannedEndDate ?? "не задан"}</strong></div>
        <div><span>Описание</span><strong>{object.description ?? "—"}</strong></div>
      </div>
      <div className="building-grid">
        {activeBuildings.map((building) => (
          <button
            className="building-card"
            key={building.id}
            aria-label={`Открыть корпус ${building.name}`}
            onClick={() => onOpenBuilding(building.id)}
          >
            <div className="mini-building" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div>
              <strong>{building.name}</strong>
              <p>{building.floors.filter((floor) => floor.type === "floor").length} этажей</p>
              <small>{users.find((item) => item.id === building.responsibleItrId)?.name ?? "ИТР не назначен"}</small>
            </div>
            <div className="building-card-actions">
              <StatusBadge value={`Готовность ${getBuildingReadiness(building)}%`} />
              {canManageObject && <span onClick={(event) => { event.stopPropagation(); setBuildingEdit(building); }}>Редактировать</span>}
            </div>
          </button>
        ))}
        {activeBuildings.length === 0 && (
          <div className="empty-plan">Корпуса ещё не добавлены администратором.</div>
        )}
      </div>
      {objectEditOpen && <ObjectEditModal object={object} users={users} onClose={() => setObjectEditOpen(false)} onSave={updateObject} />}
      {buildingEdit && <BuildingEditModal building={buildingEdit} users={users} teams={getTeams()} onClose={() => setBuildingEdit(null)} onSave={saveBuilding} />}
    </section>
  );
}

function ObjectEditModal({ object, users, onClose, onSave }) {
  const [form, setForm] = useState({
    name: object.name,
    address: object.address ?? "",
    developer: object.developer ?? "",
    status: object.status ?? "в работе",
    responsibleDirectorId: object.responsibleDirectorId ?? object.responsibleId ?? "",
    responsibleItrIds: object.responsibleItrIds ?? [],
    startDate: object.startDate ?? "",
    plannedEndDate: object.plannedEndDate ?? "",
    description: object.description ?? "",
    isActive: object.isActive ?? true,
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleItr = (id) => update("responsibleItrIds", form.responsibleItrIds.includes(id) ? form.responsibleItrIds.filter((item) => item !== id) : [...form.responsibleItrIds, id]);
  return (
    <div className="modal-backdrop">
      <form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-title"><div><h2>Редактировать объект</h2><p>Управленческие параметры объекта.</p></div><button type="button" onClick={onClose}>×</button></div>
        <div className="task-form-grid">
          <label>Название<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Адрес<input value={form.address} onChange={(event) => update("address", event.target.value)} /></label>
          <label>Застройщик / заказчик<input value={form.developer} onChange={(event) => update("developer", event.target.value)} /></label>
          <label>Статус<select value={form.status} onChange={(event) => update("status", event.target.value)}>{["подготовка", "в работе", "приостановлен", "завершён", "архив"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Ответственный директор<select value={form.responsibleDirectorId} onChange={(event) => update("responsibleDirectorId", event.target.value)}>{users.filter((item) => item.role === "construction_director").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Дата начала<input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></label>
          <label>План окончания<input type="date" value={form.plannedEndDate} onChange={(event) => update("plannedEndDate", event.target.value)} /></label>
          <label>Активность<select value={form.isActive ? "active" : "archive"} onChange={(event) => update("isActive", event.target.value === "active")}><option value="active">Активен</option><option value="archive">Архивный</option></select></label>
          <label className="wide">Описание<textarea value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
        </div>
        <div className="checkbox-grid">
          {users.filter((item) => item.role === "itr").map((item) => <label key={item.id}><input type="checkbox" checked={form.responsibleItrIds.includes(item.id)} onChange={() => toggleItr(item.id)} />{item.name}</label>)}
        </div>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить объект</button></div>
      </form>
    </div>
  );
}

function BuildingEditModal({ building, users, teams, onClose, onSave }) {
  const [form, setForm] = useState({
    id: building.id,
    floors: building.floors,
    name: building.name?.replace(/^Корпус\s*/i, "") ?? "",
    floorsCount: building.floorsCount ?? building.floors?.filter((floor) => floor.type === "floor").length ?? 25,
    doorsPerFloor: building.doorsPerFloor ?? 6,
    responsibleItrId: building.responsibleItrId ?? "itr-1",
    assignedTeamIds: building.assignedTeamIds ?? [],
    status: building.status ?? "в работе",
    comment: building.comment ?? "",
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleTeam = (id) => update("assignedTeamIds", form.assignedTeamIds.includes(id) ? form.assignedTeamIds.filter((item) => item !== id) : [...form.assignedTeamIds, id]);
  return (
    <div className="modal-backdrop">
      <form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-title"><div><h2>{form.id ? "Редактировать корпус" : "Добавить корпус"}</h2><p>Этажность, ИТР и бригады корпуса.</p></div><button type="button" onClick={onClose}>×</button></div>
        <div className="task-form-grid">
          <label>Корпус<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="4.1" /></label>
          <label>Количество этажей<input type="number" min="1" value={form.floorsCount} onChange={(event) => update("floorsCount", event.target.value)} /></label>
          <label>Дверей на этаже<input type="number" min="1" value={form.doorsPerFloor} onChange={(event) => update("doorsPerFloor", event.target.value)} /></label>
          <label>Ответственный ИТР<select value={form.responsibleItrId} onChange={(event) => update("responsibleItrId", event.target.value)}>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Статус<select value={form.status} onChange={(event) => update("status", event.target.value)}>{["подготовка", "в работе", "проблемный", "завершён", "архив"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="wide">Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label>
        </div>
        <div className="checkbox-grid">
          {teams.map((team) => <label key={team.id}><input type="checkbox" checked={form.assignedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />{team.name}</label>)}
        </div>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить корпус</button></div>
      </form>
    </div>
  );
}

function BuildingVisualization({ building, objectId, selectedFloorId, onSelectFloor, onCreateTask, canCreateTask }) {
  const selectedNumber = selectedFloorId.startsWith("floor-")
    ? Number(selectedFloorId.replace("floor-", ""))
    : null;
  const selectedFloor = building.floors.find((floor) => floor.id === selectedFloorId);
  const metricDoors = selectedFloor?.doors ?? [];
  const floorIssues = metricDoors.filter((door) => door.issue === "есть замечание").length;
  const floorOpenings = metricDoors.filter((door) =>
    ["требует корректировки", "передан на исправление"].includes(door.openingStatus)
  ).length;
  const readyDoors = metricDoors.filter((door) =>
    ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus)
  ).length;
  const floorReadiness = metricDoors.length ? Math.round((readyDoors / metricDoors.length) * 100) : 0;
  const actualFloors = building.floors
    .filter((floor) => floor.type === "floor")
    .sort((a, b) => b.number - a.number);
  const parking = building.floors.find((floor) => floor.id === "parking" || floor.type === "parking");

  return (
    <div className="building-hero">
      <div className="building-hero-copy">
        <StatusBadge value="В работе" />
        <h2>{building.name}</h2>
        <p>{building.floors.filter((floor) => floor.type === "floor").length} этажей</p>
        {canCreateTask && <button className="secondary-button slim building-task-button" onClick={() => onCreateTask({ objectId, buildingId: building.id })}>Поставить задачу по корпусу</button>}
      </div>
      <div className="building-visual">
        <div className="roof-line">Кровля</div>
        {actualFloors.map((floor) => {
          const floorNumber = floor.number;
          return (
            <button
              className={
                floorNumber === selectedNumber ? "facade-floor active" : "facade-floor"
              }
              key={floor.id}
              onClick={() => onSelectFloor(floor.id)}
            >
              <span>{floorNumber}</span>
              <i />
              <i />
              <i />
              <i />
            </button>
          );
        })}
        {parking && <button className="parking-line" onClick={() => onSelectFloor(parking.id)}>Паркинг</button>}
      </div>
      <div className="building-metrics">
        <Metric label="Замечаний" value={floorIssues} tone="warning" />
        <Metric label="Проемов на корректировке" value={floorOpenings} tone="alert" />
        <Metric label="Готовность" value={`${floorReadiness}%`} />
      </div>
    </div>
  );
}

function FloorPlan({ object, building, floor, onOpenDoor, onBack, onCreateTask, canCreateTask }) {
  const label = floor.type === "floor" ? `Этаж ${floor.number}` : floor.label;
  const [doorFilter, setDoorFilter] = useState("all");
  const visibleDoors = floor.doors.filter((door) => {
    if (doorFilter === "apartments") {
      return door.type === "Квартирная";
    }
    if (doorFilter === "common") {
      return door.type === "МОП";
    }
    return true;
  });

  return (
    <section className="floor-dashboard">
      <div className="floor-plan-shell">
        <div className="panel-title">
          <div>
            <h2>План этажа сверху</h2>
            <p>
              {object.name} / {building.name} / {label}
            </p>
          </div>
          <div className="heading-actions">
            {canCreateTask && <button className="secondary-button slim" onClick={() => onCreateTask({ objectId: object.id, buildingId: building.id, floorId: floor.id })}>Поставить задачу</button>}
            <button className="secondary-button slim" onClick={onBack}>
              К корпусу
            </button>
          </div>
        </div>
        {floor.doors.length > 0 ? (
          <>
            <div className="plan-toolbar">
              <div className="filter-tabs" aria-label="Фильтр дверей">
                <button
                  className={doorFilter === "all" ? "active" : ""}
                  onClick={() => setDoorFilter("all")}
                >
                  Все двери
                </button>
                <button
                  className={doorFilter === "apartments" ? "active" : ""}
                  onClick={() => setDoorFilter("apartments")}
                >
                  Квартирные
                </button>
                <button
                  className={doorFilter === "common" ? "active" : ""}
                  onClick={() => setDoorFilter("common")}
                >
                  МОП
                </button>
              </div>
            </div>
            <div className="floor-plan-layout">
              <div
                className={`floor-plan ${building.floorTemplate?.image ? "has-plan-image" : ""} ${building.floorTemplate?.rooms?.length ? "has-saved-template" : ""}`}
                style={building.floorTemplate?.image ? { backgroundImage: `url(${building.floorTemplate.image})` } : undefined}
              >
                <div className="plan-frame" />
                {building.floorTemplate?.rooms?.length > 0 && (
                  <SavedTemplateLayout template={building.floorTemplate} />
                )}
                <div className="corridor-line corridor-line-top" />
                <div className="corridor-line corridor-line-bottom" />
                <div className="room apartment apartment-1">
                  <strong>Квартира 1</strong>
                  <span className="wet-zone" />
                  <span className="room-split horizontal" />
                </div>
                <div className="room apartment apartment-2">
                  <strong>Квартира 2</strong>
                  <span className="wet-zone" />
                  <span className="room-split vertical" />
                </div>
                <div className="room apartment apartment-3">
                  <strong>Квартира 3</strong>
                  <span className="wet-zone" />
                  <span className="room-split vertical" />
                </div>
                <div className="room apartment apartment-4">
                  <strong>Квартира 4</strong>
                  <span className="wet-zone" />
                  <span className="room-split horizontal" />
                </div>
                <div className="room apartment apartment-5">
                  <strong>Квартира 5</strong>
                  <span className="wet-zone" />
                  <span className="room-split vertical" />
                </div>
                <div className="room apartment apartment-6">
                  <strong>Квартира 6</strong>
                  <span className="wet-zone" />
                  <span className="room-split vertical" />
                </div>
                <div className="stair-zone">
                  <strong>Лестница</strong>
                  <span className="stair-flight" />
                  <span className="stair-flight reverse" />
                </div>
                <div className="stair-entry stair-entry-top" />
                <div className="stair-entry stair-entry-bottom" />
                {visibleDoors.map((door) => (
                  <DoorMarker key={door.id} door={door} onOpen={() => onOpenDoor(door.id)} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-plan">
            Для уровня "{floor.label}" двери пока не заведены в mock-структуре.
          </div>
        )}
      </div>
    </section>
  );
}

function DoorMarker({ door, onOpen }) {
  const tone =
    door.openingStatus === "требует корректировки"
      ? "orange"
      : statusMeta[door.doorStatus]?.tone ?? "gray";
  const label = door.mark ?? door.number.replace("Квартира ", "");
  const swingClass = door.swing ?? "down-right";

  return (
    <button
      className={`door-marker swing-${swingClass} ${door.type === "МОП" ? "common" : ""} status-${tone}`}
      style={{ left: `${door.x}%`, top: `${door.y}%` }}
      onClick={onOpen}
    >
      <i className="door-leaf" />
      <i className="door-arc" />
      <span>{label}</span>
    </button>
  );
}

function SavedTemplateLayout({ template }) {
  return (
    <div className="saved-template-layout">
      {!template.image && <div className="saved-template-corridor" />}
      {template.rooms.map((room) => (
        <div className="saved-template-room" key={room.id} style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.width}%`, height: `${room.height}%` }}>{room.label}</div>
      ))}
      <div className="saved-template-stair" style={{ left: `${template.stair.x}%`, top: `${template.stair.y}%`, width: `${template.stair.width}%`, height: `${template.stair.height}%` }}>Лестница</div>
      <div className="saved-template-arrow" style={{ left: `${template.arrow.x}%`, top: `${template.arrow.y}%`, fontSize: `${template.arrow.size}px`, transform: `translate(-50%, -50%) rotate(${template.arrow.angle}deg)` }}>➜</div>
    </div>
  );
}

function DoorDetails({ object, building, floor, door, user, onSave, onBack, onCreateTask, canCreateTask }) {
  const [form, setForm] = useState({
    doorStatus: door.doorStatus,
    openingStatus: door.openingStatus,
    issue: door.issue,
    storageAct: door.storageAct,
  });
  const [saved, setSaved] = useState(false);
  const [actModalOpen, setActModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  React.useEffect(() => {
    setForm({
      doorStatus: door.doorStatus,
      openingStatus: door.openingStatus,
      issue: door.issue,
      storageAct: door.storageAct,
    });
    setSaved(false);
  }, [door.id]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(door.id, form);
    setSaved(true);
  };

  const saveFastAction = (patch, message) => {
    const nextForm = {
      ...form,
      doorStatus: patch.doorStatus ?? form.doorStatus,
      openingStatus: patch.openingStatus ?? form.openingStatus,
      issue: patch.issue ?? form.issue,
      storageAct: patch.storageAct ?? form.storageAct,
    };
    setForm(nextForm);
    onSave(door.id, { ...nextForm, ...patch, quickHistory: message });
    setSaved(true);
  };

  const saveActLink = ({ title, url, comment }) => {
    const link = {
      id: `door-act-${door.id}-${Date.now()}`,
      title: title || "Акт АОХ",
      url,
      category: "акт АОХ",
      comment,
      createdAt: new Date().toLocaleString("ru-RU"),
    };
    saveFastAction(
      {
        storageAct: "акт загружен",
        custodyActUrl: url,
        documentLinks: [link, ...(door.documentLinks ?? [])],
      },
      `Добавлена ссылка на акт АОХ${comment ? `: ${comment}` : ""}`
    );
    setActModalOpen(false);
  };

  const saveComment = (text) => {
    saveFastAction({}, `Комментарий: ${text}`);
    setCommentModalOpen(false);
  };

  return (
    <section className="door-layout">
      <form className="panel door-form" onSubmit={handleSubmit}>
        <div className="panel-title">
          <div>
            <h2>{door.number}</h2>
            <p>
              {object.name} / {building.name} / Этаж {floor.number}
            </p>
          </div>
          <div className="heading-actions">
            <StatusBadge value={form.doorStatus} />
            {canCreateTask && <button className="secondary-button slim" type="button" onClick={() => onCreateTask({ objectId: object.id, buildingId: building.id, floorId: floor.id, doorId: door.id })}>Поставить задачу</button>}
          </div>
        </div>
        <div className="detail-grid">
          <Detail label="Номер двери" value={door.number} />
          <Detail label="Марка двери" value={door.mark ?? door.number} />
          <Detail label="Тип двери" value={door.type} />
          <Detail label="Ссылка на акт ОХ" value={door.custodyActUrl ? <a href={door.custodyActUrl} target="_blank" rel="noreferrer">Открыть акт</a> : "Не добавлена"} />
          <SelectField
            label="Статус двери"
            value={form.doorStatus}
            options={doorStatusOptions}
            onChange={(value) => handleChange("doorStatus", value)}
          />
          <SelectField
            label="Статус проема"
            value={form.openingStatus}
            options={openingStatusOptions}
            onChange={(value) => handleChange("openingStatus", value)}
          />
          <SelectField
            label="Замечания"
            value={form.issue}
            options={issueOptions}
            onChange={(value) => handleChange("issue", value)}
          />
          <SelectField
            label="Акт ответственного хранения"
            value={form.storageAct}
            options={storageActOptions}
            onChange={(value) => handleChange("storageAct", value)}
          />
        </div>
        <div className="itr-fast-panel">
          <div>
            <h3>Быстрые действия ИТР</h3>
            <p>Частые операции без переходов и лишних экранов.</p>
          </div>
          <div className="itr-fast-actions">
            <button type="button" onClick={() => saveFastAction({ doorStatus: "доставлена", ordered: "Да", arrived: "Да" }, "Дверь отмечена как пришедшая")}>Пришло</button>
            <button type="button" onClick={() => saveFastAction({ lifted: "Да" }, "Дверь поднята на этаж")}>Поднято</button>
            <button type="button" onClick={() => saveFastAction({ doorStatus: "смонтирована", installed: "Да" }, "Дверь смонтирована")}>Смонтировано</button>
            <button type="button" onClick={() => saveFastAction({ tnTransferredAt: new Date().toISOString().slice(0, 10) }, "Дверь передана ТН")}>Передать ТН</button>
            <button type="button" onClick={() => saveFastAction({ doorStatus: "принято технадзором", acceptedTN: "Да" }, "Дверь принята ТН")}>Принято ТН</button>
            <button type="button" onClick={() => setActModalOpen(true)}>Добавить акт ОХ</button>
            <button type="button" onClick={() => saveFastAction({ storageAct: "передано по акту", custodyAct: "Да" }, "Дверь передана по акту ОХ")}>Передано по акту</button>
            <button type="button" onClick={() => saveFastAction({ issue: "есть замечание", tnIssues: "Да" }, "Есть замечание ТН")}>Есть замечание ТН</button>
            <button type="button" onClick={() => saveFastAction({ issue: "устранено", tnIssues: "Нет" }, "Замечание устранено")}>Устранено</button>
            <button type="button" onClick={() => setCommentModalOpen(true)}>Добавить комментарий</button>
          </div>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Назад к плану
          </button>
          <button className="primary-button" type="submit">
            Сохранить изменения
          </button>
        </div>
        {saved && <div className="save-notice">Изменения сохранены</div>}
        {door.documentLinks?.length > 0 && (
          <div className="linked-documents">
            <h3>Связанные документы</h3>
            {door.documentLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.title} · {link.category}</a>
            ))}
          </div>
        )}
      </form>
      {actModalOpen && <DoorActModal onClose={() => setActModalOpen(false)} onSave={saveActLink} />}
      {commentModalOpen && <DoorCommentModal onClose={() => setCommentModalOpen(false)} onSave={saveComment} />}
      <aside className="panel history-panel">
        <div className="panel-title">
          <div>
            <h2>История изменений</h2>
            <p>Локальная история по двери</p>
          </div>
        </div>
        <div className="history-list">
          {door.history.map((item) => (
            <div className="history-item" key={item.id}>
              <strong>{item.date}</strong>
              <small>{item.user}</small>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function DoorActModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: "Акт АОХ", url: "", comment: "" });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-title">
          <div>
            <h2>Добавить акт ОХ</h2>
            <p>Ссылка сохранится в карточке двери и документах двери.</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <label>Название<input value={form.title} onChange={(event) => update("title", event.target.value)} /></label>
        <label>Ссылка на Яндекс.Диск<input required value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://disk.yandex.ru/..." /></label>
        <label>Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} placeholder="Например: акт подписан, файл загружен" /></label>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Отмена</button>
          <button className="primary-button">Сохранить акт</button>
        </div>
      </form>
    </div>
  );
}

function DoorCommentModal({ onClose, onSave }) {
  const [text, setText] = useState("");

  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); if (text.trim()) onSave(text.trim()); }}>
        <div className="modal-title">
          <div>
            <h2>Комментарий по двери</h2>
            <p>Комментарий попадёт в историю изменений.</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="quick-comments">{["Сделано", "Нет доступа", "Акт загрузил", "Ждём технадзор"].map((item) => <button type="button" key={item} onClick={() => setText(item)}>{item}</button>)}</div>
        <label>Комментарий<textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} /></label>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Отмена</button>
          <button className="primary-button">Добавить</button>
        </div>
      </form>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function createTemplateDoor(buildingId, index, type, x, y) {
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
    history: [{ id: `${buildingId}-${type}-${number}-init`, text: "Создано администратором", date: "сегодня", user: "admin" }],
  };
}

function createTemplateRooms(count) {
  return Array.from({ length: count }, (_, index) => {
    const topCount = Math.ceil(count / 2);
    const top = index < topCount;
    const rowIndex = top ? index : index - topCount;
    const rowCount = top ? topCount : Math.max(1, count - topCount);
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

function AdminPanel({ objects, user, users, onChange }) {
  const [objectForm, setObjectForm] = useState({ name: "", address: "", metro: "" });
  const [buildingForm, setBuildingForm] = useState({ number: "", floors: 25 });
  const [templateForm, setTemplateForm] = useState({ apartments: 6, mop: 2 });
  const [objectId, setObjectId] = useState(objects[0]?.id ?? "");
  const selectedObject = objects.find((item) => item.id === objectId) ?? objects[0];
  const [buildingId, setBuildingId] = useState(selectedObject?.buildings[0]?.id ?? "");
  const selectedBuilding = selectedObject?.buildings.find((item) => item.id === buildingId) ?? selectedObject?.buildings[0];
  const [draftDoors, setDraftDoors] = useState(selectedBuilding?.floorTemplate?.doors ?? []);
  const [draftRooms, setDraftRooms] = useState(selectedBuilding?.floorTemplate?.rooms ?? []);
  const [stair, setStair] = useState(selectedBuilding?.floorTemplate?.stair ?? { x: 43, y: 39, width: 18, height: 22 });
  const [arrow, setArrow] = useState(selectedBuilding?.floorTemplate?.arrow ?? { x: 51, y: 49, size: 46, angle: -90 });
  const [planImage, setPlanImage] = useState(selectedBuilding?.floorTemplate?.image ?? "");
  const [editing, setEditing] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [notice, setNotice] = useState("");
  const canCreateObject = ["creator", "company_head", "construction_director"].includes(user.role);
  const canAssignResponsible = ["creator", "company_head", "construction_director"].includes(user.role);
  const responsibleUsers = users.filter((item) => ["itr", "construction_director"].includes(item.role));

  React.useEffect(() => {
    setBuildingId(selectedObject?.buildings[0]?.id ?? "");
  }, [objectId]);

  React.useEffect(() => {
    setDraftDoors(selectedBuilding?.floorTemplate?.doors ?? []);
    setDraftRooms(selectedBuilding?.floorTemplate?.rooms ?? []);
    setStair(selectedBuilding?.floorTemplate?.stair ?? { x: 43, y: 39, width: 18, height: 22 });
    setArrow(selectedBuilding?.floorTemplate?.arrow ?? { x: 51, y: 49, size: 46, angle: -90 });
    setPlanImage(selectedBuilding?.floorTemplate?.image ?? "");
  }, [selectedBuilding?.id]);

  const createObject = (event) => {
    event.preventDefault();
    if (!canCreateObject) {
      setNotice("Создавать объект может только руководитель");
      return;
    }
    if (!objectForm.name.trim()) return;
    const id = `object-${Date.now()}`;
    const nextObject = {
      id,
      name: objectForm.name.trim(),
      address: [objectForm.address.trim(), objectForm.metro.trim() && `метро «${objectForm.metro.trim()}»`].filter(Boolean).join(", "),
      metro: objectForm.metro.trim(),
      status: "В работе",
      responsibleId: responsibleUsers[0]?.id ?? "",
      buildings: [],
    };
    onChange([...objects, nextObject]);
    setObjectId(id);
    setObjectForm({ name: "", address: "", metro: "" });
    setNotice("Объект создан");
  };

  const assignResponsible = (responsibleId) => {
    if (!selectedObject || !canAssignResponsible) return;
    const next = objects.map((item) => item.id === selectedObject.id ? { ...item, responsibleId } : item);
    onChange(next);
    setNotice("Ответственный за объект назначен");
  };

  const addBuilding = (event) => {
    event.preventDefault();
    if (!selectedObject || !buildingForm.number.trim()) return;
    const id = `building-${Date.now()}`;
    const floorCount = Math.max(1, Number(buildingForm.floors) || 1);
    const building = {
      id,
      name: `Корпус ${buildingForm.number.trim()}`,
      readinessOffset: 0,
      floorTemplate: null,
      floors: Array.from({ length: floorCount }, (_, index) => ({ id: `floor-${index + 1}`, label: String(index + 1), number: index + 1, type: "floor", doors: [] })),
    };
    const next = objects.map((item) => item.id === selectedObject.id ? { ...item, buildings: [...item.buildings, building] } : item);
    onChange(next);
    setBuildingId(id);
    setBuildingForm({ number: "", floors: floorCount });
    setNotice("Корпус добавлен");
  };

  const generateTemplate = () => {
    if (!selectedBuilding) return;
    const apartments = Math.max(1, Number(templateForm.apartments) || 1);
    const mop = Math.max(0, Number(templateForm.mop) || 0);
    const doors = [];
    const rooms = createTemplateRooms(apartments);
    for (let index = 0; index < apartments; index += 1) {
      const top = index < Math.ceil(apartments / 2);
      const rowIndex = top ? index : index - Math.ceil(apartments / 2);
      const rowCount = top ? Math.ceil(apartments / 2) : Math.floor(apartments / 2);
      doors.push(createTemplateDoor(selectedBuilding.id, index, "Квартирная", 14 + ((rowIndex + 0.5) * 72) / Math.max(1, rowCount), top ? 32 : 68));
    }
    for (let index = 0; index < mop; index += 1) {
      doors.push(createTemplateDoor(selectedBuilding.id, index, "МОП", 48 + index * 7, 50));
    }
    setDraftDoors(doors);
    setDraftRooms(rooms);
    setStair({ x: 43, y: 39, width: 18, height: 22 });
    setArrow({ x: 51, y: 49, size: 46, angle: -90 });
    setNotice("Квартиры и двери сгенерированы. Элементы можно расставить на плане.");
  };

  const moveElement = (event, payload) => {
    if (!editing) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((event.clientY - rect.top) / rect.height) * 100));
    const [type, id] = payload.split(":");
    if (type === "door") setDraftDoors((current) => current.map((door) => door.id === id ? { ...door, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), swing: y < 50 ? "down-right" : "up-left" } : door));
    if (type === "room") setDraftRooms((current) => current.map((room) => room.id === id ? { ...room, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } : room));
    if (type === "stair") setStair((current) => ({ ...current, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }));
    if (type === "arrow") setArrow((current) => ({ ...current, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }));
  };

  const saveTemplate = () => {
    if (!selectedObject || !selectedBuilding || draftDoors.length === 0) return;
    const template = { apartments: draftRooms.length, mopDoors: Number(templateForm.mop), image: planImage, rooms: draftRooms, stair, arrow, doors: draftDoors };
    const next = objects.map((object) => object.id !== selectedObject.id ? object : {
      ...object,
      buildings: object.buildings.map((building) => building.id !== selectedBuilding.id ? building : {
        ...building,
        floorTemplate: template,
        floors: building.floors.map((floor) => ({ ...floor, doors: draftDoors.map((door) => ({ ...door, id: `${building.id}-${floor.id}-${door.id}`, history: [...door.history] })) })),
      }),
    });
    onChange(next);
    setEditing(false);
    setNotice("Шаблон сохранён и применён ко всем этажам корпуса");
  };

  return (
    <section className="admin-panel">
      <div className="admin-intro"><div><h2>Настройка объекта</h2><p>Создайте структуру и расставьте двери типового этажа.</p></div>{notice && <span>{notice}</span>}</div>
      <div className="admin-steps">
        {canCreateObject && <form className="admin-card" onSubmit={createObject}><b>01</b><h3>Создание объекта</h3><label>Название<input value={objectForm.name} onChange={(e) => setObjectForm({ ...objectForm, name: e.target.value })} /></label><label>Район / адрес<input value={objectForm.address} onChange={(e) => setObjectForm({ ...objectForm, address: e.target.value })} /></label><label>Метро<input value={objectForm.metro} onChange={(e) => setObjectForm({ ...objectForm, metro: e.target.value })} /></label><button className="primary-button">Создать объект</button></form>}
        <div className="admin-card"><b>{canCreateObject ? "02" : "01"}</b><h3>Ответственный за объект</h3><label>Объект<select value={selectedObject?.id ?? ""} onChange={(e) => setObjectId(e.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ответственный<select value={selectedObject?.responsibleId ?? ""} disabled={!canAssignResponsible} onChange={(event) => assignResponsible(event.target.value)}><option value="">Не назначен</option>{responsibleUsers.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.position}</option>)}</select></label><p>{canAssignResponsible ? "Руководитель может назначить ответственного за объект." : "Назначение ответственного доступно руководителю."}</p></div>
        <form className="admin-card" onSubmit={addBuilding}><b>{canCreateObject ? "03" : "02"}</b><h3>Добавление корпуса</h3><label>Объект<select value={selectedObject?.id ?? ""} onChange={(e) => setObjectId(e.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Номер корпуса<input value={buildingForm.number} placeholder="4.1" onChange={(e) => setBuildingForm({ ...buildingForm, number: e.target.value })} /></label><label>Количество этажей<input type="number" min="1" value={buildingForm.floors} onChange={(e) => setBuildingForm({ ...buildingForm, floors: e.target.value })} /></label><button className="primary-button">Добавить корпус</button></form>
        <div className="admin-card"><b>{canCreateObject ? "04" : "03"}</b><h3>Типовой этаж</h3><label>Корпус<select value={selectedBuilding?.id ?? ""} onChange={(e) => setBuildingId(e.target.value)}>{selectedObject?.buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Квартир на этаже<input type="number" min="1" value={templateForm.apartments} onChange={(e) => setTemplateForm({ ...templateForm, apartments: e.target.value })} /></label><label>МОП-дверей<input type="number" min="0" value={templateForm.mop} onChange={(e) => setTemplateForm({ ...templateForm, mop: e.target.value })} /></label><button className="primary-button" type="button" disabled={!selectedBuilding} onClick={generateTemplate}>Сгенерировать план</button></div>
      </div>
      <div className="admin-template-card">
        <div className="admin-template-toolbar"><div><h3>Шаблон этажа</h3><p>{selectedBuilding?.name ?? "Сначала добавьте корпус"}</p></div><label className="file-button">Загрузить план<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPlanImage(String(reader.result)); reader.readAsDataURL(file); }} /></label><button className="secondary-button" type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Завершить расстановку" : "Редактировать расположение"}</button><button className="primary-button" type="button" onClick={saveTemplate}>Сохранить шаблон этажа</button></div>
        <div className="template-editor-grid">
          <div className={`admin-plan ${planImage ? "has-image" : ""} ${editing ? "editing" : ""}`} style={planImage ? { backgroundImage: `url(${planImage})` } : undefined} onDragOver={(event) => editing && event.preventDefault()} onDrop={(event) => moveElement(event, event.dataTransfer.getData("text/plain"))}>
            {!planImage && <div className="admin-plan-corridor" />}
            {draftRooms.map((room) => <button key={room.id} draggable={editing} onClick={() => setSelectedElement({ type: "room", id: room.id })} onDragStart={(event) => event.dataTransfer.setData("text/plain", `room:${room.id}`)} className="admin-room" style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.width}%`, height: `${room.height}%` }}>{room.label}</button>)}
            <button draggable={editing} onClick={() => setSelectedElement({ type: "stair" })} onDragStart={(event) => event.dataTransfer.setData("text/plain", "stair:main")} className="admin-plan-stair" style={{ left: `${stair.x}%`, top: `${stair.y}%`, width: `${stair.width}%`, height: `${stair.height}%` }}>Лестница</button>
            <button draggable={editing} onClick={() => setSelectedElement({ type: "arrow" })} onDragStart={(event) => event.dataTransfer.setData("text/plain", "arrow:main")} className="admin-direction-arrow" style={{ left: `${arrow.x}%`, top: `${arrow.y}%`, fontSize: `${arrow.size}px`, transform: `translate(-50%, -50%) rotate(${arrow.angle}deg)` }}>➜</button>
            {draftDoors.map((door) => <button key={door.id} draggable={editing} onClick={() => setSelectedElement({ type: "door", id: door.id })} onDragStart={(event) => event.dataTransfer.setData("text/plain", `door:${door.id}`)} className={`admin-door ${door.type === "МОП" ? "mop" : ""}`} style={{ left: `${door.x}%`, top: `${door.y}%` }} title={editing ? "Перетащите дверь" : door.label}>{door.mark}</button>)}
          </div>
          <TemplateInspector selected={selectedElement} rooms={draftRooms} setRooms={setDraftRooms} stair={stair} setStair={setStair} arrow={arrow} setArrow={setArrow} doors={draftDoors} setDoors={setDraftDoors} />
        </div>
      </div>
    </section>
  );
}

function TemplateInspector({ selected, rooms, setRooms, stair, setStair, arrow, setArrow, doors, setDoors }) {
  if (!selected) return <aside className="template-inspector"><h3>Параметры элемента</h3><p>Выберите квартиру, дверь, лестницу или стрелку на плане.</p></aside>;
  const room = selected.type === "room" ? rooms.find((item) => item.id === selected.id) : null;
  const door = selected.type === "door" ? doors.find((item) => item.id === selected.id) : null;
  const updateRoom = (values) => setRooms((current) => current.map((item) => item.id === selected.id ? { ...item, ...values } : item));
  const updateDoorLabel = (value) => setDoors((current) => current.map((item) => item.id === selected.id ? { ...item, mark: value } : item));
  return (
    <aside className="template-inspector">
      <h3>Параметры элемента</h3>
      {room && <><label>Подпись<input value={room.label} onChange={(event) => updateRoom({ label: event.target.value })} /></label><RangeField label="Ширина" value={room.width} min={8} max={45} onChange={(value) => updateRoom({ width: value })} /><RangeField label="Высота" value={room.height} min={10} max={45} onChange={(value) => updateRoom({ height: value })} /></>}
      {door && <label>Марка двери<input value={door.mark} onChange={(event) => updateDoorLabel(event.target.value)} /></label>}
      {selected.type === "stair" && <><RangeField label="Ширина лестницы" value={stair.width} min={8} max={40} onChange={(value) => setStair({ ...stair, width: value })} /><RangeField label="Высота лестницы" value={stair.height} min={8} max={45} onChange={(value) => setStair({ ...stair, height: value })} /></>}
      {selected.type === "arrow" && <><RangeField label="Размер стрелки" value={arrow.size} min={20} max={90} onChange={(value) => setArrow({ ...arrow, size: value })} /><RangeField label="Угол" value={arrow.angle} min={-180} max={180} onChange={(value) => setArrow({ ...arrow, angle: value })} /></>}
    </aside>
  );
}

function RangeField({ label, value, min, max, onChange }) {
  return <label className="range-field"><span>{label}<b>{Math.round(value)}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function UsersPage({ users, objects, currentUser, onSave }) {
  const [editingUser, setEditingUser] = useState(null);
  const visibleUsers = getVisibleUsersForManager(currentUser, users, objects);
  const canCreate = canManageUsers(currentUser);
  const objectNames = new Map(objects.map((object) => [object.id, object.name]));
  const buildingNames = new Map(objects.flatMap((object) => object.buildings.map((building) => [building.id, `${object.name} / ${building.name}`])));
  const saveUser = (values) => {
    const prepared = normalizeUser({ ...values, status: "active" });
    const nextUsers = prepared.id && users.some((user) => user.id === prepared.id)
      ? users.map((user) => user.id === prepared.id ? dataProvider.users.update(prepared.id, prepared) ?? prepared : user)
      : [dataProvider.users.create({ ...prepared, id: prepared.id || `user-${Date.now()}` }), ...users];
    onSave(nextUsers.map((user) => normalizeUser({ ...user, status: "active" })));
    setEditingUser(null);
  };
  const resetPassword = (userId) => {
    onSave(users.map((user) => user.id === userId ? { ...user, password: "123456", updatedAt: new Date().toISOString() } : user));
  };

  return (
    <section className="users-page">
      <div className="tasks-hero">
        <div>
          <span>Пользователи и доступы</span>
          <h2>Команда, роли и назначения</h2>
          <p>Создание пользователей, назначение объектов и подготовка к серверной авторизации.</p>
        </div>
        {canCreate && <button className="primary-button" onClick={() => setEditingUser({ status: "active", role: "itr", password: "123456", assignedObjectIds: [], assignedBuildingIds: [] })}>Добавить пользователя</button>}
      </div>
      <div className="users-table-wrap">
        <table className="executive-table users-table">
          <thead><tr><th>ФИО</th><th>Роль</th><th>Должность</th><th>Email</th><th>Телефон</th><th>Статус</th><th>Объекты</th><th>Корпуса</th><th>Действия</th></tr></thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id}>
                <td><div className="table-user"><span>{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.slice(0, 1)}</span><strong>{user.name}</strong></div></td>
                <td>{roleLabels[user.role]}</td>
                <td>{user.position}</td>
                <td>{user.email}</td>
                <td>{user.phone || "—"}</td>
                <td><StatusBadge value="active" /></td>
                <td>{["creator", "company_head"].includes(user.role) && !user.assignedObjectIds?.length ? "Все" : user.assignedObjectIds?.map((id) => objectNames.get(id)).filter(Boolean).join(", ") || "—"}</td>
                <td>{user.assignedBuildingIds?.map((id) => buildingNames.get(id)).filter(Boolean).join(", ") || "—"}</td>
                <td><div className="task-actions">{canCreate && <button className="secondary-button slim" onClick={() => setEditingUser(user)}>Редактировать</button>}{canCreate && <button className="secondary-button slim" onClick={() => resetPassword(user.id)}>Сбросить пароль</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingUser && <UserEditModal user={editingUser} currentUser={currentUser} objects={objects} onClose={() => setEditingUser(null)} onSave={saveUser} />}
    </section>
  );
}

function UserEditModal({ user, currentUser, objects, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeUser({ ...user, id: user.id ?? `user-${Date.now()}`, name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", position: user.position ?? "", role: user.role ?? "itr" }));
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const allowedRoles = ["creator", "company_head"].includes(currentUser.role)
    ? (currentUser.role === "creator" ? ["creator", "company_head", "construction_director", "itr"] : ["company_head", "construction_director", "itr"])
    : ["itr"];
  const buildings = objects.flatMap((object) => object.buildings.map((building) => ({ ...building, objectName: object.name })));
  const toggle = (field, id) => update(field, form[field].includes(id) ? form[field].filter((item) => item !== id) : [...form[field], id]);

  return (
    <div className="modal-backdrop">
      <form className="task-modal user-edit-modal" onSubmit={(event) => { event.preventDefault(); if (!canAssignRole(currentUser.role, form.role)) return; onSave(form); }}>
        <div className="modal-title"><div><h2>{user.name ? "Редактировать пользователя" : "Добавить пользователя"}</h2><p>Роль, контакты и назначения.</p></div><button type="button" onClick={onClose}>×</button></div>
        <div className="task-form-grid">
          <label>ФИО<input value={form.name} onChange={(event) => update("name", event.target.value)} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></label>
          <label>Телефон<input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
          <label>Должность<input value={form.position} onChange={(event) => update("position", event.target.value)} /></label>
          <label>Роль<select value={form.role} onChange={(event) => update("role", event.target.value)}>{allowedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
          <label>Статус<input value="active" readOnly /></label>
          <label>Временный пароль<input value={form.password} onChange={(event) => update("password", event.target.value)} /></label>
        </div>
        <h3 className="modal-subtitle">Назначенные объекты</h3>
        <div className="checkbox-grid">{objects.map((object) => <label key={object.id}><input type="checkbox" checked={form.assignedObjectIds.includes(object.id)} onChange={() => toggle("assignedObjectIds", object.id)} />{object.name}</label>)}</div>
        <h3 className="modal-subtitle">Назначенные корпуса</h3>
        <div className="checkbox-grid">{buildings.map((building) => <label key={building.id}><input type="checkbox" checked={form.assignedBuildingIds.includes(building.id)} onChange={() => toggle("assignedBuildingIds", building.id)} />{building.objectName} / {building.name}</label>)}</div>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить пользователя</button></div>
      </form>
    </div>
  );
}

function isoDateOffset(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(dateIso) {
  return new Date(dateIso).toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function cssToken(value) {
  return String(value ?? "").replaceAll(" ", "-");
}

function ManpowerPage({ objects, user, users, onNotify }) {
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState(user.role === "itr" ? "request" : "requests");
  const [date, setDate] = useState(isoDateOffset(1));
  const [filters, setFilters] = useState({ objectId: "", itrId: "", status: "", priority: "" });
  const [adjustRequest, setAdjustRequest] = useState(null);
  const [editRequest, setEditRequest] = useState(null);
  const [weekDetails, setWeekDetails] = useState(null);
  const objectOptions = getManpowerObjectOptions(objects);
  const requests = getManpowerRequests();
  const visibleRequests = requests.filter((request) => {
    if ((request.targetDate ?? request.date) !== date) return false;
    if (filters.objectId && request.objectId !== filters.objectId) return false;
    if (filters.itrId && request.requestedBy !== filters.itrId) return false;
    if (filters.status && request.status !== filters.status) return false;
    if (filters.priority && request.priority !== filters.priority) return false;
    return true;
  });
  const stats = getManpowerSummaryByDate(date);
  const dailyTask = getDailyItrManpowerTask(user.id);
  const refresh = () => setVersion((value) => value + 1);
  const objectName = (id) => objectOptions.find((object) => object.id === id)?.name ?? id;
  const buildingName = (objectId, buildingId) => objectOptions.find((object) => object.id === objectId)?.buildings?.find((building) => building.id === buildingId)?.name ?? "—";
  const canApprove = ["creator", "company_head", "construction_director"].includes(user.role);

  const notifyUser = (payload) => {
    addNotification(payload);
    onNotify?.();
  };

  const saveRequest = (values, status = "подана") => {
    const payload = { ...values, status, requestedBy: user.id, requestedByName: user.name, requestedByRole: user.role };
    const created = values.id ? updateManpowerRequest(values.id, payload) : addManpowerRequest(payload);
    if (status === "подана") {
      notifyUser({
        type: "заявка на рабочих",
        title: "ИТР подал заявку на рабочих",
        message: `${user.name}: ${objectName(created.objectId)} на ${created.targetDate ?? created.date}`,
        priority: created.priority,
        roleTarget: "construction_director",
        objectId: created.objectId,
        buildingId: created.buildingId,
      });
    }
    setEditRequest(null);
    refresh();
  };

  const approve = (request) => {
    const updated = approveManpowerRequest(request.id, user.id);
    notifyUser({
      type: "расстановка утверждена",
      title: "Заявка утверждена",
      message: `${objectName(request.objectId)}: утверждено ${updated.approvedLoaders} груз. и ${updated.approvedInstallers} монт.`,
      priority: request.priority,
      userId: request.requestedBy,
      objectId: request.objectId,
      buildingId: request.buildingId,
    });
    refresh();
  };

  const reject = (request) => {
    const comment = window.prompt("Комментарий директора", request.directorComment || "Решение директора") ?? "";
    const updated = rejectManpowerRequest(request.id, comment, user.id);
    notifyUser({
      type: "расстановка отклонена",
      title: "Заявка отклонена",
      message: `${objectName(request.objectId)}: ${updated.directorComment || "без комментария"}`,
      priority: request.priority,
      userId: request.requestedBy,
      objectId: request.objectId,
      buildingId: request.buildingId,
    });
    refresh();
  };

  const adjust = (request, values) => {
    const updated = adjustManpowerRequest(request.id, values, user.id);
    notifyUser({
      type: "расстановка скорректирована",
      title: "Заявка скорректирована",
      message: `${objectName(request.objectId)}: скорректировано директором, утверждено ${updated.approvedLoaders} груз. и ${updated.approvedInstallers} монт.`,
      priority: updated.priority,
      userId: request.requestedBy,
      objectId: request.objectId,
      buildingId: request.buildingId,
    });
    setAdjustRequest(null);
    refresh();
  };

  const commentRequest = (request) => {
    const comment = window.prompt("Комментарий директора", request.directorComment || "") ?? request.directorComment ?? "";
    updateManpowerRequest(request.id, { directorComment: comment, status: request.status === "подана" ? "на рассмотрении" : request.status });
    refresh();
  };

  const cancel = (request) => {
    cancelManpowerRequest(request.id);
    refresh();
  };
  const canEditRequest = (request) => request.requestedBy === user.id && !["утверждена", "скорректирована", "отклонена"].includes(request.status);
  const finalRows = visibleRequests.filter((request) => ["утверждена", "скорректирована"].includes(request.status));

  return (
    <section className="manpower-page" key={version}>
      <div className="tasks-hero">
        <div>
          <span>{user.role === "itr" ? "Заявка на рабочих" : "Расстановка рабочей силы"}</span>
          <h2>{user.role === "itr" ? "Заявка на рабочих на завтра" : "Заявки ИТР и итоговый график"}</h2>
          <p>ИТР подают потребность до 15:00, директор утверждает итоговую расстановку на следующий день.</p>
        </div>
        <div className="heading-actions">
          <input className="date-filter" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      <div className="task-tabs brigade-tabs">
        {user.role === "itr" && <button className={tab === "request" ? "active" : ""} onClick={() => setTab("request")}>Подать заявку</button>}
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>{canApprove ? "Утверждение расстановки" : "Общая таблица заявок"}</button>
        <button className={tab === "final" ? "active" : ""} onClick={() => setTab("final")}>Итоговый график</button>
        <button className={tab === "week" ? "active" : ""} onClick={() => setTab("week")}>План на неделю</button>
      </div>

      <div className="manpower-kpis">
        <MetricCard title="Всего заявок" value={stats.total} />
        <MetricCard title="Без решения" value={stats.unresolved} tone={stats.unresolved ? "warning" : "neutral"} />
        <MetricCard title="Утверждено" value={stats.approved} tone="success" />
        <MetricCard title="Скорректировано" value={stats.adjusted} tone="warning" />
        <MetricCard title="Отклонено" value={stats.rejected} />
        <MetricCard title="Запрошено грузчиков" value={stats.requestedLoaders} />
        <MetricCard title="Запрошено монтажников" value={stats.requestedInstallers} />
        <MetricCard title="Утверждено грузчиков" value={stats.approvedLoaders} tone="success" />
        <MetricCard title="Утверждено монтажников" value={stats.approvedInstallers} tone="success" />
      </div>

      {tab === "request" && user.role === "itr" && <><ManpowerDailyTask task={dailyTask} onOpen={() => setEditRequest({})} /><ManpowerRequestForm objects={objectOptions} user={user} request={editRequest} onSave={saveRequest} onClose={() => setEditRequest(null)} /></>}

      {tab === "requests" && (
        <div className="brigade-card">
          <div className="panel-title">
            <div><h2>{canApprove ? "Утверждение расстановки" : "Общая таблица заявок"}</h2><p>Все заявки на выбранную дату: объект, объём, приоритет и решение директора.</p></div>
          </div>
          <div className="manpower-filters">
            <select value={filters.objectId} onChange={(event) => setFilters({ ...filters, objectId: event.target.value })}><option value="">Все объекты</option>{objectOptions.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select>
            {canApprove && <select value={filters.itrId} onChange={(event) => setFilters({ ...filters, itrId: event.target.value })}><option value="">Все ИТР</option>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Все статусы</option>{manpowerStatuses.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="">Все приоритеты</option>{manpowerPriorities.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="brigade-table-wrap">
            <table className="executive-table manpower-table">
              <thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>ИТР</th><th>Вид работ</th><th>Дверей</th><th>Груз. запрос</th><th>Монт. запрос</th><th>Приоритет</th><th>Комментарий ИТР</th><th>Статус</th><th>Решение</th><th>Утв. груз.</th><th>Утв. монт.</th><th>Комментарий директора</th><th>Действие</th></tr></thead>
              <tbody>{visibleRequests.map((request) => <tr key={request.id} className={`priority-row priority-${request.priority}`}>
                <td>{request.targetDate ?? request.date}</td><td>{objectName(request.objectId)}</td><td>{buildingName(request.objectId, request.buildingId)}</td><td>{request.requestedByName}</td><td>{request.workType ?? request.reason}</td><td>{request.doorsPlanned || "—"}</td><td>{request.loadersRequested}</td><td>{request.installersRequested}</td><td><span className={`priority-pill priority-${cssToken(request.priority)}`}>{request.priority}</span></td><td>{request.comment || request.workVolume || "—"}</td><td><span className={`manpower-status status-${cssToken(request.status)}`}>{request.status}</span></td><td>{request.directorDecision ?? "без решения"}</td><td>{request.approvedLoaders || "—"}</td><td>{request.approvedInstallers || "—"}</td><td>{request.directorComment || "—"}</td><td><div className="task-actions">{canApprove ? <><button className="secondary-button slim" onClick={() => approve(request)}>Утвердить как запрошено</button><button className="secondary-button slim" onClick={() => setAdjustRequest(request)}>Скорректировать</button><button className="secondary-button slim" onClick={() => reject(request)}>Отклонить</button><button className="secondary-button slim" onClick={() => commentRequest(request)}>Комментарий</button></> : canEditRequest(request) ? <><button className="secondary-button slim" onClick={() => { setEditRequest(request); setTab("request"); }}>Редактировать</button><button className="secondary-button slim" onClick={() => cancel(request)}>Отменить</button></> : "Просмотр"}</div></td>
              </tr>)}</tbody>
            </table>
            {visibleRequests.length === 0 && <div className="empty-plan">Заявок на выбранную дату нет.</div>}
          </div>
        </div>
      )}

      {tab === "final" && <ManpowerFinalSchedule requests={finalRows} objectName={objectName} buildingName={buildingName} />}
      {tab === "week" && <ManpowerWeekPlan startDate={date} objects={objectOptions} onDetails={setWeekDetails} />}
      {adjustRequest && <ManpowerAdjustModal request={adjustRequest} objectName={objectName(adjustRequest.objectId)} onClose={() => setAdjustRequest(null)} onSave={(values) => adjust(adjustRequest, values)} />}
      {weekDetails && <ManpowerWeekDetails details={weekDetails} objectName={objectName} buildingName={buildingName} onClose={() => setWeekDetails(null)} />}
    </section>
  );
}

function MetricCard({ title, value, tone = "neutral" }) {
  return <div className={`executive-kpi ${tone}`}><span>{title}</span><strong>{value}</strong></div>;
}

function ManpowerDailyTask({ task, onOpen }) {
  return <div className={`manpower-daily-task status-${cssToken(task.status)}`}><div><strong>{task.title}</strong><span>Срок: {task.dueText} · статус: {task.status}</span></div><button className="primary-button slim" onClick={onOpen}>Подать заявку</button></div>;
}

const manpowerWorkTypes = ["монтаж дверей", "разгрузка", "подъём дверей", "разнос дверей", "установка фурнитуры", "устранение замечаний", "подготовка проёмов", "прочее"];

function ManpowerRequestForm({ objects, user, request, onSave, onClose }) {
  const [form, setForm] = useState({ id: request?.id ?? "", targetDate: request?.targetDate ?? request?.date ?? isoDateOffset(1), objectId: request?.objectId ?? objects[0]?.id ?? "", buildingId: request?.buildingId ?? "", workType: request?.workType ?? "монтаж дверей", doorsPlanned: request?.doorsPlanned ?? 0, workVolume: request?.workVolume ?? "", loadersRequested: request?.loadersRequested ?? 0, installersRequested: request?.installersRequested ?? 0, priority: request?.priority ?? "средний", comment: request?.comment ?? "" });
  const selectedObject = objects.find((object) => object.id === form.objectId) ?? objects[0];
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: "", teamId: "" } : { ...current, [field]: value });
  return <form className="brigade-card manpower-request-form" onSubmit={(event) => { event.preventDefault(); onSave(form, "подана"); }}><div className="panel-title"><div><h2>{form.id ? "Редактировать заявку" : "Новая заявка"}</h2><p>{user.name}, укажите потребность на выбранный объект.</p></div>{form.id && <button className="secondary-button slim" type="button" onClick={onClose}>Закрыть</button>}</div><div className="object-plan-form"><label>Дата, на которую нужны рабочие<input type="date" value={form.targetDate} onChange={(event) => update("targetDate", event.target.value)} /></label><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}><option value="">Без корпуса</option>{selectedObject?.buildings?.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Вид работ<select value={form.workType} onChange={(event) => update("workType", event.target.value)}>{manpowerWorkTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Количество дверей<input type="number" min="0" value={form.doorsPlanned} onChange={(event) => update("doorsPlanned", event.target.value)} /></label><label>Грузчики<input type="number" min="0" value={form.loadersRequested} onChange={(event) => update("loadersRequested", event.target.value)} /></label><label>Монтажники<input type="number" min="0" value={form.installersRequested} onChange={(event) => update("installersRequested", event.target.value)} /></label><label>Приоритет<select value={form.priority} onChange={(event) => update("priority", event.target.value)}>{manpowerPriorities.map((item) => <option key={item}>{item}</option>)}</select></label><label className="wide">Объём / комментарий по объёму<input value={form.workVolume} onChange={(event) => update("workVolume", event.target.value)} placeholder="Например: 18 дверей, корпус 4.1, этажи 8-10" /></label><label className="wide">Комментарий ИТР<input value={form.comment} onChange={(event) => update("comment", event.target.value)} placeholder="Что важно знать директору" /></label><button className="secondary-button" type="button" onClick={() => onSave(form, "черновик")}>Сохранить черновик</button><button className="primary-button">Подать заявку</button></div></form>;
}

function ManpowerFinalSchedule({ requests, objectName, buildingName }) {
  return <div className="brigade-card"><div className="panel-title"><div><h2>Итоговый график</h2><p>Только утверждённые и скорректированные заявки.</p></div></div><div className="brigade-table-wrap"><table className="executive-table manpower-table"><thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>ИТР</th><th>Вид работ</th><th>Дверей</th><th>Грузчики утверждено</th><th>Монтажники утверждено</th><th>Комментарий директора</th><th>Статус</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td>{request.targetDate ?? request.date}</td><td>{objectName(request.objectId)}</td><td>{buildingName(request.objectId, request.buildingId)}</td><td>{request.requestedByName}</td><td>{request.workType ?? request.reason}</td><td>{request.doorsPlanned || "—"}</td><td>{request.approvedLoaders}</td><td>{request.approvedInstallers}</td><td>{request.directorComment || "—"}</td><td>{request.status}</td></tr>)}</tbody></table>{requests.length === 0 && <div className="empty-plan">Итоговый график на выбранную дату пока пуст.</div>}</div></div>;
}

function ManpowerWeekPlan({ startDate, objects, onDetails }) {
  const { days, requests } = getWeeklyManpowerPlan(startDate);
  const rows = objects.map((object) => ({ object, requests: requests.filter((request) => request.objectId === object.id) })).filter((row) => row.requests.length > 0 || ["СК 25", "СК 18", "ПИК Яуза", "Матвеевский парк", "Родные кварталы"].includes(row.object.name));
  const cell = (object, day) => {
    const dayRequests = requests.filter((request) => request.objectId === object.id && (request.targetDate ?? request.date) === day);
    const approved = dayRequests.filter((request) => ["утверждена", "скорректирована"].includes(request.status));
    const loaders = approved.reduce((sum, request) => sum + Number(request.approvedLoaders || 0), 0);
    const installers = approved.reduce((sum, request) => sum + Number(request.approvedInstallers || 0), 0);
    const top = dayRequests.find((request) => request.priority === "критичный") ?? dayRequests.find((request) => request.priority === "высокий") ?? dayRequests[0];
    return <button className={`week-cell ${approved.length ? "approved" : dayRequests.length ? "pending" : ""} ${top?.priority === "критичный" ? "critical" : top?.priority === "высокий" ? "high" : ""}`} onClick={() => dayRequests.length && onDetails({ object, day, requests: dayRequests })}><strong>{dayRequests.length ? `Г: ${loaders} / М: ${installers}` : "—"}</strong>{top && <small>{top.workType ?? top.reason}</small>}{top?.doorsPlanned ? <small>{top.doorsPlanned} дверей</small> : null}{top && <em>{top.priority}</em>}</button>;
  };
  return <div className="brigade-card"><div className="panel-title"><div><h2>План на неделю</h2><p>Excel-подобный вид утверждённой расстановки по объектам и дням.</p></div></div><div className="manpower-week-wrap"><table className="manpower-week-table"><thead><tr><th>Объект</th>{days.map((day) => <th key={day}>{formatShortDate(day)}</th>)}</tr></thead><tbody>{rows.map(({ object }) => <tr key={object.id}><td>{object.name}</td>{days.map((day) => <td key={`${object.id}-${day}`}>{cell(object, day)}</td>)}</tr>)}</tbody></table></div></div>;
}

function ManpowerWeekDetails({ details, objectName, buildingName, onClose }) {
  return <div className="modal-backdrop"><div className="task-modal"><div className="modal-title"><div><h2>{details.object.name} / {details.day}</h2><p>Детали заявок на дату.</p></div><button type="button" onClick={onClose}>×</button></div><div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Корпус</th><th>ИТР</th><th>Вид работ</th><th>Дверей</th><th>Груз.</th><th>Монт.</th><th>Статус</th></tr></thead><tbody>{details.requests.map((request) => <tr key={request.id}><td>{objectName(request.objectId)}</td><td>{buildingName(request.objectId, request.buildingId)}</td><td>{request.requestedByName}</td><td>{request.workType}</td><td>{request.doorsPlanned || "—"}</td><td>{request.approvedLoaders || request.loadersRequested}</td><td>{request.approvedInstallers || request.installersRequested}</td><td>{request.status}</td></tr>)}</tbody></table></div></div></div>;
}

function ManpowerAdjustModal({ request, objectName, onClose, onSave }) {
  const [form, setForm] = useState({ approvedLoaders: request.approvedLoaders || request.loadersRequested, approvedInstallers: request.approvedInstallers || request.installersRequested, directorComment: request.directorComment || "", priority: request.priority });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <div className="modal-backdrop"><form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="modal-title"><div><h2>Скорректировать заявку</h2><p>{objectName}: запрошено {request.loadersRequested} груз. и {request.installersRequested} монт.</p></div><button type="button" onClick={onClose}>×</button></div><label>Утвердить грузчиков<input type="number" min="0" value={form.approvedLoaders} onChange={(event) => update("approvedLoaders", event.target.value)} /></label><label>Утвердить монтажников<input type="number" min="0" value={form.approvedInstallers} onChange={(event) => update("approvedInstallers", event.target.value)} /></label><label>Приоритет<select value={form.priority} onChange={(event) => update("priority", event.target.value)}>{manpowerPriorities.map((item) => <option key={item}>{item}</option>)}</select></label><label>Комментарий директора<textarea value={form.directorComment} onChange={(event) => update("directorComment", event.target.value)} /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить решение</button></div></form></div>;
}

function ProfilePage({ user, objects, onSave }) {
  const [form, setForm] = useState({ ...user, oldPassword: "", newPassword: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setSaved(false); };
  const assignedObjects = objects.filter((object) => form.assignedObjectIds?.includes(object.id));
  const assignedBuildings = objects.flatMap((object) => object.buildings.map((building) => ({ ...building, objectName: object.name }))).filter((building) => form.assignedBuildingIds?.includes(building.id));
  return <section className="profile-panel"><div className="profile-card"><div className="profile-avatar"><div>{form.avatarUrl ? <img src={form.avatarUrl} alt="Аватар" /> : form.name.slice(0, 1)}</div><label>Загрузить аватар<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => update("avatarUrl", String(reader.result)); reader.readAsDataURL(file); }} /></label></div><form onSubmit={(event) => { event.preventDefault(); setError(""); if (form.newPassword && form.oldPassword !== user.password) { setError("Введите текущий пароль, чтобы подтвердить смену пароля"); return; } const { oldPassword, newPassword, ...profile } = form; onSave(normalizeUser({ ...profile, password: newPassword ? newPassword : user.password })); setForm((current) => ({ ...current, oldPassword: "", newPassword: "", password: newPassword ? newPassword : user.password })); setSaved(true); }}><div className="profile-grid"><label>ФИО<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label><label>Должность<input value={form.position} readOnly /></label><label>Роль<input value={roleLabels[form.role]} readOnly /></label><label>Email<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label><label>Телефон<input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label><label>Статус<input value={form.status} readOnly /></label><label className="profile-password">Текущий пароль<input type="password" value={form.oldPassword} onChange={(event) => update("oldPassword", event.target.value)} placeholder="Введите старый пароль" /></label><label className="profile-password">Новый пароль<input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} placeholder="Оставьте пустым, если не меняете" /></label></div><div className="profile-assignments"><div><span>Назначенные объекты</span><strong>{assignedObjects.map((object) => object.name).join(", ") || "Все / не ограничено"}</strong></div><div><span>Назначенные корпуса</span><strong>{assignedBuildings.map((building) => `${building.objectName} / ${building.name}`).join(", ") || "Не указаны"}</strong></div></div><button className="primary-button">Сохранить профиль</button>{error && <div className="form-error">{error}</div>}{saved && <div className="save-notice">Данные пользователя сохранены</div>}</form></div></section>;
}

function BrigadePlanPage({ objects, user, users }) {
  const [tab, setTab] = useState("current");
  const [version, setVersion] = useState(0);
  const [standardEdit, setStandardEdit] = useState(null);
  const [factOpen, setFactOpen] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  const refresh = () => setVersion((value) => value + 1);
  const standards = getWorkStandards();
  const activeStandards = standards.filter((item) => item.isActive);
  const plans = getObjectWorkPlans();
  const teams = getTeams();
  const workers = getEmployees();
  const reports = getDailyWorkReports();
  const stats = getPlanFactStats();
  const moneyStats = getPlanFactMoneyStats();
  const delayStats = getDelayReasonStats();
  const objectNames = new Map(objects.map((object) => [object.id, object.name]));
  const buildingNames = new Map(objects.flatMap((object) => object.buildings.map((building) => [building.id, building.name])));
  const standardNames = new Map(standards.map((item) => [item.id, item.workType]));
  const teamNames = new Map(teams.map((item) => [item.id, item.name]));
  const workerNames = new Map(workers.map((item) => [item.id, item.name]));
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const canEditStandards = ["creator", "company_head"].includes(user.role);
  const canAssignPlan = ["creator", "company_head", "construction_director"].includes(user.role);

  const saveStandard = (values) => {
    values.id ? updateWorkStandard(values.id, values) : addWorkStandard(values);
    setStandardEdit(null);
    refresh();
  };
  const saveFact = (values) => {
    const report = addDailyWorkReport({ ...values, createdBy: user.id });
    if (report.completionPercent < 80) {
      addNotification({ type: "отставание бригады", title: "Выполнение ниже 80%", message: `${teamNames.get(report.teamId) ?? "Бригада"}: ${report.completionPercent}%`, priority: "средний", roleTarget: "construction_director", objectId: report.objectId, buildingId: report.buildingId });
      const lowRows = getDailyWorkReports().filter((row) => row.teamId === report.teamId && row.completionPercent < 80).slice(0, 2);
      if (lowRows.length >= 2) {
        addTask({ title: "Проверить отставание бригады", description: `${teamNames.get(report.teamId) ?? "Бригада"} два дня подряд ниже 80%.`, type: "Другое", priority: "высокий", status: "новая", createdBy: "system", assignedTo: report.createdBy, objectId: report.objectId, buildingId: report.buildingId, dueDate: new Date().toISOString().slice(0, 10), automatic: true, automaticKey: `team-lag-${report.teamId}` });
      }
    }
    refresh();
  };

  return <section className="brigade-page" key={version}>
    <div className="tasks-hero"><div><span>План бригад / План-факт работ</span><h2>Контроль выработки по объектам</h2><p>Регламент компании, план по корпусам и ежедневный факт ИТР в одном модуле.</p></div><div className="heading-actions"><button className="primary-button" onClick={() => setFactOpen(true)}>Добавить факт за день</button><button className="secondary-button" onClick={() => setMultiOpen(true)}>Факт по рабочим</button></div></div>
    <div className="task-tabs brigade-tabs">{[["current", "Текущий план"], ["standards", "Регламент работ"], ["object", "План на объект"], ["daily", "Ежедневный факт"], ["fact", "План-факт"], ["ratings", "Рейтинги"], ["auto-report", "Автоотчёт"], ["teams", "Бригады / рабочие"]].map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</div>
    {["current", "standards"].includes(tab) && <div className="brigade-card"><div className="panel-title"><div><h2>{tab === "current" ? "Утверждённый текущий план" : "Регламент работ"}</h2><p>Основа для переноса текущего Excel-плана компании.</p></div>{canEditStandards && <button className="primary-button slim" onClick={() => setStandardEdit({})}>Добавить вид работ</button>}</div><StandardsTable rows={standards} canEdit={canEditStandards} onEdit={setStandardEdit} onDisable={(id) => { disableWorkStandard(id); refresh(); }} /></div>}
    {tab === "object" && <ObjectPlanPanel objects={objects} users={users} standards={activeStandards} teams={teams} plans={plans} canAssign={canAssignPlan} onSave={(values) => { addObjectWorkPlan({ ...values, createdBy: user.id }); refresh(); }} />}
    {tab === "daily" && <div className="brigade-card"><div className="panel-title"><div><h2>Журнал ежедневного факта</h2><p>Факт по бригадам и рабочим. Вносит ИТР, рабочий не получает личный кабинет.</p></div><button className="primary-button slim" onClick={() => setFactOpen(true)}>Добавить факт</button></div><ReportsTable reports={reports} objectNames={objectNames} buildingNames={buildingNames} standardNames={standardNames} teamNames={teamNames} employeeNames={workerNames} userNames={userNames} /></div>}
    {tab === "fact" && <div className="brigade-planfact"><div className="tasks-summary"><div><span>План</span><strong>{stats.plan}</strong></div><div><span>Факт</span><strong>{stats.fact}</strong></div><div className={stats.completionPercent >= 100 ? "success" : stats.completionPercent < 80 ? "danger" : ""}><span>Выполнение</span><strong>{stats.completionPercent}%</strong></div><div><span>Отклонение</span><strong>{stats.deviation}</strong></div><div className="success"><span>Перевыполнение</span><strong>{stats.overrun}</strong></div><div className="danger"><span>Отставание</span><strong>{stats.lag}</strong></div><div><span>Бригад</span><strong>{stats.activeTeams}</strong></div></div><MoneySummary stats={moneyStats} /><div className="brigade-card"><h2>План-факт</h2><ReportsTable reports={stats.reports} objectNames={objectNames} buildingNames={buildingNames} standardNames={standardNames} teamNames={teamNames} employeeNames={workerNames} userNames={userNames} /></div><DelayReasonsBlock rows={delayStats} /><div className="brigade-analytics-grid"><TeamEfficiencyTable rows={getTeamEfficiency()} objectNames={objectNames} /><EmployeeOutputTable rows={getEmployeeOutput()} teamNames={teamNames} /></div></div>}
    {tab === "ratings" && <div className="brigade-analytics-grid"><TeamRatingTable rows={getTeamRating()} objectNames={objectNames} buildingNames={buildingNames} /><ItrRatingTable rows={getItrRating()} /></div>}
    {tab === "auto-report" && <AutoReportTab objects={objects} users={users} objectNames={objectNames} buildingNames={buildingNames} user={user} />}
    {tab === "teams" && <TeamsPanel teams={teams} employees={workers} objects={objects} users={users} refresh={refresh} />}
    {standardEdit && <StandardModal standard={standardEdit} onClose={() => setStandardEdit(null)} onSave={saveStandard} />}
    {factOpen && <DailyFactModal objects={objects} standards={activeStandards} teams={teams} employees={workers} user={user} onClose={() => setFactOpen(false)} onSave={(values) => { saveFact(values); setFactOpen(false); }} />}
    {multiOpen && <MultiFactModal objects={objects} standards={activeStandards} teams={teams} employees={workers} user={user} onClose={() => setMultiOpen(false)} onSave={(rows) => { rows.forEach(saveFact); setMultiOpen(false); }} />}
  </section>;
}

function StandardsTable({ rows, canEdit, onEdit, onDisable }) {
  return <div className="brigade-table-wrap"><table className="executive-table brigade-table"><thead><tr><th>Вид работ</th><th>Состав</th><th>План/день</th><th>Ед.</th><th>Сумма</th><th>Цена</th><th>Категория</th><th>Комментарий</th><th>Статус</th>{canEdit && <th>Действие</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={!row.isActive ? "is-muted" : ""}><td><strong>{row.workType}</strong></td><td>{row.teamComposition}</td><td>{row.dailyPlan}</td><td>{row.unitName}</td><td>{row.dailyBudget || "—"}</td><td>{row.unitPrice || "—"}</td><td>{row.category}</td><td>{row.comment || "—"}</td><td><span className={`act-status ${row.isActive ? "closed" : "pending"}`}>{row.isActive ? "Активен" : "Отключен"}</span></td>{canEdit && <td><div className="task-actions"><button className="secondary-button slim" onClick={() => onEdit(row)}>Редактировать</button><button className="secondary-button slim" onClick={() => onDisable(row.id)}>Отключить</button></div></td>}</tr>)}</tbody></table></div>;
}

function StandardModal({ standard, onClose, onSave }) {
  const [form, setForm] = useState({ workType: "", teamComposition: "", dailyPlan: 0, unitName: "двери", dailyBudget: 0, unitPrice: 0, category: "Монтаж", comment: "", isActive: true, ...standard });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <div className="modal-backdrop"><form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><div className="modal-title"><div><h2>{form.id ? "Редактировать вид работ" : "Добавить вид работ"}</h2><p>Регламент работ компании.</p></div><button type="button" onClick={onClose}>×</button></div><div className="task-form-grid"><label className="wide">Вид работ<input value={form.workType} onChange={(event) => update("workType", event.target.value)} /></label><label>Состав группы<input value={form.teamComposition} onChange={(event) => update("teamComposition", event.target.value)} /></label><label>План в день<input type="number" value={form.dailyPlan} onChange={(event) => update("dailyPlan", event.target.value)} /></label><label>Единица<select value={form.unitName} onChange={(event) => update("unitName", event.target.value)}>{["двери", "комплекты", "этажи", "операции", "часы", "рейсы"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Сумма в день<input type="number" value={form.dailyBudget} onChange={(event) => update("dailyBudget", event.target.value)} /></label><label>Цена за единицу<input type="number" value={form.unitPrice} onChange={(event) => update("unitPrice", event.target.value)} /></label><label>Категория<input value={form.category} onChange={(event) => update("category", event.target.value)} /></label><label className="wide">Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label></div><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить</button></div></form></div>;
}

function formatRub(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("ru-RU")} ₽`;
}

function MoneySummary({ stats }) {
  return <div className="money-summary"><div><span>План в деньгах</span><strong>{formatRub(stats.plannedAmount)}</strong></div><div><span>Факт в деньгах</span><strong>{formatRub(stats.actualAmount)}</strong></div><div className={stats.moneyDeviation < 0 ? "danger" : "success"}><span>Отклонение в деньгах</span><strong>{formatRub(stats.moneyDeviation)}</strong></div><div className="danger"><span>Недовыполнение</span><strong>{formatRub(stats.moneyUnderperformance)}</strong></div><div className="success"><span>Перевыполнение</span><strong>{formatRub(stats.moneyOverperformance)}</strong></div></div>;
}

function DelayReasonsBlock({ rows }) {
  return <div className="brigade-card"><h2>Причины отставания</h2><div className="delay-reason-grid">{rows.map((row) => <div key={row.reason}><strong>{row.reason}</strong><span>{row.quantityLag} ед. · {formatRub(row.moneyLag)} · {row.percent}%</span></div>)}{rows.length === 0 && <div className="empty-plan">Отставаний за период нет.</div>}</div></div>;
}

function scoreTone(score) {
  if (score >= 100) return "good";
  if (score >= 80) return "warn";
  return "bad";
}

function TeamRatingTable({ rows, objectNames }) {
  return <div className="brigade-card"><h2>Рейтинг бригад</h2><table className="executive-table"><thead><tr><th>Бригада</th><th>Объект</th><th>План</th><th>Факт</th><th>%</th><th>План ₽</th><th>Факт ₽</th><th>Откл. ₽</th><th>Дней</th><th>Ниже 80%</th><th>Балл</th></tr></thead><tbody>{rows.map((row) => <tr key={row.teamId}><td>{row.team}</td><td>{objectNames.get(row.objectId)}</td><td>{row.plan}</td><td>{row.fact}</td><td>{row.completionPercent}%</td><td>{formatRub(row.plannedAmount)}</td><td>{formatRub(row.actualAmount)}</td><td className={row.moneyDeviation < 0 ? "danger-text" : "success-text"}>{formatRub(row.moneyDeviation)}</td><td>{row.daysCount}</td><td>{row.lowDays}</td><td><span className={`completion-pill ${scoreTone(row.score)}`}>{row.score}</span></td></tr>)}</tbody></table></div>;
}

function ItrRatingTable({ rows }) {
  return <div className="brigade-card"><h2>Рейтинг ИТР</h2><table className="executive-table"><thead><tr><th>ФИО</th><th>Объекты</th><th>Корпуса</th><th>Отчётов</th><th>Дней без отчёта</th><th>План</th><th>Факт</th><th>%</th><th>План ₽</th><th>Факт ₽</th><th>Откл. ₽</th><th>Бригад ниже 80%</th><th>Балл</th></tr></thead><tbody>{rows.map((row) => <tr key={row.userId}><td>{row.name}</td><td>{row.objectsCount}</td><td>{row.buildingsCount}</td><td>{row.reportsCount}</td><td>{row.daysWithoutReport}</td><td>{row.plan}</td><td>{row.fact}</td><td>{row.completionPercent}%</td><td>{formatRub(row.plannedAmount)}</td><td>{formatRub(row.actualAmount)}</td><td className={row.moneyDeviation < 0 ? "danger-text" : "success-text"}>{formatRub(row.moneyDeviation)}</td><td>{row.lowTeams}</td><td><span className={`completion-pill ${scoreTone(row.score)}`}>{row.score}</span></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-plan">Пока нет данных для рейтинга ИТР.</div>}</div>;
}

function AutoReportTab({ objects, users, objectNames, buildingNames, user }) {
  const [filters, setFilters] = useState({ date: new Date().toISOString().slice(0, 10), objectId: objects[0]?.id ?? "", buildingId: objects[0]?.buildings[0]?.id ?? "", itrId: "" });
  const [copied, setCopied] = useState(false);
  const selectedObject = objects.find((object) => object.id === filters.objectId) ?? objects[0];
  const reportText = generateDailyAutoReport(filters, { objectNames, buildingNames });
  const history = getDailyAutoReports();
  const update = (field, value) => setFilters((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((object) => object.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return <div className="auto-report-layout"><div className="brigade-card"><div className="panel-title"><div><h2>Автоотчёт за день</h2><p>Формируется автоматически из ежедневного факта.</p></div></div><div className="object-plan-form"><label>Дата<input type="date" value={filters.date} onChange={(event) => update("date", event.target.value)} /></label><label>Объект<select value={filters.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label><label>Корпус<select value={filters.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>ИТР<select value={filters.itrId} onChange={(event) => update("itrId", event.target.value)}><option value="">Все ИТР</option>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><pre className="auto-report-text">{reportText}</pre><div className="form-actions"><button className="primary-button" onClick={copyReport}>{copied ? "Скопировано" : "Скопировать отчёт"}</button><button className="secondary-button" onClick={() => addDailyAutoReport({ ...filters, createdBy: user.id, reportText })}>Сохранить в историю</button></div></div><div className="brigade-card"><h2>История автоотчётов</h2><div className="team-list">{history.map((item) => <div key={item.id}><strong>{item.date}</strong><span>{objectNames.get(item.objectId) ?? "Все объекты"} · {new Date(item.createdAt).toLocaleString("ru-RU")}</span></div>)}{history.length === 0 && <div className="empty-plan">История пока пустая.</div>}</div></div></div>;
}

function ObjectPlanPanel({ objects, users, standards, teams, plans, canAssign, onSave }) {
  const firstObject = objects[0];
  const [form, setForm] = useState(() => ({ objectId: firstObject?.id ?? "", buildingId: firstObject?.buildings[0]?.id ?? "", workTypeId: standards[0]?.id ?? "", plannedQuantity: 240, startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), assignedItrId: users.find((item) => item.role === "itr")?.id ?? "", assignedTeamId: teams[0]?.id ?? "", comment: "" }));
  const selectedObject = objects.find((object) => object.id === form.objectId) ?? firstObject;
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((object) => object.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  return <div className="brigade-card"><div className="panel-title"><div><h2>План на объект / корпус</h2><p>Назначение плана по объектам и ответственным ИТР.</p></div></div>{canAssign && <form className="object-plan-form" onSubmit={(event) => { event.preventDefault(); onSave(form); }}><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Вид работ<select value={form.workTypeId} onChange={(event) => update("workTypeId", event.target.value)}>{standards.map((standard) => <option key={standard.id} value={standard.id}>{standard.workType}</option>)}</select></label><label>План<input type="number" value={form.plannedQuantity} onChange={(event) => update("plannedQuantity", event.target.value)} /></label><label>Начало<input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></label><label>Окончание<input type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} /></label><label>Ответственный ИТР<select value={form.assignedItrId} onChange={(event) => update("assignedItrId", event.target.value)}>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Бригада<select value={form.assignedTeamId} onChange={(event) => update("assignedTeamId", event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="wide">Комментарий<input value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label><button className="primary-button">Назначить план</button></form>}<div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Корпус</th><th>Вид работ</th><th>План</th><th>Период</th><th>ИТР</th><th>Бригада</th><th>Комментарий</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td>{objects.find((object) => object.id === plan.objectId)?.name}</td><td>{objects.flatMap((object) => object.buildings).find((building) => building.id === plan.buildingId)?.name}</td><td>{standards.find((standard) => standard.id === plan.workTypeId)?.workType}</td><td>{plan.plannedQuantity}</td><td>{plan.startDate} — {plan.endDate}</td><td>{users.find((item) => item.id === plan.assignedItrId)?.name}</td><td>{teams.find((team) => team.id === plan.assignedTeamId)?.name}</td><td>{plan.comment}</td></tr>)}</tbody></table></div></div>;
}

function DailyFactModal({ objects, standards, teams, employees, user, onClose, onSave }) {
  const object = objects[0];
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), objectId: object?.id ?? "", buildingId: object?.buildings[0]?.id ?? "", teamId: teams[0]?.id ?? "", workerId: "", workTypeId: standards[0]?.id ?? "", actualQuantity: 0, delayReason: "", comment: "" });
  const selectedObject = objects.find((item) => item.id === form.objectId) ?? object;
  const standard = standards.find((item) => item.id === form.workTypeId);
  const isBehindPlan = Number(form.actualQuantity) < Number(standard?.dailyPlan ?? 0);
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((item) => item.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  const teamWorkers = getWorkersByTeam(form.teamId);
  const approvedSchedule = getManpowerRequests().filter((request) =>
    (request.targetDate ?? request.date) === form.date &&
    request.objectId === form.objectId &&
    request.buildingId === form.buildingId &&
    ["утверждена", "скорректирована"].includes(request.status)
  );
  return <div className="modal-backdrop"><form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, employeeId: form.workerId, plannedQuantity: standard?.dailyPlan ?? 0, createdBy: user.id }); }}><div className="modal-title"><div><h2>Добавить факт за день</h2><p>Короткая форма для ИТР. Рабочий не получает личный кабинет.</p></div><button type="button" onClick={onClose}>×</button></div><label>Дата<input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Бригада<select value={form.teamId} onChange={(event) => update("teamId", event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Рабочий<select value={form.workerId} onChange={(event) => update("workerId", event.target.value)}><option value="">Бригада целиком</option>{teamWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} — {worker.workerType}</option>)}</select></label>{approvedSchedule.length > 0 && <div className="approved-manpower-box"><span>Утверждённая расстановка на выбранный день</span>{approvedSchedule.map((request) => <div className="approved-manpower-row" key={request.id}><strong>{request.workType}</strong><small>{request.approvedLoaders ?? request.loadersRequested ?? 0} грузч. / {request.approvedInstallers ?? request.installersRequested ?? 0} монт. · {request.doorsPlanned ?? 0} дверей · {request.status}</small></div>)}</div>}<label>Вид работ<select value={form.workTypeId} onChange={(event) => update("workTypeId", event.target.value)}>{standards.map((item) => <option key={item.id} value={item.id}>{item.workType}</option>)}</select></label><div className="auto-plan-box">План: <strong>{standard?.dailyPlan ?? 0} {standard?.unitName}</strong></div><label>Факт<input type="number" value={form.actualQuantity} onChange={(event) => update("actualQuantity", event.target.value)} /></label>{isBehindPlan && <div className="soft-warning">Укажите причину отставания, чтобы руководитель видел, что мешает работе.</div>}<label className={isBehindPlan && !form.delayReason ? "needs-attention" : ""}>Причина отставания<select value={form.delayReason} onChange={(event) => update("delayReason", event.target.value)}><option value="">Не выбрана</option>{delayReasonOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить факт</button></div></form></div>;
}

function MultiFactModal({ objects, standards, teams, employees, user, onClose, onSave }) {
  const object = objects[0];
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), objectId: object?.id ?? "", buildingId: object?.buildings[0]?.id ?? "", teamId: teams[0]?.id ?? "", workTypeId: standards[0]?.id ?? "", comment: "" });
  const [facts, setFacts] = useState({});
  const selectedObject = objects.find((item) => item.id === form.objectId) ?? object;
  const standard = standards.find((item) => item.id === form.workTypeId);
  const teamEmployees = getWorkersByTeam(form.teamId);
  const update = (field, value) => setForm((current) => field === "objectId" ? { ...current, objectId: value, buildingId: objects.find((item) => item.id === value)?.buildings[0]?.id ?? "" } : { ...current, [field]: value });
  return <div className="modal-backdrop"><form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(teamEmployees.filter((worker) => Number(facts[worker.id]) > 0).map((worker) => ({ ...form, workerId: worker.id, employeeId: worker.id, plannedQuantity: standard?.dailyPlan ?? 0, actualQuantity: Number(facts[worker.id]) || 0, createdBy: user.id }))); }}><div className="modal-title"><div><h2>Факт по рабочим</h2><p>Внесите выработку сразу по рабочим выбранной бригады.</p></div><button type="button" onClick={onClose}>×</button></div><div className="task-form-grid"><label>Дата<input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label><label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Бригада<select value={form.teamId} onChange={(event) => update("teamId", event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="wide">Вид работ<select value={form.workTypeId} onChange={(event) => update("workTypeId", event.target.value)}>{standards.map((item) => <option key={item.id} value={item.id}>{item.workType}</option>)}</select></label></div><div className="employee-fact-list">{teamEmployees.map((worker) => <label key={worker.id}>{worker.name}<input type="number" value={facts[worker.id] ?? ""} onChange={(event) => setFacts((current) => ({ ...current, [worker.id]: event.target.value }))} placeholder={`План ${standard?.dailyPlan ?? 0}`} /></label>)}</div><div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить</button></div></form></div>;
}

function ReportsTable({ reports, objectNames, buildingNames, standardNames, teamNames, employeeNames, userNames }) {
  return <div className="brigade-table-wrap"><table className="executive-table brigade-table"><thead><tr><th>Дата</th><th>Объект</th><th>Корпус</th><th>Бригада</th><th>Рабочий</th><th>Вид работ</th><th>План</th><th>Факт</th><th>%</th><th>Откл.</th><th>План, ₽</th><th>Факт, ₽</th><th>Откл., ₽</th><th>Причина</th><th>Комментарий</th><th>Внёс</th></tr></thead><tbody>{reports.map((row) => <tr key={row.id}><td>{row.date}</td><td>{objectNames.get(row.objectId)}</td><td>{buildingNames.get(row.buildingId)}</td><td>{teamNames.get(row.teamId)}</td><td>{employeeNames.get(row.workerId ?? row.employeeId) ?? "Бригада"}</td><td>{standardNames.get(row.workTypeId)}</td><td>{row.plannedQuantity}</td><td>{row.actualQuantity}</td><td><span className={`completion-pill ${row.completionPercent >= 100 ? "good" : row.completionPercent >= 80 ? "warn" : "bad"}`}>{row.completionPercent}%</span></td><td>{row.deviation}</td><td>{formatRub(row.plannedAmount)}</td><td>{formatRub(row.actualAmount)}</td><td className={row.moneyDeviation < 0 ? "danger-text" : "success-text"}>{formatRub(row.moneyDeviation)}</td><td>{row.delayReason || "—"}</td><td>{row.comment || "—"}</td><td>{userNames.get(row.createdBy) ?? row.createdBy}</td></tr>)}</tbody></table>{reports.length === 0 && <div className="empty-plan">Факты пока не внесены.</div>}</div>;
}

function TeamEfficiencyTable({ rows, objectNames }) {
  return <div className="brigade-card"><h2>Эффективность бригад</h2><table className="executive-table"><thead><tr><th>Бригада</th><th>Объект</th><th>План</th><th>Факт</th><th>%</th><th>Отставание</th><th>Дней</th></tr></thead><tbody>{rows.map((row) => <tr key={row.teamId}><td>{row.team}</td><td>{objectNames.get(row.objectId)}</td><td>{row.plan}</td><td>{row.fact}</td><td><span className={`completion-pill ${row.completionPercent >= 100 ? "good" : row.completionPercent >= 80 ? "warn" : "bad"}`}>{row.completionPercent}%</span></td><td>{row.lag}</td><td>{row.daysCount}</td></tr>)}</tbody></table></div>;
}

function EmployeeOutputTable({ rows, teamNames }) {
  return <div className="brigade-card"><h2>Выработка рабочих</h2><table className="executive-table"><thead><tr><th>Рабочий</th><th>Бригада</th><th>Вид работ</th><th>Факт день</th><th>Факт неделя</th><th>% плана</th><th>Комментарии</th></tr></thead><tbody>{rows.map((row) => <tr key={row.employeeId}><td>{row.employee}</td><td>{teamNames.get(row.teamId)}</td><td>{row.workType}</td><td>{row.todayFact}</td><td>{row.weekFact}</td><td>{row.completionPercent}%</td><td>{row.comments.slice(0, 2).join("; ") || "—"}</td></tr>)}</tbody></table></div>;
}

function TeamsPanel({ teams, employees, objects, users, refresh }) {
  const [teamForm, setTeamForm] = useState({ name: "", teamType: "Монтаж", objectId: objects[0]?.id ?? "", buildingId: objects[0]?.buildings[0]?.id ?? "", responsibleItrId: users.find((user) => user.role === "itr")?.id ?? "" });
  const [employeeForm, setEmployeeForm] = useState({ name: "", group: "", nationality: "", workerType: "монтажник", teamId: teams[0]?.id ?? "", phone: "", comment: "" });
  const selectedObject = objects.find((object) => object.id === teamForm.objectId) ?? objects[0];
  const teamStats = new Map(getTeamEfficiency().map((row) => [row.teamId, row]));
  const assignableWorkers = employees.filter((worker) => worker.status === "active");
  const addWorkerToTeam = (workerId, teamId) => { assignWorkerToTeam(workerId, teamId); refresh(); };
  const removeFromTeam = (workerId) => { removeWorkerFromTeam(workerId); refresh(); };
  const disable = (workerId) => { disableEmployee(workerId); refresh(); };
  return <div className="brigade-analytics-grid">
    <div className="brigade-card wide">
      <h2>Бригады</h2>
      <form className="compact-admin-form" onSubmit={(event) => { event.preventDefault(); addTeam({ ...teamForm, memberWorkerIds: [] }); setTeamForm({ ...teamForm, name: "" }); refresh(); }}>
        <input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} placeholder="Название бригады" />
        <input value={teamForm.teamType} onChange={(event) => setTeamForm({ ...teamForm, teamType: event.target.value })} placeholder="Тип" />
        <select value={teamForm.objectId} onChange={(event) => setTeamForm({ ...teamForm, objectId: event.target.value, buildingId: objects.find((object) => object.id === event.target.value)?.buildings[0]?.id ?? "" })}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select>
        <select value={teamForm.buildingId} onChange={(event) => setTeamForm({ ...teamForm, buildingId: event.target.value })}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select>
        <select value={teamForm.responsibleItrId} onChange={(event) => setTeamForm({ ...teamForm, responsibleItrId: event.target.value })}>{users.filter((user) => user.role === "itr").map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <button className="primary-button slim">Добавить бригаду</button>
      </form>
      <div className="team-cards-grid">{teams.map((team) => {
        const workers = getWorkersByTeam(team.id);
        const stats = teamStats.get(team.id);
        return <article className="team-card" key={team.id}><div><strong>{team.name}</strong><span>{team.teamType} · {objects.find((object) => object.id === team.objectId)?.name ?? "объект не указан"} · {users.find((person) => person.id === team.responsibleItrId)?.name ?? "ИТР не назначен"}</span></div><div className="team-card-metrics"><span>Рабочих: {workers.length}</span><span>План: {stats?.plan ?? 0}</span><span>Факт: {stats?.fact ?? 0}</span><span>Эффективность: {stats?.completionPercent ?? 0}%</span></div><div className="worker-tags">{workers.map((worker) => <button key={worker.id} onClick={() => removeFromTeam(worker.id)} title="Убрать из бригады">{worker.name}</button>)}</div><select onChange={(event) => event.target.value && addWorkerToTeam(event.target.value, team.id)} value=""><option value="">Добавить рабочего в бригаду</option>{assignableWorkers.filter((worker) => !workers.some((item) => item.id === worker.id)).map((worker) => <option key={worker.id} value={worker.id}>{worker.name} — {worker.group}</option>)}</select></article>;
      })}</div>
    </div>
    <div className="brigade-card wide">
      <h2>Рабочие без личных кабинетов</h2>
      <p className="card-note">Это монтажники, грузчики и сотрудники бригад. Они не входят в users и не могут войти на сайт.</p>
      <form className="compact-admin-form" onSubmit={(event) => { event.preventDefault(); const worker = addEmployee(employeeForm); if (employeeForm.teamId) assignWorkerToTeam(worker.id, employeeForm.teamId); setEmployeeForm({ ...employeeForm, name: "", phone: "", comment: "" }); refresh(); }}>
        <input value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} placeholder="ФИО рабочего" />
        <input value={employeeForm.group} onChange={(event) => setEmployeeForm({ ...employeeForm, group: event.target.value })} placeholder="Группа" />
        <input value={employeeForm.nationality} onChange={(event) => setEmployeeForm({ ...employeeForm, nationality: event.target.value })} placeholder="Гражданство" />
        <select value={employeeForm.workerType} onChange={(event) => setEmployeeForm({ ...employeeForm, workerType: event.target.value })}>{["монтажник", "грузчик", "разнорабочий", "фурнитурщик", "бригадир", "другое"].map((type) => <option key={type}>{type}</option>)}</select>
        <select value={employeeForm.teamId} onChange={(event) => setEmployeeForm({ ...employeeForm, teamId: event.target.value })}><option value="">Без бригады</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
        <button className="primary-button slim">Добавить рабочего</button>
      </form>
      <div className="brigade-table-wrap"><table className="executive-table"><thead><tr><th>ФИО</th><th>Группа</th><th>Гражданство</th><th>Тип</th><th>Бригада</th><th>Статус</th><th>Комментарий</th><th>Действия</th></tr></thead><tbody>{employees.map((worker) => <tr key={worker.id} className={worker.status === "inactive" ? "is-muted" : ""}><td>{worker.name}</td><td>{worker.group || "—"}</td><td>{worker.nationality || "—"}</td><td>{worker.workerType}</td><td>{teams.find((team) => team.id === worker.teamId)?.name ?? "—"}</td><td>{worker.status}</td><td><input className="table-input" value={worker.comment || ""} onChange={(event) => { updateEmployee(worker.id, { comment: event.target.value }); refresh(); }} /></td><td><div className="task-actions"><select value={worker.teamId || ""} onChange={(event) => event.target.value ? addWorkerToTeam(worker.id, event.target.value) : removeFromTeam(worker.id)}><option value="">Без бригады</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button className="secondary-button slim" onClick={() => disable(worker.id)}>Отключить</button></div></td></tr>)}</tbody></table></div>
    </div>
  </div>;
}

function riskLabel(count) {
  if (count >= 30) return "критично";
  if (count >= 10) return "под контролем";
  return "норма";
}

function CompanyDashboard({ objects, user, users, onOpen }) {
  const visibleObjects = user.role === "construction_director" ? objects : objects;
  const doors = visibleObjects.flatMap((object) => getAllDoors(object));
  const problems = getProblems(visibleObjects);
  const tasks = calculateTodayTasks(visibleObjects);
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const mounted = doors.filter((door) => ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus)).length;
  const withoutCustodyAct = doors.filter((door) => door.doorStatus === "смонтирована" && !["передано по акту", "закрыто"].includes(door.storageAct)).length;
  const issues = doors.filter((door) => door.issue === "есть замечание").length;
  const overdueTasks = tasks.filter((task) => task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== "done").length;
  const readiness = doors.length ? Math.round((mounted / doors.length) * 100) : 0;
  const problematicBuildings = new Set(problems.filter((problem) => problem.buildingId).map((problem) => problem.buildingId)).size;
  const cards = [
    ["Объектов в работе", visibleObjects.filter((object) => object.status === "В работе").length, "neutral"],
    ["Общая готовность", `${readiness}%`, "success"],
    ["Дверей смонтировано", mounted, "success"],
    ["Смонтировано без акта", withoutCustodyAct, "danger"],
    ["Открытых замечаний ТН", issues, "danger"],
    ["Просроченных задач", overdueTasks, "danger"],
    ["Проблемных корпусов", problematicBuildings, "warning"],
  ];
  const objectRows = visibleObjects.map((object) => {
    const objectDoors = getAllDoors(object);
    const objectMounted = objectDoors.filter((door) => ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus)).length;
    const objectProblems = problems.filter((problem) => problem.objectId === object.id);
    const objectIssues = objectDoors.filter((door) => door.issue === "есть замечание").length;
    const objectWithoutActs = objectDoors.filter((door) => door.doorStatus === "смонтирована" && !["передано по акту", "закрыто"].includes(door.storageAct)).length;
    const objectReadiness = objectDoors.length ? Math.round((objectMounted / objectDoors.length) * 100) : 0;
    return {
      object,
      readiness: objectReadiness,
      problems: objectProblems.length,
      issues: objectIssues,
      withoutActs: objectWithoutActs,
      risk: riskLabel(objectProblems.length + objectIssues + objectWithoutActs),
      responsible: userNames.get(object.responsibleId) ?? object.responsibleId ?? "Не назначен",
    };
  });
  const topRisks = [...problems].sort((a, b) => {
    const weight = { высокий: 0, средний: 1, низкий: 2 };
    return (weight[a.priority] ?? 2) - (weight[b.priority] ?? 2) || b.days - a.days;
  }).slice(0, 5);
  const responsibleRows = users.filter((item) => item.role !== "creator").map((person) => {
    const ownedObjects = visibleObjects.filter((object) => object.responsibleId === person.id);
    const ownedProblems = problems.filter((problem) => ownedObjects.some((object) => object.id === problem.objectId) || problem.responsible === person.id || problem.responsible === person.name);
    const ownedTasks = tasks.filter((task) => task.assignedTo === person.id || task.assignedTo === person.name);
    return {
      person,
      objects: ownedObjects.length,
      tasks: ownedTasks.length,
      overdue: ownedTasks.filter((task) => task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== "done").length,
      issues: ownedProblems.filter((problem) => problem.type === "Замечания ТН").length,
      withoutActs: ownedProblems.filter((problem) => problem.type === "Смонтировано без акта ОХ").length,
    };
  });
  const planFact = { plan: 420, fact: 356 };
  const deviation = planFact.fact - planFact.plan;
  const completion = Math.round((planFact.fact / planFact.plan) * 100);
  const tomorrow = isoDateOffset(1);
  const manpowerTomorrow = getManpowerSummaryByDate(tomorrow);
  const manpowerObjects = getManpowerObjectOptions(objects);
  const manpowerTomorrowRows = getManpowerRequests()
    .filter((request) => (request.targetDate ?? request.date) === tomorrow)
    .slice(0, 5);
  const manpowerObjectName = (id) => manpowerObjects.find((object) => object.id === id)?.name ?? id;

  return (
    <section className="executive-dashboard">
      <div className="executive-hero">
        <div>
          <span>Центр управления компанией</span>
          <h2>Состояние объектов за 30 секунд</h2>
          <p>Готовность, риски, акты ОХ, замечания ТН, отставания и ответственные собраны на одном управленческом экране.</p>
        </div>
        <div className="executive-score">
          <span>Общая готовность</span>
          <strong>{readiness}%</strong>
        </div>
      </div>
      <div className="executive-kpi-grid">{cards.map(([label, value, tone]) => <div className={`executive-kpi ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="executive-grid">
        <section className="executive-card wide">
          <div className="executive-card-title"><h3>Объекты</h3><p>Сводка по каждому объекту и статус риска.</p></div>
          <div className="executive-table-wrap"><table className="executive-table"><thead><tr><th>Объект</th><th>Корпуса</th><th>Готовность</th><th>Проблем</th><th>Замечаний ТН</th><th>Без актов</th><th>Ответственный директор</th><th>Статус риска</th></tr></thead><tbody>{objectRows.map((row) => <tr key={row.object.id}><td><button onClick={() => onOpen({ objectId: row.object.id })}>{row.object.name}</button></td><td>{row.object.buildings.length}</td><td><div className="mini-progress"><span style={{ width: `${row.readiness}%` }} /></div><b>{row.readiness}%</b></td><td>{row.problems}</td><td>{row.issues}</td><td>{row.withoutActs}</td><td>{row.responsible}</td><td><span className={`risk-pill risk-${row.risk}`}>{row.risk}</span></td></tr>)}</tbody></table></div>
        </section>
        <section className="executive-card">
          <div className="executive-card-title"><h3>Риски</h3><p>Топ-5 зон внимания.</p></div>
          <div className="risk-list">{topRisks.map((risk) => <button key={risk.id} onClick={() => onOpen(risk)}><strong>{risk.type}</strong><span>{risk.object} / {risk.building}</span><small>{risk.priority} · {risk.days} дн.</small></button>)}</div>
        </section>
        <section className="executive-card">
          <div className="executive-card-title"><h3>План-факт</h3><p>Mock-показатель недели.</p></div>
          <div className="plan-fact"><div><span>План недели</span><strong>{planFact.plan}</strong></div><div><span>Факт недели</span><strong>{planFact.fact}</strong></div><div><span>Отклонение</span><strong className={deviation < 0 ? "danger-text" : "success-text"}>{deviation}</strong></div><div><span>Выполнение</span><strong>{completion}%</strong></div></div>
        </section>
        <section className="executive-card">
          <div className="executive-card-title"><h3>Расстановка на завтра</h3><p>Заявки ИТР, решения директора и итоговые количества.</p></div>
          <div className="plan-fact manpower-dashboard">
            <div><span>Заявок</span><strong>{manpowerTomorrow.total}</strong></div>
            <div><span>Утверждено</span><strong>{manpowerTomorrow.approved}</strong></div>
            <div><span>Без решения</span><strong className={manpowerTomorrow.unresolved ? "danger-text" : ""}>{manpowerTomorrow.unresolved}</strong></div>
            <div><span>Скорректировано</span><strong>{manpowerTomorrow.adjusted}</strong></div>
            <div><span>Запрошено груз.</span><strong>{manpowerTomorrow.requestedLoaders}</strong></div>
            <div><span>Утверждено груз.</span><strong>{manpowerTomorrow.approvedLoaders}</strong></div>
            <div><span>Запрошено монт.</span><strong>{manpowerTomorrow.requestedInstallers}</strong></div>
            <div><span>Утверждено монт.</span><strong>{manpowerTomorrow.approvedInstallers}</strong></div>
          </div>
          <div className="risk-list compact">{manpowerTomorrowRows.map((request) => <button key={request.id}><strong>{manpowerObjectName(request.objectId)}</strong><span>{request.requestedByName} · {request.workType ?? request.reason} · {request.priority}</span><small>дверей {request.doorsPlanned || "—"} · запрос {request.loadersRequested}/{request.installersRequested} · утверждено {request.approvedLoaders || 0}/{request.approvedInstallers || 0}</small></button>)}{manpowerTomorrowRows.length === 0 && <div className="empty-plan">Заявок на завтра пока нет.</div>}</div>
        </section>
        <section className="executive-card wide">
          <div className="executive-card-title"><h3>Ответственные</h3><p>Нагрузка и проблемные зоны по людям.</p></div>
          <div className="executive-table-wrap"><table className="executive-table"><thead><tr><th>ФИО</th><th>Роль</th><th>Объекты</th><th>Задач</th><th>Просрочено</th><th>Замечаний</th><th>Без актов</th></tr></thead><tbody>{responsibleRows.map((row) => <tr key={row.person.id}><td>{row.person.name}</td><td>{roleLabels[row.person.role]}</td><td>{row.objects}</td><td>{row.tasks}</td><td>{row.overdue}</td><td>{row.issues}</td><td>{row.withoutActs}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </section>
  );
}

const matrixDocumentLinks = [
  {
    id: "matrix-4-1",
    title: "Шахматка ЖК Матвеевский парк / Корпус 4.1",
    object: "ЖК Матвеевский парк",
    building: "Корпус 4.1",
    owner: "Иван Петров",
    url: "https://disk.yandex.ru/",
  },
  {
    id: "matrix-4-2",
    title: "Шахматка ЖК Матвеевский парк / Корпус 4.2",
    object: "ЖК Матвеевский парк",
    building: "Корпус 4.2",
    owner: "Иван Петров",
    url: "https://disk.yandex.ru/",
  },
  {
    id: "matrix-4-3",
    title: "Шахматка ЖК Матвеевский парк / Корпус 4.3",
    object: "ЖК Матвеевский парк",
    building: "Корпус 4.3",
    owner: "Иван Петров",
    url: "https://disk.yandex.ru/",
  },
];

function DocumentsPage() {
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MATRIX_DOCUMENTS_KEY));
      const savedItems = Array.isArray(saved) ? saved : [];
      return matrixDocumentLinks.map((item) => ({ ...item, ...(savedItems.find((savedItem) => savedItem.id === item.id) ?? {}) }));
    } catch {
      return matrixDocumentLinks;
    }
  });
  const updateLink = (id, url) => {
    const next = documents.map((item) => item.id === id ? { ...item, url } : item);
    setDocuments(next);
    localStorage.setItem(MATRIX_DOCUMENTS_KEY, JSON.stringify(next));
  };

  return (
    <section className="documents-page">
      <div className="documents-hero">
        <div>
          <span>Документы объекта</span>
          <h2>Шахматки на Яндекс.Диске</h2>
          <p>В MVP рабочие шахматки ведутся во внешних файлах. В системе оставлены быстрые ссылки по корпусам.</p>
        </div>
      </div>
      <div className="documents-grid">
        {documents.map((item) => (
          <article className="document-card" key={item.id}>
            <div className="document-icon">Г</div>
            <div className="document-card-body">
              <h3>{item.title}</h3>
              <dl>
                <div><dt>Объект</dt><dd>{item.object}</dd></div>
                <div><dt>Корпус</dt><dd>{item.building}</dd></div>
                <div><dt>Ответственный</dt><dd>{item.owner}</dd></div>
              </dl>
              <label className="document-url-field">Ссылка на шахматку<input type="url" value={item.url} onChange={(event) => updateLink(item.id, event.target.value)} placeholder="https://disk.yandex.ru/..." /></label>
              <a className="primary-button document-link" href={item.url || "https://disk.yandex.ru/"} target="_blank" rel="noreferrer">
                Открыть шахматку
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function canSeeProblemObject(problem, user) {
  if (["creator", "company_head"].includes(user.role)) return true;
  if (user.role === "construction_director") return true;
  if (user.role === "itr") return !problem.responsible || problem.responsible === "Не назначен" || problem.responsible === user.id || problem.responsible === user.name;
  return false;
}

function canSeeTask(task, user) {
  if (["creator", "company_head"].includes(user.role)) return true;
  if (user.role === "construction_director") return true;
  if (user.role === "itr") return !task.assignedTo || task.assignedTo === "Не назначен" || task.assignedTo === user.id || task.assignedTo === user.name;
  return false;
}

function custodyAge(floor, doorIndex) {
  return ((Number(floor.number) || 1) + doorIndex * 2) % 10 + 1;
}

function getCustodyActRows(objects, users) {
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  return objects.flatMap((object) =>
    object.buildings.flatMap((building) =>
      building.floors
        .filter((floor) => floor.type === "floor")
        .flatMap((floor) =>
          floor.doors.map((door, doorIndex) => {
            const mounted = ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus);
            const closed = ["передано по акту", "закрыто"].includes(door.storageAct);
            const days = mounted ? custodyAge(floor, doorIndex) : 0;
            return {
              id: `custody-${door.id}`,
              objectId: object.id,
              object: object.name,
              buildingId: building.id,
              building: building.name,
              floorId: floor.id,
              floor: floor.number,
              doorId: door.id,
              door: door.number,
              mounted,
              closed,
              days,
              mountedAt: mounted ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : "",
              responsible: userNames.get(door.assignedUserId ?? object.responsibleId) ?? door.assignedUserId ?? object.responsibleId ?? "Не назначен",
              responsibleId: door.assignedUserId ?? object.responsibleId ?? "",
              storageAct: door.storageAct,
              custodyActUrl: door.custodyActUrl ?? "",
              overdue: mounted && !closed && days > 3,
            };
          })
        )
    )
  );
}

function canSeeCustodyRow(row, user) {
  if (["creator", "company_head", "construction_director"].includes(user.role)) return true;
  if (user.role === "itr") return !row.responsibleId || row.responsibleId === user.id || row.responsible === user.name;
  return false;
}

function CustodyActsPage({ objects, user, users, onOpen, onUpdateAct }) {
  const [draftLinks, setDraftLinks] = useState({});
  const rows = getCustodyActRows(objects, users).filter((row) => canSeeCustodyRow(row, user));
  const mountedRows = rows.filter((row) => row.mounted);
  const closedRows = mountedRows.filter((row) => row.closed);
  const withoutAct = mountedRows.filter((row) => !row.closed);
  const overdueRows = withoutAct.filter((row) => row.overdue);
  const closeRate = mountedRows.length ? Math.round((closedRows.length / mountedRows.length) * 100) : 0;
  const stats = [
    ["Смонтировано дверей", mountedRows.length, "neutral"],
    ["Передано по акту", closedRows.length, "success"],
    ["Без акта", withoutAct.length, "warning"],
    ["Просрочено без акта", overdueRows.length, "danger"],
    ["Закрытие актов", `${closeRate}%`, "success"],
  ];
  const visibleRows = mountedRows.filter((row) => !row.closed || row.custodyActUrl);

  const saveLink = (row) => {
    const url = draftLinks[row.doorId] ?? row.custodyActUrl ?? "";
    onUpdateAct(row.doorId, { custodyActUrl: url, storageAct: url ? "акт подготовлен" : row.storageAct });
  };

  return (
    <section className="custody-page">
      <div className="custody-hero">
        <div>
          <span>Документы передачи</span>
          <h2>Контроль актов ОХ</h2>
          <p>Все смонтированные двери без закрытого акта ответственного хранения собраны в одном рабочем списке.</p>
        </div>
      </div>
      <div className="custody-stats">
        {stats.map(([label, value, tone]) => <div className={`custody-stat ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="custody-table-card">
        <table className="custody-table">
          <thead>
            <tr>
              <th>Объект</th>
              <th>Корпус</th>
              <th>Этаж</th>
              <th>Дверь / проём</th>
              <th>Дата монтажа</th>
              <th>Дней без акта</th>
              <th>Ответственный</th>
              <th>Статус акта</th>
              <th>Ссылка на акт</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const actUrl = draftLinks[row.doorId] ?? row.custodyActUrl ?? "";
              return (
                <tr className={row.closed ? "is-closed" : row.overdue ? "is-overdue" : "is-warning"} key={row.id}>
                  <td>{row.object}</td>
                  <td>{row.building}</td>
                  <td>{row.floor}</td>
                  <td>{row.door}</td>
                  <td>{row.mountedAt}</td>
                  <td>{row.closed ? 0 : row.days}</td>
                  <td>{row.responsible}</td>
                  <td><span className={`act-status ${row.closed ? "closed" : row.overdue ? "overdue" : "pending"}`}>{row.closed ? "Закрыто" : row.storageAct}</span></td>
                  <td><input type="url" value={actUrl} onChange={(event) => setDraftLinks((current) => ({ ...current, [row.doorId]: event.target.value }))} placeholder="https://disk.yandex.ru/..." /></td>
                  <td><div className="custody-actions"><button className="secondary-button slim" onClick={() => onOpen(row)}>Открыть дверь</button><button className="secondary-button slim" onClick={() => saveLink(row)}>Добавить ссылку</button><button className="primary-button slim" onClick={() => onUpdateAct(row.doorId, { custodyActUrl: actUrl, storageAct: "передано по акту" })}>Отметить акт закрытым</button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && <div className="empty-plan">Смонтированных дверей без актов нет.</div>}
      </div>
    </section>
  );
}

function getTnIssueRows(objects, users) {
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  return objects.flatMap((object) =>
    object.buildings.flatMap((building) =>
      building.floors
        .filter((floor) => floor.type === "floor")
        .flatMap((floor) =>
          floor.doors
            .filter((door) => door.issue === "есть замечание" || door.tnIssues === "Да")
            .map((door, index) => {
              const days = ((Number(floor.number) || 1) + index * 3) % 9 + 1;
              const resolved = door.issue === "устранено" || door.doorStatus === "принято технадзором";
              return {
                id: `tn-${door.id}`,
                objectId: object.id,
                object: object.name,
                buildingId: building.id,
                building: building.name,
                floorId: floor.id,
                floor: floor.number,
                doorId: door.id,
                door: door.number,
                mark: door.mark,
                status: resolved ? "устранено" : days > 3 ? "просрочено" : "новое",
                days,
                responsible: userNames.get(door.assignedUserId ?? object.responsibleId) ?? "Не назначен",
                comment: door.openingComment || door.comment || "Проверить замечание технадзора",
              };
            })
        )
    )
  );
}

function TnIssuesPage({ objects, user, users, onOpen }) {
  const rows = getTnIssueRows(objects, users).filter((row) => {
    if (["creator", "company_head", "construction_director"].includes(user.role)) return true;
    return row.responsible === user.name || row.responsible === "Не назначен";
  });
  const stats = [
    ["Всего замечаний", rows.length, "neutral"],
    ["Открытые", rows.filter((row) => row.status === "новое").length, "warning"],
    ["Просроченные", rows.filter((row) => row.status === "просрочено").length, "danger"],
    ["Устранённые", rows.filter((row) => row.status === "устранено").length, "success"],
    ["Принятые ТН", rows.filter((row) => row.status === "устранено").length, "success"],
  ];
  return (
    <section className="custody-page">
      <div className="custody-hero">
        <div>
          <span>Качество и технадзор</span>
          <h2>Замечания ТН</h2>
          <p>Короткий рабочий список замечаний технадзора по дверям, чтобы ИТР быстро видел, что нужно закрыть.</p>
        </div>
      </div>
      <div className="custody-stats">
        {stats.map(([label, value, tone]) => <div className={`custody-stat ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="custody-table-card">
        <table className="custody-table">
          <thead><tr><th>Объект</th><th>Корпус</th><th>Этаж</th><th>Дверь</th><th>Марка</th><th>Статус</th><th>Дней</th><th>Ответственный</th><th>Комментарий</th><th>Действие</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.status === "просрочено" ? "is-overdue" : row.status === "устранено" ? "is-closed" : "is-warning"}>
                <td>{row.object}</td><td>{row.building}</td><td>{row.floor}</td><td>{row.door}</td><td>{row.mark}</td><td><span className={`act-status ${row.status === "устранено" ? "closed" : row.status === "просрочено" ? "overdue" : "pending"}`}>{row.status}</span></td><td>{row.days}</td><td>{row.responsible}</td><td>{row.comment}</td><td><button className="secondary-button slim" onClick={() => onOpen(row)}>Открыть дверь</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty-plan">Открытых замечаний ТН нет.</div>}
      </div>
    </section>
  );
}

function taskStatusLabel(status) {
  return {
    new: "Новая",
    in_progress: "В работе",
    done: "Выполнено",
  }[status] ?? "Новая";
}

function isManualTaskOverdue(task) {
  return task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !["выполнена", "отменена"].includes(task.status);
}

function canSeeManualTask(task, user) {
  if (["creator", "company_head"].includes(user.role)) return true;
  if (user.role === "construction_director") return true;
  if (user.role === "itr") return task.assignedTo === user.id;
  return false;
}

function getManualTaskNoticeCount(tasks, user) {
  return tasks.filter((task) => canSeeManualTask(task, user) && (task.status === "новая" || isManualTaskOverdue(task))).length;
}

function getTaskContext(objects, task) {
  const object = objects.find((item) => item.id === task.objectId);
  const building = object?.buildings.find((item) => item.id === task.buildingId);
  const floor = building?.floors.find((item) => item.id === task.floorId);
  const door = floor?.doors.find((item) => item.id === task.doorId);
  return {
    objectName: object?.name ?? "—",
    buildingName: building?.name ?? "—",
    floorName: floor?.number ? `Этаж ${floor.number}` : "—",
    doorName: door?.number ?? door?.mark ?? "—",
  };
}

function ManualTasksPage({ tasks, objects, user, users, onOpen, onCreateTask, onUpdateTask, onAddComment, onAddLink }) {
  const isItr = user.role === "itr";
  const tabs = isItr
    ? ["Мои задачи", "Новые", "В работе", "Просроченные", "Выполненные"]
    : ["Все задачи", "Созданные мной", "Просроченные", "Выполненные"];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [commentTask, setCommentTask] = useState(null);
  const [linkTask, setLinkTask] = useState(null);
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const visibleTasks = tasks.filter((task) => canSeeManualTask(task, user));
  const filteredTasks = visibleTasks.filter((task) => {
    if (activeTab === "Созданные мной") return task.createdBy === user.id;
    if (activeTab === "Новые") return task.status === "новая";
    if (activeTab === "В работе") return task.status === "в работе";
    if (activeTab === "Просроченные") return isManualTaskOverdue(task);
    if (activeTab === "Выполненные") return task.status === "выполнена";
    return true;
  });
  const stats = {
    total: visibleTasks.length,
    new: visibleTasks.filter((task) => task.status === "новая").length,
    progress: visibleTasks.filter((task) => task.status === "в работе").length,
    overdue: visibleTasks.filter(isManualTaskOverdue).length,
    done: visibleTasks.filter((task) => task.status === "выполнена").length,
  };

  const openTaskTarget = (task) => {
    if (task.doorId || task.floorId || task.buildingId || task.objectId) {
      onOpen(task);
    }
  };

  return (
    <section className="manual-tasks-page">
      <div className="tasks-hero">
        <div>
          <span>Ручное управление</span>
          <h2>{isItr ? "Мои задачи" : "Задачи команды"}</h2>
          <p>Руководитель ставит задачи по объекту, корпусу, этажу или двери. ИТР закрывает их прямо в карточке задачи.</p>
        </div>
        {!isItr && <button className="primary-button" onClick={onCreateTask}>Поставить задачу</button>}
      </div>
      <div className="tasks-summary">
        <div><span>Всего задач</span><strong>{stats.total}</strong></div>
        <div><span>Новые</span><strong>{stats.new}</strong></div>
        <div><span>В работе</span><strong>{stats.progress}</strong></div>
        <div className="danger"><span>Просроченные</span><strong>{stats.overdue}</strong></div>
        <div className="success"><span>Выполненные</span><strong>{stats.done}</strong></div>
      </div>
      <div className="task-tabs">
        {tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </div>
      <div className={isItr ? "manual-task-card-grid itr-task-grid" : "manual-task-card-grid"}>
        {filteredTasks.map((task) => {
          const context = getTaskContext(objects, task);
          return (
            <article className={`manual-task-card priority-${task.priority} ${isManualTaskOverdue(task) ? "overdue" : ""}`} key={task.id}>
              <div className="manual-task-card-head">
                <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                <span className={`manual-task-status status-${task.status.replaceAll(" ", "-")}`}>{task.status}</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.description || "Без описания"}</p>
              <dl className="task-context-grid">
                <div><dt>Объект</dt><dd>{context.objectName}</dd></div>
                <div><dt>Корпус</dt><dd>{context.buildingName}</dd></div>
                <div><dt>Этаж</dt><dd>{context.floorName}</dd></div>
                <div><dt>Дверь</dt><dd>{context.doorName}</dd></div>
                <div><dt>Срок</dt><dd>{task.dueDate || "—"}</dd></div>
                <div><dt>Исполнитель</dt><dd>{userNames.get(task.assignedTo) ?? "—"}</dd></div>
              </dl>
              {task.comments?.[0] && <div className="task-last-comment"><strong>{task.comments[0].userName}</strong><span>{task.comments[0].text}</span></div>}
              {task.documentLinks?.length > 0 && <div className="task-links-list">{task.documentLinks.slice(0, 2).map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.title}</a>)}</div>}
              <div className="manual-task-actions">
                <button className="secondary-button slim" onClick={() => openTaskTarget(task)}>Открыть</button>
                {task.status !== "выполнена" && <button className="secondary-button slim" onClick={() => onUpdateTask(task.id, { status: "в работе" })}>В работу</button>}
                {task.status !== "выполнена" && <button className="primary-button slim" onClick={() => onUpdateTask(task.id, { status: "выполнена" })}>Выполнено</button>}
                <button className="secondary-button slim" onClick={() => setCommentTask(task)}>Комментарий</button>
                <button className="secondary-button slim" onClick={() => setLinkTask(task)}>Ссылка</button>
                {!isItr && task.status !== "отменена" && <button className="secondary-button slim" onClick={() => onUpdateTask(task.id, { status: "отменена" })}>Отменить</button>}
              </div>
            </article>
          );
        })}
      </div>
      {filteredTasks.length === 0 && <div className="empty-plan">Задач в этом режиме нет.</div>}
      {commentTask && <TaskCommentModal task={commentTask} onClose={() => setCommentTask(null)} onSave={(text) => { onAddComment(commentTask.id, text); setCommentTask(null); }} />}
      {linkTask && <TaskLinkModal task={linkTask} onClose={() => setLinkTask(null)} onSave={(link) => { onAddLink(linkTask, link); setLinkTask(null); }} />}
    </section>
  );
}

function TaskCreateModal({ context, objects, users, onClose, onCreate }) {
  const firstObject = objects.find((object) => object.id === context.objectId) ?? objects[0];
  const firstBuilding = firstObject?.buildings.find((building) => building.id === context.buildingId) ?? firstObject?.buildings[0];
  const firstFloor = firstBuilding?.floors.find((floor) => floor.id === context.floorId) ?? firstBuilding?.floors.find((floor) => floor.type === "floor");
  const firstDoor = firstFloor?.doors.find((door) => door.id === context.doorId) ?? firstFloor?.doors[0];
  const assignees = users.filter((item) => ["itr", "construction_director"].includes(item.role));
  const [form, setForm] = useState(() => ({
    title: context.title ?? "",
    description: context.description ?? "",
    type: context.type ?? "Другое",
    priority: context.priority ?? "средний",
    assignedTo: context.assignedTo ?? assignees.find((item) => item.role === "itr")?.id ?? assignees[0]?.id ?? "",
    objectId: firstObject?.id ?? "",
    buildingId: firstBuilding?.id ?? "",
    floorId: firstFloor?.id ?? "",
    doorId: firstDoor?.id ?? "",
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  }));
  const selectedObject = objects.find((object) => object.id === form.objectId) ?? objects[0];
  const selectedBuilding = selectedObject?.buildings.find((building) => building.id === form.buildingId) ?? selectedObject?.buildings[0];
  const selectedFloor = selectedBuilding?.floors.find((floor) => floor.id === form.floorId) ?? selectedBuilding?.floors.find((floor) => floor.type === "floor");
  const update = (field, value) => setForm((current) => {
    const next = { ...current, [field]: value };
    if (field === "objectId") {
      const nextObject = objects.find((object) => object.id === value);
      const nextBuilding = nextObject?.buildings[0];
      const nextFloor = nextBuilding?.floors.find((floor) => floor.type === "floor");
      return { ...next, buildingId: nextBuilding?.id ?? "", floorId: nextFloor?.id ?? "", doorId: nextFloor?.doors[0]?.id ?? "" };
    }
    if (field === "buildingId") {
      const nextBuilding = selectedObject?.buildings.find((building) => building.id === value);
      const nextFloor = nextBuilding?.floors.find((floor) => floor.type === "floor");
      return { ...next, floorId: nextFloor?.id ?? "", doorId: nextFloor?.doors[0]?.id ?? "" };
    }
    if (field === "floorId") {
      const nextFloor = selectedBuilding?.floors.find((floor) => floor.id === value);
      return { ...next, doorId: nextFloor?.doors[0]?.id ?? "" };
    }
    return next;
  });

  return (
    <div className="modal-backdrop">
      <form className="task-modal" onSubmit={(event) => { event.preventDefault(); if (!form.title.trim()) return; onCreate(form); }}>
        <div className="modal-title">
          <div><h2>Поставить задачу</h2><p>Быстрая постановка задачи по текущему контексту.</p></div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="task-form-grid">
          <label className="wide">Название задачи<input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Например: закрыть акт ОХ" /></label>
          <label className="wide">Описание<textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Что нужно сделать ИТР" /></label>
          <label>Исполнитель<select value={form.assignedTo} onChange={(event) => update("assignedTo", event.target.value)}>{assignees.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.position}</option>)}</select></label>
          <label>Тип<select value={form.type} onChange={(event) => update("type", event.target.value)}>{manualTaskTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Приоритет<select value={form.priority} onChange={(event) => update("priority", event.target.value)}>{manualTaskPriorities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Срок<input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} /></label>
          <label>Объект<select value={form.objectId} onChange={(event) => update("objectId", event.target.value)}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>
          <label>Корпус<select value={form.buildingId} onChange={(event) => update("buildingId", event.target.value)}>{selectedObject?.buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label>
          <label>Этаж<select value={form.floorId} onChange={(event) => update("floorId", event.target.value)}><option value="">Не выбран</option>{selectedBuilding?.floors.filter((floor) => floor.type === "floor").map((floor) => <option key={floor.id} value={floor.id}>Этаж {floor.number}</option>)}</select></label>
          <label>Дверь<select value={form.doorId} onChange={(event) => update("doorId", event.target.value)}><option value="">Не выбрана</option>{selectedFloor?.doors.map((door) => <option key={door.id} value={door.id}>{door.number} · {door.mark}</option>)}</select></label>
        </div>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button" type="submit">Поставить задачу</button></div>
      </form>
    </div>
  );
}

function TaskCommentModal({ task, onClose, onSave }) {
  const [text, setText] = useState("");
  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave(text); }}>
        <div className="modal-title"><div><h2>Комментарий</h2><p>{task.title}</p></div><button type="button" onClick={onClose}>×</button></div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Сделано, нет доступа, акт загрузил..." />
        <div className="quick-comments">{["Сделано", "Нет доступа", "Акт загрузил", "Ждём технадзор"].map((item) => <button type="button" key={item} onClick={() => setText(item)}>{item}</button>)}</div>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Добавить</button></div>
      </form>
    </div>
  );
}

function TaskLinkModal({ task, defaultCategory = "документ", onClose, onSave }) {
  const [form, setForm] = useState({ title: defaultCategory === "акт АОХ" ? "Акт АОХ" : "", url: "", category: defaultCategory, comment: "" });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="modal-backdrop">
      <form className="task-modal compact" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-title"><div><h2>Добавить ссылку</h2><p>{task.title}</p></div><button type="button" onClick={onClose}>×</button></div>
        <label>Название ссылки<input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Акт АОХ / фото / документ" /></label>
        <label>Ссылка на Яндекс.Диск<input type="url" value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://disk.yandex.ru/..." /></label>
        <label>Категория<select value={form.category} onChange={(event) => update("category", event.target.value)}>{taskLinkCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label>
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Отмена</button><button className="primary-button">Сохранить ссылку</button></div>
      </form>
    </div>
  );
}

function NotificationsPage({ notifications, onOpen, onMarkRead, onMarkAll, onQuickAct, onQuickTn }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const priorityWeight = { высокий: 0, средний: 1, низкий: 2 };
  const filtered = notifications
    .filter((item) => {
      const haystack = `${item.title} ${item.message}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      if (!matchesSearch) return false;
      if (filter === "unread") return item.status === "unread";
      if (filter === "overdue") return item.type.includes("просроч") || item.priority === "высокий";
      if (filter === "tasks") return item.taskId || item.type.includes("задач");
      if (filter === "acts") return item.type.includes("АОХ") || item.title.includes("АОХ") || item.message.includes("акт");
      if (filter === "tn") return item.type.includes("ТН") || item.title.includes("ТН");
      return true;
    })
    .sort((a, b) => (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2) || new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <section className="notifications-page">
      <div className="tasks-hero">
        <div>
          <span>Центр уведомлений</span>
          <h2>Уведомления</h2>
          <p>Автоматические просрочки, новые задачи, комментарии и быстрые действия по ТН и актам АОХ.</p>
        </div>
        <button className="secondary-button" onClick={onMarkAll}>Отметить все как прочитанные</button>
      </div>
      <div className="notification-filters">
        {[
          ["all", "Все"],
          ["unread", "Непрочитанные"],
          ["overdue", "Просроченные"],
          ["tasks", "Задачи"],
          ["acts", "Акты"],
          ["tn", "ТН"],
        ].map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по объекту / корпусу" />
      </div>
      <div className="notifications-grid">
        {filtered.map((item) => (
          <article className={`notification-card ${item.status} priority-${item.priority}`} key={item.id}>
            <div className="notification-card-head">
              <span className={`priority-badge priority-${item.priority}`}>{item.priority}</span>
              <small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small>
            </div>
            <h3>{item.title}</h3>
            <p>{item.message}</p>
            <div className="manual-task-actions">
              <button className="secondary-button slim" onClick={() => onOpen(item)}>Открыть</button>
              {item.status === "unread" && <button className="secondary-button slim" onClick={() => onMarkRead(item.id)}>Прочитано</button>}
              {(item.type.includes("АОХ") || item.title.includes("АОХ")) && item.doorId && <button className="primary-button slim" onClick={() => onQuickAct(item)}>Добавить акт</button>}
              {(item.type.includes("ТН") || item.title.includes("ТН")) && item.doorId && <button className="primary-button slim" onClick={() => onQuickTn(item)}>Передано ТН</button>}
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-plan">Уведомлений по выбранному фильтру нет.</div>}
    </section>
  );
}

function TodayTasksPage({ objects, user, users, onOpen }) {
  const [version, setVersion] = useState(0);
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const today = new Date().toISOString().slice(0, 10);
  const tasks = calculateTodayTasks(objects)
    .filter((task) => canSeeTask(task, user))
    .map((task) => ({ ...task, assignedToName: userNames.get(task.assignedTo) ?? task.assignedTo }));
  const urgentTasks = tasks.filter((task) => task.priority === "высокий" && task.status !== "done");
  const stats = {
    total: tasks.length,
    urgent: urgentTasks.length,
    today: tasks.filter((task) => task.dueDate <= today && task.status !== "done").length,
    overdue: tasks.filter((task) => task.dueDate < today && task.status !== "done").length,
    done: tasks.filter((task) => task.status === "done").length,
  };
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusWeight = { new: 0, in_progress: 1, done: 2 };
    const priorityWeight = { высокий: 0, средний: 1, низкий: 2 };
    return (statusWeight[a.status] ?? 0) - (statusWeight[b.status] ?? 0) || (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2);
  });
  const changeStatus = (taskId, status) => {
    updateTaskStatus(taskId, status);
    setVersion((value) => value + 1);
  };

  return (
    <section className="tasks-page" key={version}>
      <div className="tasks-hero">
        <div>
          <span>Ежедневный список</span>
          <h2>Задачи на сегодня</h2>
          <p>Задачи формируются автоматически из проблем, статусов дверей, актов и замечаний. Выполненные действия сохраняются локально.</p>
        </div>
      </div>
      <div className="tasks-summary">
        <div><span>Всего задач</span><strong>{stats.total}</strong></div>
        <div className="danger"><span>Срочные</span><strong>{stats.urgent}</strong></div>
        <div><span>На сегодня</span><strong>{stats.today}</strong></div>
        <div className="danger"><span>Просроченные</span><strong>{stats.overdue}</strong></div>
        <div className="success"><span>Выполненные</span><strong>{stats.done}</strong></div>
      </div>
      {urgentTasks.length > 0 && (
        <div className="urgent-task-strip">
          <strong>Срочные задачи</strong>
          <div>{urgentTasks.slice(0, 4).map((task) => <button key={task.id} onClick={() => onOpen(task)}>{task.title}<span>{task.object}</span></button>)}</div>
        </div>
      )}
      <div className="tasks-table-card">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Приоритет</th>
              <th>Задача</th>
              <th>Объект</th>
              <th>Корпус</th>
              <th>Этаж</th>
              <th>Дверь</th>
              <th>Срок</th>
              <th>Статус</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr className={task.status === "done" ? "is-done" : ""} key={task.id}>
                <td><span className={`priority-badge priority-${task.priority}`}>{task.priority}</span></td>
                <td><strong>{task.title}</strong><small>{task.description}</small></td>
                <td>{task.object}</td>
                <td>{task.building}</td>
                <td>{task.floor}</td>
                <td>{task.door}</td>
                <td>{task.dueDate}</td>
                <td><span className={`task-status status-${task.status}`}>{taskStatusLabel(task.status)}</span></td>
                <td><div className="task-actions"><button className="secondary-button slim" onClick={() => onOpen(task)}>Открыть</button><button className="secondary-button slim" disabled={task.status === "done"} onClick={() => changeStatus(task.id, "in_progress")}>В работу</button><button className="primary-button slim" disabled={task.status === "done"} onClick={() => changeStatus(task.id, "done")}>Выполнено</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedTasks.length === 0 && <div className="empty-plan">На сегодня задач нет.</div>}
      </div>
    </section>
  );
}

function ProblemCenterPage({ objects, user, users, onOpen, onCreateTask }) {
  const userNames = new Map(users.map((item) => [item.id, item.name]));
  const problems = getProblems(objects)
    .filter((problem) => canSeeProblemObject(problem, user))
    .map((problem) => ({
      ...problem,
      responsible: userNames.get(problem.responsible) ?? problem.responsible,
    }));
  const stats = getProblemStats(problems);
  const summary = [
    ["Всего проблем", stats.total, "critical"],
    ["Просрочено", stats.overdue, "critical"],
    ["Замечания ТН", stats.tnIssues, "critical"],
    ["Без акта ОХ", stats.noCustodyAct, "warning"],
    ["Проёмы под риск", stats.riskyOpenings, "warning"],
  ];
  const typeCards = [
    "Просроченные двери",
    "Смонтировано без акта ОХ",
    "Замечания ТН",
    "Проёмы под риск",
    "Нет ответственного",
    "Нет документов",
    "Зависшие статусы",
  ];

  return (
    <section className="problem-center">
      <div className="problem-hero">
        <div>
          <span>Контроль рисков</span>
          <h2>Центр проблем</h2>
          <p>Система подсвечивает зоны, где монтаж дверей может зависнуть: статусы, акты, замечания, документы и ответственные.</p>
        </div>
      </div>
      <div className="problem-summary">
        {summary.map(([label, value, tone]) => (
          <div className={`problem-summary-card ${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="problem-type-grid">
        {typeCards.map((type) => {
          const count = problems.filter((problem) => problem.type === type).length;
          return <div className="problem-type-card" key={type}><span>{type}</span><strong>{count}</strong></div>;
        })}
      </div>
      <div className="problem-table-card">
        <table className="problem-table">
          <thead>
            <tr>
              <th>Тип проблемы</th>
              <th>Объект</th>
              <th>Корпус</th>
              <th>Этаж</th>
              <th>Дверь / проём</th>
              <th>Ответственный</th>
              <th>Дней</th>
              <th>Приоритет</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => (
              <tr key={problem.id}>
                <td><strong>{problem.type}</strong></td>
                <td>{problem.object}</td>
                <td>{problem.building}</td>
                <td>{problem.floor}</td>
                <td>{problem.door}</td>
                <td>{problem.responsible || "Не назначен"}</td>
                <td>{problem.days}</td>
                <td><span className={`priority-badge priority-${problem.priority}`}>{problem.priority}</span></td>
                <td>
                  <div className="task-actions">
                    <button className="secondary-button slim" onClick={() => onOpen(problem)}>Открыть</button>
                    {["creator", "company_head", "construction_director"].includes(user.role) && (
                      <button
                        className="primary-button slim"
                        onClick={() => onCreateTask({
                          title: problem.action,
                          description: `${problem.type}: ${problem.object} / ${problem.building} / ${problem.door}`,
                          type: problem.type === "Смонтировано без акта ОХ" ? "Добавить акт АОХ" : problem.type === "Замечания ТН" ? "Проверить замечание ТН" : "Другое",
                          priority: problem.priority,
                          objectId: problem.objectId,
                          buildingId: problem.buildingId,
                          floorId: problem.floorId,
                          doorId: problem.doorId,
                        })}
                      >
                        Задача
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {problems.length === 0 && <div className="empty-plan">Проблем по доступным объектам нет.</div>}
      </div>
    </section>
  );
}

function PlaceholderPage({ screen }) {
  const content = {
    companies: ["Компании", "Управление компаниями и их доступами появится на следующем этапе."],
    users: ["Пользователи", "Здесь будет создание пользователей, назначения и управление доступом."],
    roles: ["Роли и доступы", "Матрица прав и детальные разрешения будут добавлены позже."],
    itr_team: ["Команда ИТР", "Назначение ИТР на объекты и контроль активности появятся в следующей версии."],
  };
  const [title, text] = content[screen] ?? ["Раздел", "Раздел находится в разработке."];
  return <section className="placeholder-page"><div className="placeholder-mark">Г</div><div><span>Следующий этап MVP</span><h2>{title}</h2><p>{text}</p></div></section>;
}

const matrixColumns = [
  ["floor", "Этаж"], ["openingNumber", "№ проёма"], ["mark", "Марка двери"], ["actualHeight", "Высота факт"], ["actualWidth", "Ширина факт"],
  ["date", "Дата", "date"], ["model", "Модель"], ["arOpening", "Проём АР"],
  ["note", "Примечание"], ["ordered", "Заказ", "status"],
  ["arrived", "Приход", "status"], ["lifted", "Подъём", "status"], ["distributed", "Разнос", "status"], ["installed", "Монтаж", "status"],
  ["installationTeam", "Бригада монтажа"], ["custodyAct", "Акт ОХ", "status"], ["keys", "Ключи", "status"],
  ["acceptedTN", "Принято ТН", "status"], ["tnIssues", "Замечания ТН", "status"], ["ptoDate", "Дата для ПТО", "date"],
];

const mandatoryMatrixColumns = ["floor", "openingNumber", "mark", "actualHeight", "actualWidth"];
const MATRIX_COLUMNS_KEY = "gross-lean-montage.matrix-columns.v1";
const MATRIX_COMPACT_KEY = "gross-lean-montage.matrix-compact.v1";

const itrEditableFields = ["arrived", "lifted", "distributed", "installed", "custodyAct", "keys", "tnIssues"];

function matrixMetrics(rows) {
  const yes = (field) => rows.filter((row) => row[field] === "Да").length;
  const installed = yes("installed");
  return {
    total: rows.length,
    ordered: yes("ordered"), arrived: yes("arrived"), lifted: yes("lifted"), distributed: yes("distributed"), installed,
    custodyAct: yes("custodyAct"), keys: yes("keys"), acceptedTN: yes("acceptedTN"), tnIssues: yes("tnIssues"),
    readiness: rows.length ? Math.round((installed / rows.length) * 100) : 0,
  };
}

function MatrixStats({ rows }) {
  const metrics = matrixMetrics(rows);
  const items = [["Всего дверей", metrics.total], ["Заказано", metrics.ordered], ["Пришло", metrics.arrived], ["Поднято", metrics.lifted], ["Разнесено", metrics.distributed], ["Смонтировано", metrics.installed], ["Акт ОХ", metrics.custodyAct], ["Ключи", metrics.keys], ["Принято ТН", metrics.acceptedTN], ["Замечаний ТН", metrics.tnIssues], ["Готовность", `${metrics.readiness}%`]];
  return <div className="matrix-stats">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function DoorMatrixPage({ objects, rows, role, onChange, onRowsChange }) {
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [filters, setFilters] = useState({ floor: "", installed: "", custodyAct: "", acceptedTN: "", tnIssues: "" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [compact, setCompact] = useState(() => localStorage.getItem(MATRIX_COMPACT_KEY) !== "false");
  const [activeCell, setActiveCell] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [collapsedFloors, setCollapsedFloors] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MATRIX_COLUMNS_KEY)) ?? matrixColumns.map(([field]) => field); }
    catch { return matrixColumns.map(([field]) => field); }
  });
  const objectChoices = objects.map((object) => ({ id: object.id, name: object.name }));
  const buildingChoices = (objects.find((object) => object.id === selectedObjectId)?.buildings ?? []).map((building) => ({ id: building.id, name: building.name }));
  const scopedRows = rows.filter((row) => row.objectId === selectedObjectId && row.buildingId === selectedBuildingId);
  const options = (field) => [...new Set(scopedRows.map((row) => String(row[field])).filter(Boolean))];
  const filtered = scopedRows.filter((row) => Object.entries(filters).every(([field, value]) => !value || String(row[field]) === value));
  const canEdit = (field) => ["creator", "company_head", "construction_director"].includes(role) || (role === "itr" && itrEditableFields.includes(field));
  const canManageRows = ["creator", "company_head", "construction_director"].includes(role);
  const shownColumns = matrixColumns.filter(([field]) => mandatoryMatrixColumns.includes(field) || visibleColumns.includes(field));
  const cellPosition = (cell) => cell ? { row: filtered.findIndex((item) => item.id === cell.rowId), column: shownColumns.findIndex(([field]) => field === cell.field) } : null;
  const selectionBounds = (() => {
    const start = cellPosition(rangeStart ?? activeCell);
    const end = cellPosition(activeCell);
    if (!start || !end || start.row < 0 || end.row < 0 || start.column < 0 || end.column < 0) return null;
    return { rowFrom: Math.min(start.row, end.row), rowTo: Math.max(start.row, end.row), columnFrom: Math.min(start.column, end.column), columnTo: Math.max(start.column, end.column) };
  })();
  const isSelectedCell = (rowIndex, columnIndex) => selectionBounds && rowIndex >= selectionBounds.rowFrom && rowIndex <= selectionBounds.rowTo && columnIndex >= selectionBounds.columnFrom && columnIndex <= selectionBounds.columnTo;
  const selectionText = () => {
    if (!selectionBounds) return "";
    return filtered.slice(selectionBounds.rowFrom, selectionBounds.rowTo + 1).map((row) => shownColumns.slice(selectionBounds.columnFrom, selectionBounds.columnTo + 1).map(([field]) => row[field] ?? "").join("\t")).join("\n");
  };
  const pasteGrid = (text) => {
    if (!activeCell || !text) return;
    const start = cellPosition(activeCell);
    if (!start || start.row < 0 || start.column < 0) return;
    const grid = text.replace(/\r/g, "").split("\n").filter((line, index, list) => line.length > 0 || index < list.length - 1).map((line) => line.split("\t"));
    const updates = new Map();
    grid.forEach((values, rowOffset) => values.forEach((value, columnOffset) => {
      const targetRow = filtered[start.row + rowOffset];
      const column = shownColumns[start.column + columnOffset];
      if (targetRow && column && canEdit(column[0])) updates.set(`${targetRow.id}:${column[0]}`, value);
    }));
    onRowsChange(rows.map((row) => {
      const values = {};
      shownColumns.forEach(([field]) => { const key = `${row.id}:${field}`; if (updates.has(key)) values[field] = updates.get(key); });
      return { ...row, ...values };
    }));
  };
  const fillDown = () => {
    if (!activeCell || !canEdit(activeCell.field)) return;
    const start = filtered.findIndex((row) => row.id === activeCell.rowId);
    const source = filtered[start]?.[activeCell.field];
    if (start < 0) return;
    const targets = new Set(filtered.slice(start + 1).map((row) => row.id));
    onRowsChange(rows.map((row) => targets.has(row.id) ? { ...row, [activeCell.field]: source } : row));
  };
  const duplicateRows = () => {
    if (!canManageRows) return;
    const selected = rows.filter((row) => selectedRows.includes(row.id));
    if (!selected.length) return;
    onRowsChange([...rows, ...selected.map((row, index) => ({ ...row, id: `matrix-copy-${Date.now()}-${index}`, doorId: `${row.doorId}-copy-${Date.now()}-${index}`, hidden: false }))]);
  };
  const deleteRows = () => {
    if (!canManageRows) return;
    if (!selectedRows.length) return;
    onRowsChange(rows.filter((row) => !selectedRows.includes(row.id)));
    setSelectedRows([]);
  };
  const copyRows = () => {
    const selected = rows.filter((row) => selectedRows.includes(row.id));
    if (!selected.length) return;
    navigator.clipboard?.writeText(selected.map((row) => matrixColumns.map(([field]) => row[field] ?? "").join("\t")).join("\n"));
  };
  const pasteRows = async () => {
    if (!canManageRows) return;
    const text = await navigator.clipboard?.readText?.();
    if (!text) return;
    const next = text.replace(/\r/g, "").split("\n").filter(Boolean).map((line, rowIndex) => {
      const values = line.split("\t");
      const row = { id: `matrix-paste-${Date.now()}-${rowIndex}`, doorId: `door-paste-${Date.now()}-${rowIndex}`, hidden: false };
      matrixColumns.forEach(([field], columnIndex) => { row[field] = values[columnIndex] ?? ""; });
      return row;
    });
    onRowsChange([...rows, ...next]);
  };
  const toggleColumn = (field) => {
    const next = visibleColumns.includes(field) ? visibleColumns.filter((item) => item !== field) : [...visibleColumns, field];
    setVisibleColumns(next);
    localStorage.setItem(MATRIX_COLUMNS_KEY, JSON.stringify(next));
  };
  const floorGroups = Object.entries(filtered.reduce((groups, row) => { const key = `${row.object}|${row.building}|${row.floor}`; groups[key] = [...(groups[key] ?? []), row]; return groups; }, {}));
  const selectedObject = objectChoices.find((item) => item.id === selectedObjectId);
  const selectedBuilding = buildingChoices.find((item) => item.id === selectedBuildingId);
  if (!selectedObjectId) {
    return <section className="matrix-selection"><div className="matrix-selection-heading"><h2>Выберите объект</h2><p>Шахматки хранятся отдельно для каждого корпуса.</p></div><div className="matrix-selection-grid">{objectChoices.map((object) => <button key={object.id} onClick={() => { setSelectedObjectId(object.id); setSelectedBuildingId(""); }}><span>Объект</span><strong>{object.name}</strong><small>{rows.filter((row) => row.objectId === object.id).length} дверей</small></button>)}</div></section>;
  }
  if (!selectedBuildingId) {
    return <section className="matrix-selection"><div className="matrix-selection-heading"><button className="matrix-back" onClick={() => setSelectedObjectId("")}>← К объектам</button><h2>Выберите корпус</h2><p>{selectedObject?.name}</p></div><div className="matrix-selection-grid">{buildingChoices.map((building) => <button key={building.id} onClick={() => setSelectedBuildingId(building.id)}><span>Корпус</span><strong>{building.name}</strong><small>{rows.filter((row) => row.buildingId === building.id).length} дверей</small></button>)}</div></section>;
  }
  return <section tabIndex="0" onCopy={(event) => { const text = selectionText(); if (text) { event.preventDefault(); event.clipboardData.setData("text/plain", text); } }} onPaste={(event) => { if (activeCell) { event.preventDefault(); pasteGrid(event.clipboardData.getData("text/plain")); } }} className={`matrix-page ${fullscreen ? "matrix-fullscreen" : ""} ${compact ? "is-compact" : ""}`}>
    <div className="matrix-context"><div><button onClick={() => setSelectedBuildingId("")}>← К корпусам</button><span>Шахматка / {selectedObject?.name} / {selectedBuilding?.name}</span></div></div>
    {!fullscreen && <MatrixStats rows={filtered} />}
    <div className="matrix-toolbar"><div className="matrix-filters">{[["floor", "Этаж"], ["installed", "Монтаж"], ["custodyAct", "Акт ОХ"], ["acceptedTN", "Принято ТН"], ["tnIssues", "Замечания ТН"]].map(([field, label]) => <label key={field}>{label}<select value={filters[field]} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })}><option value="">Все</option>{options(field).map((value) => <option key={value}>{value}</option>)}</select></label>)}</div><div className="matrix-actions"><button className="secondary-button" disabled={!activeCell || !canEdit(activeCell?.field)} onClick={fillDown}>Протянуть вниз</button><button className="secondary-button" disabled={!selectedRows.length} onClick={copyRows}>Копировать строку</button><button className="secondary-button" disabled={!canManageRows} onClick={pasteRows}>Вставить строки</button><button className="secondary-button" disabled={!canManageRows || !selectedRows.length} onClick={duplicateRows}>Дублировать</button><button className="secondary-button danger" disabled={!canManageRows || !selectedRows.length} onClick={deleteRows}>Удалить</button><button className="secondary-button" onClick={() => setSettingsOpen((value) => !value)}>Настроить столбцы</button><button className="primary-button" onClick={() => setFullscreen((value) => !value)}>{fullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}</button></div></div>
    {settingsOpen && <div className="column-settings"><div className="column-settings-header"><strong>Настройка столбцов</strong><button onClick={() => { const all = matrixColumns.map(([field]) => field); setVisibleColumns(all); localStorage.setItem(MATRIX_COLUMNS_KEY, JSON.stringify(all)); }}>Сбросить столбцы</button></div><div>{matrixColumns.filter(([field]) => !mandatoryMatrixColumns.includes(field)).map(([field, label]) => <label key={field}><input type="checkbox" checked={visibleColumns.includes(field)} onChange={() => toggleColumn(field)} />{label}</label>)}</div><div className="column-settings-options"><label><input type="checkbox" checked={compact} onChange={(event) => { setCompact(event.target.checked); localStorage.setItem(MATRIX_COMPACT_KEY, String(event.target.checked)); }} />Компактный режим</label></div></div>}
    <div className="matrix-table-card"><table className="matrix-table"><thead><tr><th className="matrix-select-column"><input type="checkbox" checked={filtered.length > 0 && filtered.every((row) => selectedRows.includes(row.id))} onChange={(event) => setSelectedRows(event.target.checked ? filtered.map((row) => row.id) : [])} /></th>{shownColumns.map(([field, label]) => <th className={`matrix-col-${field}`} key={field}>{label}</th>)}<th className="matrix-actions-column">Действия</th></tr></thead><tbody>{floorGroups.map(([groupKey, groupRows]) => { const metrics = matrixMetrics(groupRows); const collapsed = collapsedFloors.includes(groupKey); return <React.Fragment key={groupKey}><tr className="floor-divider"><td colSpan={shownColumns.length + 2}><button onClick={() => setCollapsedFloors((current) => current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey])}>{collapsed ? "▸" : "▾"} {groupRows[0].floor} этаж</button><span>{groupRows[0].building}</span><span>Всего: {metrics.total}</span><span>Смонтировано: {metrics.installed}</span><span>Замечаний: {metrics.tnIssues}</span><strong>{metrics.readiness}%</strong></td></tr>{!collapsed && groupRows.map((row) => { const rowIndex = filtered.findIndex((item) => item.id === row.id); return <tr key={row.id}><td className="matrix-select-column"><input type="checkbox" checked={selectedRows.includes(row.id)} onChange={(event) => setSelectedRows((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></td>{shownColumns.map(([field, , type], columnIndex) => <td onMouseDown={(event) => { if (event.shiftKey && activeCell) setRangeStart(rangeStart ?? activeCell); else setRangeStart({ rowId: row.id, field }); setActiveCell({ rowId: row.id, field }); }} className={`matrix-col-${field} ${isSelectedCell(rowIndex, columnIndex) ? "is-selected" : ""} ${activeCell?.rowId === row.id && activeCell?.field === field ? "is-active" : ""}`} key={field}>{type === "status" ? <select disabled={!canEdit(field)} value={row[field] ?? "Нет"} onChange={(event) => onChange(row.id, field, event.target.value)}><option>Да</option><option>Нет</option><option>Не требуется</option></select> : <input disabled={!canEdit(field)} type={type === "date" ? "date" : "text"} value={row[field] ?? ""} onChange={(event) => onChange(row.id, field, event.target.value)} />}</td>)}<td className="matrix-actions-column"><button onClick={() => navigator.clipboard?.writeText(matrixColumns.map(([field]) => row[field] ?? "").join("\t"))}>Копировать</button></td></tr>; })}</React.Fragment>; })}</tbody></table>{filtered.length === 0 && <div className="empty-plan">По выбранным фильтрам дверей нет.</div>}</div>
  </section>;
}

function reportRowsFromObjects(objects) {
  return objects.flatMap((object) =>
    object.buildings.flatMap((building) =>
      building.floors
        .filter((floor) => floor.type === "floor")
        .flatMap((floor) =>
          floor.doors.map((door) => ({
            objectId: object.id,
            object: object.name,
            buildingId: building.id,
            building: building.name,
            floor: floor.number,
            mounted: ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus),
            accepted: door.doorStatus === "принято технадзором",
            custody: door.storageAct === "передано по акту",
            issue: door.issue === "есть замечание",
          }))
        )
    )
  );
}

function reportMetrics(rows) {
  const mounted = rows.filter((row) => row.mounted).length;
  return {
    total: rows.length,
    mounted,
    accepted: rows.filter((row) => row.accepted).length,
    custody: rows.filter((row) => row.custody).length,
    issues: rows.filter((row) => row.issue).length,
    readiness: rows.length ? Math.round((mounted / rows.length) * 100) : 0,
  };
}

function ReportsPage({ objects }) {
  const [groupBy, setGroupBy] = useState("object");
  const [objectId, setObjectId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const rows = reportRowsFromObjects(objects);
  const objectOptions = objects.map((object) => [object.id, object.name]);
  const buildingOptions = objects
    .filter((object) => !objectId || object.id === objectId)
    .flatMap((object) => object.buildings.map((building) => [building.id, building.name]));
  const scopedRows = rows.filter((row) => (!objectId || row.objectId === objectId) && (!buildingId || row.buildingId === buildingId));
  const metrics = reportMetrics(scopedRows);
  const grouped = Object.entries(scopedRows.reduce((result, row) => {
    const key = String(row[groupBy]);
    result[key] = [...(result[key] ?? []), row];
    return result;
  }, {}));

  return (
    <section className="reports-page">
      <div className="report-toolbar">
        <div>
          <h2>Отчёты по монтажу</h2>
          <p>Показатели рассчитываются по текущим статусам дверей в объекте, без внутренней таблицы шахматки.</p>
        </div>
        <div className="report-scope">
          <label>Объект<select value={objectId} onChange={(event) => { setObjectId(event.target.value); setBuildingId(""); }}><option value="">Все объекты</option>{objectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Корпус<select value={buildingId} onChange={(event) => setBuildingId(event.target.value)}><option value="">Все корпуса</option>{buildingOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Группировка<select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}><option value="object">По объекту</option><option value="building">По корпусу</option><option value="floor">По этажу</option></select></label>
        </div>
      </div>
      <div className="matrix-stats">
        <div><span>Всего дверей</span><strong>{metrics.total}</strong></div>
        <div><span>Смонтировано</span><strong>{metrics.mounted}</strong></div>
        <div><span>Передано по актам</span><strong>{metrics.custody}</strong></div>
        <div><span>Принято ТН</span><strong>{metrics.accepted}</strong></div>
        <div><span>Замечаний</span><strong>{metrics.issues}</strong></div>
        <div><span>Готовность</span><strong>{metrics.readiness}%</strong></div>
      </div>
      <div className="report-groups">
        {grouped.map(([name, groupRows]) => {
          const groupMetrics = reportMetrics(groupRows);
          return <div className="report-group" key={name}><div><strong>{name}</strong><span>{groupMetrics.total} дверей</span></div><div className="progress-bar"><span style={{ width: `${groupMetrics.readiness}%` }} /></div><b>{groupMetrics.readiness}%</b><span>Смонтировано: {groupMetrics.mounted}</span><span>Замечаний: {groupMetrics.issues}</span></div>;
        })}
      </div>
    </section>
  );
}

function StatusBadge({ value }) {
  const tone = statusMeta[value]?.tone ?? "blue";
  return <span className={`status-badge status-${tone}`}>{value}</span>;
}

function Metric({ label, value, tone = "neutral" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export {
  AdminPanel,
  BrigadePlanPage,
  BuildingVisualization,
  CompanyDashboard,
  CustodyActsPage,
  DocumentsPage,
  DoorDetails,
  FloorPlan,
  LoginPage,
  ManpowerPage,
  ManualTasksPage,
  NotificationsPage,
  ObjectsPage,
  ProblemCenterPage,
  ProfilePage,
  ReportsPage,
  UsersPage,
  mockUsers,
};

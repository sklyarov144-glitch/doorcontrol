import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  cancelManpowerRequest,
  getManpowerRequests,
  getManpowerStats,
  getManpowerSummaryByDate,
  getDailyItrManpowerTask,
  getWeeklyManpowerPlan,
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
  getTasks,
  getTeamEfficiency,
  getTeamRating,
  getItrRating,
  getTeams,
  getWorkStandards,
  generateDailyAutoReport,
  markAllNotificationsRead,
  markNotificationRead,
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
  updateWorkStandard,
  disableWorkStandard,
} from "../storage";
import { dataProvider, dataProviderName } from "../../services/dataProvider";
import { fileService } from "../../services/files";
import { storageLocationFromUri } from "../../services/files/filePolicy";
import { persistUploadedFile } from "../../services/files/uploadLifecycle";
import { setMonitoringUser } from "../../services/monitoring";
import FinancePage from "../pages/FinancePage";
import DocumentsPage from "../pages/DocumentsPage";
import RemoteDocumentsPage from "../pages/RemoteDocumentsPage";
import RemoteExecutiveDashboard from "../pages/RemoteExecutiveDashboard";
import CompanyDashboard from "../pages/DashboardPage";
import RemoteTnIssuesPage from "../pages/RemoteTnIssuesPage";
import RemoteProblemCenterPage from "../pages/RemoteProblemCenterPage";
import RemoteCustodyActsPage from "../pages/RemoteCustodyActsPage";
import { RemoteBrigadePlanPage, RemoteManpowerPage } from "../pages/RemoteWorkforcePage";
import AuditLogPage from "../pages/AuditLogPage";
import { AuthProvider } from "../contexts/AuthContext";
import { Detail, Metric, StatusBadge } from "../components/UiPrimitives";
import AuthenticatedAppShell from "../components/AuthenticatedAppShell";
import LoginPage, { PasswordRecoveryPage } from "../pages/LoginPage";
import ObjectsPage from "../pages/ObjectsPage";
import StandaloneObjectPage from "../pages/ObjectPage";
import UsersPage from "../pages/UsersPage";
import RolesPage from "../pages/RolesPage";
import CompanyPage from "../pages/CompanyPage";
import ProfilePage from "../pages/ProfilePage";
import StandaloneManpowerPage from "../pages/ManpowerPage";
import StandaloneBrigadePlanPage from "../pages/BrigadePlanPage";
import StandaloneCustodyActsPage from "../pages/CustodyActsPage";
import StandaloneProblemCenterPage from "../pages/ProblemCenterPage";
import StandaloneTnIssuesPage from "../pages/TnIssuesPage";
import MfaPage from "../pages/MfaPage";
import AdminPanel from "../pages/AdminPage";
import ManualTasksPage, { TaskLinkModal } from "../pages/TasksPage";
import TodayTasksPage from "../pages/TodayTasksPage";
import ReportsPage from "../pages/ReportsPage";
import NotificationsPage from "../pages/NotificationsPage";
import BuildingVisualization from "../pages/BuildingPage";
import FloorPlan from "../pages/FloorPage";
import DoorDetails from "../pages/DoorPage";
import { permissionsFor } from "../domain/permissions";
import { normalizeUser } from "../domain/users";
import { isPrivilegedMfaRole, requiresMfa } from "../domain/mfa";
import { applyDoorWorkflow } from "../domain/doorWorkflow";
import { getManualTaskNoticeCount } from "../domain/tasks";
import { visibleObjectsForUser as getVisibleObjectsForUser } from "../domain/objectAccess";
import { buildAppPath, parseAppRoute } from "./routes";
import AppRoutePages from "./AppRoutePages";
import "../styles.css";

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
  if (dataProviderName === "supabase") return [];
  try {
    const saved = dataProvider.objects.getAll();
    return saved.length ? mergeInitialObjects(saved) : createInitialObjects();
  } catch {
    return createInitialObjects();
  }
}

function saveObjects(objects) {
  if (dataProviderName === "supabase") {
    return dataProvider.objects.upsertTree(objects).catch((error) => {
      console.error("Unable to persist object tree", error);
      throw error;
    });
  }
  return dataProvider.objects.replaceAll(objects);
}

const retiredDemoUserIds = new Set([
  "itr-2",
  "user-garanin-sergey",
  "user-tkachenko-artemy",
  "user-meshkov-alexander",
  "user-kostenko-sergey",
  "user-popov-sergey",
  "user-eremin-alexander",
  "user-kuznetsov-alexander",
  "user-sapozhnikov-alexander",
  "user-tishin-ivan",
  "user-sklyarov-ivan",
  "user-yampolsky-dmitry",
  "user-razmakhin-gennady",
  "user-sharaev-vladimir",
  "user-zhidkov-nikita",
  "user-fattykhov-renat",
]);

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

function loadUsers(demoUsers) {
  if (dataProviderName === "supabase") return [];
  try {
    const saved = dataProvider.users.getAll();
    const activateUser = (user) => normalizeUser({ ...user, status: "active" });
    const savedById = new Map(saved.map((user) => [user.id, activateUser(user)]));
    const merged = demoUsers.map((user) => activateUser({ ...(savedById.get(user.id) ?? {}), ...user }));
    const mockIds = new Set(demoUsers.map((user) => user.id));
    return [
      ...merged,
      ...saved.map(activateUser).filter((user) => !mockIds.has(user.id) && !retiredDemoUserIds.has(user.id)),
    ];
  } catch {
    return demoUsers.map((user) => normalizeUser({ ...user, status: "active" }));
  }
}

function saveUsers(users) {
  if (dataProviderName === "supabase") return users;
  dataProvider.users.replaceAll(users.map((user) => normalizeUser({ ...user, status: "active" })));
  return users;
}

export function App({ demoUsers = [], demoPassword = "" }) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const routeSyncing = React.useRef(false);
  const initialRoute = parseAppRoute(location.pathname);
  const isRemoteAuth = dataProviderName === "supabase";
  const isPasswordRecovery = isRemoteAuth && location.pathname === "/reset-password";
  const [objects, setObjects] = useState(() => isRemoteAuth ? [] : loadObjects());
  const localSession = isRemoteAuth ? null : dataProvider.auth.getSession();
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localSession?.userId));
  const [authLoading, setAuthLoading] = useState(isRemoteAuth);
  const [domainLoading, setDomainLoading] = useState(isRemoteAuth);
  const [domainError, setDomainError] = useState("");
  const [domainReload, setDomainReload] = useState(0);
  const [persistenceError, setPersistenceError] = useState("");
  const [users, setUsers] = useState(() => isRemoteAuth ? [] : loadUsers(demoUsers));
  const [currentUserId, setCurrentUserId] = useState(() => localSession?.userId || (isRemoteAuth ? "" : "creator-1"));
  const [mfaFlow, setMfaFlow] = useState(null);
  const user = users.find((item) => item.id === currentUserId) ?? users[0] ?? { id: "", name: "", role: "itr", assignedObjectIds: [], assignedBuildingIds: [] };
  const [screen, setScreen] = useState(initialRoute.screen === "login" ? "objects" : initialRoute.screen);
  const [selectedObjectId, setSelectedObjectId] = useState(initialRoute.objectId ?? objects[0]?.id ?? "");
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    initialRoute.buildingId ?? objects.find((object) => object.id === initialRoute.objectId)?.buildings[0]?.id ?? objects[0]?.buildings[0]?.id ?? ""
  );
  const [selectedFloorId, setSelectedFloorId] = useState(initialRoute.floorId ?? "");
  const [selectedDoorId, setSelectedDoorId] = useState(initialRoute.doorId ?? "");
  const [taskVersion, setTaskVersion] = useState(0);
  const [remoteTasks, setRemoteTasks] = useState([]);
  const [taskContext, setTaskContext] = useState(null);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [remoteTeams, setRemoteTeams] = useState([]);
  const [actNotificationTask, setActNotificationTask] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const visibleObjects = useMemo(() => getVisibleObjectsForUser(user, objects), [user, objects]);

  const finalizeRemoteAuthentication = React.useCallback((profile) => {
    setUsers((current) => [profile, ...current.filter((item) => item.id !== profile.id)]);
    setCurrentUserId(profile.id);
    setMfaFlow(null);
    setIsLoggedIn(true);
  }, []);

  const admitRemoteProfile = React.useCallback(async (profile) => {
    if (isPrivilegedMfaRole(profile.role)) {
      const mfaStatus = await dataProvider.auth.getMfaStatus();
      const mustVerify = requiresMfa(profile.role) || Boolean(mfaStatus.verifiedFactorId);
      if (mustVerify && mfaStatus.currentLevel !== "aal2") {
        setUsers((current) => [profile, ...current.filter((item) => item.id !== profile.id)]);
        setCurrentUserId(profile.id);
        setMfaFlow({ profile, status: mfaStatus });
        setIsLoggedIn(false);
        return false;
      }
    }
    finalizeRemoteAuthentication(profile);
    return true;
  }, [finalizeRemoteAuthentication]);

  const selectedObject = useMemo(
    () => visibleObjects.find((object) => object.id === selectedObjectId) ?? visibleObjects[0] ?? objects[0] ?? null,
    [visibleObjects, objects, selectedObjectId]
  );
  const selectedBuilding = useMemo(
    () =>
      selectedObject?.buildings.find((building) => building.id === selectedBuildingId) ??
      selectedObject?.buildings[0] ?? null,
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

  const manualTasks = useMemo(() => isRemoteAuth ? remoteTasks : getTasks(), [isRemoteAuth, remoteTasks, taskVersion]);
  const notifications = useMemo(() => isRemoteAuth ? remoteNotifications : getNotificationsByUser(user), [isRemoteAuth, remoteNotifications, notificationVersion, user]);
  const unreadNotifications = useMemo(() => isRemoteAuth ? notifications.filter((item) => item.status === "unread").length : getUnreadNotificationsCount(user), [isRemoteAuth, notifications, notificationVersion, user]);
  const taskNoticeCount = useMemo(() => getManualTaskNoticeCount(manualTasks, user), [manualTasks, user]);
  const canCreateManualTask = ["creator", "company_head", "construction_director"].includes(user?.role);
  const permissions = useMemo(() => permissionsFor(user), [user]);
  React.useEffect(() => {
    setMonitoringUser(isLoggedIn ? user : null);
  }, [isLoggedIn, user]);
  const refreshManualTasks = async () => {
    if (isRemoteAuth) setRemoteTasks(await dataProvider.tasks.getAll());
    else setTaskVersion((value) => value + 1);
  };
  const refreshNotifications = async () => {
    if (isRemoteAuth) setRemoteNotifications(await dataProvider.notifications.getForCurrentUser());
    else setNotificationVersion((value) => value + 1);
  };
  const readNotification = async (id) => {
    if (isRemoteAuth) await dataProvider.notifications.markRead(id);
    else markNotificationRead(id);
    await refreshNotifications();
  };
  const readAllNotifications = async () => {
    if (isRemoteAuth) await dataProvider.notifications.markAllRead();
    else markAllNotificationsRead(user);
    await refreshNotifications();
  };
  const syncAutomation = async (sourceObjects = objects) => {
    if (isRemoteAuth) {
      await dataProvider.operations.syncOverdueTasks();
      await Promise.all([refreshManualTasks(), refreshNotifications()]);
      return;
    }
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

  React.useEffect(() => {
    if (!isRemoteAuth) return undefined;
    let active = true;

    const restoreSession = async () => {
      try {
        const session = await dataProvider.auth.getSession();
        if (!session) return;
        const profile = await dataProvider.auth.getCurrentProfile();
        if (!profile || profile.status === "disabled") {
          await dataProvider.auth.signOut();
          return;
        }
        if (!active) return;
        await admitRemoteProfile(profile);
      } catch (error) {
        console.error("Unable to restore Supabase session", error);
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    restoreSession();
    const subscription = dataProvider.auth.onAuthStateChange((_event, session) => {
      if (!session && active) setIsLoggedIn(false);
    });
    return () => {
      active = false;
      subscription?.data?.subscription?.unsubscribe();
    };
  }, [admitRemoteProfile, isRemoteAuth]);

  React.useEffect(() => {
    if (!isRemoteAuth || !isLoggedIn) return;
    let active = true;
    setDomainLoading(true);
    setDomainError("");
    Promise.all([
      dataProvider.objects.getTree(),
      dataProvider.users.getAll(),
      dataProvider.tasks.getAll(),
      dataProvider.notifications.getForCurrentUser(),
      dataProvider.teams.getAll(),
    ])
      .then(([objectRows, userRows, taskRows, notificationRows, teamRows]) => {
        if (!active) return;
        const normalizedObjects = objectRows.map(normalizeObject);
        setObjects(normalizedObjects);
        setUsers(userRows.map(normalizeUser));
        setRemoteTasks(taskRows);
        setRemoteNotifications(notificationRows);
        setRemoteTeams(teamRows);
        if (normalizedObjects.length === 0 && !["admin", "profile", "users"].includes(screen)) {
          setScreen(user.role === "itr" ? "objects" : "admin");
        }
      })
      .catch((error) => {
        console.error("Unable to load Supabase domain", error);
        if (active) setDomainError("Не удалось загрузить данные. Проверьте соединение и повторите попытку.");
      })
      .finally(() => {
        if (active) setDomainLoading(false);
      });
    return () => { active = false; };
  }, [isRemoteAuth, isLoggedIn, currentUserId, domainReload]);
  const openTaskModal = (context = {}) => {
    if (!canCreateManualTask) return;
    setTaskContext(context);
  };

  const createManualTask = async (task) => {
    if (isRemoteAuth) {
      await dataProvider.tasks.create({ ...task, companyId: user.companyId, createdBy: user.id });
      await Promise.all([refreshManualTasks(), refreshNotifications()]);
      setTaskContext(null);
      return;
    }
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

  const changeManualTask = async (taskId, values) => {
    if (isRemoteAuth) {
      if (values.status && Object.keys(values).length === 1) {
        await dataProvider.tasks.updateStatus(taskId, values.status);
      } else {
        await dataProvider.tasks.update(taskId, {
          ...values,
          completedAt: values.status === "выполнена" ? new Date().toISOString() : undefined,
        });
      }
      await Promise.all([refreshManualTasks(), refreshNotifications()]);
      return;
    }
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

  const commentManualTask = async (taskId, text) => {
    if (!text.trim()) return;
    if (isRemoteAuth) {
      await dataProvider.tasks.addComment(taskId, { userName: user.name, text: text.trim() });
      await refreshManualTasks();
      return;
    }
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

  const linkManualTask = async (task, link) => {
    if (!link.url.trim()) return;
    if (isRemoteAuth) {
      const isCustodyAct = Boolean(task.doorId && link.category === "акт АОХ");
      const document = {
        title: link.title.trim() || "Документ к задаче",
        category: isCustodyAct ? "custody_act" : link.category || "document",
        url: link.url.trim(),
        comment: link.comment?.trim() || `Добавлено из задачи «${task.title}»`,
      };
      let updatedDoor = null;
      let nextObjects = objects;
      let act = null;
      if (isCustodyAct) {
        const currentDoor = objects
          .flatMap((object) => object.buildings)
          .flatMap((building) => building.floors)
          .flatMap((floor) => floor.doors)
          .find((door) => door.id === task.doorId);
        if (!currentDoor) throw new Error("Door is outside the loaded access scope");
        const uploadedAt = new Date().toISOString();
        const workflow = applyDoorWorkflow(objects, task.doorId, {
          doorStatus: currentDoor.doorStatus,
          openingStatus: currentDoor.openingStatus,
          issue: currentDoor.issue,
          storageAct: "акт загружен",
          custodyActUrl: document.url,
          custodyActUploadedAt: uploadedAt,
          documentLinks: [{ ...document, id: `task-document-${task.id}` }, ...(currentDoor.documentLinks ?? [])],
          quickHistory: "Акт ОХ добавлен из задачи",
        }, user.name);
        nextObjects = workflow.nextObjects;
        updatedDoor = workflow.updatedDoor;
        act = { status: "акт загружен", uploadedAt };
      }
      await dataProvider.tasks.addDocumentWorkflow(task.id, document, link, updatedDoor, act);
      if (updatedDoor) setObjects(nextObjects);
      await Promise.all([refreshManualTasks(), refreshNotifications()]);
      if (updatedDoor) setDomainReload((value) => value + 1);
      return;
    }
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

  const completeAutomaticTask = async (taskId) => {
    if (!taskId) return;
    if (isRemoteAuth) {
      await dataProvider.tasks.updateStatus(taskId, "выполнена");
      await Promise.all([refreshManualTasks(), refreshNotifications()]);
      return;
    }
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

  const quickAcceptTn = async (notification) => {
    if (!notification.doorId) return;
    const currentDoor = objects
      .flatMap((object) => object.buildings)
      .flatMap((building) => building.floors)
      .flatMap((floor) => floor.doors)
      .find((door) => door.id === notification.doorId);
    if (!currentDoor) return;
    await updateDoor(notification.doorId, {
      doorStatus: "принято технадзором",
      openingStatus: currentDoor.openingStatus,
      issue: currentDoor.issue,
      storageAct: currentDoor.storageAct,
      tnAcceptedAt: new Date().toISOString().slice(0, 10),
    });
    await completeAutomaticTask(notification.taskId);
    await readNotification(notification.id);
  };

  const updateDoor = (doorId, values) => {
    const { nextObjects, updatedDoor: persistedDoor } = applyDoorWorkflow(
      objects,
      doorId,
      values,
      user.name
    );

    setObjects(nextObjects);
    let persistencePromise = Promise.resolve();
    if (isRemoteAuth && persistedDoor) {
      setPersistenceError("");
      persistencePromise = dataProvider.doors.updateWorkflow(doorId, persistedDoor, {
          title: `Замечание ТН · ${persistedDoor.number ?? persistedDoor.label ?? persistedDoor.mark}`,
          description: persistedDoor.openingComment || persistedDoor.comment || "Проверить замечание технадзора",
          status: persistedDoor.issue === "есть замечание" ? "открыто" : "устранено",
          priority: persistedDoor.issue === "есть замечание" ? "высокий" : "средний",
          responsibleId: persistedDoor.assignedUserId || null,
          resolvedAt: persistedDoor.issue === "есть замечание" ? null : new Date().toISOString(),
        })
        .then(() => syncAutomation(nextObjects))
        .catch((error) => {
          console.error("Unable to save door", error);
          setObjects(objects);
          setPersistenceError("Изменения не сохранены. Проверьте соединение и повторите сохранение.");
          throw error;
        });
    } else {
      saveObjects(nextObjects);
      syncAutomation(nextObjects);
    }
    return persistencePromise;
  };

  const goToObject = (objectId) => {
    const nextObject = visibleObjects.find((object) => object.id === objectId) ?? visibleObjects[0] ?? objects[0];
    if (!nextObject) return;
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

  const updateCustodyAct = async (doorId, values) => {
    let context = null;
    for (const object of objects) {
      for (const building of object.buildings) {
        for (const floor of building.floors) {
          const door = floor.doors.find((item) => item.id === doorId);
          if (door) context = { object, building, floor, door };
        }
      }
    }
    if (!context) return;
    const currentDoor = context.door;
    const nextStatus = values.storageAct ?? currentDoor.storageAct;
    const nextUrl = values.custodyActUrl ?? currentDoor.custodyActUrl ?? "";
    const uploadedAt = nextUrl ? new Date().toISOString() : currentDoor.custodyActUploadedAt;
    const closedAt = nextStatus === "передано по акту" ? new Date().toISOString() : currentDoor.custodyActClosedAt;
    const workflowValues = {
      ...values,
      doorStatus: values.doorStatus ?? currentDoor.doorStatus,
      openingStatus: values.openingStatus ?? currentDoor.openingStatus,
      issue: values.issue ?? currentDoor.issue,
      storageAct: nextStatus,
      custodyActUrl: nextUrl,
      custodyActUploadedAt: uploadedAt,
      custodyActClosedAt: closedAt,
      quickHistory: values.quickHistory ?? `Акт ОХ: ${nextStatus}`,
    };
    if (!isRemoteAuth) return updateDoor(doorId, workflowValues);

    const link = nextUrl && nextUrl !== currentDoor.custodyActUrl
      ? {
          id: `door-act-${doorId}-${Date.now()}`,
          title: values.actTitle || `Акт ОХ · ${currentDoor.number ?? currentDoor.label ?? currentDoor.mark}`,
          url: nextUrl,
          category: "акт АОХ",
          comment: values.actComment || "Добавлено из модуля контроля актов ОХ",
          createdAt: new Date().toISOString(),
        }
      : null;
    const { nextObjects, updatedDoor } = applyDoorWorkflow(objects, doorId, {
      ...workflowValues,
      documentLinks: link ? [link, ...(currentDoor.documentLinks ?? [])] : currentDoor.documentLinks,
    }, user.name);
    if (!updatedDoor) throw new Error("Door is outside the loaded access scope");

    setPersistenceError("");
    try {
      await dataProvider.custodyActs.saveWorkflow(doorId, updatedDoor, {
        status: nextStatus,
        documentId: values.documentId ?? null,
        uploadedAt: nextUrl ? uploadedAt : null,
        closedAt: nextStatus === "передано по акту" ? closedAt : null,
      }, link && !values.documentId ? {
        title: link.title,
        url: link.url,
        comment: link.comment,
      } : null);
      setObjects(nextObjects);
      await syncAutomation(nextObjects);
    } catch (error) {
      console.error("Unable to persist custody act", error);
      setPersistenceError("Акт не сохранён в реестре документов. Проверьте соединение и повторите действие.");
      throw error;
    }
  };

  const saveDoorDetails = (doorId, values) => {
    const currentDoor = objects
      .flatMap((object) => object.buildings)
      .flatMap((building) => building.floors)
      .flatMap((floor) => floor.doors)
      .find((door) => door.id === doorId);
    if (currentDoor && (values.custodyActUrl || values.storageAct !== currentDoor.storageAct)) {
      return updateCustodyAct(doorId, values);
    }
    return updateDoor(doorId, values);
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
    if (authLoading) return;
    if (isPasswordRecovery) return;
    if (!isLoggedIn) {
      if (location.pathname !== "/login") routerNavigate("/login", { replace: true });
      return;
    }
    if (location.pathname === "/login" || location.pathname === "/") {
      routerNavigate(buildAppPath(defaultScreenForRole(user.role)), { replace: true });
      return;
    }
    const route = parseAppRoute(location.pathname);
    if (!permissions.canView(route.screen)) {
      const fallback = defaultScreenForRole(user.role);
      routeSyncing.current = false;
      setScreen(fallback);
      routerNavigate(buildAppPath(fallback), { replace: true });
      return;
    }
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
  }, [authLoading, isLoggedIn, location.pathname, isPasswordRecovery, permissions, user.role]);

  React.useEffect(() => {
    if (authLoading || !isLoggedIn || permissions.canView(screen)) return;
    const fallback = defaultScreenForRole(user.role);
    routeSyncing.current = false;
    setScreen(fallback);
    routerNavigate(buildAppPath(fallback), { replace: true });
  }, [authLoading, isLoggedIn, permissions, screen, user.role]);

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

  const loginUser = async (email, password) => {
    if (isRemoteAuth) {
      try {
        await dataProvider.auth.signIn(email.trim(), password);
        const profile = await dataProvider.auth.getCurrentProfile();
        if (!profile || profile.status === "disabled") {
          await dataProvider.auth.signOut();
          return { ok: false, message: "Учётная запись неактивна" };
        }
        const admitted = await admitRemoteProfile(profile);
        if (admitted) {
          const nextScreen = defaultScreenForRole(profile.role);
          setScreen(nextScreen);
          routerNavigate(buildAppPath(nextScreen), { replace: true });
        }
        return { ok: true, mfaRequired: !admitted };
      } catch (error) {
        return {
          ok: false,
          message: error?.message === "Invalid login credentials"
            ? "Неверный email или пароль"
            : "Не удалось войти. Проверьте соединение и повторите попытку.",
        };
      }
    }
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

  const logoutUser = async () => {
    if (isRemoteAuth) await dataProvider.auth.signOut();
    else dataProvider.auth.clearSession();
    setMfaFlow(null);
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

  if (authLoading || !isPasswordRecovery && isLoggedIn && domainLoading) {
    return <main className="auth-loading" aria-live="polite">{authLoading ? "Проверяем сессию..." : "Загружаем объекты..."}</main>;
  }

  if (isPasswordRecovery) {
    return <PasswordRecoveryPage onSave={async (password) => {
      await dataProvider.auth.updatePassword(password);
      await dataProvider.auth.signOut();
      setIsLoggedIn(false);
      routerNavigate("/login", { replace: true });
    }} />;
  }

  if (mfaFlow) {
    return <AuthProvider value={authValue}><MfaPage
      auth={dataProvider.auth}
      profile={mfaFlow.profile}
      gate
      onVerified={() => {
        const profile = mfaFlow.profile;
        finalizeRemoteAuthentication(profile);
        const nextScreen = defaultScreenForRole(profile.role);
        setScreen(nextScreen);
        routerNavigate(buildAppPath(nextScreen), { replace: true });
      }}
      onCancel={logoutUser}
    /></AuthProvider>;
  }

  if (!isLoggedIn) {
    return <AuthProvider value={authValue}><LoginPage users={users} onLogin={loginUser} onResetPassword={isRemoteAuth ? (email) => dataProvider.auth.requestPasswordReset(email) : null} isDemo={!isRemoteAuth} /></AuthProvider>;
  }

  if (domainError) {
    return <main className="auth-loading" aria-live="assertive"><div><strong>Данные временно недоступны</strong><p>{domainError}</p><button className="primary-button" onClick={() => setDomainReload((value) => value + 1)}>Повторить</button></div></main>;
  }

  return (
    <AuthenticatedAppShell
      authValue={authValue}
      sidebarCollapsed={sidebarCollapsed}
      role={user.role}
      activeScreen={screen}
      onNavigate={navigate}
      onLogout={logoutUser}
      taskNoticeCount={taskNoticeCount}
      onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
      screen={screen}
      selectedObject={selectedObject}
      selectedBuilding={selectedBuilding}
      selectedFloor={selectedFloor}
      selectedDoor={selectedDoor}
      user={user}
      users={users}
      notifications={notifications}
      unreadNotifications={unreadNotifications}
      allowUserSwitch={!isRemoteAuth}
      onOpenNotification={(notification) => {
        readNotification(notification.id);
        if (notification.taskId) {
          setScreen("tasks");
          return;
        }
        openProblem(notification);
      }}
      onMarkNotificationRead={readNotification}
      onMarkAllNotificationsRead={readAllNotifications}
      onOpenNotificationsPage={() => setScreen("notifications")}
      onUserChange={(userId) => {
        setCurrentUserId(userId);
        dataProvider.auth.saveSession({ userId, createdAt: new Date().toISOString() });
        const nextUser = users.find((item) => item.id === userId);
        const nextScreen = defaultScreenForRole(nextUser?.role);
        setScreen(nextScreen);
        routerNavigate(buildAppPath(nextScreen));
      }}
    >
      <div className="page-transition" key={screen}>
          {persistenceError && <div className="form-error persistence-error" role="alert">{persistenceError}<button type="button" onClick={() => setPersistenceError("")}>×</button></div>}
          {screen === "admin" && (
            <AdminPanel
              objects={objects}
              user={user}
              users={users}
              onChange={async (nextObjects) => {
                setObjects(nextObjects);
                setPersistenceError("");
                try {
                  await saveObjects(nextObjects);
                  if (isRemoteAuth) {
                    const persisted = await dataProvider.objects.getTree();
                    const normalized = persisted.map(normalizeObject);
                    setObjects(normalized);
                    return normalized;
                  }
                  return nextObjects;
                } catch (error) {
                  console.error("Unable to save admin changes", error);
                  setPersistenceError("Не удалось сохранить изменения админ-панели. Данные нужно проверить и повторить операцию.");
                  if (isRemoteAuth) setDomainReload((value) => value + 1);
                  throw error;
                }
              }}
              onPlanUpload={async ({ objectId, buildingId, floorId }, file) => {
                if (!isRemoteAuth) {
                  const uploaded = await fileService.uploadFloorPlan({ companyId: user.companyId, objectId, buildingId, floorId }, file);
                  return { image: uploaded.uri, imageStorageUri: uploaded.uri };
                }
                const currentBuilding = objects.find((item) => item.id === objectId)
                  ?.buildings.find((item) => item.id === buildingId);
                const previousLocation = storageLocationFromUri(currentBuilding?.floorTemplate?.imageStorageUri);
                const result = await persistUploadedFile({
                  upload: () => fileService.uploadFloorPlan({ companyId: user.companyId, objectId, buildingId, floorId }, file),
                  persist: async (uploaded) => {
                    const image = await fileService.createSignedUrl(uploaded.bucket, uploaded.path, 3600);
                    const nextObjects = objects.map((object) => object.id !== objectId ? object : {
                      ...object,
                      buildings: object.buildings.map((building) => building.id !== buildingId ? building : {
                        ...building,
                        floorTemplate: {
                          ...(building.floorTemplate ?? {}),
                          image,
                          imageStorageUri: uploaded.uri,
                        },
                      }),
                    });
                    await saveObjects(nextObjects);
                    const persisted = await dataProvider.objects.getTree();
                    setObjects(persisted.map(normalizeObject));
                    return { image, imageStorageUri: uploaded.uri };
                  },
                  remove: (uploaded) => fileService.remove(uploaded.bucket, [uploaded.path]),
                });
                if (previousLocation && previousLocation.path !== storageLocationFromUri(result.imageStorageUri)?.path) {
                  fileService.remove(previousLocation.bucket, [previousLocation.path])
                    .catch((error) => console.error("Unable to remove the replaced floor plan", error));
                }
                return result;
              }}
            />
          )}
          {screen === "profile" && (
            <ProfilePage
              user={user}
              objects={objects}
              remoteAuth={isRemoteAuth}
              mfaAuth={isRemoteAuth ? dataProvider.auth : null}
              onSave={async (nextUser, passwordChange) => {
                if (isRemoteAuth) {
                  if (passwordChange?.newPassword) {
                    await dataProvider.auth.signIn(user.email, passwordChange.oldPassword);
                    await dataProvider.auth.updatePassword(passwordChange.newPassword);
                  }
                  const updatedProfile = await dataProvider.users.update(nextUser.id, {
                    name: nextUser.name,
                    phone: nextUser.phone,
                    avatarUrl: nextUser.avatarStorageUri ?? nextUser.avatarUrl,
                  });
                  const displayProfile = nextUser.avatarStorageUri
                    ? { ...updatedProfile, avatarStorageUri: nextUser.avatarStorageUri, avatarUrl: nextUser.avatarUrl }
                    : updatedProfile;
                  setUsers((current) => current.map((item) => item.id === displayProfile.id ? displayProfile : item));
                  return displayProfile;
                }
                const nextUsers = users.map((item) => item.id === nextUser.id ? nextUser : item);
                setUsers(nextUsers);
                saveUsers(nextUsers);
                return nextUser;
              }}
              onAvatarUpload={async (file) => {
                if (!isRemoteAuth) {
                  const uploaded = await fileService.uploadAvatar({ userId: user.id }, file);
                  return { avatarUrl: uploaded.uri, avatarStorageUri: "" };
                }
                const previousLocation = storageLocationFromUri(user.avatarStorageUri);
                const result = await persistUploadedFile({
                  upload: () => fileService.uploadAvatar({ userId: user.id }, file),
                  persist: async (uploaded) => {
                    const avatarUrl = await fileService.createSignedUrl(uploaded.bucket, uploaded.path, 3600);
                    await dataProvider.users.update(user.id, { avatarUrl: uploaded.uri });
                    const avatar = { avatarUrl, avatarStorageUri: uploaded.uri };
                    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...avatar } : item));
                    return avatar;
                  },
                  remove: (uploaded) => fileService.remove(uploaded.bucket, [uploaded.path]),
                });
                if (previousLocation && previousLocation.path !== storageLocationFromUri(result.avatarStorageUri)?.path) {
                  fileService.remove(previousLocation.bucket, [previousLocation.path])
                    .catch((error) => console.error("Unable to remove the replaced avatar", error));
                }
                return result;
              }}
            />
          )}
          <AppRoutePages
            screen={screen}
            isRemoteAuth={isRemoteAuth}
            objects={objects}
            visibleObjects={visibleObjects}
            user={user}
            users={users}
            remoteTeams={remoteTeams}
            teams={isRemoteAuth ? remoteTeams : getTeams()}
            manpowerObjects={isRemoteAuth ? [] : getManpowerObjectOptions(visibleObjects)}
            demoPassword={demoPassword}
            notifications={notifications}
            manualTasks={manualTasks}
            selectedObject={selectedObject}
            selectedBuilding={selectedBuilding}
            selectedFloorId={selectedFloorId}
            selectedFloor={selectedFloor}
            selectedDoor={selectedDoor}
            canCreateManualTask={canCreateManualTask}
            onReadNotification={readNotification}
            onReadAllNotifications={readAllNotifications}
            onOpenNotificationProblem={openProblem}
            onOpenTaskModal={openTaskModal}
            onSetScreen={setScreen}
            onSetActNotificationTask={setActNotificationTask}
            onQuickAcceptTn={quickAcceptTn}
            onChangeManualTask={changeManualTask}
            onCommentManualTask={commentManualTask}
            onLinkManualTask={linkManualTask}
            onNotify={refreshNotifications}
            onUpdateCustodyAct={updateCustodyAct}
            onUpdateDoor={updateDoor}
            onSaveUsers={async (nextUsers) => {
              if (isRemoteAuth) {
                const rows = await dataProvider.users.getAll();
                setUsers(rows.map(normalizeUser));
                return;
              }
              setUsers(nextUsers);
              saveUsers(nextUsers);
            }}
            onChangeObjects={async (nextObjects) => {
              await saveObjects(nextObjects);
              setObjects(nextObjects);
            }}
            onOpenObject={goToObject}
            onOpenBuilding={goToBuilding}
            onOpenFloor={goToFloor}
            onOpenDoor={goToDoor}
            onSaveDoor={saveDoorDetails}
          />
        </div>
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
            readNotification(actNotificationTask.notificationId);
            setActNotificationTask(null);
          }}
        />
      )}
    </AuthenticatedAppShell>
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

function AccessDeniedPage() {
  return <section className="placeholder-page"><div className="placeholder-mark">Г</div><div><h2>Нет доступа</h2><p>Для вашей роли этот раздел недоступен.</p></div></section>;
}

export {
  AdminPanel,
  BuildingVisualization,
  CompanyDashboard,
  DoorDetails,
  FloorPlan,
  LoginPage,
  ManualTasksPage,
  NotificationsPage,
  ObjectsPage,
  ProfilePage,
  ReportsPage,
  UsersPage,
};

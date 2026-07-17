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
import { Header, Sidebar } from "../components/AppShell";
import LoginPage, { PasswordRecoveryPage } from "../pages/LoginPage";
import ObjectsPage from "../pages/ObjectsPage";
import StandaloneObjectPage from "../pages/ObjectPage";
import UsersPage from "../pages/UsersPage";
import RolesPage from "../pages/RolesPage";
import CompanyPage from "../pages/CompanyPage";
import ProfilePage from "../pages/ProfilePage";
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
        />
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
          {screen === "documents" && (isRemoteAuth
            ? <RemoteDocumentsPage objects={visibleObjects} user={user} />
            : <DocumentsPage objects={visibleObjects} user={user} />)}
          {screen === "brigade_plan" && (isRemoteAuth ? <RemoteBrigadePlanPage objects={visibleObjects} user={user} users={users} /> : <BrigadePlanPage objects={visibleObjects} user={user} users={users} />)}
          {screen === "manpower" && (isRemoteAuth ? <RemoteManpowerPage objects={visibleObjects} user={user} users={users} onNotify={refreshNotifications} /> : <ManpowerPage objects={visibleObjects} user={user} users={users} onNotify={refreshNotifications} />)}
          {screen === "notifications" && (
            <NotificationsPage
              notifications={notifications}
              onOpen={(notification) => {
                readNotification(notification.id);
                notification.taskId ? setScreen("tasks") : openProblem(notification);
              }}
              onMarkRead={readNotification}
              onMarkAll={readAllNotifications}
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
          {screen === "custody_acts" && (isRemoteAuth
            ? <RemoteCustodyActsPage objects={visibleObjects} users={users} onOpen={openProblem} onUpdateAct={updateCustodyAct} />
            : <CustodyActsPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} onUpdateAct={updateCustodyAct} />)}
          {screen === "tn_issues" && (isRemoteAuth ? <RemoteTnIssuesPage objects={visibleObjects} users={users} onOpen={openProblem} onResolve={(doorId) => updateDoor(doorId, { issue: "устранено", tnIssues: "Нет" })} /> : <TnIssuesPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} />)}
          {screen === "today_tasks" && <TodayTasksPage tasks={manualTasks} objects={visibleObjects} user={user} users={users} onOpen={openProblem} onUpdateTask={changeManualTask} />}
          {screen === "problem_center" && (isRemoteAuth
            ? <RemoteProblemCenterPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} onCreateTask={openTaskModal} />
            : <ProblemCenterPage objects={visibleObjects} user={user} users={users} onOpen={openProblem} onCreateTask={openTaskModal} />)}
          {screen === "reports" && <ReportsPage objects={visibleObjects} />}
          {screen === "finance" && <FinancePage objects={visibleObjects} user={user} />}
          {screen === "audit" && ["creator", "company_head", "construction_director"].includes(user.role) && <AuditLogPage objects={visibleObjects} users={users} />}
          {screen === "audit" && !["creator", "company_head", "construction_director"].includes(user.role) && <AccessDeniedPage />}
          {screen === "company_dashboard" && (isRemoteAuth ? <RemoteExecutiveDashboard objects={visibleObjects} users={users} onOpen={openProblem} /> : <CompanyDashboard objects={visibleObjects} users={users} onOpen={openProblem} manpowerObjects={getManpowerObjectOptions(visibleObjects)} />)}
          {screen === "users" && <UsersPage users={users} objects={objects} currentUser={user} remoteAuth={isRemoteAuth} demoPassword={demoPassword} onSave={async (nextUsers) => {
            if (isRemoteAuth) {
              const rows = await dataProvider.users.getAll();
              setUsers(rows.map(normalizeUser));
              return;
            }
            setUsers(nextUsers);
            saveUsers(nextUsers);
          }} />}
          {screen === "roles" && <RolesPage users={users} onOpenUsers={() => setScreen("users")} />}
          {screen === "companies" && <CompanyPage objects={visibleObjects} users={users} user={user} onOpenObjects={() => setScreen("objects")} />}
          {screen === "objects" && <ObjectsPage objects={visibleObjects} onOpen={goToObject} />}
          {screen === "object" && selectedObject && (
            <StandaloneObjectPage
              object={selectedObject}
              objects={objects}
              users={users}
              teams={isRemoteAuth ? remoteTeams : getTeams()}
              user={user}
              onOpenBuilding={goToBuilding}
              onCreateTask={openTaskModal}
              canCreateTask={canCreateManualTask}
              onChange={async (nextObjects) => {
                await saveObjects(nextObjects);
                setObjects(nextObjects);
              }}
            />
          )}
          {screen === "building" && selectedBuilding && (
            <section className="building-dashboard">
              <BuildingVisualization
                building={selectedBuilding}
                objectId={selectedObject?.id}
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
              onSave={saveDoorDetails}
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
            readNotification(actNotificationTask.notificationId);
            setActNotificationTask(null);
          }}
        />
      )}
    </div></AuthProvider>
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

function AccessDeniedPage() {
  return <section className="placeholder-page"><div className="placeholder-mark">Г</div><div><h2>Нет доступа</h2><p>Для вашей роли этот раздел недоступен.</p></div></section>;
}

export {
  AdminPanel,
  BrigadePlanPage,
  BuildingVisualization,
  CompanyDashboard,
  CustodyActsPage,
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
};

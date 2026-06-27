import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import matveevskyParkImage from "./assets/matveevsky-park.png";
import workerMascot from "./assets/gross-worker-mascot.png";
import { createDoorMatrix, getDoorMatrix, mergeDoorMatrixWithObjects, normalizeDoorMatrix, saveDoorMatrix } from "./storage";
import "./styles.css";

const STORAGE_KEY = "gross-lean-montage.visual.mvp.v7";
const USERS_STORAGE_KEY = "gross-lean-montage.users.v1";
const CURRENT_USER_KEY = "gross-lean-montage.current-user.v1";
const MATRIX_DOCUMENTS_KEY = "gross-lean-montage.matrix-documents.v1";
const ADMIN_PASSWORD = "123456";

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
const storageActOptions = ["не передана", "акт подготовлен", "передано по акту"];
const matrixStatusOptions = ["Да", "Нет", "Не требуется"];

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

const floorOptions = [
  { id: "parking", label: "Паркинг", type: "service" },
  ...Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    return { id: `floor-${number}`, label: String(number), number, type: "floor" };
  }),
  { id: "roof", label: "Кровля", type: "service" },
];

function createBuilding(id, name, readinessOffset = 0) {
  return {
    id,
    name,
    floorTemplate: null,
    floors: floorOptions.map((floor) => ({
      ...floor,
      doors:
        floor.type === "floor"
          ? baseDoors.map((door) => ({
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

function createInitialObjects() {
  return [
    {
      id: "object-north",
      name: "ЖК Матвеевский парк",
      address: "Очаково-Матвеевское, ближайшая станция метро «Аминьевская»",
      status: "В работе",
      responsibleId: "itr-1",
      buildings: [
        createBuilding("building-1", "Корпус 1", 0),
        createBuilding("building-2", "Корпус 2", -18),
        createBuilding("building-4-1", "Корпус 4.1", -8),
        createBuilding("building-4-2", "Корпус 4.2", -12),
        createBuilding("building-4-3", "Корпус 4.3", -5),
      ],
    },
  ];
}

function loadObjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : createInitialObjects();
  } catch {
    return createInitialObjects();
  }
}

function saveObjects(objects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(objects));
}

const mockUsers = [
  { id: "creator-1", name: "Иван", role: "creator", position: "Создатель сайта", email: "ivan@gross.ru", phone: "+7 900 100-00-01", avatar: "", password: "123456" },
  { id: "head-1", name: "Руководитель", role: "company_head", position: "Руководитель компании", email: "head@gross.ru", phone: "+7 900 100-00-02", avatar: "", password: "123456" },
  { id: "director-1", name: "Директор строительства", role: "construction_director", position: "Директор по строительству", email: "director@gross.ru", phone: "+7 900 100-00-03", avatar: "", password: "123456" },
  { id: "itr-1", name: "ИТР", role: "itr", position: "Инженер ИТР", email: "itr@gross.ru", phone: "+7 900 100-00-04", avatar: "", password: "123456" },
];

const roleLabels = {
  creator: "Создатель сайта",
  company_head: "Руководитель компании",
  construction_director: "Директор по строительству",
  itr: "ИТР",
};

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY)) ?? mockUsers;
  } catch {
    return mockUsers;
  }
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

function App() {
  const [objects, setObjects] = useState(loadObjects);
  const [doorMatrix, setDoorMatrix] = useState(() => {
    const saved = getDoorMatrix();
    const currentObjects = loadObjects();
    const source = saved.length > 0 ? mergeDoorMatrixWithObjects(saved, currentObjects) : createDoorMatrix(currentObjects);
    const normalized = normalizeDoorMatrix(source);
    saveDoorMatrix(normalized);
    return normalized;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [users, setUsers] = useState(loadUsers);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(CURRENT_USER_KEY) || "creator-1");
  const user = users.find((item) => item.id === currentUserId) ?? users[0];
  const [screen, setScreen] = useState("objects");
  const [selectedObjectId, setSelectedObjectId] = useState(objects[0].id);
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    objects[0].buildings[0].id
  );
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedDoorId, setSelectedDoorId] = useState("");

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? objects[0],
    [objects, selectedObjectId]
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

  const updateDoor = (doorId, values) => {
    const effectiveValues = {
      ...values,
      doorStatus: values.acceptedTN === "Да" ? "принято технадзором" : values.installed === "Да" && values.doorStatus === "не начато" ? "смонтирована" : values.doorStatus,
      issue: values.tnIssues === "Да" ? "есть замечание" : values.issue,
      storageAct: values.custodyAct === "Да" ? "передано по акту" : values.storageAct,
    };
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

            return {
              ...door,
              ...effectiveValues,
              history:
                changed.length > 0
                  ? [
                      {
                        id: `${door.id}-${Date.now()}`,
                        text: changed.join("; "),
                        date: new Date().toLocaleString("ru-RU"),
                        user: "admin",
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
    const nextObject = objects.find((object) => object.id === objectId) ?? objects[0];
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

  const navigate = (nextScreen) => {
    setScreen(nextScreen);
  };

  if (!isLoggedIn) {
    return <LoginPage userPassword={user.password} onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-shell">
      <Sidebar role={user.role} activeScreen={screen} setScreen={navigate} onLogout={() => setIsLoggedIn(false)} />
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
          onUserChange={(userId) => {
            setCurrentUserId(userId);
            localStorage.setItem(CURRENT_USER_KEY, userId);
            setScreen("objects");
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
              onSave={(nextUser) => {
                const nextUsers = users.map((item) => item.id === nextUser.id ? nextUser : item);
                setUsers(nextUsers);
                localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
              }}
            />
          )}
          {screen === "documents" && <DocumentsPage />}
          {screen === "reports" && <ReportsPage objects={objects} />}
          {screen === "company_dashboard" && <CompanyDashboard objects={objects} />}
          {["companies", "users", "roles", "itr_team"].includes(screen) && <PlaceholderPage screen={screen} />}
          {screen === "objects" && <ObjectsPage objects={objects} onOpen={goToObject} />}
          {screen === "object" && (
            <ObjectPage object={selectedObject} onOpenBuilding={goToBuilding} />
          )}
          {screen === "building" && selectedBuilding && (
            <section className="building-dashboard">
              <BuildingVisualization
                building={selectedBuilding}
                selectedFloorId={selectedFloorId}
                onSelectFloor={goToFloor}
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
            />
          )}
          {screen === "door" && selectedDoor && (
            <DoorDetails
              object={selectedObject}
              building={selectedBuilding}
              floor={selectedFloor}
              door={selectedDoor}
              onSave={updateDoor}
              onBack={() => setScreen("floor")}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function LoginPage({ onLogin, userPassword }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand-zone">
          <BrandMark variant="login" />
          <h1>ГРОСС Бережливый Монтаж</h1>
          <p>Цифровое управление монтажом</p>
          <div className="login-worker-preview" aria-hidden="true">
            <img src={workerMascot} alt="" />
          </div>
        </div>
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (login === "admin" && password === (userPassword || ADMIN_PASSWORD)) {
              setError("");
              onLogin();
              return;
            }

            setError("Неверный логин или пароль");
          }}
        >
          <label>
            Логин
            <input
              type="text"
              autoComplete="username"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="admin"
            />
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

function Sidebar({ role, activeScreen, setScreen, onLogout }) {
  const menus = {
    creator: [["objects", "Мои объекты"], ["company_dashboard", "Дашборд"], ["documents", "Документы"], ["reports", "Отчёты"], ["users", "Пользователи"], ["admin", "Админ-панель"], ["profile", "Личный кабинет"]],
    company_head: [["objects", "Мои объекты"], ["company_dashboard", "Дашборд"], ["documents", "Документы"], ["reports", "Отчёты"], ["users", "Пользователи"], ["admin", "Админ-панель"], ["profile", "Личный кабинет"]],
    construction_director: [["objects", "Мои объекты"], ["company_dashboard", "Дашборд"], ["documents", "Документы"], ["reports", "Отчёты"], ["admin", "Админ-панель"], ["profile", "Личный кабинет"]],
    itr: [["objects", "Мои объекты"], ["documents", "Документы"], ["reports", "Отчёты"], ["admin", "Админ-панель"], ["profile", "Личный кабинет"]],
  };
  const items = menus[role] ?? menus.itr;

  return (
    <aside className="sidebar">
      <div>
        <BrandMark />
        <div className="brand-subtitle">Цифровое управление монтажом</div>
        <nav className="nav">
          {items.map(([id, label]) => (
            <button
              className={activeScreen === id ? "active" : ""}
              key={id}
              onClick={() => setScreen(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <button className="ghost-button" onClick={onLogout}>
        Выйти
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

function Header({ screen, setScreen, selectedObject, selectedBuilding, selectedFloor, selectedDoor, user, users, onUserChange }) {
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
    company_dashboard: "Дашборд компании",
    itr_team: "Команда ИТР",
  };

  return (
    <header className="page-header">
      <div>
        {!(["admin", "profile", "companies", "users", "roles", "reports", "documents", "company_dashboard", "itr_team"].includes(screen)) && <div className="breadcrumbs">
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
        <div className="user-chip"><strong>{user.name}</strong><span>{roleLabels[user.role]}</span></div>
        <select aria-label="Текущий пользователь" value={user.id} onChange={(event) => onUserChange(event.target.value)}>{users.map((item) => <option key={item.id} value={item.id}>{item.name} — {roleLabels[item.role]}</option>)}</select>
      </div>
    </header>
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

function ObjectPage({ object, onOpenBuilding }) {
  return (
    <section className="visual-panel">
      <div className="view-heading">
        <div>
          <h2>{object.name}</h2>
          <p>Выберите корпус, чтобы перейти к визуализации этажей.</p>
        </div>
        <StatusBadge value={object.status} />
      </div>
      <div className="building-grid">
        {object.buildings.map((building) => (
          <button
            className="building-card"
            key={building.id}
            aria-label={`Открыть корпус ${building.name}`}
            onClick={() => onOpenBuilding(building.id)}
          >
            <div className="mini-building" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <strong>{building.name}</strong>
              <p>{building.floors.filter((floor) => floor.type === "floor").length} этажей</p>
            </div>
            <StatusBadge value={`Готовность ${getBuildingReadiness(building)}%`} />
          </button>
        ))}
        {object.buildings.length === 0 && (
          <div className="empty-plan">Корпуса ещё не добавлены администратором.</div>
        )}
      </div>
    </section>
  );
}

function BuildingVisualization({ building, selectedFloorId, onSelectFloor }) {
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

function FloorPlan({ object, building, floor, onOpenDoor, onBack }) {
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
          <button className="secondary-button slim" onClick={onBack}>
            К корпусу
          </button>
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

function DoorDetails({ object, building, floor, door, onSave, onBack }) {
  const [form, setForm] = useState({
    doorStatus: door.doorStatus,
    openingStatus: door.openingStatus,
    issue: door.issue,
    storageAct: door.storageAct,
  });
  const [saved, setSaved] = useState(false);

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
          <StatusBadge value={form.doorStatus} />
        </div>
        <div className="detail-grid">
          <Detail label="Номер двери" value={door.number} />
          <Detail label="Марка двери" value={door.mark ?? door.number} />
          <Detail label="Тип двери" value={door.type} />
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
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Назад к плану
          </button>
          <button className="primary-button" type="submit">
            Сохранить изменения
          </button>
        </div>
        {saved && <div className="save-notice">Изменения сохранены</div>}
      </form>
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

function ProfilePage({ user, onSave }) {
  const [form, setForm] = useState({ ...user, oldPassword: "", newPassword: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setSaved(false); };
  return <section className="profile-panel"><div className="profile-card"><div className="profile-avatar"><div>{form.avatar ? <img src={form.avatar} alt="Аватар" /> : form.name.slice(0, 1)}</div><label>Загрузить аватар<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => update("avatar", String(reader.result)); reader.readAsDataURL(file); }} /></label></div><form onSubmit={(event) => { event.preventDefault(); setError(""); if (form.newPassword && form.oldPassword !== user.password) { setError("Введите текущий пароль, чтобы подтвердить смену пароля"); return; } const { oldPassword, newPassword, ...profile } = form; onSave({ ...profile, password: newPassword ? newPassword : user.password }); setForm((current) => ({ ...current, oldPassword: "", newPassword: "", password: newPassword ? newPassword : user.password })); setSaved(true); }}><div className="profile-grid"><label>Имя<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label><label>Должность<input value={form.position} onChange={(event) => update("position", event.target.value)} /></label><label>Роль<input value={roleLabels[form.role]} readOnly /></label><label>Email<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label><label>Телефон<input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label><label className="profile-password">Текущий пароль<input type="password" value={form.oldPassword} onChange={(event) => update("oldPassword", event.target.value)} placeholder="Введите старый пароль" /></label><label className="profile-password">Новый пароль<input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} placeholder="Оставьте пустым, если не меняете" /></label></div><button className="primary-button">Сохранить профиль</button>{error && <div className="form-error">{error}</div>}{saved && <div className="save-notice">Данные пользователя сохранены</div>}</form></div></section>;
}

function CompanyDashboard({ objects }) {
  const doors = objects.flatMap((object) => getAllDoors(object));
  const mounted = doors.filter((door) => ["смонтирована", "принято технадзором", "передано по акту"].includes(door.doorStatus)).length;
  const transferred = doors.filter((door) => door.doorStatus === "передано по акту" || door.storageAct === "передано по акту").length;
  const issues = doors.filter((door) => door.issue === "есть замечание").length;
  const readiness = doors.length ? Math.round((mounted / doors.length) * 100) : 0;
  const problematic = objects.filter((object) => getMetrics(object).issues > 0 || getMetrics(object).openingsOnCorrection > 0).length;
  const cards = [
    ["Объектов в работе", objects.filter((object) => object.status === "В работе").length],
    ["Общая готовность", `${readiness}%`],
    ["Замечаний", issues],
    ["Дверей смонтировано", mounted],
    ["Передано по актам", transferred],
    ["Проблемные объекты", problematic],
  ];
  return <section className="company-dashboard"><div className="dashboard-summary"><div><h2>Монтаж по компании</h2><p>Сводные показатели на основе текущих объектов и статусов дверей.</p></div><StatusBadge value="В работе" /></div><div className="dashboard-metrics">{cards.map(([label, value]) => <div className="dashboard-metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="dashboard-progress"><div><span>Общая готовность</span><strong>{readiness}%</strong></div><div className="progress-bar"><span style={{ width: `${readiness}%` }} /></div></div></section>;
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

createRoot(document.getElementById("root")).render(<App />);

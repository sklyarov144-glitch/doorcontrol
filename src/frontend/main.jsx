import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import matveevskyParkImage from "./assets/matveevsky-park.png";
import workerMascot from "./assets/gross-worker-mascot.png";
import "./styles.css";

const STORAGE_KEY = "gross-lean-montage.visual.mvp.v7";

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

function App() {
  const [objects, setObjects] = useState(loadObjects);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState("itr");
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
            if (door.doorStatus !== values.doorStatus) {
              changed.push(`Статус двери: ${door.doorStatus} -> ${values.doorStatus}`);
            }
            if (door.openingStatus !== values.openingStatus) {
              changed.push(
                `Статус проема: ${door.openingStatus} -> ${values.openingStatus}`
              );
            }
            if (door.issue !== values.issue) {
              changed.push(`Замечания: ${door.issue} -> ${values.issue}`);
            }
            if (door.storageAct !== values.storageAct) {
              changed.push(`Акт: ${door.storageAct} -> ${values.storageAct}`);
            }

            return {
              ...door,
              ...values,
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

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-shell">
      <Sidebar role={role} activeScreen={screen} setScreen={setScreen} onLogout={() => setIsLoggedIn(false)} />
      <main className="content">
        <Header
          role={role}
          onRoleChange={(nextRole) => {
            setRole(nextRole);
            setScreen(nextRole === "admin" ? "admin" : "objects");
          }}
          screen={screen}
          setScreen={setScreen}
          selectedObject={selectedObject}
          selectedBuilding={selectedBuilding}
          selectedFloor={selectedFloor}
          selectedDoor={selectedDoor}
        />
        <div className="page-transition" key={screen}>
          {screen === "admin" && (
            <AdminPanel
              objects={objects}
              onChange={(nextObjects) => {
                setObjects(nextObjects);
                saveObjects(nextObjects);
              }}
            />
          )}
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

function LoginPage({ onLogin }) {
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
            if (login === "admin" && password === "123456") {
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
  const items = role === "admin"
    ? [["admin", "Админ-панель"]]
    : [["objects", "Мои объекты"]];

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

function Header({ role, onRoleChange, screen, setScreen, selectedObject, selectedBuilding, selectedFloor, selectedDoor }) {
  const labels = {
    objects: "Мои объекты",
    object: "Корпуса объекта",
    building: "Визуализация корпуса",
    floor: "План этажа",
    door: "Карточка двери",
    admin: "Админ-панель",
  };

  return (
    <header className="page-header">
      <div>
        {screen !== "admin" && <div className="breadcrumbs">
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
      <div className="role-switch" aria-label="Переключение роли">
        <button className={role === "itr" ? "active" : ""} onClick={() => onRoleChange("itr")}>ИТР</button>
        <button className={role === "admin" ? "active" : ""} onClick={() => onRoleChange("admin")}>Админ</button>
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

  return (
    <div className="building-hero">
      <div className="building-hero-copy">
        <StatusBadge value="В работе" />
        <h2>{building.name}</h2>
        <p>{building.floors.filter((floor) => floor.type === "floor").length} этажей</p>
      </div>
      <div className="building-visual">
        <div className="roof-line">Кровля</div>
        {Array.from({ length: 25 }, (_, index) => {
          const floorNumber = 25 - index;
          return (
            <button
              className={
                floorNumber === selectedNumber ? "facade-floor active" : "facade-floor"
              }
              key={floorNumber}
              onClick={() => onSelectFloor(`floor-${floorNumber}`)}
            >
              <span>{floorNumber}</span>
              <i />
              <i />
              <i />
              <i />
            </button>
          );
        })}
        <button className="parking-line" onClick={() => onSelectFloor("parking")}>
          Паркинг
        </button>
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
                className={`floor-plan ${building.floorTemplate?.image ? "has-plan-image" : ""}`}
                style={building.floorTemplate?.image ? { backgroundImage: `url(${building.floorTemplate.image})` } : undefined}
              >
                <div className="plan-frame" />
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

function AdminPanel({ objects, onChange }) {
  const [objectForm, setObjectForm] = useState({ name: "", address: "", metro: "" });
  const [buildingForm, setBuildingForm] = useState({ number: "", floors: 25 });
  const [templateForm, setTemplateForm] = useState({ apartments: 6, mop: 2 });
  const [objectId, setObjectId] = useState(objects[0]?.id ?? "");
  const selectedObject = objects.find((item) => item.id === objectId) ?? objects[0];
  const [buildingId, setBuildingId] = useState(selectedObject?.buildings[0]?.id ?? "");
  const selectedBuilding = selectedObject?.buildings.find((item) => item.id === buildingId) ?? selectedObject?.buildings[0];
  const [draftDoors, setDraftDoors] = useState(selectedBuilding?.floorTemplate?.doors ?? []);
  const [planImage, setPlanImage] = useState(selectedBuilding?.floorTemplate?.image ?? "");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  React.useEffect(() => {
    setBuildingId(selectedObject?.buildings[0]?.id ?? "");
  }, [objectId]);

  React.useEffect(() => {
    setDraftDoors(selectedBuilding?.floorTemplate?.doors ?? []);
    setPlanImage(selectedBuilding?.floorTemplate?.image ?? "");
  }, [selectedBuilding?.id]);

  const createObject = (event) => {
    event.preventDefault();
    if (!objectForm.name.trim()) return;
    const id = `object-${Date.now()}`;
    const nextObject = {
      id,
      name: objectForm.name.trim(),
      address: [objectForm.address.trim(), objectForm.metro.trim() && `метро «${objectForm.metro.trim()}»`].filter(Boolean).join(", "),
      metro: objectForm.metro.trim(),
      status: "В работе",
      buildings: [],
    };
    onChange([...objects, nextObject]);
    setObjectId(id);
    setObjectForm({ name: "", address: "", metro: "" });
    setNotice("Объект создан");
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
    setNotice("Двери сгенерированы. Их можно расставить на плане.");
  };

  const moveDoor = (event, doorId) => {
    if (!editing) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((event.clientY - rect.top) / rect.height) * 100));
    setDraftDoors((current) => current.map((door) => door.id === doorId ? { ...door, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), swing: y < 50 ? "down-right" : "up-left" } : door));
  };

  const saveTemplate = () => {
    if (!selectedObject || !selectedBuilding || draftDoors.length === 0) return;
    const template = { apartments: Number(templateForm.apartments), mopDoors: Number(templateForm.mop), image: planImage, doors: draftDoors };
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
        <form className="admin-card" onSubmit={createObject}><b>01</b><h3>Создание объекта</h3><label>Название<input value={objectForm.name} onChange={(e) => setObjectForm({ ...objectForm, name: e.target.value })} /></label><label>Район / адрес<input value={objectForm.address} onChange={(e) => setObjectForm({ ...objectForm, address: e.target.value })} /></label><label>Метро<input value={objectForm.metro} onChange={(e) => setObjectForm({ ...objectForm, metro: e.target.value })} /></label><button className="primary-button">Создать объект</button></form>
        <form className="admin-card" onSubmit={addBuilding}><b>02</b><h3>Добавление корпуса</h3><label>Объект<select value={selectedObject?.id ?? ""} onChange={(e) => setObjectId(e.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Номер корпуса<input value={buildingForm.number} placeholder="4.1" onChange={(e) => setBuildingForm({ ...buildingForm, number: e.target.value })} /></label><label>Количество этажей<input type="number" min="1" value={buildingForm.floors} onChange={(e) => setBuildingForm({ ...buildingForm, floors: e.target.value })} /></label><button className="primary-button">Добавить корпус</button></form>
        <div className="admin-card"><b>03</b><h3>Типовой этаж</h3><label>Корпус<select value={selectedBuilding?.id ?? ""} onChange={(e) => setBuildingId(e.target.value)}>{selectedObject?.buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Квартир на этаже<input type="number" min="1" value={templateForm.apartments} onChange={(e) => setTemplateForm({ ...templateForm, apartments: e.target.value })} /></label><label>МОП-дверей<input type="number" min="0" value={templateForm.mop} onChange={(e) => setTemplateForm({ ...templateForm, mop: e.target.value })} /></label><button className="primary-button" type="button" disabled={!selectedBuilding} onClick={generateTemplate}>Сгенерировать план</button></div>
      </div>
      <div className="admin-template-card">
        <div className="admin-template-toolbar"><div><h3>Шаблон этажа</h3><p>{selectedBuilding?.name ?? "Сначала добавьте корпус"}</p></div><label className="file-button">Загрузить план<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPlanImage(String(reader.result)); reader.readAsDataURL(file); }} /></label><button className="secondary-button" type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Завершить расстановку" : "Редактировать расположение"}</button><button className="primary-button" type="button" onClick={saveTemplate}>Сохранить шаблон этажа</button></div>
        <div className={`admin-plan ${planImage ? "has-image" : ""} ${editing ? "editing" : ""}`} style={planImage ? { backgroundImage: `url(${planImage})` } : undefined} onDragOver={(event) => editing && event.preventDefault()} onDrop={(event) => moveDoor(event, event.dataTransfer.getData("text/plain"))}>
          {!planImage && <><div className="admin-plan-corridor" /><div className="admin-plan-stair">Лестница</div></>}
          {draftDoors.map((door) => <button key={door.id} draggable={editing} onDragStart={(event) => event.dataTransfer.setData("text/plain", door.id)} className={`admin-door ${door.type === "МОП" ? "mop" : ""}`} style={{ left: `${door.x}%`, top: `${door.y}%` }} title={editing ? "Перетащите дверь" : door.label}>{door.mark}</button>)}
        </div>
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

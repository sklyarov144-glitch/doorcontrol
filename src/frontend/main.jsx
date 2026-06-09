import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "gross-montage.visual.mvp.v1";

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
    number: "Квартира 1501",
    type: "Квартирная",
    doorStatus: "смонтирована",
    openingStatus: "готов",
    issue: "нет",
    storageAct: "не передана",
    x: 17,
    y: 24,
    roomClass: "room-left-top",
  },
  {
    id: "apt-1502",
    number: "Квартира 1502",
    type: "Квартирная",
    doorStatus: "доставлена",
    openingStatus: "требует корректировки",
    issue: "есть замечание",
    storageAct: "не передана",
    x: 67,
    y: 24,
    roomClass: "room-right-top",
  },
  {
    id: "apt-1503",
    number: "Квартира 1503",
    type: "Квартирная",
    doorStatus: "замечание",
    openingStatus: "передан на исправление",
    issue: "есть замечание",
    storageAct: "не передана",
    x: 18,
    y: 72,
    roomClass: "room-left-bottom",
  },
  {
    id: "mop-15-01",
    number: "МОП-15-01",
    type: "МОП",
    doorStatus: "принято технадзором",
    openingStatus: "исправлен",
    issue: "устранено",
    storageAct: "акт подготовлен",
    x: 46,
    y: 50,
    roomClass: "room-core-left",
  },
  {
    id: "mop-15-02",
    number: "МОП-15-02",
    type: "МОП",
    doorStatus: "передано по акту",
    openingStatus: "готов",
    issue: "нет",
    storageAct: "передано по акту",
    x: 73,
    y: 72,
    roomClass: "room-right-bottom",
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
      name: "ЖК Северный",
      address: "Северный район, строительная площадка",
      status: "В работе",
      buildings: [
        createBuilding("building-1", "Корпус 1", 0),
        createBuilding("building-2", "Корпус 2", -18),
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
  const [screen, setScreen] = useState("objects");
  const [selectedObjectId, setSelectedObjectId] = useState(objects[0].id);
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    objects[0].buildings[0].id
  );
  const [selectedFloorId, setSelectedFloorId] = useState("floor-15");
  const [selectedDoorId, setSelectedDoorId] = useState("");

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? objects[0],
    [objects, selectedObjectId]
  );
  const selectedBuilding = useMemo(
    () =>
      selectedObject.buildings.find((building) => building.id === selectedBuildingId) ??
      selectedObject.buildings[0],
    [selectedObject, selectedBuildingId]
  );
  const selectedFloor = useMemo(
    () =>
      selectedBuilding.floors.find((floor) => floor.id === selectedFloorId) ??
      selectedBuilding.floors.find((floor) => floor.id === "floor-15") ??
      selectedBuilding.floors[0],
    [selectedBuilding, selectedFloorId]
  );
  const selectedDoor = useMemo(
    () =>
      selectedFloor.doors.find((door) => door.id === selectedDoorId) ??
      selectedFloor.doors[0],
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
    setSelectedBuildingId(nextObject.buildings[0].id);
    setScreen("object");
  };

  const goToBuilding = (buildingId) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId("floor-15");
    setScreen("building");
  };

  const goToFloor = (floorId) => {
    const floor = selectedBuilding.floors.find((item) => item.id === floorId);
    setSelectedFloorId(floorId);
    setSelectedDoorId(floor?.doors[0]?.id ?? "");
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
      <Sidebar setScreen={setScreen} onLogout={() => setIsLoggedIn(false)} />
      <main className="content">
        <Header
          screen={screen}
          setScreen={setScreen}
          selectedObject={selectedObject}
          selectedBuilding={selectedBuilding}
          selectedFloor={selectedFloor}
          selectedDoor={selectedDoor}
        />
        <div className="page-transition" key={screen}>
          {screen === "objects" && <ObjectsPage objects={objects} onOpen={goToObject} />}
          {screen === "object" && (
            <ObjectPage object={selectedObject} onOpenBuilding={goToBuilding} />
          )}
          {screen === "building" && (
            <section className="building-dashboard">
              <BuildingVisualization
                building={selectedBuilding}
                selectedFloorId={selectedFloor.id}
                onSelectFloor={goToFloor}
              />
              <FloorSelector
                building={selectedBuilding}
                selectedFloorId={selectedFloor.id}
                onSelectFloor={goToFloor}
              />
            </section>
          )}
          {screen === "floor" && (
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
          <h1>ГРОСС Монтаж</h1>
          <p>Цифровое управление монтажом</p>
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

function Sidebar({ setScreen, onLogout }) {
  return (
    <aside className="sidebar">
      <div>
        <BrandMark />
        <div className="brand-subtitle">Цифровое управление монтажом</div>
        <nav className="nav">
          <button onClick={() => setScreen("objects")}>Мои объекты</button>
          <button onClick={() => setScreen("object")}>Корпуса объекта</button>
          <button onClick={() => setScreen("building")}>Визуализация корпуса</button>
          <button onClick={() => setScreen("floor")}>План этажа</button>
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
      <div className="company-mark" aria-hidden="true">
        <span className="mark-corner" />
        <span className="mark-block" />
        <span className="mark-cut" />
      </div>
      <div>
        <div className="company-name">ГРОСС</div>
        <div className="product-name">Монтаж</div>
      </div>
    </div>
  );
}

function Header({ screen, setScreen, selectedObject, selectedBuilding, selectedFloor, selectedDoor }) {
  const labels = {
    objects: "Мои объекты",
    object: "Корпуса объекта",
    building: "Визуализация корпуса",
    floor: "План этажа",
    door: "Карточка двери",
  };

  return (
    <header className="page-header">
      <div>
        <div className="breadcrumbs">
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
              <button onClick={() => setScreen("building")}>{selectedBuilding.name}</button>
            </>
          )}
          {["floor", "door"].includes(screen) && (
            <>
              <span>/</span>
              <button onClick={() => setScreen("floor")}>
                {selectedFloor.type === "floor" ? `Этаж ${selectedFloor.number}` : selectedFloor.label}
              </button>
            </>
          )}
          {screen === "door" && selectedDoor && (
            <>
              <span>/</span>
              <span>{selectedDoor.number}</span>
            </>
          )}
        </div>
        <h1>{labels[screen]}</h1>
      </div>
      <div className="user-chip">ИТР: admin</div>
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
        <div className="object-tower tower-a" />
        <div className="object-tower tower-b" />
        <div className="object-ground" />
      </div>
      <div className="object-card-body">
        <div className="object-card-main">
          <div>
            <strong>{object.name}</strong>
            <p>{object.address}</p>
          </div>
          <StatusBadge value={object.status} />
        </div>
        <div className="metric-grid">
          <Metric label="Готовность" value={`${metrics.readiness}%`} />
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
          <p>Корпуса объекта в текущей mock-структуре.</p>
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
            <div className="mini-building">
              {Array.from({ length: 9 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <div>
              <strong>{building.name}</strong>
              <p>{building.floors.filter((floor) => floor.type === "floor").length} этажей</p>
            </div>
            <StatusBadge value={`Готовность ${getBuildingReadiness(building)}%`} />
          </button>
        ))}
      </div>
    </section>
  );
}

function BuildingVisualization({ building, selectedFloorId, onSelectFloor }) {
  const selectedNumber = selectedFloorId.startsWith("floor-")
    ? Number(selectedFloorId.replace("floor-", ""))
    : null;

  return (
    <div className="panel building-visual-card">
      <div className="panel-title">
        <div>
          <h2>{building.name}</h2>
          <p>Фасад корпуса с горизонтальными уровнями</p>
        </div>
        <StatusBadge value={`Готовность ${getBuildingReadiness(building)}%`} />
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
    </div>
  );
}

function FloorSelector({ building, selectedFloorId, onSelectFloor }) {
  return (
    <aside className="panel floor-selector">
      <div className="panel-title">
        <div>
          <h2>Этажи</h2>
          <p>{building.name}</p>
        </div>
      </div>
      <div className="floor-list">
        {[...building.floors].reverse().map((floor) => (
          <button
            className={floor.id === selectedFloorId ? "floor-chip active" : "floor-chip"}
            key={floor.id}
            onClick={() => onSelectFloor(floor.id)}
          >
            {floor.label}
          </button>
        ))}
      </div>
    </aside>
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
      <div className="panel floor-plan-panel">
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
              <span>{visibleDoors.length} из {floor.doors.length}</span>
            </div>
            <div className="floor-plan">
              <div className="room room-left-top">Квартира 1501</div>
              <div className="room room-right-top">Квартира 1502</div>
              <div className="room room-left-bottom">Квартира 1503</div>
              <div className="room room-core-left">МОП</div>
              <div className="room room-right-bottom">МОП</div>
              <div className="plan-core">Лифтовой холл</div>
              <div className="plan-corridor horizontal" />
              <div className="plan-corridor vertical" />
              {visibleDoors.map((door) => (
                <DoorMarker key={door.id} door={door} onOpen={() => onOpenDoor(door.id)} />
              ))}
            </div>
            <StatusLegend />
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

  return (
    <button
      className={`door-marker ${door.type === "МОП" ? "common" : ""} status-${tone}`}
      style={{ left: `${door.x}%`, top: `${door.y}%` }}
      onClick={onOpen}
    >
      <span>{door.number}</span>
      <small>{door.doorStatus}</small>
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

function StatusLegend() {
  return (
    <div className="status-legend">
      {[
        "не начато",
        "доставлена",
        "смонтирована",
        "замечание",
        "принято технадзором",
        "передано по акту",
        "требует корректировки",
      ].map((status) => (
        <StatusBadge key={status} value={status} />
      ))}
    </div>
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

import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const baseDoors = [
  {
    id: "apt-1501",
    number: "Квартира 1501",
    type: "Квартирная",
    doorStatus: "смонтирована",
    openingStatus: "готов",
    issue: "Нет",
    storageAct: "Не требуется",
    x: 16,
    y: 20,
  },
  {
    id: "apt-1502",
    number: "Квартира 1502",
    type: "Квартирная",
    doorStatus: "доставлена",
    openingStatus: "требует корректировки",
    issue: "Отклонение по геометрии проема",
    storageAct: "Не требуется",
    x: 58,
    y: 20,
  },
  {
    id: "apt-1503",
    number: "Квартира 1503",
    type: "Квартирная",
    doorStatus: "замечание",
    openingStatus: "передан на исправление",
    issue: "Требуется регулировка полотна",
    storageAct: "Не требуется",
    x: 16,
    y: 68,
  },
  {
    id: "mop-15-01",
    number: "МОП-15-01",
    type: "МОП",
    doorStatus: "принято технадзором",
    openingStatus: "исправлен",
    issue: "Нет",
    storageAct: "Акт подготовлен",
    x: 43,
    y: 48,
  },
  {
    id: "mop-15-02",
    number: "МОП-15-02",
    type: "МОП",
    doorStatus: "передано по акту",
    openingStatus: "готов",
    issue: "Нет",
    storageAct: "Передано на ответственное хранение",
    x: 70,
    y: 68,
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

function createProjectStructure() {
  return {
    id: "object-north",
    name: "ЖК Северный",
    address: "Северный район, строительная площадка",
    readiness: 72,
    issues: 5,
    openingsOnCorrection: 12,
    buildings: [
      createBuilding("building-1", "Корпус 1", 72),
      createBuilding("building-2", "Корпус 2", 41),
    ],
  };
}

function createBuilding(id, name, readiness) {
  return {
    id,
    name,
    readiness,
    floors: floorOptions.map((floor) => ({
      ...floor,
      doors:
        floor.type === "floor"
          ? baseDoors.map((door) => ({
              ...door,
              id: `${id}-${floor.id}-${door.id}`,
            }))
          : [],
    })),
  };
}

const mockObjects = [createProjectStructure()];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState("objects");
  const [selectedObjectId, setSelectedObjectId] = useState(mockObjects[0].id);
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    mockObjects[0].buildings[0].id
  );
  const [selectedFloorId, setSelectedFloorId] = useState("floor-15");
  const [selectedDoorId, setSelectedDoorId] = useState("");

  const selectedObject = useMemo(
    () => mockObjects.find((object) => object.id === selectedObjectId) ?? mockObjects[0],
    [selectedObjectId]
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

  const goToObject = (objectId) => {
    const nextObject = mockObjects.find((object) => object.id === objectId) ?? mockObjects[0];
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
      <aside className="sidebar">
        <div>
          <div className="brand">DoorControl</div>
          <div className="brand-subtitle">Визуальное управление объектом</div>
        </div>
        <nav className="nav">
          <button onClick={() => setScreen("objects")}>Мои объекты</button>
          <button onClick={() => setScreen("object")}>Корпуса объекта</button>
          <button onClick={() => setScreen("building")}>Визуализация корпуса</button>
          <button onClick={() => setScreen("floor")}>План этажа</button>
        </nav>
        <button className="ghost-button" onClick={() => setIsLoggedIn(false)}>
          Выйти
        </button>
      </aside>

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
          {screen === "objects" && <ObjectsPage objects={mockObjects} onOpen={goToObject} />}
          {screen === "object" && (
            <ObjectPage object={selectedObject} onOpenBuilding={goToBuilding} />
          )}
          {screen === "building" && (
            <BuildingPage
              building={selectedBuilding}
              selectedFloorId={selectedFloor.id}
              onSelectFloor={goToFloor}
            />
          )}
          {screen === "floor" && (
            <FloorPage
              object={selectedObject}
              building={selectedBuilding}
              floor={selectedFloor}
              onOpenDoor={goToDoor}
              onBack={() => setScreen("building")}
            />
          )}
          {screen === "door" && selectedDoor && (
            <DoorPage
              object={selectedObject}
              building={selectedBuilding}
              floor={selectedFloor}
              door={selectedDoor}
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
        <div>
          <div className="brand">DoorControl</div>
          <h1>Вход в систему</h1>
          <p>Визуальная закрытая часть для контроля дверей на объекте.</p>
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
                {selectedFloor.label === "15" ? "Этаж 15" : selectedFloor.label}
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
      <div className="user-chip">admin</div>
    </header>
  );
}

function ObjectsPage({ objects, onOpen }) {
  return (
    <section className="panel visual-panel">
      <div className="panel-title">
        <h2>Объекты в работе</h2>
        <span>{objects.length} объект</span>
      </div>
      <div className="object-grid">
        {objects.map((object) => (
          <button
            className="object-card visual-card"
            key={object.id}
            aria-label={`Открыть объект ${object.name}`}
            onClick={() => onOpen(object.id)}
          >
            <div className="object-card-main">
              <div>
                <strong>{object.name}</strong>
                <p>{object.address}</p>
              </div>
              <Status label="В работе" />
            </div>
            <div className="metric-grid">
              <Metric label="Готовность" value={`${object.readiness}%`} />
              <Metric label="Замечания" value={object.issues} tone="warning" />
              <Metric
                label="Проемы на корректировке"
                value={object.openingsOnCorrection}
                tone="alert"
              />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ObjectPage({ object, onOpenBuilding }) {
  return (
    <section className="panel visual-panel">
      <div className="panel-title">
        <h2>{object.name}</h2>
        <span>Корпуса объекта</span>
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
              {Array.from({ length: 7 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <div>
              <strong>{building.name}</strong>
              <p>{building.floors.filter((floor) => floor.type === "floor").length} этажей</p>
            </div>
            <Status label={`Готовность ${building.readiness}%`} />
          </button>
        ))}
      </div>
    </section>
  );
}

function BuildingPage({ building, selectedFloorId, onSelectFloor }) {
  return (
    <section className="building-dashboard">
      <div className="panel building-visual-card">
        <div className="panel-title">
          <h2>{building.name}</h2>
          <span>Стилизованная визуализация</span>
        </div>
        <div className="building-visual">
          <div className="roof-line" />
          {Array.from({ length: 25 }, (_, index) => {
            const floorNumber = 25 - index;
            return (
              <button
                className={floorNumber === 15 ? "facade-floor active" : "facade-floor"}
                key={floorNumber}
                onClick={() => onSelectFloor(`floor-${floorNumber}`)}
              >
                <span>{floorNumber}</span>
                <i />
                <i />
                <i />
              </button>
            );
          })}
          <div className="parking-line">Паркинг</div>
        </div>
      </div>
      <aside className="panel floor-selector">
        <div className="panel-title">
          <h2>Выбор этажа</h2>
          <span>{building.name}</span>
        </div>
        <div className="floor-list">
          {building.floors.map((floor) => (
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
    </section>
  );
}

function FloorPage({ object, building, floor, onOpenDoor, onBack }) {
  const label = floor.type === "floor" ? `Этаж ${floor.number}` : floor.label;

  return (
    <section className="floor-dashboard">
      <div className="panel floor-plan-panel">
        <div className="panel-title">
          <h2>План этажа сверху</h2>
          <span>
            {object.name} / {building.name} / {label}
          </span>
        </div>
        {floor.doors.length > 0 ? (
          <div className="floor-plan">
            <div className="plan-core">Лифтовой холл</div>
            <div className="plan-corridor horizontal" />
            <div className="plan-corridor vertical" />
            {floor.doors.map((door) => (
              <button
                className={`door-marker ${door.type === "МОП" ? "common" : ""}`}
                style={{ left: `${door.x}%`, top: `${door.y}%` }}
                key={door.id}
                onClick={() => onOpenDoor(door.id)}
              >
                <span>{door.number}</span>
                <small>{door.doorStatus}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-plan">
            Для уровня "{floor.label}" двери пока не заведены в мок-структуре.
          </div>
        )}
        <button className="secondary-button" onClick={onBack}>
          Назад к корпусу
        </button>
      </div>
    </section>
  );
}

function DoorPage({ object, building, floor, door, onBack }) {
  return (
    <section className="door-layout">
      <div className="panel">
        <div className="panel-title">
          <h2>{door.number}</h2>
          <span>
            {object.name} / {building.name} / Этаж {floor.number}
          </span>
        </div>
        <div className="detail-grid">
          <Detail label="Номер двери" value={door.number} />
          <Detail label="Тип двери" value={door.type} />
          <Detail label="Статус двери" value={door.doorStatus} />
          <Detail label="Статус проема" value={door.openingStatus} />
          <Detail label="Замечания" value={door.issue} />
          <Detail label="Акт ответственного хранения" value={door.storageAct} />
        </div>
        <button className="secondary-button" onClick={onBack}>
          Назад к плану этажа
        </button>
      </div>
      <div className="panel door-preview">
        <div className="door-slab" />
        <Status label={door.doorStatus} />
      </div>
    </section>
  );
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

function Status({ label, muted = false }) {
  return <span className={muted ? "status muted" : "status"}>{label}</span>;
}

createRoot(document.getElementById("root")).render(<App />);

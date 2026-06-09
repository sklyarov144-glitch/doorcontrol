import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const doorTemplates = [
  {
    id: "apt-1501",
    number: "Квартира 1501",
    type: "Квартирная",
    doorStatus: "смонтирована",
    openingStatus: "готов",
    issue: "Нет",
    storageAct: "Не требуется",
  },
  {
    id: "apt-1502",
    number: "Квартира 1502",
    type: "Квартирная",
    doorStatus: "доставлена",
    openingStatus: "требует корректировки",
    issue: "Отклонение по геометрии проема",
    storageAct: "Не требуется",
  },
  {
    id: "apt-1503",
    number: "Квартира 1503",
    type: "Квартирная",
    doorStatus: "замечание",
    openingStatus: "передан на исправление",
    issue: "Требуется регулировка полотна",
    storageAct: "Не требуется",
  },
  {
    id: "mop-150-a",
    number: "МОП-150",
    type: "МОП",
    doorStatus: "принято технадзором",
    openingStatus: "исправлен",
    issue: "Нет",
    storageAct: "Акт подготовлен",
  },
  {
    id: "mop-150-b",
    number: "МОП-150",
    type: "МОП",
    doorStatus: "передано по акту",
    openingStatus: "готов",
    issue: "Нет",
    storageAct: "Передано на ответственное хранение",
  },
];

const doorStatuses = [
  "не начато",
  "доставлена",
  "смонтирована",
  "замечание",
  "принято технадзором",
  "передано по акту",
];

const openingStatuses = [
  "готов",
  "требует корректировки",
  "передан на исправление",
  "исправлен",
];

function createProjectStructure() {
  return {
    name: "ЖК Северный",
    address: "Строительный объект",
    readiness: 72,
    issues: 5,
    openingsOnCorrection: 12,
    buildings: [
      {
        id: "building-1",
        name: "Корпус 1",
        floors: Array.from({ length: 25 }, (_, index) => {
          const floorNumber = index + 1;

          return {
            id: `floor-${floorNumber}`,
            number: floorNumber,
            doors: doorTemplates.map((door) => ({
              ...door,
              id: `${door.id}-floor-${floorNumber}`,
            })),
          };
        }),
      },
    ],
  };
}

const project = createProjectStructure();
const currentBuilding = project.buildings[0];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState("objects");
  const [selectedFloor, setSelectedFloor] = useState(15);
  const selectedFloorData = useMemo(
    () =>
      currentBuilding.floors.find((floor) => floor.number === selectedFloor) ??
      currentBuilding.floors[0],
    [selectedFloor]
  );
  const doors = selectedFloorData.doors;
  const [selectedDoorId, setSelectedDoorId] = useState(doors[0].id);

  const selectedDoor = useMemo(
    () => doors.find((door) => door.id === selectedDoorId) ?? doors[0],
    [doors, selectedDoorId]
  );

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">DoorControl</div>
          <div className="brand-subtitle">MVP установки дверей</div>
        </div>
        <nav className="nav">
          <button onClick={() => setScreen("objects")}>Объекты</button>
          <button onClick={() => setScreen("object")}>Объект</button>
          <button onClick={() => setScreen("building")}>Корпус</button>
          <button onClick={() => setScreen("floor")}>Этаж</button>
        </nav>
        <button className="ghost-button" onClick={() => setIsLoggedIn(false)}>
          Выйти
        </button>
      </aside>

      <main className="content">
        <Header
          screen={screen}
          setScreen={setScreen}
          selectedFloor={selectedFloor}
          selectedDoor={selectedDoor}
        />
        {screen === "objects" && <ObjectsPage setScreen={setScreen} />}
        {screen === "object" && <ObjectPage setScreen={setScreen} />}
        {screen === "building" && (
          <BuildingPage
            setScreen={setScreen}
            selectedFloor={selectedFloor}
            setSelectedFloor={setSelectedFloor}
            floors={currentBuilding.floors}
          />
        )}
        {screen === "floor" && (
          <FloorPage
            selectedFloor={selectedFloor}
            doors={doors}
            setScreen={setScreen}
            setSelectedDoorId={setSelectedDoorId}
          />
        )}
        {screen === "door" && (
          <DoorPage
            selectedFloor={selectedFloor}
            selectedDoor={selectedDoor}
            setScreen={setScreen}
          />
        )}
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
          <p>Закрытая часть MVP для контроля дверей на объекте.</p>
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

function Header({ screen, setScreen, selectedFloor, selectedDoor }) {
  const labels = {
    objects: "Объекты",
    object: project.name,
    building: currentBuilding.name,
    floor: `Этаж ${selectedFloor}`,
    door: selectedDoor.number,
  };

  return (
    <header className="page-header">
      <div>
        <div className="breadcrumbs">
          <button onClick={() => setScreen("objects")}>Объекты</button>
          <span>/</span>
          <button onClick={() => setScreen("object")}>{project.name}</button>
          <span>/</span>
          <button onClick={() => setScreen("building")}>{currentBuilding.name}</button>
        </div>
        <h1>{labels[screen]}</h1>
      </div>
      <div className="user-chip">admin</div>
    </header>
  );
}

function ObjectsPage({ setScreen }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Доступные объекты</h2>
        <span>1 объект</span>
      </div>
      <button
        className="object-card"
        aria-label={`Открыть объект ${project.name}`}
        onClick={() => setScreen("object")}
      >
        <div className="object-card-main">
          <div>
            <strong>{project.name}</strong>
            <p>{project.address}</p>
          </div>
          <Status label="В работе" />
        </div>
        <div className="metric-grid">
          <Metric label="Готовность" value={`${project.readiness}%`} />
          <Metric label="Замечания" value={project.issues} tone="warning" />
          <Metric
            label="Проемы на корректировке"
            value={project.openingsOnCorrection}
            tone="alert"
          />
        </div>
      </button>
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

function ObjectPage({ setScreen }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Корпуса объекта</h2>
        <span>{project.name}</span>
      </div>
      <button
        className="row-card"
        aria-label={`Открыть корпус ${currentBuilding.name}`}
        onClick={() => setScreen("building")}
      >
        <div>
          <strong>{currentBuilding.name}</strong>
          <p>Этажи: {currentBuilding.floors.length}. Двери заведены на уровне этажа.</p>
        </div>
        <Status label="Активен" />
      </button>
    </section>
  );
}

function BuildingPage({ setScreen, selectedFloor, setSelectedFloor, floors }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Этажи корпуса</h2>
        <span>{currentBuilding.name}</span>
      </div>
      <div className="floor-grid">
        {floors.map((floor) => (
          <button
            className={
              floor.number === selectedFloor ? "floor-tile active" : "floor-tile"
            }
            key={floor.id}
            onClick={() => {
              setSelectedFloor(floor.number);
              setScreen("floor");
            }}
          >
            {floor.number}
          </button>
        ))}
      </div>
    </section>
  );
}

function FloorPage({ selectedFloor, doors, setScreen, setSelectedDoorId }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Двери на этаже {selectedFloor}</h2>
        <span>{doors.length} дверей</span>
      </div>
      <div className="table">
        <div className="table-head">
          <span>Номер</span>
          <span>Тип</span>
          <span>Статус двери</span>
          <span>Статус проема</span>
          <span>Замечания</span>
          <span>Акт</span>
        </div>
        {doors.map((door) => (
          <button
            className="table-row"
            key={door.id}
            onClick={() => {
              setSelectedDoorId(door.id);
              setScreen("door");
            }}
          >
            <span>{door.number}</span>
            <span>{door.type}</span>
            <Status label={door.doorStatus} />
            <Status label={door.openingStatus} muted />
            <span>{door.issue}</span>
            <span>{door.storageAct}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DoorPage({ selectedFloor, selectedDoor, setScreen }) {
  return (
    <section className="door-layout">
      <div className="panel">
        <div className="panel-title">
          <h2>Карточка двери</h2>
          <span>{project.name}</span>
        </div>
        <div className="detail-grid">
          <Detail label="Объект" value={project.name} />
          <Detail label="Корпус" value={currentBuilding.name} />
          <Detail label="Этаж" value={selectedFloor} />
          <Detail label="Номер" value={selectedDoor.number} />
          <Detail label="Тип двери" value={selectedDoor.type} />
          <Detail label="Статус двери" value={selectedDoor.doorStatus} />
          <Detail label="Статус проема" value={selectedDoor.openingStatus} />
          <Detail label="Замечания" value={selectedDoor.issue} />
          <Detail label="Акт ответственного хранения" value={selectedDoor.storageAct} />
        </div>
        <button className="secondary-button" onClick={() => setScreen("floor")}>
          Назад к списку дверей
        </button>
      </div>
      <div className="panel">
        <div className="panel-title">
          <h2>Доступные статусы</h2>
        </div>
        <div className="status-list">
          {doorStatuses.map((status) => (
            <Status key={status} label={status} />
          ))}
        </div>
        <div className="status-list compact">
          {openingStatuses.map((status) => (
            <Status key={status} label={status} muted />
          ))}
        </div>
      </div>
    </section>
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

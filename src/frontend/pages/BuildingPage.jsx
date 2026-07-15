import React from "react";
import { Metric, StatusBadge } from "../components/UiPrimitives";

export default function BuildingVisualization({
  building,
  objectId,
  selectedFloorId = "",
  onSelectFloor,
  onCreateTask,
  canCreateTask = false,
}) {
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
  const floorReadiness = metricDoors.length
    ? Math.round((readyDoors / metricDoors.length) * 100)
    : 0;
  const actualFloors = building.floors
    .filter((floor) => floor.type === "floor")
    .sort((a, b) => b.number - a.number);
  const parking = building.floors.find(
    (floor) => floor.id === "parking" || floor.type === "parking"
  );

  return (
    <div className="building-hero">
      <div className="building-hero-copy">
        <StatusBadge value="В работе" />
        <h2>{building.name}</h2>
        <p>{building.floorsCount ?? actualFloors.length} этажей</p>
        {canCreateTask && (
          <button
            className="secondary-button slim building-task-button"
            onClick={() => onCreateTask({ objectId, buildingId: building.id })}
          >
            Поставить задачу по корпусу
          </button>
        )}
      </div>
      <div className="building-visual">
        <div className="roof-line">Кровля</div>
        {actualFloors.map((floor) => (
          <button
            aria-label={`Открыть ${floor.number} этаж`}
            className={floor.number === selectedNumber ? "facade-floor active" : "facade-floor"}
            key={floor.id}
            onClick={() => onSelectFloor(floor.id)}
          >
            <span>{floor.number}</span>
            <i />
            <i />
            <i />
            <i />
          </button>
        ))}
        {parking && (
          <button
            aria-label="Открыть паркинг"
            className="parking-line"
            onClick={() => onSelectFloor(parking.id)}
          >
            Паркинг
          </button>
        )}
      </div>
      <div className="building-metrics">
        <Metric label="Замечаний" value={floorIssues} tone="warning" />
        <Metric label="Проемов на корректировке" value={floorOpenings} tone="alert" />
        <Metric label="Готовность" value={`${floorReadiness}%`} />
      </div>
    </div>
  );
}

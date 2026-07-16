import React, { useState } from "react";
import { statusMeta } from "../domain/statuses";

export default function FloorPlan({
  object,
  building,
  floor,
  onOpenDoor,
  onBack,
  onCreateTask,
  canCreateTask = false,
}) {
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
            {canCreateTask && (
              <button
                className="secondary-button slim"
                onClick={() => onCreateTask({
                  objectId: object.id,
                  buildingId: building.id,
                  floorId: floor.id,
                })}
              >
                Поставить задачу
              </button>
            )}
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
                style={building.floorTemplate?.image
                  ? { backgroundImage: `url(${building.floorTemplate.image})` }
                  : undefined}
              >
                <div className="plan-frame" />
                {building.floorTemplate?.rooms?.length > 0 && (
                  <SavedTemplateLayout template={building.floorTemplate} />
                )}
                <div className="corridor-line corridor-line-top" />
                <div className="corridor-line corridor-line-bottom" />
                <ApartmentRoom number={1} split="horizontal" />
                <ApartmentRoom number={2} split="vertical" />
                <ApartmentRoom number={3} split="vertical" />
                <ApartmentRoom number={4} split="horizontal" />
                <ApartmentRoom number={5} split="vertical" />
                <ApartmentRoom number={6} split="vertical" />
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
            Для уровня "{floor.label}" двери пока не заведены.
          </div>
        )}
      </div>
    </section>
  );
}

function ApartmentRoom({ number, split }) {
  return (
    <div className={`room apartment apartment-${number}`}>
      <strong>Квартира {number}</strong>
      <span className="wet-zone" />
      <span className={`room-split ${split}`} />
    </div>
  );
}

export function DoorMarker({ door, onOpen }) {
  const tone = door.openingStatus === "требует корректировки"
    ? "orange"
    : statusMeta[door.doorStatus]?.tone ?? "gray";
  const label = door.mark ?? door.number.replace("Квартира ", "");
  const swingClass = door.swing ?? "down-right";

  return (
    <button
      aria-label={label}
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
        <div
          className="saved-template-room"
          key={room.id}
          style={{
            left: `${room.x}%`,
            top: `${room.y}%`,
            width: `${room.width}%`,
            height: `${room.height}%`,
          }}
        >
          {room.label}
        </div>
      ))}
      <div
        className="saved-template-stair"
        style={{
          left: `${template.stair.x}%`,
          top: `${template.stair.y}%`,
          width: `${template.stair.width}%`,
          height: `${template.stair.height}%`,
        }}
      >
        Лестница
      </div>
      <div
        className="saved-template-arrow"
        style={{
          left: `${template.arrow.x}%`,
          top: `${template.arrow.y}%`,
          fontSize: `${template.arrow.size}px`,
          transform: `translate(-50%, -50%) rotate(${template.arrow.angle}deg)`,
        }}
      >
        ➜
      </div>
    </div>
  );
}

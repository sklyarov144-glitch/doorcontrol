import React, { useState } from "react";
import { StatusBadge } from "../components/UiPrimitives";
import { buildingReadiness } from "../domain/objectAccess";
import { createEmptyBuilding, resizeBuildingFloors } from "../domain/objectFactory";
import { canCreate, canEdit } from "../domain/permissions";

export default function ObjectPage({
  object,
  objects,
  users,
  teams = [],
  user,
  onOpenBuilding,
  onCreateTask,
  canCreateTask = false,
  onChange,
}) {
  const [objectEditOpen, setObjectEditOpen] = useState(false);
  const [buildingEdit, setBuildingEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState("");
  const canManageObject = ["creator", "company_head"].includes(user.role)
    || (user.role === "construction_director"
      && [object.responsibleDirectorId, object.responsibleId].includes(user.id));
  const canCreateBuilding = canCreate(user, "building");
  const canEditBuilding = canEdit(user, "building");
  const activeBuildings = object.buildings.filter((building) => building.status !== "архив");

  const persistObjects = async (nextObjects, onSuccess) => {
    setSaving(true);
    setPersistenceError("");
    try {
      await onChange(nextObjects);
      onSuccess();
    } catch {
      setPersistenceError("Изменения не сохранены. Проверьте соединение и повторите попытку.");
    } finally {
      setSaving(false);
    }
  };

  const updateObject = async (values) => {
    const nextObjects = objects.map((item) => item.id === object.id
      ? {
          ...item,
          ...values,
          responsibleId: values.responsibleDirectorId,
          updatedAt: new Date().toISOString(),
        }
      : item);
    await persistObjects(nextObjects, () => setObjectEditOpen(false));
  };

  const saveBuilding = async (values) => {
    const now = new Date();
    const floorCount = Math.max(1, Number(values.floorsCount) || 1);
    const normalizedName = `Корпус ${String(values.name).replace(/^Корпус\s*/i, "")}`;
    const building = values.id
      ? {
          ...values,
          name: normalizedName,
          floors: resizeBuildingFloors(values, floorCount),
          floorsCount: floorCount,
          doorsPerFloor: Math.max(0, Number(values.doorsPerFloor) || 0),
          updatedAt: now.toISOString(),
        }
      : createEmptyBuilding({
          ...values,
          id: `building-${Date.now()}`,
          objectId: object.id,
          name: normalizedName,
          floorsCount: floorCount,
        }, now);
    const nextObjects = objects.map((item) => {
      if (item.id !== object.id) return item;
      return {
        ...item,
        buildings: values.id
          ? item.buildings.map((current) => current.id === values.id
            ? { ...current, ...building }
            : current)
          : [...item.buildings, building],
        updatedAt: now.toISOString(),
      };
    });
    await persistObjects(nextObjects, () => setBuildingEdit(null));
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
          {canManageObject && (
            <button className="secondary-button slim" onClick={() => setObjectEditOpen(true)}>
              Редактировать объект
            </button>
          )}
          {canCreateBuilding && (
            <button className="primary-button slim" onClick={() => setBuildingEdit({})}>
              Добавить корпус
            </button>
          )}
          {canCreateTask && (
            <button
              className="secondary-button slim"
              onClick={() => onCreateTask({ objectId: object.id })}
            >
              Поставить задачу
            </button>
          )}
        </div>
      </div>
      {persistenceError && <div className="form-error" role="alert">{persistenceError}</div>}
      <div className="object-management-strip">
        <div>
          <span>Ответственный директор</span>
          <strong>{users.find((item) => item.id === object.responsibleDirectorId)?.name ?? "Не назначен"}</strong>
        </div>
        <div>
          <span>ИТР</span>
          <strong>
            {(object.responsibleItrIds ?? [])
              .map((id) => users.find((item) => item.id === id)?.name)
              .filter(Boolean)
              .join(", ") || "Не назначены"}
          </strong>
        </div>
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
              <small>
                {users.find((item) => item.id === building.responsibleItrId)?.name
                  ?? "ИТР не назначен"}
              </small>
            </div>
            <div className="building-card-actions">
              <StatusBadge value={`Готовность ${buildingReadiness(building)}%`} />
              {canEditBuilding && (
                <span onClick={(event) => { event.stopPropagation(); setBuildingEdit(building); }}>
                  Редактировать
                </span>
              )}
            </div>
          </button>
        ))}
        {activeBuildings.length === 0 && (
          <div className="empty-plan">Корпуса ещё не добавлены администратором.</div>
        )}
      </div>
      {objectEditOpen && (
        <ObjectEditModal
          object={object}
          users={users}
          saving={saving}
          onClose={() => setObjectEditOpen(false)}
          onSave={updateObject}
        />
      )}
      {buildingEdit && (
        <BuildingEditModal
          building={buildingEdit}
          users={users}
          teams={teams}
          saving={saving}
          onClose={() => setBuildingEdit(null)}
          onSave={saveBuilding}
        />
      )}
    </section>
  );
}

function ObjectEditModal({ object, users, saving, onClose, onSave }) {
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
  const toggleItr = (id) => update(
    "responsibleItrIds",
    form.responsibleItrIds.includes(id)
      ? form.responsibleItrIds.filter((item) => item !== id)
      : [...form.responsibleItrIds, id]
  );

  return (
    <div className="modal-backdrop">
      <form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-title">
          <div><h2>Редактировать объект</h2><p>Управленческие параметры объекта.</p></div>
          <button type="button" aria-label="Закрыть редактирование объекта" onClick={onClose}>×</button>
        </div>
        <div className="task-form-grid">
          <label>Название<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label>Адрес<input value={form.address} onChange={(event) => update("address", event.target.value)} /></label>
          <label>Застройщик / заказчик<input value={form.developer} onChange={(event) => update("developer", event.target.value)} /></label>
          <label>Статус<select value={form.status} onChange={(event) => update("status", event.target.value)}>{["подготовка", "в работе", "приостановлен", "завершён", "архив"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Ответственный директор<select value={form.responsibleDirectorId} onChange={(event) => update("responsibleDirectorId", event.target.value)}><option value="">Не назначен</option>{users.filter((item) => item.role === "construction_director").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Дата начала<input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></label>
          <label>План окончания<input type="date" value={form.plannedEndDate} onChange={(event) => update("plannedEndDate", event.target.value)} /></label>
          <label>Активность<select value={form.isActive ? "active" : "archive"} onChange={(event) => update("isActive", event.target.value === "active")}><option value="active">Активен</option><option value="archive">Архивный</option></select></label>
          <label className="wide">Описание<textarea value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
        </div>
        <div className="checkbox-grid">
          {users.filter((item) => item.role === "itr").map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={form.responsibleItrIds.includes(item.id)}
                onChange={() => toggleItr(item.id)}
              />
              {item.name}
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" disabled={saving} onClick={onClose}>Отмена</button>
          <button className="primary-button" disabled={saving}>{saving ? "Сохраняем..." : "Сохранить объект"}</button>
        </div>
      </form>
    </div>
  );
}

function BuildingEditModal({ building, users, teams, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    id: building.id,
    floors: building.floors,
    name: building.name?.replace(/^Корпус\s*/i, "") ?? "",
    floorsCount: building.floorsCount
      ?? building.floors?.filter((floor) => floor.type === "floor").length
      ?? 25,
    doorsPerFloor: building.doorsPerFloor ?? 6,
    responsibleItrId: building.responsibleItrId ?? "",
    assignedTeamIds: building.assignedTeamIds ?? [],
    status: building.status ?? "в работе",
    comment: building.comment ?? "",
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleTeam = (id) => update(
    "assignedTeamIds",
    form.assignedTeamIds.includes(id)
      ? form.assignedTeamIds.filter((item) => item !== id)
      : [...form.assignedTeamIds, id]
  );

  return (
    <div className="modal-backdrop">
      <form className="task-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-title">
          <div>
            <h2>{form.id ? "Редактировать корпус" : "Добавить корпус"}</h2>
            <p>Этажность, ИТР и бригады корпуса.</p>
          </div>
          <button type="button" aria-label="Закрыть редактирование корпуса" onClick={onClose}>×</button>
        </div>
        <div className="task-form-grid">
          <label>Корпус<input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="4.1" /></label>
          <label>Количество этажей<input type="number" min="1" required value={form.floorsCount} onChange={(event) => update("floorsCount", event.target.value)} /></label>
          <label>Дверей на этаже<input type="number" min="0" value={form.doorsPerFloor} onChange={(event) => update("doorsPerFloor", event.target.value)} /></label>
          <label>Ответственный ИТР<select value={form.responsibleItrId} onChange={(event) => update("responsibleItrId", event.target.value)}><option value="">Не назначен</option>{users.filter((item) => item.role === "itr").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Статус<select value={form.status} onChange={(event) => update("status", event.target.value)}>{["подготовка", "в работе", "проблемный", "завершён", "архив"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="wide">Комментарий<textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} /></label>
        </div>
        <div className="checkbox-grid">
          {teams.map((team) => (
            <label key={team.id}>
              <input
                type="checkbox"
                checked={form.assignedTeamIds.includes(team.id)}
                onChange={() => toggleTeam(team.id)}
              />
              {team.name}
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" disabled={saving} onClick={onClose}>Отмена</button>
          <button className="primary-button" disabled={saving}>{saving ? "Сохраняем..." : "Сохранить корпус"}</button>
        </div>
      </form>
    </div>
  );
}

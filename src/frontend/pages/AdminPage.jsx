import React, { useEffect, useState } from "react";
import {
  applyTemplateToBuilding,
  defaultDirectionArrow,
  defaultStair,
  generateFloorTemplateDraft,
} from "../domain/floorTemplate";
import { createEmptyBuilding } from "../domain/objectFactory";

export default function AdminPage({ objects, user, users, onChange, onPlanUpload }) {
  const [objectForm, setObjectForm] = useState({ name: "", address: "", metro: "" });
  const [buildingForm, setBuildingForm] = useState({ number: "", floors: 25 });
  const [templateForm, setTemplateForm] = useState({ apartments: 6, mop: 2 });
  const [objectId, setObjectId] = useState(objects[0]?.id ?? "");
  const selectedObject = objects.find((item) => item.id === objectId) ?? objects[0];
  const [buildingId, setBuildingId] = useState(selectedObject?.buildings?.[0]?.id ?? "");
  const selectedBuilding = selectedObject?.buildings?.find((item) => item.id === buildingId)
    ?? selectedObject?.buildings?.[0];
  const [draftDoors, setDraftDoors] = useState(selectedBuilding?.floorTemplate?.doors ?? []);
  const [draftRooms, setDraftRooms] = useState(selectedBuilding?.floorTemplate?.rooms ?? []);
  const [stair, setStair] = useState(selectedBuilding?.floorTemplate?.stair ?? defaultStair);
  const [arrow, setArrow] = useState(selectedBuilding?.floorTemplate?.arrow ?? defaultDirectionArrow);
  const [planImage, setPlanImage] = useState(selectedBuilding?.floorTemplate?.image ?? "");
  const [planImageStorageUri, setPlanImageStorageUri] = useState(selectedBuilding?.floorTemplate?.imageStorageUri ?? "");
  const [planUploading, setPlanUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [notice, setNotice] = useState("");
  const canCreateObject = ["creator", "company_head"].includes(user.role);
  const canAssignResponsible = ["creator", "company_head", "construction_director"].includes(user.role);
  const responsibleDirectors = users.filter((item) => item.role === "construction_director" && item.status !== "disabled");
  const responsibleItr = users.filter((item) => item.role === "itr" && item.status !== "disabled");

  useEffect(() => {
    setBuildingId(selectedObject?.buildings?.[0]?.id ?? "");
  }, [objectId]);

  useEffect(() => {
    setDraftDoors(selectedBuilding?.floorTemplate?.doors ?? []);
    setDraftRooms(selectedBuilding?.floorTemplate?.rooms ?? []);
    setStair(selectedBuilding?.floorTemplate?.stair ?? { ...defaultStair });
    setArrow(selectedBuilding?.floorTemplate?.arrow ?? { ...defaultDirectionArrow });
    setPlanImage(selectedBuilding?.floorTemplate?.image ?? "");
    setPlanImageStorageUri(selectedBuilding?.floorTemplate?.imageStorageUri ?? "");
    setSelectedElement(null);
  }, [selectedBuilding?.id, selectedBuilding?.floorTemplate]);

  const persistAdminChange = async (next, successMessage) => {
    setSaving(true);
    setNotice("");
    try {
      const persisted = await onChange(next);
      setNotice(successMessage);
      return persisted;
    } catch {
      setNotice("Изменения не сохранены. Проверьте доступ и соединение.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createObject = async (event) => {
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
      responsibleDirectorId: responsibleDirectors[0]?.id ?? "",
      buildings: [],
    };
    const persisted = await persistAdminChange([...objects, nextObject], "Объект создан");
    if (!persisted) return;
    const created = persisted.find((item) => item.id === id || item.legacyId === id);
    setObjectId(created?.id ?? id);
    setObjectForm({ name: "", address: "", metro: "" });
  };

  const assignResponsible = async (responsibleId) => {
    if (!selectedObject || !canAssignResponsible) return;
    const next = objects.map((item) => item.id === selectedObject.id
      ? { ...item, responsibleId, responsibleDirectorId: responsibleId }
      : item);
    await persistAdminChange(next, "Ответственный за объект назначен");
  };

  const assignBuildingItr = async (responsibleItrId) => {
    if (!selectedObject || !selectedBuilding || !canAssignResponsible) return;
    const next = objects.map((object) => object.id !== selectedObject.id ? object : {
      ...object,
      buildings: object.buildings.map((building) => building.id === selectedBuilding.id
        ? { ...building, responsibleItrId }
        : building),
    });
    await persistAdminChange(next, "Ответственный ИТР за корпус назначен");
  };

  const addBuilding = async (event) => {
    event.preventDefault();
    if (!selectedObject || !buildingForm.number.trim()) return;
    const id = `building-${Date.now()}`;
    const floorCount = Math.max(1, Number(buildingForm.floors) || 1);
    const building = createEmptyBuilding({
      id,
      objectId: selectedObject.id,
      name: `Корпус ${buildingForm.number.trim()}`,
      floorsCount: floorCount,
      doorsPerFloor: 0,
      status: "в работе",
    });
    const next = objects.map((item) => item.id === selectedObject.id
      ? { ...item, buildings: [...(item.buildings ?? []), building] }
      : item);
    const persisted = await persistAdminChange(next, "Корпус добавлен");
    if (!persisted) return;
    const persistedObject = persisted.find((item) => item.id === selectedObject.id || item.legacyId === selectedObject.id);
    const created = persistedObject?.buildings.find((item) => item.id === id || item.legacyId === id);
    setObjectId(persistedObject?.id ?? selectedObject.id);
    setBuildingId(created?.id ?? id);
    setBuildingForm({ number: "", floors: floorCount });
  };

  const generateTemplate = () => {
    if (!selectedBuilding) return;
    const draft = generateFloorTemplateDraft(selectedBuilding.id, templateForm.apartments, templateForm.mop);
    setDraftDoors(draft.doors);
    setDraftRooms(draft.rooms);
    setStair(draft.stair);
    setArrow(draft.arrow);
    setNotice("Квартиры и двери сгенерированы. Элементы можно расставить на плане.");
  };

  const moveElement = (event, payload) => {
    if (!editing || !payload) return;
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

  const saveTemplate = async () => {
    if (!selectedObject || !selectedBuilding || draftDoors.length === 0) return;
    const template = {
      apartments: draftRooms.length,
      mopDoors: draftDoors.filter((door) => door.type === "МОП").length,
      image: planImage,
      imageStorageUri: planImageStorageUri || undefined,
      rooms: draftRooms,
      stair,
      arrow,
      doors: draftDoors,
    };
    const next = objects.map((object) => object.id !== selectedObject.id ? object : {
      ...object,
      buildings: object.buildings.map((building) => building.id === selectedBuilding.id
        ? applyTemplateToBuilding(building, template)
        : building),
    });
    const persisted = await persistAdminChange(next, "Шаблон сохранён и применён ко всем этажам корпуса");
    if (persisted) setEditing(false);
  };

  const uploadPlan = async (file) => {
    if (!file || !selectedObject || !selectedBuilding) return;
    setPlanUploading(true);
    setNotice("");
    try {
      const firstFloor = selectedBuilding.floors.find((floor) => floor.type === "floor");
      const uploaded = await onPlanUpload({
        objectId: selectedObject.id,
        buildingId: selectedBuilding.id,
        floorId: firstFloor?.id ?? "template",
      }, file);
      setPlanImage(uploaded.image);
      setPlanImageStorageUri(uploaded.imageStorageUri ?? "");
      setNotice("План загружен. Сохраните шаблон этажа.");
    } catch {
      setNotice("Не удалось загрузить план. Допустимы PNG, JPEG или WebP до 20 МБ.");
    } finally {
      setPlanUploading(false);
    }
  };

  return (
    <section className="admin-panel">
      <div className="admin-intro">
        <div><h2>Настройка объекта</h2><p>Создайте структуру и расставьте двери типового этажа.</p></div>
        {notice && <span role="status">{notice}</span>}
      </div>
      <div className="admin-steps">
        {canCreateObject && <ObjectCreateCard value={objectForm} onChange={setObjectForm} onSubmit={createObject} disabled={saving} />}
        <ResponsibleCard
          step={canCreateObject ? "02" : "01"}
          objects={objects}
          selectedObject={selectedObject}
          selectedBuilding={selectedBuilding}
          directors={responsibleDirectors}
          itrUsers={responsibleItr}
          canAssign={canAssignResponsible}
          onObject={setObjectId}
          onBuilding={setBuildingId}
          onDirector={assignResponsible}
          onItr={assignBuildingItr}
        />
        <BuildingCreateCard
          step={canCreateObject ? "03" : "02"}
          objects={objects}
          selectedObject={selectedObject}
          value={buildingForm}
          onObject={setObjectId}
          onChange={setBuildingForm}
          onSubmit={addBuilding}
          disabled={saving}
        />
        <TemplateSetupCard
          step={canCreateObject ? "04" : "03"}
          selectedObject={selectedObject}
          selectedBuilding={selectedBuilding}
          value={templateForm}
          onBuilding={setBuildingId}
          onChange={setTemplateForm}
          onGenerate={generateTemplate}
        />
      </div>
      <TemplateEditor
        building={selectedBuilding}
        doors={draftDoors}
        setDoors={setDraftDoors}
        rooms={draftRooms}
        setRooms={setDraftRooms}
        stair={stair}
        setStair={setStair}
        arrow={arrow}
        setArrow={setArrow}
        planImage={planImage}
        planUploading={planUploading}
        editing={editing}
        setEditing={setEditing}
        selectedElement={selectedElement}
        setSelectedElement={setSelectedElement}
        onMove={moveElement}
        onUpload={uploadPlan}
        onSave={saveTemplate}
        saving={saving}
      />
    </section>
  );
}

function ObjectCreateCard({ value, onChange, onSubmit, disabled }) {
  return <form className="admin-card" onSubmit={onSubmit}><b>01</b><h3>Создание объекта</h3><label>Название<input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label><label>Район / адрес<input value={value.address} onChange={(event) => onChange({ ...value, address: event.target.value })} /></label><label>Метро<input value={value.metro} onChange={(event) => onChange({ ...value, metro: event.target.value })} /></label><button className="primary-button" disabled={disabled}>Создать объект</button></form>;
}

function ResponsibleCard({ step, objects, selectedObject, selectedBuilding, directors, itrUsers, canAssign, onObject, onBuilding, onDirector, onItr }) {
  return <div className="admin-card"><b>{step}</b><h3>Ответственные</h3><label>Объект<select value={selectedObject?.id ?? ""} onChange={(event) => onObject(event.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Директор объекта<select value={selectedObject?.responsibleDirectorId ?? ""} disabled={!canAssign} onChange={(event) => onDirector(event.target.value)}><option value="">Не назначен</option>{directors.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.position}</option>)}</select></label><label>Корпус<select value={selectedBuilding?.id ?? ""} onChange={(event) => onBuilding(event.target.value)}>{selectedObject?.buildings?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ответственный ИТР<select value={selectedBuilding?.responsibleItrId ?? ""} disabled={!canAssign || !selectedBuilding} onChange={(event) => onItr(event.target.value)}><option value="">Не назначен</option>{itrUsers.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.position}</option>)}</select></label></div>;
}

function BuildingCreateCard({ step, objects, selectedObject, value, onObject, onChange, onSubmit, disabled }) {
  return <form className="admin-card" onSubmit={onSubmit}><b>{step}</b><h3>Добавление корпуса</h3><label>Объект<select value={selectedObject?.id ?? ""} onChange={(event) => onObject(event.target.value)}>{objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Номер корпуса<input value={value.number} placeholder="4.1" onChange={(event) => onChange({ ...value, number: event.target.value })} /></label><label>Количество этажей<input type="number" min="1" value={value.floors} onChange={(event) => onChange({ ...value, floors: event.target.value })} /></label><button className="primary-button" disabled={disabled}>Добавить корпус</button></form>;
}

function TemplateSetupCard({ step, selectedObject, selectedBuilding, value, onBuilding, onChange, onGenerate }) {
  return <div className="admin-card"><b>{step}</b><h3>Типовой этаж</h3><label>Корпус<select value={selectedBuilding?.id ?? ""} onChange={(event) => onBuilding(event.target.value)}>{selectedObject?.buildings?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Квартир на этаже<input type="number" min="1" value={value.apartments} onChange={(event) => onChange({ ...value, apartments: event.target.value })} /></label><label>МОП-дверей<input type="number" min="0" value={value.mop} onChange={(event) => onChange({ ...value, mop: event.target.value })} /></label><button className="primary-button" type="button" disabled={!selectedBuilding} onClick={onGenerate}>Сгенерировать план</button></div>;
}

function TemplateEditor({ building, doors, setDoors, rooms, setRooms, stair, setStair, arrow, setArrow, planImage, planUploading, editing, setEditing, selectedElement, setSelectedElement, onMove, onUpload, onSave, saving }) {
  return <div className="admin-template-card"><div className="admin-template-toolbar"><div><h3>Шаблон этажа</h3><p>{building?.name ?? "Сначала добавьте корпус"}</p></div><label className={`file-button ${planUploading ? "disabled" : ""}`}>{planUploading ? "Загрузка..." : "Загрузить план"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={planUploading || !building} onChange={(event) => onUpload(event.target.files?.[0])} /></label><button className="secondary-button" type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Завершить расстановку" : "Редактировать расположение"}</button><button className="primary-button" type="button" disabled={saving || !doors.length} onClick={onSave}>Сохранить шаблон этажа</button></div><div className="template-editor-grid"><div className={`admin-plan ${planImage ? "has-image" : ""} ${editing ? "editing" : ""}`} style={planImage ? { backgroundImage: `url(${planImage})` } : undefined} onDragOver={(event) => editing && event.preventDefault()} onDrop={(event) => onMove(event, event.dataTransfer.getData("text/plain"))}>{!planImage && <div className="admin-plan-corridor" />}{rooms.map((room) => <button key={room.id} draggable={editing} onClick={() => setSelectedElement({ type: "room", id: room.id })} onDragStart={(event) => event.dataTransfer.setData("text/plain", `room:${room.id}`)} className="admin-room" style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.width}%`, height: `${room.height}%` }}>{room.label}</button>)}<button draggable={editing} onClick={() => setSelectedElement({ type: "stair" })} onDragStart={(event) => event.dataTransfer.setData("text/plain", "stair:main")} className="admin-plan-stair" style={{ left: `${stair.x}%`, top: `${stair.y}%`, width: `${stair.width}%`, height: `${stair.height}%` }}>Лестница</button><button draggable={editing} aria-label="Направление движения" onClick={() => setSelectedElement({ type: "arrow" })} onDragStart={(event) => event.dataTransfer.setData("text/plain", "arrow:main")} className="admin-direction-arrow" style={{ left: `${arrow.x}%`, top: `${arrow.y}%`, fontSize: `${arrow.size}px`, transform: `translate(-50%, -50%) rotate(${arrow.angle}deg)` }}>➜</button>{doors.map((door) => <button key={door.id} draggable={editing} onClick={() => setSelectedElement({ type: "door", id: door.id })} onDragStart={(event) => event.dataTransfer.setData("text/plain", `door:${door.id}`)} className={`admin-door ${door.type === "МОП" ? "mop" : ""}`} style={{ left: `${door.x}%`, top: `${door.y}%` }} title={editing ? "Перетащите дверь" : door.label}>{door.mark}</button>)}</div><TemplateInspector selected={selectedElement} rooms={rooms} setRooms={setRooms} stair={stair} setStair={setStair} arrow={arrow} setArrow={setArrow} doors={doors} setDoors={setDoors} /></div></div>;
}

function TemplateInspector({ selected, rooms, setRooms, stair, setStair, arrow, setArrow, doors, setDoors }) {
  if (!selected) return <aside className="template-inspector"><h3>Параметры элемента</h3><p>Выберите квартиру, дверь, лестницу или стрелку на плане.</p></aside>;
  const room = selected.type === "room" ? rooms.find((item) => item.id === selected.id) : null;
  const door = selected.type === "door" ? doors.find((item) => item.id === selected.id) : null;
  const updateRoom = (values) => setRooms((current) => current.map((item) => item.id === selected.id ? { ...item, ...values } : item));
  const updateDoorLabel = (value) => setDoors((current) => current.map((item) => item.id === selected.id ? { ...item, mark: value } : item));
  return <aside className="template-inspector"><h3>Параметры элемента</h3>{room && <><label>Подпись<input value={room.label} onChange={(event) => updateRoom({ label: event.target.value })} /></label><RangeField label="Ширина" value={room.width} min={8} max={45} onChange={(value) => updateRoom({ width: value })} /><RangeField label="Высота" value={room.height} min={10} max={45} onChange={(value) => updateRoom({ height: value })} /></>}{door && <label>Марка двери<input value={door.mark} onChange={(event) => updateDoorLabel(event.target.value)} /></label>}{selected.type === "stair" && <><RangeField label="Ширина лестницы" value={stair.width} min={8} max={40} onChange={(value) => setStair({ ...stair, width: value })} /><RangeField label="Высота лестницы" value={stair.height} min={8} max={45} onChange={(value) => setStair({ ...stair, height: value })} /></>}{selected.type === "arrow" && <><RangeField label="Размер стрелки" value={arrow.size} min={20} max={90} onChange={(value) => setArrow({ ...arrow, size: value })} /><RangeField label="Угол" value={arrow.angle} min={-180} max={180} onChange={(value) => setArrow({ ...arrow, angle: value })} /></>}</aside>;
}

function RangeField({ label, value, min, max, onChange }) {
  return <label className="range-field"><span>{label}<b>{Math.round(value)}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

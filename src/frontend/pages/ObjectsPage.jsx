import React from "react";
import matveevskyParkImage from "../assets/matveevsky-park.jpg";
import { Metric, StatusBadge } from "../components/UiPrimitives";
import { objectMetrics } from "../domain/objectAccess";

export default function ObjectsPage({ objects, onOpen }) {
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
  const metrics = objectMetrics(object);

  return (
    <button className="object-card visual-card" aria-label={`Открыть объект ${object.name}`} onClick={onOpen}>
      <div className="object-image">
        <img src={matveevskyParkImage} alt="" />
        <div className="object-image-overlay">
          <StatusBadge value={object.status} />
          <div><strong>{object.name}</strong><p>{object.address}</p></div>
        </div>
      </div>
      <div className="object-card-body">
        <div className="object-card-main">
          <div><span className="metric-label">Готовность</span><strong className="readiness-value">{metrics.readiness}%</strong></div>
          <span className="open-arrow">Перейти</span>
        </div>
        <div className="progress-bar"><span style={{ width: `${metrics.readiness}%` }} /></div>
        <div className="metric-grid">
          <Metric label="Замечания" value={metrics.issues} tone="warning" />
          <Metric label="Проемы на корректировке" value={metrics.openingsOnCorrection} tone="alert" />
        </div>
      </div>
    </button>
  );
}

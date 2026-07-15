import React from "react";
import { statusMeta } from "../domain/statuses";

export function StatusBadge({ value }) {
  const tone = statusMeta[value]?.tone ?? "blue";
  return <span className={`status-badge status-${tone}`}>{value}</span>;
}

export function Metric({ label, value, tone = "neutral" }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function Detail({ label, value }) {
  return <div className="detail"><span>{label}</span><strong>{value}</strong></div>;
}

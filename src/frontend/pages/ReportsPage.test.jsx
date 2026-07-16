import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReportsPage from "./ReportsPage";

const objects = [
  { id: "object-1", name: "ЖК Матвеевский парк", buildings: [{ id: "building-1", name: "Корпус 4.1", floors: [{ id: "floor-8", type: "floor", number: 8, doors: [
    { id: "door-1", doorStatus: "смонтирована", storageAct: "не передана", issue: "нет" },
    { id: "door-2", doorStatus: "передано по акту", storageAct: "передано по акту", issue: "нет" },
  ] }] }] },
  { id: "object-2", name: "ЖК Прокшино", buildings: [{ id: "building-2", name: "Корпус 1", floors: [{ id: "floor-2", type: "floor", number: 2, doors: [
    { id: "door-3", doorStatus: "не начато", storageAct: "не передана", issue: "есть замечание" },
  ] }] }] },
];

function metric(label) {
  return within(screen.getByText(label).parentElement).getByRole("strong").textContent;
}

describe("ReportsPage", () => {
  it("shows aggregate production metrics from object doors", () => {
    render(<ReportsPage objects={objects} />);
    expect(metric("Всего дверей")).toBe("3");
    expect(metric("Смонтировано")).toBe("2");
    expect(metric("Принято ТН")).toBe("1");
    expect(metric("Готовность")).toBe("67%");
  });

  it("recalculates the report for the selected object", () => {
    render(<ReportsPage objects={objects} />);
    fireEvent.change(screen.getByLabelText("Объект отчёта"), { target: { value: "object-2" } });
    expect(metric("Всего дверей")).toBe("1");
    expect(metric("Смонтировано")).toBe("0");
    expect(metric("Замечаний")).toBe("1");
    expect(screen.queryByText("Корпус 4.1")).not.toBeInTheDocument();
  });

  it("groups the selected scope by floor", () => {
    render(<ReportsPage objects={objects} />);
    fireEvent.change(screen.getByLabelText("Объект отчёта"), { target: { value: "object-1" } });
    fireEvent.change(screen.getByLabelText("Группировка отчёта"), { target: { value: "floor" } });
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});

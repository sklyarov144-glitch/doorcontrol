import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TodayTasksPage from "./TodayTasksPage";

const users = [
  { id: "itr-1", name: "Инженер ИТР", role: "itr" },
  { id: "itr-2", name: "Другой ИТР", role: "itr" },
];
const objects = [{
  id: "object-1",
  name: "ЖК Матвеевский парк",
  buildings: [{
    id: "building-1",
    name: "Корпус 4.1",
    floors: [{ id: "floor-1", number: 8, doors: [{ id: "door-1", number: "Квартира 1", mark: "Д-1" }] }],
  }],
}];
const tasks = [
  { id: "task-1", title: "Передать дверь ТН", description: "Автоматическая просрочка", priority: "высокий", status: "новая", assignedTo: "itr-1", objectId: "object-1", buildingId: "building-1", floorId: "floor-1", doorId: "door-1", dueDate: "2000-01-01" },
  { id: "task-2", title: "Закрытая задача", priority: "средний", status: "выполнена", assignedTo: "itr-1", objectId: "object-1", dueDate: "2000-01-01" },
  { id: "task-3", title: "Чужая задача", priority: "высокий", status: "новая", assignedTo: "itr-2", objectId: "object-1", dueDate: "2000-01-01" },
];

describe("TodayTasksPage", () => {
  it("shows backend tasks only for the current ITR and resolves their context", () => {
    render(<TodayTasksPage tasks={tasks} objects={objects} user={users[0]} users={users} onOpen={vi.fn()} onUpdateTask={vi.fn()} />);

    expect(screen.getAllByText("Передать дверь ТН").length).toBeGreaterThan(0);
    expect(screen.getByText("Закрытая задача")).toBeInTheDocument();
    expect(screen.queryByText("Чужая задача")).not.toBeInTheDocument();
    expect(screen.getAllByText("ЖК Матвеевский парк").length).toBeGreaterThan(0);
    expect(screen.getByText("Корпус 4.1")).toBeInTheDocument();
    expect(screen.getByText("Этаж 8")).toBeInTheDocument();
  });

  it("updates status through the injected production callback", () => {
    const onUpdateTask = vi.fn();
    render(<TodayTasksPage tasks={tasks} objects={objects} user={users[0]} users={users} onOpen={vi.fn()} onUpdateTask={onUpdateTask} />);
    const row = within(screen.getByRole("table")).getByText("Передать дверь ТН").closest("tr");

    fireEvent.click(within(row).getByRole("button", { name: "В работу" }));
    expect(onUpdateTask).toHaveBeenCalledWith("task-1", { status: "в работе" });
    fireEvent.click(within(row).getByRole("button", { name: "Выполнено" }));
    expect(onUpdateTask).toHaveBeenCalledWith("task-1", { status: "выполнена" });
  });

  it("opens the linked door context in one action", () => {
    const onOpen = vi.fn();
    render(<TodayTasksPage tasks={tasks} objects={objects} user={users[0]} users={users} onOpen={onOpen} onUpdateTask={vi.fn()} />);
    const row = within(screen.getByRole("table")).getByText("Передать дверь ТН").closest("tr");
    fireEvent.click(within(row).getByRole("button", { name: "Открыть" }));
    expect(onOpen).toHaveBeenCalledWith(tasks[0]);
  });
});

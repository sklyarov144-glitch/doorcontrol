import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TasksPage from "./TasksPage";

const users = [
  { id: "director-1", name: "Директор", role: "construction_director" },
  { id: "itr-1", name: "Инженер ИТР", role: "itr" },
  { id: "itr-2", name: "Другой ИТР", role: "itr" },
];
const objects = [{ id: "object-1", name: "ЖК Матвеевский парк", buildings: [{ id: "building-1", name: "Корпус 4.1", floors: [{ id: "floor-1", number: 8, doors: [{ id: "door-1", number: "Квартира 1", mark: "Д-1" }] }] }] }];
const tasks = [
  { id: "task-1", title: "Добавить акт АОХ", description: "Загрузить ссылку", priority: "высокий", status: "новая", createdBy: "director-1", assignedTo: "itr-1", objectId: "object-1", buildingId: "building-1", floorId: "floor-1", doorId: "door-1", dueDate: "2099-01-01", comments: [], documentLinks: [] },
  { id: "task-2", title: "Чужая задача", description: "Не показывать", priority: "низкий", status: "новая", createdBy: "director-1", assignedTo: "itr-2", comments: [], documentLinks: [] },
];

function renderItr(overrides = {}) {
  const props = {
    tasks,
    objects,
    users,
    user: users[1],
    onOpen: vi.fn(),
    onCreateTask: vi.fn(),
    onUpdateTask: vi.fn(),
    onAddComment: vi.fn(),
    onAddLink: vi.fn(),
    ...overrides,
  };
  render(<TasksPage {...props} />);
  return props;
}

describe("TasksPage", () => {
  it("shows only assigned tasks to ITR and updates their status", () => {
    const props = renderItr();

    expect(screen.getByText("Добавить акт АОХ")).toBeInTheDocument();
    expect(screen.queryByText("Чужая задача")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Поставить задачу" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "В работу" }));
    expect(props.onUpdateTask).toHaveBeenCalledWith("task-1", { status: "в работе" });
  });

  it("adds a comment without leaving the task page", () => {
    const props = renderItr();
    fireEvent.click(screen.getByRole("button", { name: "Комментарий" }));
    fireEvent.change(screen.getByLabelText("Комментарий к задаче"), { target: { value: "Акт загрузил" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(props.onAddComment).toHaveBeenCalledWith("task-1", "Акт загрузил");
  });

  it("adds a document link through the task callback", () => {
    const props = renderItr();
    fireEvent.click(screen.getByRole("button", { name: "Ссылка" }));
    fireEvent.change(screen.getByLabelText("Название ссылки"), { target: { value: "Акт АОХ" } });
    fireEvent.change(screen.getByLabelText("Ссылка на Яндекс.Диск"), { target: { value: "https://disk.yandex.ru/example" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить ссылку" }));
    expect(props.onAddLink).toHaveBeenCalledWith(tasks[0], expect.objectContaining({ title: "Акт АОХ", url: "https://disk.yandex.ru/example" }));
  });

  it("allows a director to create and cancel tasks", () => {
    renderItr({ user: users[0] });
    expect(screen.getByRole("button", { name: "Поставить задачу" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Отменить" })).toHaveLength(2);
  });
});

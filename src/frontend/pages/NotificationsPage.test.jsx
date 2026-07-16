import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotificationsPage from "./NotificationsPage";

const notifications = [
  { id: "notification-1", type: "акт АОХ просрочен", title: "Добавить акт АОХ", message: "ЖК Матвеевский парк · Корпус 4.1", priority: "высокий", status: "unread", createdAt: "2026-07-16T08:00:00Z", doorId: "door-1", taskId: "task-1" },
  { id: "notification-2", type: "ТН", title: "Передать дверь ТН", message: "Корпус 4.2", priority: "средний", status: "read", createdAt: "2026-07-15T08:00:00Z", doorId: "door-2" },
];

describe("NotificationsPage", () => {
  it("marks notifications read and exposes quick custody action", () => {
    const onMarkRead = vi.fn();
    const onQuickAct = vi.fn();
    render(<NotificationsPage notifications={notifications} onOpen={vi.fn()} onMarkRead={onMarkRead} onMarkAll={vi.fn()} onQuickAct={onQuickAct} onQuickTn={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Прочитано" }));
    expect(onMarkRead).toHaveBeenCalledWith("notification-1");
    fireEvent.click(screen.getByRole("button", { name: "Добавить акт" }));
    expect(onQuickAct).toHaveBeenCalledWith(notifications[0]);
  });

  it("filters notifications and invokes the TN quick action", () => {
    const onQuickTn = vi.fn();
    render(<NotificationsPage notifications={notifications} onOpen={vi.fn()} onMarkRead={vi.fn()} onMarkAll={vi.fn()} onQuickAct={vi.fn()} onQuickTn={onQuickTn} />);

    fireEvent.click(screen.getByRole("button", { name: "ТН" }));
    expect(screen.queryByText("Добавить акт АОХ")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Передано ТН" }));
    expect(onQuickTn).toHaveBeenCalledWith(notifications[1]);
  });
});

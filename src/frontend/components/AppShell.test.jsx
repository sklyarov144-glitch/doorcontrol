import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { menuForRole, Sidebar } from "./AppShell";

describe("application shell role navigation", () => {
  it("keeps administration out of the ITR navigation", () => {
    const labels = menuForRole("itr").map(([, label]) => label);
    expect(labels).toContain("Мои объекты");
    expect(labels).toContain("Мои задачи");
    expect(labels).not.toContain("Админ-панель");
    expect(labels).not.toContain("Финансы");
  });

  it("shows the full management contour to creator", () => {
    const labels = menuForRole("creator").map(([, label]) => label);
    expect(labels).toEqual(expect.arrayContaining(["Дашборд", "Админ-панель", "Финансы", "Роли", "Журнал действий"]));
  });

  it("routes from the sidebar and exposes the task notice", () => {
    const setScreen = vi.fn();
    render(<Sidebar role="itr" activeScreen="objects" setScreen={setScreen} onLogout={vi.fn()} taskNoticeCount={3} collapsed={false} onToggleCollapsed={vi.fn()} />);
    expect(screen.getByText("Новые задачи: 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Мои задачи" }));
    expect(setScreen).toHaveBeenCalledWith("tasks");
  });
});

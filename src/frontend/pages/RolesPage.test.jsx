import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RolesPage from "./RolesPage";

const users = [
  { id: "creator-1", role: "creator", status: "active" },
  { id: "head-1", role: "company_head", status: "active" },
  { id: "director-1", role: "construction_director", status: "disabled" },
  { id: "itr-1", role: "itr", status: "active" },
  { id: "itr-2", role: "itr", status: "active" },
];

describe("RolesPage", () => {
  it("shows account counts and the effective permission matrix", () => {
    render(<RolesPage users={users} onOpenUsers={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Роли и доступы" })).toBeInTheDocument();
    expect(screen.getByText("2 аккаунта")).toBeInTheDocument();

    const financeRow = screen.getByText("Финансовые показатели").closest("tr");
    expect(within(financeRow).getAllByText("Доступ")).toHaveLength(3);
    expect(within(financeRow).getByText("Нет")).toBeInTheDocument();

    const roleMatrixRow = screen.getByText("Матрица ролей").closest("tr");
    expect(within(roleMatrixRow).getAllByText("Доступ")).toHaveLength(1);
    expect(within(roleMatrixRow).getAllByText("Нет")).toHaveLength(3);
  });

  it("opens the protected user-management screen for role assignment", () => {
    const onOpenUsers = vi.fn();
    render(<RolesPage users={users} onOpenUsers={onOpenUsers} />);

    fireEvent.click(screen.getByRole("button", { name: "Назначить роль" }));
    expect(onOpenUsers).toHaveBeenCalledOnce();
  });
});

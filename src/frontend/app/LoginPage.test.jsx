import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPage, mockUsers } from "./LegacyApp";

describe("mock user login", () => {
  it.each(["creator", "company_head", "construction_director", "itr"])("submits credentials for %s", (role) => {
    const selectedUser = mockUsers.find((user) => user.role === role);
    const onLogin = vi.fn(() => ({ ok: true }));
    render(<LoginPage users={mockUsers} onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText("Демо-пользователь"), { target: { value: selectedUser.email } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: selectedUser.password } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(onLogin).toHaveBeenCalledWith(selectedUser.email, selectedUser.password);
  });
});

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPage, mockUsers } from "./LegacyApp";

describe("mock user login", () => {
  it.each(["creator", "company_head", "construction_director", "itr"])("submits credentials for %s", async (role) => {
    const selectedUser = mockUsers.find((user) => user.role === role);
    const onLogin = vi.fn(() => ({ ok: true }));
    render(<LoginPage users={mockUsers} onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText("Демо-пользователь"), { target: { value: selectedUser.email } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: selectedUser.password } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(selectedUser.email, selectedUser.password));
  });

  it("does not expose demo accounts in production auth mode", () => {
    render(<LoginPage users={mockUsers} onLogin={() => ({ ok: false })} isDemo={false} />);
    expect(screen.queryByLabelText("Демо-пользователь")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("requests a password recovery email in production auth mode", async () => {
    const onResetPassword = vi.fn(() => Promise.resolve());
    render(<LoginPage users={mockUsers} onLogin={() => ({ ok: false })} onResetPassword={onResetPassword} isDemo={false} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "itr@gross.ru" } });
    fireEvent.click(screen.getByRole("button", { name: "Восстановить пароль" }));
    await waitFor(() => expect(onResetPassword).toHaveBeenCalledWith("itr@gross.ru"));
    expect(screen.getByText(/ссылка для восстановления отправлена/i)).toBeInTheDocument();
  });
});

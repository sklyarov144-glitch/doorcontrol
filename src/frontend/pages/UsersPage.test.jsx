import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UsersPage from "./UsersPage";

const object = {
  id: "object-1",
  name: "ЖК Матвеевский парк",
  responsibleDirectorId: "director-1",
  buildings: [{ id: "building-1", name: "Корпус 4.1" }],
};

const users = [
  { id: "head-1", name: "Руководитель", role: "company_head", position: "Руководитель", status: "active", assignedObjectIds: [], assignedBuildingIds: [] },
  { id: "director-1", name: "Директор", role: "construction_director", position: "Директор", status: "active", assignedObjectIds: ["object-1"], assignedBuildingIds: [] },
  { id: "itr-1", name: "Инженер", role: "itr", position: "ИТР", status: "active", assignedObjectIds: ["object-1"], assignedBuildingIds: ["building-1"] },
];

function provider() {
  return {
    users: {
      invite: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn((_, value) => value),
      create: vi.fn((value) => value),
      setAccountStatus: vi.fn().mockResolvedValue(undefined),
      restoreAccess: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("UsersPage", () => {
  it("limits a construction director to assigned ITR accounts", () => {
    render(<UsersPage users={users} objects={[object]} currentUser={users[1]} onSave={vi.fn()} remoteAuth provider={provider()} />);

    expect(screen.getAllByText("Директор").length).toBeGreaterThan(0);
    expect(screen.getByText("Инженер")).toBeInTheDocument();
    expect(screen.queryByText("Руководитель")).not.toBeInTheDocument();
  });

  it("invites a new remote user through the backend provider", async () => {
    const backend = provider();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<UsersPage users={users} objects={[object]} currentUser={users[0]} onSave={onSave} remoteAuth provider={backend} />);

    fireEvent.click(screen.getByRole("button", { name: "Добавить пользователя" }));
    fireEvent.change(screen.getByLabelText("ФИО"), { target: { value: "Новый ИТР" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new.itr@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить пользователя" }));

    await waitFor(() => expect(backend.users.invite).toHaveBeenCalledOnce());
    expect(backend.users.invite).toHaveBeenCalledWith(expect.objectContaining({
      id: undefined,
      name: "Новый ИТР",
      email: "new.itr@example.com",
      role: "itr",
    }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("does not expose user management actions to ITR", () => {
    render(<UsersPage users={users} objects={[object]} currentUser={users[2]} onSave={vi.fn()} remoteAuth provider={provider()} />);

    expect(screen.queryByRole("button", { name: "Добавить пользователя" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать" })).not.toBeInTheDocument();
  });
});

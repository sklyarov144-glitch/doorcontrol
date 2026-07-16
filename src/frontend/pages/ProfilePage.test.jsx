import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "./ProfilePage";

const user = {
  id: "itr-1",
  name: "Инженер ИТР",
  email: "itr@example.com",
  phone: "+7 900 000-00-00",
  role: "itr",
  position: "Инженер ИТР",
  status: "active",
  password: "old-password",
  assignedObjectIds: ["object-1"],
  assignedBuildingIds: ["building-1"],
};
const objects = [{
  id: "object-1",
  name: "ЖК Матвеевский парк",
  buildings: [{ id: "building-1", name: "Корпус 4.1" }],
}];

function renderProfile(overrides = {}) {
  const props = {
    user,
    objects,
    remoteAuth: true,
    onSave: vi.fn().mockImplementation(async (profile) => profile),
    onAvatarUpload: vi.fn().mockResolvedValue({
      avatarUrl: "https://signed.example/avatar.jpg",
      avatarStorageUri: "storage://avatars/itr-1/avatar.jpg",
    }),
    ...overrides,
  };
  render(<ProfilePage {...props} />);
  return props;
}

describe("ProfilePage", () => {
  it("shows server-backed assignments", () => {
    renderProfile();

    expect(screen.getByText("ЖК Матвеевский парк")).toBeInTheDocument();
    expect(screen.getByText("ЖК Матвеевский парк / Корпус 4.1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ИТР")).toBeInTheDocument();
  });

  it("requires the current password before requesting a remote password change", async () => {
    const { onSave } = renderProfile();

    fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Введите текущий пароль, чтобы подтвердить смену пароля"
    );
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Текущий пароль"), { target: { value: "old-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][1]).toEqual({
      oldPassword: "old-password",
      newPassword: "new-password",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Данные пользователя сохранены");
  });

  it("loads an avatar through the storage callback", async () => {
    const { onAvatarUpload } = renderProfile();
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Загрузить аватар"), { target: { files: [file] } });

    await waitFor(() => expect(onAvatarUpload).toHaveBeenCalledWith(file));
    expect(await screen.findByRole("img", { name: "Аватар" })).toHaveAttribute(
      "src",
      "https://signed.example/avatar.jpg"
    );
  });

  it("rejects an invalid current password in local mode", async () => {
    const { onSave } = renderProfile({ remoteAuth: false });

    fireEvent.change(screen.getByLabelText("Текущий пароль"), { target: { value: "wrong" } });
    fireEvent.change(screen.getByLabelText("Новый пароль"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Текущий пароль указан неверно");
    expect(onSave).not.toHaveBeenCalled();
  });
});

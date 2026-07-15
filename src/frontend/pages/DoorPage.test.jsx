import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DoorDetails from "./DoorPage";

const object = { id: "object-1", name: "ЖК Матвеевский парк" };
const building = { id: "building-1", name: "Корпус 4.1" };
const floor = { id: "floor-8", number: 8 };
const door = {
  id: "door-8-1",
  number: "Квартира 1",
  mark: "Д-1",
  type: "Квартирная",
  doorStatus: "не начато",
  openingStatus: "готов",
  issue: "нет",
  storageAct: "не передана",
  history: [
    { id: "history-1", date: "15.07.2026", user: "Иван", text: "Дверь создана" },
  ],
};

function renderDoor(overrides = {}) {
  const props = {
    object,
    building,
    floor,
    door,
    onSave: vi.fn().mockResolvedValue(undefined),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<DoorDetails {...props} />);
  return props;
}

describe("DoorDetails", () => {
  it("saves editable workflow fields using the stable door id", async () => {
    const { onSave } = renderDoor();

    fireEvent.change(screen.getByLabelText("Статус двери"), {
      target: { value: "смонтирована" },
    });
    fireEvent.change(screen.getByLabelText("Статус проема"), {
      target: { value: "требует корректировки" },
    });
    fireEvent.change(screen.getByLabelText("Замечания"), {
      target: { value: "есть замечание" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("door-8-1", {
      doorStatus: "смонтирована",
      openingStatus: "требует корректировки",
      issue: "есть замечание",
      storageAct: "не передана",
    }));
    expect(await screen.findByText("Изменения сохранены")).toBeInTheDocument();
  });

  it("sends fast ITR actions through the same persistence callback", async () => {
    const { onSave } = renderDoor();

    fireEvent.click(screen.getByRole("button", { name: "Смонтировано" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      "door-8-1",
      expect.objectContaining({
        doorStatus: "смонтирована",
        installed: "Да",
        quickHistory: "Дверь смонтирована",
      })
    ));
  });

  it("attaches a custody act link through the door workflow", async () => {
    const { onSave } = renderDoor();

    fireEvent.click(screen.getByRole("button", { name: "Добавить акт ОХ" }));
    fireEvent.change(screen.getByLabelText("Ссылка на Яндекс.Диск"), {
      target: { value: "https://disk.yandex.ru/example" },
    });
    fireEvent.change(screen.getByLabelText("Комментарий"), {
      target: { value: "Подписан" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить акт" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      "door-8-1",
      expect.objectContaining({
        storageAct: "акт загружен",
        custodyActUrl: "https://disk.yandex.ru/example",
        actTitle: "Акт АОХ",
        actComment: "Подписан",
        quickHistory: "Добавлена ссылка на акт АОХ: Подписан",
      })
    ));
    expect(screen.queryByRole("heading", { name: "Добавить акт ОХ" })).not.toBeInTheDocument();
  });

  it("keeps history visible and reports persistence failures", async () => {
    renderDoor({ onSave: vi.fn().mockRejectedValue(new Error("offline")) });

    expect(screen.getByText("Дверь создана")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось сохранить изменения. Проверьте соединение и повторите попытку."
    );
    expect(screen.queryByText("Изменения сохранены")).not.toBeInTheDocument();
  });
});

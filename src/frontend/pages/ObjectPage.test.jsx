import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ObjectPage from "./ObjectPage";

const users = [
  { id: "director-1", name: "Директор", role: "construction_director" },
  { id: "itr-1", name: "Инженер ИТР", role: "itr" },
];
const object = {
  id: "object-1",
  name: "ЖК Матвеевский парк",
  address: "Очаково-Матвеевское",
  developer: "ПИК",
  status: "в работе",
  responsibleDirectorId: "director-1",
  responsibleItrIds: ["itr-1"],
  buildings: [
    {
      id: "building-1",
      name: "Корпус 4.1",
      status: "в работе",
      responsibleItrId: "itr-1",
      floorsCount: 2,
      floors: [
        { id: "floor-1", number: 1, type: "floor", doors: [] },
        { id: "floor-2", number: 2, type: "floor", doors: [] },
        { id: "roof", type: "service", doors: [] },
      ],
    },
  ],
};

function renderPage(overrides = {}) {
  const props = {
    object,
    objects: [object],
    users,
    teams: [{ id: "team-1", name: "Бригада 1" }],
    user: { id: "creator-1", role: "creator" },
    onOpenBuilding: vi.fn(),
    onChange: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<ObjectPage {...props} />);
  return props;
}

describe("ObjectPage", () => {
  it("opens a building from the object card", () => {
    const { onOpenBuilding } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Открыть корпус Корпус 4.1" }));
    expect(onOpenBuilding).toHaveBeenCalledWith("building-1");
  });

  it("lets ITR manage assigned building structure without editing the object", () => {
    renderPage({ user: { id: "itr-1", role: "itr" } });

    expect(screen.queryByRole("button", { name: "Редактировать объект" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить корпус" })).toBeInTheDocument();
    expect(screen.getByText("Редактировать")).toBeInTheDocument();
  });

  it("creates a blank building with the requested floor count and real team assignment", async () => {
    const { onChange } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Добавить корпус" }));
    fireEvent.change(screen.getByLabelText("Корпус"), { target: { value: "4.2" } });
    fireEvent.change(screen.getByLabelText("Количество этажей"), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("Ответственный ИТР"), { target: { value: "itr-1" } });
    fireEvent.click(screen.getByLabelText("Бригада 1"));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить корпус" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    const nextObjects = onChange.mock.calls[0][0];
    const created = nextObjects[0].buildings.find((building) => building.name === "Корпус 4.2");
    expect(created).toBeDefined();
    expect(created.floorsCount).toBe(11);
    expect(created.floors.filter((floor) => floor.type === "floor")).toHaveLength(11);
    expect(created.floors.flatMap((floor) => floor.doors)).toEqual([]);
    expect(created.assignedTeamIds).toEqual(["team-1"]);
  });

  it("keeps the editor open and reports backend persistence errors", async () => {
    renderPage({ onChange: vi.fn().mockRejectedValue(new Error("offline")) });

    fireEvent.click(screen.getByRole("button", { name: "Редактировать объект" }));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить объект" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Изменения не сохранены. Проверьте соединение и повторите попытку."
    );
    expect(screen.getByRole("heading", { name: "Редактировать объект" })).toBeInTheDocument();
  });
});

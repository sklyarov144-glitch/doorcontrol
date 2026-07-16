import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "./AdminPage";

const users = [
  { id: "head-1", name: "Руководитель", role: "company_head", position: "Руководитель", status: "active" },
  { id: "director-1", name: "Директор", role: "construction_director", position: "Директор", status: "active" },
  { id: "itr-1", name: "Инженер", role: "itr", position: "ИТР", status: "active" },
];
const building = {
  id: "building-1",
  name: "Корпус 4.1",
  floorsCount: 2,
  floors: [
    { id: "floor-1", number: 1, type: "floor", doors: [] },
    { id: "floor-2", number: 2, type: "floor", doors: [] },
    { id: "roof", type: "service", doors: [] },
  ],
};
const object = {
  id: "object-1",
  name: "ЖК Матвеевский парк",
  responsibleDirectorId: "director-1",
  buildings: [building],
};

function renderAdmin(overrides = {}) {
  const props = {
    objects: [object],
    users,
    user: users[0],
    onChange: vi.fn().mockImplementation(async (next) => next),
    onPlanUpload: vi.fn().mockResolvedValue({
      image: "https://signed.example/plan.png",
      imageStorageUri: "storage://plans/object-1/building-1/plan.png",
    }),
    ...overrides,
  };
  render(<AdminPage {...props} />);
  return props;
}

describe("AdminPage", () => {
  it("lets a company head create an object through the persistence callback", async () => {
    const { onChange } = renderAdmin();

    fireEvent.change(screen.getByLabelText("Название"), { target: { value: "ЖК Новый" } });
    fireEvent.change(screen.getByLabelText("Район / адрес"), { target: { value: "Москва" } });
    fireEvent.change(screen.getByLabelText("Метро"), { target: { value: "Аминьевская" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать объект" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    expect(onChange.mock.calls[0][0].at(-1)).toMatchObject({
      name: "ЖК Новый",
      address: "Москва, метро «Аминьевская»",
      buildings: [],
    });
  });

  it("lets ITR add an exact blank building without allowing object creation", async () => {
    const { onChange } = renderAdmin({ user: users[2] });
    expect(screen.queryByRole("button", { name: "Создать объект" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Номер корпуса"), { target: { value: "4.2" } });
    fireEvent.change(screen.getByLabelText("Количество этажей"), { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить корпус" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    const created = onChange.mock.calls[0][0][0].buildings.at(-1);
    expect(created.name).toBe("Корпус 4.2");
    expect(created.floorsCount).toBe(11);
    expect(created.floors.filter((floor) => floor.type === "floor")).toHaveLength(11);
    expect(created.floors.find((floor) => floor.id === "roof")).toBeDefined();
    expect(created.floors.flatMap((floor) => floor.doors)).toEqual([]);
  });

  it("generates and applies one floor template to every real floor", async () => {
    const { onChange } = renderAdmin();

    fireEvent.change(screen.getByLabelText("Квартир на этаже"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("МОП-дверей"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Сгенерировать план" }));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить шаблон этажа" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    const savedBuilding = onChange.mock.calls[0][0][0].buildings[0];
    expect(savedBuilding.floorTemplate.apartments).toBe(3);
    expect(savedBuilding.floorTemplate.mopDoors).toBe(2);
    expect(savedBuilding.doorsPerFloor).toBe(5);
    expect(savedBuilding.floors[0].doors).toHaveLength(5);
    expect(savedBuilding.floors[1].doors).toHaveLength(5);
    expect(savedBuilding.floors[2].doors).toEqual([]);
  });

  it("keeps the private plan storage URI in the saved template", async () => {
    const { onChange, onPlanUpload } = renderAdmin();
    const file = new File(["plan"], "plan.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Загрузить план"), { target: { files: [file] } });
    await waitFor(() => expect(onPlanUpload).toHaveBeenCalledWith({
      objectId: "object-1",
      buildingId: "building-1",
      floorId: "floor-1",
    }, file));
    fireEvent.click(screen.getByRole("button", { name: "Сгенерировать план" }));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить шаблон этажа" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    expect(onChange.mock.calls[0][0][0].buildings[0].floorTemplate).toMatchObject({
      image: "https://signed.example/plan.png",
      imageStorageUri: "storage://plans/object-1/building-1/plan.png",
    });
  });
});

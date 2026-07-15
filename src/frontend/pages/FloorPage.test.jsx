import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FloorPlan, { DoorMarker } from "./FloorPage";

const object = { id: "object-1", name: "ЖК Матвеевский парк" };
const building = { id: "building-1", name: "Корпус 4.1" };
const floor = {
  id: "floor-8",
  number: 8,
  type: "floor",
  doors: [
    {
      id: "door-1",
      number: "Квартира 1",
      mark: "Д-1",
      type: "Квартирная",
      doorStatus: "смонтирована",
      openingStatus: "готов",
      swing: "down-right",
      x: 25,
      y: 30,
    },
    {
      id: "door-2",
      number: "1 МОП",
      mark: "МОП-1",
      type: "МОП",
      doorStatus: "не начато",
      openingStatus: "требует корректировки",
      swing: "up-left",
      x: 50,
      y: 50,
    },
  ],
};

describe("FloorPlan", () => {
  it("filters apartment and common-area doors without changing floor data", () => {
    render(
      <FloorPlan
        object={object}
        building={building}
        floor={floor}
        onOpenDoor={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Д-1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "МОП-1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Квартирные" }));
    expect(screen.getByRole("button", { name: "Д-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "МОП-1" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "МОП" }));
    expect(screen.queryByRole("button", { name: "Д-1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "МОП-1" })).toBeInTheDocument();
    expect(floor.doors).toHaveLength(2);
  });

  it("opens the selected door and returns to the building", () => {
    const onOpenDoor = vi.fn();
    const onBack = vi.fn();
    render(
      <FloorPlan
        object={object}
        building={building}
        floor={floor}
        onOpenDoor={onOpenDoor}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Д-1" }));
    expect(onOpenDoor).toHaveBeenCalledWith("door-1");

    fireEvent.click(screen.getByRole("button", { name: "К корпусу" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows an empty state when a level has no doors", () => {
    render(
      <FloorPlan
        object={object}
        building={building}
        floor={{ id: "roof", type: "roof", label: "Кровля", doors: [] }}
        onOpenDoor={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Для уровня "Кровля" двери пока не заведены в mock-структуре.'))
      .toBeInTheDocument();
  });
});

describe("DoorMarker", () => {
  it("prioritizes an opening correction warning and preserves marker coordinates", () => {
    const { container } = render(<DoorMarker door={floor.doors[1]} onOpen={vi.fn()} />);
    const marker = screen.getByRole("button", { name: "МОП-1" });

    expect(marker).toHaveClass("common", "status-orange", "swing-up-left");
    expect(marker).toHaveStyle({ left: "50%", top: "50%" });
    expect(container.querySelector(".door-leaf")).toBeInTheDocument();
    expect(container.querySelector(".door-arc")).toBeInTheDocument();
  });
});

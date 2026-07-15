import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BuildingVisualization from "./BuildingPage";

const building = {
  id: "building-11",
  name: "Корпус 4.1",
  floorsCount: 3,
  floors: [
    {
      id: "floor-1",
      number: 1,
      type: "floor",
      doors: [],
    },
    {
      id: "floor-2",
      number: 2,
      type: "floor",
      doors: [
        {
          id: "door-1",
          doorStatus: "смонтирована",
          issue: "есть замечание",
          openingStatus: "требует корректировки",
        },
        {
          id: "door-2",
          doorStatus: "не начато",
          issue: "нет",
          openingStatus: "готов",
        },
      ],
    },
    {
      id: "floor-3",
      number: 3,
      type: "floor",
      doors: [],
    },
    {
      id: "parking",
      type: "parking",
      doors: [],
    },
  ],
};

describe("BuildingVisualization", () => {
  it("renders only the floors present in building data and starts without an active floor", () => {
    const { container } = render(
      <BuildingVisualization building={building} onSelectFloor={vi.fn()} />
    );

    expect(screen.getByText("3 этажей")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Открыть 3 этаж" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Открыть 2 этаж" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Открыть 1 этаж" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Открыть 4 этаж" })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".facade-floor")).toHaveLength(3);
    expect(container.querySelector(".facade-floor.active")).toBeNull();
  });

  it("opens a floor immediately and calculates metrics from the selected floor", () => {
    const onSelectFloor = vi.fn();
    render(
      <BuildingVisualization
        building={building}
        selectedFloorId="floor-2"
        onSelectFloor={onSelectFloor}
      />
    );

    expect(screen.getByText("Замечаний").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Проемов на корректировке").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Готовность").nextSibling).toHaveTextContent("50%");

    fireEvent.click(screen.getByRole("button", { name: "Открыть 1 этаж" }));
    expect(onSelectFloor).toHaveBeenCalledWith("floor-1");
  });

  it("opens parking when the building includes it", () => {
    const onSelectFloor = vi.fn();
    render(<BuildingVisualization building={building} onSelectFloor={onSelectFloor} />);

    fireEvent.click(screen.getByRole("button", { name: "Открыть паркинг" }));
    expect(onSelectFloor).toHaveBeenCalledWith("parking");
  });
});

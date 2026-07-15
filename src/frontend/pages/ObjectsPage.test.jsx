import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ObjectsPage from "./ObjectsPage";

const object = {
  id: "object-1",
  name: "ЖК Матвеевский парк",
  address: "Очаково-Матвеевское",
  status: "в работе",
  buildings: [{
    id: "building-1",
    floors: [{
      id: "floor-1",
      doors: [
        { id: "door-1", doorStatus: "смонтирована", issue: "нет", openingStatus: "готов" },
        { id: "door-2", doorStatus: "не начато", issue: "есть замечание", openingStatus: "требует корректировки" },
      ],
    }],
  }],
};

describe("ObjectsPage", () => {
  it("renders calculated object metrics and opens the selected object", () => {
    const onOpen = vi.fn();
    render(<ObjectsPage objects={[object]} onOpen={onOpen} />);

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Замечания").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Проемы на корректировке").nextSibling).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Открыть объект ЖК Матвеевский парк" }));
    expect(onOpen).toHaveBeenCalledWith("object-1");
  });
});

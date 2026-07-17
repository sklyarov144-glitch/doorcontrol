import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import BrigadePlanPage from "./BrigadePlanPage";

describe("BrigadePlanPage", () => {
  beforeEach(() => localStorage.clear());

  it("renders the extracted plan-fact workspace", () => {
    render(<BrigadePlanPage objects={[]} users={[]} user={{ id: "itr-1", name: "ИТР", role: "itr" }} />);

    expect(screen.getByRole("heading", { name: "Контроль выработки по объектам" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить факт за день" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "План-факт" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ProblemCenterPage from "./ProblemCenterPage";

describe("ProblemCenterPage", () => {
  beforeEach(() => localStorage.clear());

  it("renders the extracted problem center without domain data", () => {
    render(<ProblemCenterPage objects={[]} users={[]} user={{ id: "itr-1", name: "ИТР", role: "itr" }} onOpen={() => undefined} onCreateTask={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Центр проблем" })).toBeInTheDocument();
    expect(screen.getByText("Всего проблем")).toBeInTheDocument();
    expect(screen.getByText("Проблем по доступным объектам нет.")).toBeInTheDocument();
  });
});

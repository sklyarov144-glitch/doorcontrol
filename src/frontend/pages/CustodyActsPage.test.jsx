import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CustodyActsPage from "./CustodyActsPage";

describe("CustodyActsPage", () => {
  beforeEach(() => localStorage.clear());

  it("renders the extracted custody act control screen", () => {
    render(<CustodyActsPage objects={[]} users={[]} user={{ id: "itr-1", name: "ИТР", role: "itr" }} onOpen={() => undefined} onUpdateAct={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Контроль актов ОХ" })).toBeInTheDocument();
    expect(screen.getByText("Смонтировано дверей")).toBeInTheDocument();
    expect(screen.getByText("Смонтированных дверей без актов нет.")).toBeInTheDocument();
  });
});

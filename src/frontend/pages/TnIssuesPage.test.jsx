import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import TnIssuesPage from "./TnIssuesPage";

describe("TnIssuesPage", () => {
  beforeEach(() => localStorage.clear());

  it("renders the extracted TN issues screen without domain data", () => {
    render(<TnIssuesPage objects={[]} users={[]} user={{ id: "itr-1", name: "ИТР", role: "itr" }} onOpen={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Замечания ТН" })).toBeInTheDocument();
    expect(screen.getByText("Всего замечаний")).toBeInTheDocument();
    expect(screen.getByText("Открытых замечаний ТН нет.")).toBeInTheDocument();
  });
});

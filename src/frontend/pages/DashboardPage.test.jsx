import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CompanyDashboard from "./DashboardPage";

describe("CompanyDashboard", () => {
  beforeEach(() => localStorage.clear());

  it("renders the extracted management dashboard without domain data", () => {
    render(<CompanyDashboard objects={[]} users={[]} onOpen={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Состояние объектов за 30 секунд" })).toBeInTheDocument();
    expect(screen.getByText("Объектов в работе")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ответственные" })).toBeInTheDocument();
  });
});

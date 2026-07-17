import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ManpowerPage from "./ManpowerPage";

describe("ManpowerPage", () => {
  beforeEach(() => localStorage.clear());

  it("renders the extracted workforce planning screen for an ITR user", () => {
    render(<ManpowerPage objects={[]} user={{ id: "itr-1", name: "ИТР", role: "itr" }} users={[]} />);

    expect(screen.getByRole("heading", { name: "Заявка на рабочих на завтра" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Подать заявку" }).length).toBeGreaterThan(1);
    expect(screen.getByText("Итоговый график")).toBeInTheDocument();
  });
});

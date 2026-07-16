import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompanyPage from "./CompanyPage";

const company = { id: "company-1", name: "ГРОСС", status: "active" };
const objects = [{ id: "object-1", name: "ЖК Матвеевский парк", buildings: [{ id: "building-1" }, { id: "building-2" }] }];
const users = [
  { id: "creator-1", role: "creator", status: "active" },
  { id: "itr-1", role: "itr", status: "active" },
  { id: "itr-2", role: "itr", status: "disabled" },
];

function makeProvider() {
  return { companies: { getAll: vi.fn().mockResolvedValue([company]), update: vi.fn().mockResolvedValue({ ...company, name: "ГРОСС Монтаж" }) } };
}

describe("CompanyPage", () => {
  it("loads the current tenant and calculates company statistics", async () => {
    render(<CompanyPage objects={objects} users={users} user={{ companyId: "company-1" }} provider={makeProvider()} onOpenObjects={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "ГРОСС" })).toBeInTheDocument();
    expect(screen.getByText("ЖК Матвеевский парк")).toBeInTheDocument();
    expect(screen.getByText("Активных пользователей").nextElementSibling).toHaveTextContent("2");
  });

  it("persists the company name through the provider", async () => {
    const provider = makeProvider();
    render(<CompanyPage objects={objects} users={users} user={{ companyId: "company-1" }} provider={provider} onOpenObjects={vi.fn()} />);

    await screen.findByRole("heading", { name: "ГРОСС" });
    fireEvent.click(screen.getByRole("button", { name: "Изменить название" }));
    fireEvent.change(screen.getByLabelText("Название"), { target: { value: "ГРОСС Монтаж" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => expect(provider.companies.update).toHaveBeenCalledWith("company-1", { name: "ГРОСС Монтаж" }));
    expect(await screen.findByRole("heading", { name: "ГРОСС Монтаж" })).toBeInTheDocument();
  });
});


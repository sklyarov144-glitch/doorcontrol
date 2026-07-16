import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FinancePage from "./FinancePage";

const objects = [{ id: "object-1", name: "ЖК Тест", readiness: 50, buildings: [] }];
const user = (role) => ({ id: `user-${role}`, companyId: "company-1", role });

describe("FinancePage permissions", () => {
  it("allows company leadership to add financial records", async () => {
    render(<FinancePage objects={objects} user={user("company_head")} />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Добавить" })).toHaveLength(3));
  });

  it("keeps construction director in read-only mode", async () => {
    render(<FinancePage objects={objects} user={user("construction_director")} />);

    await waitFor(() => expect(screen.getByText("Экономика объектов")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Добавить" })).not.toBeInTheDocument();
  });

  it("does not expose financial data to ITR", () => {
    render(<FinancePage objects={objects} user={user("itr")} />);

    expect(screen.getByText("Финансовые показатели недоступны для роли ИТР.")).toBeInTheDocument();
    expect(screen.queryByText("Портфель договоров")).not.toBeInTheDocument();
  });

  it("never falls back to generated amounts when the production provider fails", async () => {
    const provider = {
      analytics: { getFinancialSummary: vi.fn().mockRejectedValue(new Error("backend unavailable")) },
      contracts: { getAll: vi.fn().mockResolvedValue([]) },
      budgetItems: { getAll: vi.fn().mockResolvedValue([]) },
      financialTransactions: { getAll: vi.fn().mockResolvedValue([]) },
    };

    render(<FinancePage objects={objects} user={user("company_head")} provider={provider} isRemote />);

    expect(await screen.findByRole("alert")).toHaveTextContent("backend unavailable");
    expect(screen.queryByRole("cell", { name: "ЖК Тест" })).not.toBeInTheDocument();
  });
});

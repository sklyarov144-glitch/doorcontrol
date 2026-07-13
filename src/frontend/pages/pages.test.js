import { describe, expect, it } from "vitest";
import * as pages from "./index";

describe("page module contract", () => {
  it("exposes production page entrypoints", () => {
    for (const page of [
      "LoginPage",
      "ObjectsPage",
      "ObjectPage",
      "BuildingPage",
      "FloorPage",
      "DoorPage",
      "DashboardPage",
      "TasksPage",
      "NotificationsPage",
      "ProblemCenterPage",
      "CustodyActsPage",
      "DocumentsPage",
      "BrigadePlanPage",
      "ManpowerPage",
      "UsersPage",
      "ProfilePage",
      "AdminPage",
      "ReportsPage",
      "FinancePage",
    ]) {
      expect(pages[page], `${page} must be exported`).toBeTypeOf("function");
    }
  });
});

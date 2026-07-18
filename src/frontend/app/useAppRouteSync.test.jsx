import React, { useMemo, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useAppRouteSync } from "./useAppRouteSync";

const permissions = { canView: () => true };

function Harness() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [screenName, setScreenName] = useState("tasks");
  const [selection, setSelection] = useState({});
  const stablePermissions = useMemo(() => permissions, []);

  useAppRouteSync({
    location,
    routerNavigate,
    authLoading: false,
    isLoggedIn: true,
    isPasswordRecovery: false,
    permissions: stablePermissions,
    role: "itr",
    screen: screenName,
    setScreen: setScreenName,
    setSelectedObjectId: (value) => setSelection((current) => ({ ...current, objectId: value })),
    setSelectedBuildingId: (value) => setSelection((current) => ({ ...current, buildingId: value })),
    setSelectedFloorId: (value) => setSelection((current) => ({ ...current, floorId: value })),
    setSelectedDoorId: (value) => setSelection((current) => ({ ...current, doorId: value })),
    selectedObjectId: selection.objectId,
    selectedBuildingId: selection.buildingId,
    selectedFloorId: selection.floorId,
    selectedDoorId: selection.doorId,
    selectedObject: null,
    selectedBuilding: null,
    selectedFloor: null,
    selectedDoor: null,
  });

  return <>
    <span data-testid="screen">{screenName}</span>
    <span data-testid="path">{location.pathname}</span>
    <button onClick={() => setScreenName("objects")}>Мои объекты</button>
    <button onClick={() => routerNavigate("/objects")}>Открыть URL</button>
  </>;
}

function renderHarness(initialEntry = "/tasks") {
  return render(<MemoryRouter initialEntries={[initialEntry]}><Harness /></MemoryRouter>);
}

describe("useAppRouteSync", () => {
  it("updates the URL after a user selects another screen", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Мои объекты" }));

    await waitFor(() => {
      expect(screen.getByTestId("screen")).toHaveTextContent("objects");
      expect(screen.getByTestId("path")).toHaveTextContent("/objects");
    });
  });

  it("restores the screen from a directly opened URL", async () => {
    renderHarness("/objects");

    await waitFor(() => expect(screen.getByTestId("screen")).toHaveTextContent("objects"));
  });
});

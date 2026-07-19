import React from "react";
import { buildAppPath, parseAppRoute } from "./routes";

export function defaultScreenForRole(role) {
  return role === "itr" ? "tasks" : "company_dashboard";
}

export function useAppRouteSync({
  location,
  routerNavigate,
  authLoading,
  isLoggedIn,
  isPasswordRecovery,
  permissions,
  role,
  screen,
  setScreen,
  setSelectedObjectId,
  setSelectedBuildingId,
  setSelectedFloorId,
  setSelectedDoorId,
  selectedObjectId,
  selectedBuildingId,
  selectedFloorId,
  selectedDoorId,
  selectedObject,
  selectedBuilding,
  selectedFloor,
  selectedDoor,
}) {
  const routeSyncing = React.useRef(false);

  React.useEffect(() => {
    if (authLoading || isPasswordRecovery) return;
    if (!isLoggedIn) {
      if (location.pathname !== "/login") routerNavigate("/login", { replace: true });
      return;
    }
    if (location.pathname === "/login" || location.pathname === "/") {
      routerNavigate(buildAppPath(defaultScreenForRole(role)), { replace: true });
      return;
    }
    const route = parseAppRoute(location.pathname);
    if (!permissions.canView(route.screen)) {
      const fallback = defaultScreenForRole(role);
      routeSyncing.current = false;
      setScreen(fallback);
      routerNavigate(buildAppPath(fallback), { replace: true });
      return;
    }
    const routeChanged = route.screen !== screen ||
      Boolean(route.objectId && route.objectId !== selectedObjectId) ||
      Boolean(route.buildingId && route.buildingId !== selectedBuildingId) ||
      Boolean(route.floorId && route.floorId !== selectedFloorId) ||
      Boolean(route.doorId && route.doorId !== selectedDoorId);
    if (!routeChanged) return;
    routeSyncing.current = true;
    setScreen(route.screen);
    if (route.objectId) setSelectedObjectId(route.objectId);
    if (route.buildingId) setSelectedBuildingId(route.buildingId);
    if (route.floorId) setSelectedFloorId(route.floorId);
    if (route.doorId) setSelectedDoorId(route.doorId);
  }, [authLoading, isLoggedIn, location.pathname, isPasswordRecovery, permissions, role]);

  React.useEffect(() => {
    if (authLoading || !isLoggedIn || permissions.canView(screen)) return;
    const fallback = defaultScreenForRole(role);
    routeSyncing.current = false;
    setScreen(fallback);
    routerNavigate(buildAppPath(fallback), { replace: true });
  }, [authLoading, isLoggedIn, permissions, role, routerNavigate, screen, setScreen]);

  React.useEffect(() => {
    if (!isLoggedIn || location.pathname === "/login") return;
    if (routeSyncing.current) {
      routeSyncing.current = false;
      return;
    }
    const nextPath = buildAppPath(screen, {
      objectId: selectedObject?.id,
      buildingId: selectedBuilding?.id,
      floorId: selectedFloor?.id,
      doorId: selectedDoor?.id,
    });
    if (location.pathname !== nextPath) routerNavigate(nextPath);
  }, [
    isLoggedIn,
    location.pathname,
    routerNavigate,
    screen,
    selectedBuilding?.id,
    selectedDoor?.id,
    selectedFloor?.id,
    selectedObject?.id,
  ]);

  return { defaultScreenForRole };
}

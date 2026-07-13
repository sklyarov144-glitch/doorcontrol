export const screenPaths = {
  login: "/login",
  objects: "/objects",
  company_dashboard: "/dashboard",
  tasks: "/tasks",
  notifications: "/notifications",
  problem_center: "/problems",
  custody_acts: "/custody-acts",
  documents: "/documents",
  brigade_plan: "/brigades",
  manpower: "/manpower",
  users: "/users",
  profile: "/profile",
  admin: "/admin",
  reports: "/reports",
  tn_issues: "/tn-issues",
  roles: "/roles",
};

export function parseAppRoute(pathname) {
  const door = pathname.match(/^\/objects\/([^/]+)\/buildings\/([^/]+)\/floors\/([^/]+)\/doors\/([^/]+)$/);
  if (door) return { screen: "door", objectId: door[1], buildingId: door[2], floorId: door[3], doorId: door[4] };
  const floor = pathname.match(/^\/objects\/([^/]+)\/buildings\/([^/]+)\/floors\/([^/]+)$/);
  if (floor) return { screen: "floor", objectId: floor[1], buildingId: floor[2], floorId: floor[3] };
  const building = pathname.match(/^\/objects\/([^/]+)\/buildings\/([^/]+)$/);
  if (building) return { screen: "building", objectId: building[1], buildingId: building[2] };
  const object = pathname.match(/^\/objects\/([^/]+)$/);
  if (object) return { screen: "object", objectId: object[1] };
  const screen = Object.entries(screenPaths).find(([, path]) => path === pathname)?.[0];
  return { screen: screen ?? "objects" };
}

export function buildAppPath(screen, selection = {}) {
  const { objectId, buildingId, floorId, doorId } = selection;
  if (screen === "object" && objectId) return `/objects/${objectId}`;
  if (screen === "building" && objectId && buildingId) return `/objects/${objectId}/buildings/${buildingId}`;
  if (screen === "floor" && objectId && buildingId && floorId) return `/objects/${objectId}/buildings/${buildingId}/floors/${floorId}`;
  if (screen === "door" && objectId && buildingId && floorId && doorId) return `/objects/${objectId}/buildings/${buildingId}/floors/${floorId}/doors/${doorId}`;
  return screenPaths[screen] ?? "/objects";
}

export const roles = ["creator", "company_head", "construction_director", "itr"];

const administrativeRoles = new Set(["creator", "company_head", "construction_director"]);

export function canView(user, resource) {
  if (!user) return false;
  if (resource === "admin" || resource === "users") return administrativeRoles.has(user.role);
  if (resource === "company_dashboard") return user.role !== "itr";
  if (resource === "finance") return user.role !== "itr";
  return roles.includes(user.role);
}

export function canCreate(user, resource) {
  if (!user) return false;
  if (resource === "object") return ["creator", "company_head"].includes(user.role);
  if (["building", "floor", "door", "task", "document"].includes(resource)) {
    return administrativeRoles.has(user.role) || user.role === "itr" && resource !== "task";
  }
  return administrativeRoles.has(user.role);
}

export function canEdit(user, resource) {
  if (!user) return false;
  if (["door", "opening", "custody_act", "document", "building", "floor"].includes(resource)) return roles.includes(user.role);
  return administrativeRoles.has(user.role);
}

export function canDelete(user) {
  return Boolean(user && ["creator", "company_head"].includes(user.role));
}

export function canManageUsers(user) {
  return Boolean(user && administrativeRoles.has(user.role));
}

export function canManageObjects(user) {
  return Boolean(user && ["creator", "company_head"].includes(user.role));
}

export function permissionsFor(user) {
  return {
    canView: (resource) => canView(user, resource),
    canCreate: (resource) => canCreate(user, resource),
    canEdit: (resource) => canEdit(user, resource),
    canDelete: (resource) => canDelete(user, resource),
    canManageUsers: () => canManageUsers(user),
    canManageObjects: () => canManageObjects(user),
  };
}

export function normalizeUser(user) {
  const now = "2026-06-01T08:00:00.000Z";
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    phone: user.phone ?? "",
    role: user.role ?? "itr",
    position: user.position ?? "",
    avatarUrl: user.avatarUrl ?? user.avatar ?? "",
    avatarStorageUri: user.avatarStorageUri ?? "",
    avatar: user.avatarUrl ?? user.avatar ?? "",
    status: user.status ?? "active",
    assignedObjectIds: user.assignedObjectIds ?? [],
    assignedBuildingIds: user.assignedBuildingIds ?? [],
    createdAt: user.createdAt ?? now,
    updatedAt: user.updatedAt ?? now,
    lastLoginAt: user.lastLoginAt ?? "",
    password: user.password ?? "",
  };
}

export function canAssignRole(managerRole, targetRole) {
  if (managerRole === "creator") return true;
  if (managerRole === "company_head") {
    return ["company_head", "construction_director", "itr"].includes(targetRole);
  }
  if (managerRole === "construction_director") return targetRole === "itr";
  return false;
}

export function assignableRoles(managerRole) {
  return ["creator", "company_head", "construction_director", "itr"].filter((role) =>
    canAssignRole(managerRole, role)
  );
}

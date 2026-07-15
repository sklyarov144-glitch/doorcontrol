const allowedRoles = new Set(["company_head", "construction_director", "itr"]);

export function validatePilotUserManifest(payload) {
  const errors = [];
  const keys = new Set();
  const emails = new Set();
  const users = payload?.users;
  if (!Array.isArray(users) || users.length === 0) return { valid: false, errors: ["users must be a non-empty array"] };
  for (const [index, user] of users.entries()) {
    const path = `users[${index}]`;
    if (!/^[a-z][a-z0-9_-]{1,39}$/.test(user.key ?? "")) errors.push(`${path}.key is invalid`);
    if (keys.has(user.key)) errors.push(`${path}.key duplicates ${user.key}`);
    keys.add(user.key);
    const email = user.email?.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "")) errors.push(`${path}.email is invalid`);
    if (emails.has(email)) errors.push(`${path}.email is duplicated`);
    emails.add(email);
    if (!allowedRoles.has(user.role)) errors.push(`${path}.role is unsupported`);
    if (!user.name?.trim()) errors.push(`${path}.name is required`);
  }
  const countRole = (role) => users.filter((user) => user.role === role).length;
  if (countRole("company_head") < 1) errors.push("at least one company_head is required");
  if (countRole("construction_director") < 1) errors.push("at least one construction_director is required");
  if (countRole("itr") < 2) errors.push("at least two itr users are required for the pilot");
  return { valid: errors.length === 0, errors };
}

export function reconcilePilotUsers(manifest, profiles, companyId) {
  const errors = [];
  const profileByEmail = new Map(profiles.map((profile) => [profile.email.toLowerCase(), profile]));
  const assignments = {};
  for (const user of manifest.users) {
    const profile = profileByEmail.get(user.email.trim().toLowerCase());
    if (!profile) {
      errors.push(`${user.key}: invited user has not activated an account`);
      continue;
    }
    if (profile.company_id !== companyId) errors.push(`${user.key}: profile belongs to another company`);
    if (profile.role !== user.role) errors.push(`${user.key}: expected role ${user.role}, received ${profile.role}`);
    if (profile.status !== "active") errors.push(`${user.key}: profile is not active`);
    assignments[user.key] = profile.id;
  }
  return { valid: errors.length === 0, errors, assignments };
}

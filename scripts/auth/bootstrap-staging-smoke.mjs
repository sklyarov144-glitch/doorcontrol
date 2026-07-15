import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (process.env.STAGING_BOOTSTRAP_CONFIRM !== "STAGING") {
  throw new Error("Set STAGING_BOOTSTRAP_CONFIRM=STAGING to create smoke accounts");
}

const url = required("SUPABASE_URL");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const companyId = required("STAGING_SMOKE_COMPANY_ID");
if (!url.startsWith("https://") || !url.endsWith(".supabase.co")) {
  throw new Error("SUPABASE_URL must be a hosted Supabase HTTPS URL");
}

const roles = ["creator", "company_head", "construction_director", "itr"];
const roleNames = {
  creator: "Smoke Creator",
  company_head: "Smoke Company Head",
  construction_director: "Smoke Construction Director",
  itr: "Smoke ITR",
};
const rolePositions = {
  creator: "Создатель системы",
  company_head: "Руководитель компании",
  construction_director: "Директор по строительству",
  itr: "Инженер ИТР",
};
const client = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: company, error: companyError } = await client
  .from("companies")
  .select("id")
  .eq("id", companyId)
  .maybeSingle();
if (companyError) throw companyError;
if (!company) throw new Error("STAGING_SMOKE_COMPANY_ID does not exist");

const profilesByRole = new Map();
for (const role of roles) {
  const prefix = `AUTH_SMOKE_${role.toUpperCase()}`;
  const email = required(`${prefix}_EMAIL`).toLowerCase();
  const password = required(`${prefix}_PASSWORD`);
  if (password.length < 12) throw new Error(`${prefix}_PASSWORD must contain at least 12 characters`);

  const { data: existing, error: existingError } = await client
    .from("profiles")
    .select("id, company_id, role")
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (existing.company_id !== companyId || existing.role !== role) {
      throw new Error(`${prefix}_EMAIL belongs to another company or role`);
    }
    const { error: authError } = await client.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      ban_duration: "none",
    });
    if (authError) throw authError;
    const { error: profileError } = await client.from("profiles").update({ status: "active" }).eq("id", existing.id);
    if (profileError) throw profileError;
    profilesByRole.set(role, existing.id);
    console.log(`Updated staging smoke profile: ${role}`);
    continue;
  }

  await client.from("user_invitations").update({ status: "revoked" })
    .eq("company_id", companyId).eq("email", email).eq("status", "pending");
  const { data: invitation, error: invitationError } = await client.from("user_invitations").insert({
    company_id: companyId,
    email,
    name: roleNames[role],
    role,
    position: rolePositions[role],
  }).select("id").single();
  if (invitationError) throw invitationError;

  const { data: authData, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { invitation_id: invitation.id, smoke_account: true },
  });
  if (createError || !authData.user) {
    await client.from("user_invitations").update({ status: "revoked" }).eq("id", invitation.id);
    throw createError ?? new Error(`Unable to create ${role}`);
  }
  profilesByRole.set(role, authData.user.id);
  console.log(`Created staging smoke profile: ${role}`);
}

const { data: object, error: objectError } = await client
  .from("objects")
  .select("id, buildings(id)")
  .eq("company_id", companyId)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
if (objectError) throw objectError;
if (!object || !object.buildings?.length) {
  throw new Error("Import at least one object and building before assigning staging smoke users");
}

const { error: objectAssignError } = await client.from("objects")
  .update({ responsible_director_id: profilesByRole.get("construction_director") })
  .eq("id", object.id);
if (objectAssignError) throw objectAssignError;
const { error: buildingAssignError } = await client.from("buildings")
  .update({ responsible_itr_id: profilesByRole.get("itr") })
  .eq("id", object.buildings[0].id);
if (buildingAssignError) throw buildingAssignError;

console.log("Staging smoke users are active and assigned. Run npm run auth:smoke next.");

import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const supabaseUrl = required("SUPABASE_URL");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const companyName = required("BOOTSTRAP_COMPANY_NAME");
const email = required("BOOTSTRAP_CREATOR_EMAIL").toLowerCase();
const name = required("BOOTSTRAP_CREATOR_NAME");
const appUrl = required("APP_PUBLIC_URL").replace(/\/$/, "");
const position = process.env.BOOTSTRAP_CREATOR_POSITION?.trim() || "Создатель системы";

if (!/^https:\/\//.test(supabaseUrl) || !/^https:\/\//.test(appUrl)) {
  throw new Error("SUPABASE_URL and APP_PUBLIC_URL must use HTTPS");
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count: profileCount, error: profileCountError } = await client
  .from("profiles")
  .select("id", { count: "exact", head: true });
if (profileCountError) throw profileCountError;
if (profileCount > 0) {
  throw new Error("Bootstrap refused: profiles already exist. Invite users from the application.");
}

let companyId = process.env.BOOTSTRAP_COMPANY_ID?.trim();
if (companyId) {
  const { data: company, error } = await client.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (error) throw error;
  if (!company) throw new Error("BOOTSTRAP_COMPANY_ID does not exist");
} else {
  const { data: company, error } = await client
    .from("companies")
    .insert({ name: companyName })
    .select("id")
    .single();
  if (error) throw error;
  companyId = company.id;
}

const { data: invitation, error: invitationError } = await client
  .from("user_invitations")
  .insert({ company_id: companyId, email, name, role: "creator", position })
  .select("id")
  .single();
if (invitationError) throw invitationError;

const { data: invited, error: inviteError } = await client.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${appUrl}/reset-password`,
  data: { invitation_id: invitation.id },
});
if (inviteError) {
  await client.from("user_invitations").update({ status: "revoked" }).eq("id", invitation.id);
  throw inviteError;
}

console.log(`Creator invitation sent. company_id=${companyId} user_id=${invited.user.id}`);

import { createClient } from "@supabase/supabase-js";
import { generateTotp } from "./totp.mjs";

const roles = ["creator", "company_head", "construction_director", "itr"];
const url = (process.env.AUTH_SMOKE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim();
const anonKey = (process.env.AUTH_SMOKE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY)?.trim();
if (!url || !anonKey) throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for Auth smoke");
const results = new Map();
const requireMfa = process.env.AUTH_SMOKE_REQUIRE_MFA === "1";

for (const role of roles) {
  const prefix = `AUTH_SMOKE_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are required`);

  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) throw new Error(`${role}: sign-in failed (${authError?.message ?? "missing user"})`);

  if (requireMfa && role !== "itr") {
    const secret = process.env[`${prefix}_TOTP_SECRET`]?.trim();
    if (!secret) throw new Error(`${prefix}_TOTP_SECRET is required for production MFA smoke`);
    const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
    if (factorError) throw new Error(`${role}: MFA factors unavailable (${factorError.message})`);
    const factor = (factors.totp ?? []).find((item) => item.status === "verified");
    if (!factor) throw new Error(`${role}: verified TOTP factor is required`);
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) throw new Error(`${role}: MFA challenge failed (${challengeError.message})`);
    const { error: verifyError } = await client.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: generateTotp(secret),
    });
    if (verifyError) throw new Error(`${role}: MFA verification failed (${verifyError.message})`);
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance.currentLevel !== "aal2") throw new Error(`${role}: session did not reach aal2`);
  }

  const { data: profile, error: profileError } = await client.from("profiles").select("id, company_id, role, status").eq("id", authData.user.id).single();
  if (profileError) throw new Error(`${role}: profile unavailable (${profileError.message})`);
  if (profile.role !== role || profile.status !== "active") throw new Error(`${role}: unexpected profile role/status`);

  let objectCount = 0;
  for (const table of ["objects", "buildings", "floors", "doors", "document_items"]) {
    const { count, error } = await client.from(table).select("id", { head: true, count: "exact" });
    if (error) throw new Error(`${role}: ${table} read failed (${error.message})`);
    if (table === "objects") objectCount = count ?? 0;
  }
  if (objectCount < 1) throw new Error(`${role}: smoke account has no accessible objects`);

  const { count: financeCount, error: financeError } = await client.from("financial_transactions").select("id", { head: true, count: "exact" });
  if (financeError) throw new Error(`${role}: finance policy check failed (${financeError.message})`);
  if (role === "itr" && financeCount !== 0) throw new Error("itr: financial rows must not be visible");

  const { count: invitationCount, error: invitationError } = await client.from("user_invitations").select("id", { head: true, count: "exact" });
  if (invitationError) throw new Error(`${role}: invitation policy check failed (${invitationError.message})`);
  if (role === "itr" && invitationCount !== 0) throw new Error("itr: invitations must not be visible");

  await client.auth.signOut();
  results.set(role, { companyId: profile.company_id, objectCount });
  console.log(`OK ${role}`);
}

const companyIds = new Set([...results.values()].map((item) => item.companyId));
if (companyIds.size !== 1) throw new Error("Auth smoke users must belong to one staging company");
const companyObjectCount = results.get("company_head").objectCount;
if (results.get("creator").objectCount !== companyObjectCount) throw new Error("Creator and company head object scopes differ");
if (results.get("construction_director").objectCount > companyObjectCount) throw new Error("Director object scope exceeds company head scope");
if (results.get("itr").objectCount > companyObjectCount) throw new Error("ITR object scope exceeds company head scope");

console.log("Auth role smoke passed for all four roles.");

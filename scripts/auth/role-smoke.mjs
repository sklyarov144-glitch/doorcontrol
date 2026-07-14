import { createClient } from "@supabase/supabase-js";

const roles = ["creator", "company_head", "construction_director", "itr"];
const url = process.env.AUTH_SMOKE_SUPABASE_URL?.trim();
const anonKey = process.env.AUTH_SMOKE_SUPABASE_ANON_KEY?.trim();
if (!url || !anonKey) throw new Error("AUTH_SMOKE_SUPABASE_URL and AUTH_SMOKE_SUPABASE_ANON_KEY are required");
const results = new Map();

for (const role of roles) {
  const prefix = `AUTH_SMOKE_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are required`);

  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) throw new Error(`${role}: sign-in failed (${authError?.message ?? "missing user"})`);

  const { data: profile, error: profileError } = await client.from("profiles").select("id, company_id, role, status").eq("id", authData.user.id).single();
  if (profileError) throw new Error(`${role}: profile unavailable (${profileError.message})`);
  if (profile.role !== role || profile.status !== "active") throw new Error(`${role}: unexpected profile role/status`);

  let objectCount = 0;
  for (const table of ["objects", "buildings", "floors", "doors"]) {
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

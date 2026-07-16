const commonSecrets = [
  "SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_ID", "VERCEL_TOKEN", "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY",
];
const roleSmokeSecrets = [
  "AUTH_SMOKE_SUPABASE_URL", "AUTH_SMOKE_SUPABASE_ANON_KEY",
  "AUTH_SMOKE_CREATOR_EMAIL", "AUTH_SMOKE_CREATOR_PASSWORD",
  "AUTH_SMOKE_COMPANY_HEAD_EMAIL", "AUTH_SMOKE_COMPANY_HEAD_PASSWORD",
  "AUTH_SMOKE_CONSTRUCTION_DIRECTOR_EMAIL", "AUTH_SMOKE_CONSTRUCTION_DIRECTOR_PASSWORD",
  "AUTH_SMOKE_ITR_EMAIL", "AUTH_SMOKE_ITR_PASSWORD",
];
const productionSecrets = [
  "VITE_SENTRY_DSN", "SUPABASE_DB_URL", "BACKUP_ENCRYPTION_PASSWORD",
  "BACKUP_SUPABASE_URL", "BACKUP_SUPABASE_SERVICE_ROLE_KEY", "UAT_EVIDENCE_JSON",
  "AUTH_SMOKE_CREATOR_TOTP_SECRET", "AUTH_SMOKE_COMPANY_HEAD_TOTP_SECRET",
  "AUTH_SMOKE_CONSTRUCTION_DIRECTOR_TOTP_SECRET",
];

export function environmentRequirements(environment) {
  if (!["staging", "production"].includes(environment)) throw new Error("environment must be staging or production");
  return {
    secrets: [...commonSecrets, ...roleSmokeSecrets, ...(environment === "production" ? productionSecrets : [])],
    variables: ["APP_ALLOWED_ORIGINS", "APP_PUBLIC_URL"],
  };
}

export function validateEnvironmentValues(environment, values) {
  const requirements = environmentRequirements(environment);
  const missing = [...requirements.secrets, ...requirements.variables].filter((name) => !values[name]?.trim());
  if (missing.length) return { valid: false, missing, requirements };
  const projectId = values.SUPABASE_PROJECT_ID.trim();
  const supabaseUrl = new URL(values.VITE_SUPABASE_URL.trim());
  const publicUrl = new URL(values.APP_PUBLIC_URL.trim());
  const origins = values.APP_ALLOWED_ORIGINS.split(",").map((item) => item.trim().replace(/\/$/, ""));
  const errors = [];
  if (supabaseUrl.hostname !== `${projectId}.supabase.co` || supabaseUrl.protocol !== "https:") {
    errors.push("VITE_SUPABASE_URL does not match SUPABASE_PROJECT_ID");
  }
  if (values.AUTH_SMOKE_SUPABASE_URL.trim() !== values.VITE_SUPABASE_URL.trim()
      || values.AUTH_SMOKE_SUPABASE_ANON_KEY.trim() !== values.VITE_SUPABASE_ANON_KEY.trim()) {
    errors.push("Auth smoke credentials must target the deployed Supabase project");
  }
  if (publicUrl.protocol !== "https:" || !origins.includes(publicUrl.origin)) {
    errors.push("APP_PUBLIC_URL must be HTTPS and included in APP_ALLOWED_ORIGINS");
  }
  return { valid: errors.length === 0, missing: [], errors, requirements };
}

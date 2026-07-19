import { parseSentryDsn } from "./monitoring/sentryEnvelope.js";

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
const stagingObservabilitySecrets = ["VITE_SENTRY_DSN"];
const productionSecrets = [
  "VITE_SENTRY_DSN", "UAT_EVIDENCE_JSON",
  "PILOT_RECONCILIATION_EVIDENCE_JSON", "RESTORE_EVIDENCE_JSON",
  "PRODUCTION_HANDOFF_JSON",
  "AUTH_SMOKE_CREATOR_TOTP_SECRET", "AUTH_SMOKE_COMPANY_HEAD_TOTP_SECRET",
  "AUTH_SMOKE_CONSTRUCTION_DIRECTOR_TOTP_SECRET",
];
const backupSecrets = [
  "SUPABASE_DB_URL", "BACKUP_ENCRYPTION_PASSWORD",
  "BACKUP_SUPABASE_URL", "BACKUP_SUPABASE_SERVICE_ROLE_KEY",
];
const restoreSecrets = ["BACKUP_ENCRYPTION_PASSWORD"];

export const deploymentEnvironments = ["staging", "production", "production-backup", "production-restore"];

export function environmentRequirements(environment) {
  if (!deploymentEnvironments.includes(environment)) {
    throw new Error(`environment must be one of: ${deploymentEnvironments.join(", ")}`);
  }
  if (environment === "production-backup") return { secrets: backupSecrets, variables: [] };
  if (environment === "production-restore") return { secrets: restoreSecrets, variables: [] };
  return {
    secrets: [
      ...commonSecrets,
      ...roleSmokeSecrets,
      ...(environment === "staging" ? stagingObservabilitySecrets : []),
      ...(environment === "production" ? productionSecrets : []),
    ],
    variables: ["APP_ALLOWED_ORIGINS", "APP_PUBLIC_URL"],
  };
}

export function validateEnvironmentValues(environment, values) {
  const requirements = environmentRequirements(environment);
  const missing = [...requirements.secrets, ...requirements.variables].filter((name) => !values[name]?.trim());
  if (missing.length) return { valid: false, missing, requirements };
  const errors = [];
  if (["production-backup", "production-restore"].includes(environment)) {
    if (values.BACKUP_ENCRYPTION_PASSWORD.trim().length < 24) {
      errors.push("BACKUP_ENCRYPTION_PASSWORD must contain at least 24 characters");
    }
    if (environment === "production-backup") {
      try {
        const databaseUrl = new URL(values.SUPABASE_DB_URL.trim());
        if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
          errors.push("SUPABASE_DB_URL must use postgres or postgresql protocol");
        }
      } catch {
        errors.push("SUPABASE_DB_URL must be a valid database URL");
      }
      try {
        const backupUrl = new URL(values.BACKUP_SUPABASE_URL.trim());
        if (backupUrl.protocol !== "https:" || !backupUrl.hostname.endsWith(".supabase.co")) {
          errors.push("BACKUP_SUPABASE_URL must be an HTTPS Supabase project URL");
        }
      } catch {
        errors.push("BACKUP_SUPABASE_URL must be a valid URL");
      }
    }
    return { valid: errors.length === 0, missing: [], errors, requirements };
  }
  const projectId = values.SUPABASE_PROJECT_ID.trim();
  const supabaseUrl = new URL(values.VITE_SUPABASE_URL.trim());
  const publicUrl = new URL(values.APP_PUBLIC_URL.trim());
  const origins = values.APP_ALLOWED_ORIGINS.split(",").map((item) => item.trim().replace(/\/$/, ""));
  if (["staging", "production"].includes(environment)) {
    try {
      parseSentryDsn(values.VITE_SENTRY_DSN.trim());
    } catch (error) {
      errors.push(`VITE_SENTRY_DSN is invalid: ${error.message}`);
    }
  }
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

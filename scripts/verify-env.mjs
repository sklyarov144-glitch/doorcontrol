const environments = {
  local: ["VITE_DATA_PROVIDER"],
  staging: ["VITE_DATA_PROVIDER", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_SENTRY_DSN"],
  production: ["VITE_DATA_PROVIDER", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_SENTRY_DSN"],
};

const target = process.env.DEPLOY_ENV ?? "local";
const required = environments[target];

if (!required) {
  console.error(`Unknown DEPLOY_ENV: ${target}`);
  process.exit(1);
}

const missing = required.filter((name) => !process.env[name]);
if (process.env.VITE_DATA_PROVIDER && target !== "local" && process.env.VITE_DATA_PROVIDER !== "supabase") {
  missing.push("VITE_DATA_PROVIDER= supabase");
}
if (target === "production" && process.env.VITE_REQUIRE_PRIVILEGED_MFA !== "true") {
  missing.push("VITE_REQUIRE_PRIVILEGED_MFA=true");
}

if (missing.length) {
  console.error(`Missing or invalid ${target} environment values: ${missing.join(", ")}`);
  process.exit(1);
}

if (target !== "local") {
  const supabaseUrl = new URL(process.env.VITE_SUPABASE_URL);
  if (supabaseUrl.protocol !== "https:" || !supabaseUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("VITE_SUPABASE_URL must be the HTTPS URL of a hosted Supabase project");
  }
  if (process.env.VITE_SUPABASE_ANON_KEY.length < 80) {
    throw new Error("VITE_SUPABASE_ANON_KEY has an unexpected format");
  }
}

console.log(`${target} environment contains all required public configuration values.`);

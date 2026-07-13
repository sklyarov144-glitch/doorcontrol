const environments = {
  local: ["VITE_DATA_PROVIDER"],
  staging: ["VITE_DATA_PROVIDER", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
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

if (missing.length) {
  console.error(`Missing or invalid ${target} environment values: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`${target} environment contains all required public configuration values.`);

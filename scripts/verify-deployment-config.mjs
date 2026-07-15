const required = [
  "SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_ID", "APP_ALLOWED_ORIGINS", "APP_PUBLIC_URL",
  "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "VITE_SUPABASE_URL",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) throw new Error(`Missing deployment configuration: ${missing.join(", ")}`);

const publicUrl = new URL(process.env.APP_PUBLIC_URL);
if (publicUrl.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(publicUrl.hostname)) {
  throw new Error("APP_PUBLIC_URL must be a public HTTPS origin");
}
if (publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash) {
  throw new Error("APP_PUBLIC_URL must contain only scheme and host");
}

const origins = process.env.APP_ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
for (const origin of origins) {
  const parsed = new URL(origin);
  if (parsed.origin !== origin.replace(/\/$/, "") || parsed.protocol !== "https:") {
    throw new Error(`Invalid allowed origin: ${origin}`);
  }
}
if (!origins.map((value) => value.replace(/\/$/, "")).includes(publicUrl.origin)) {
  throw new Error("APP_ALLOWED_ORIGINS must include APP_PUBLIC_URL");
}
if (!/^[a-z0-9]{20}$/.test(process.env.SUPABASE_PROJECT_ID)) {
  throw new Error("SUPABASE_PROJECT_ID has an unexpected format");
}
const supabaseUrl = new URL(process.env.VITE_SUPABASE_URL);
if (supabaseUrl.protocol !== "https:" || supabaseUrl.pathname !== "/" || supabaseUrl.search || supabaseUrl.hash) {
  throw new Error("VITE_SUPABASE_URL must be a hosted HTTPS origin");
}
if (supabaseUrl.hostname !== `${process.env.SUPABASE_PROJECT_ID}.supabase.co`) {
  throw new Error("VITE_SUPABASE_URL must match SUPABASE_PROJECT_ID");
}

console.log(`Deployment configuration is valid for ${publicUrl.origin} and Supabase project ${process.env.SUPABASE_PROJECT_ID}.`);

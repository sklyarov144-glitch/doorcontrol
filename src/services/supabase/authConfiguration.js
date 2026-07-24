const managementApiBaseUrl = "https://api.supabase.com/v1";

export function normalizeAppPublicUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("APP_PUBLIC_URL must use HTTPS");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("APP_PUBLIC_URL must be an HTTPS origin without credentials, path, query or hash");
  }
  return url.origin;
}

export function buildHostedAuthConfiguration(appPublicUrl) {
  const origin = normalizeAppPublicUrl(appPublicUrl);
  return {
    site_url: origin,
    uri_allow_list: [origin, `${origin}/reset-password`].join(","),
    disable_signup: true,
    external_email_enabled: true,
    external_phone_enabled: false,
    mailer_autoconfirm: false,
    // Recovery links already prove possession of the account email. Requiring
    // a second recent login here invalidates the recovery session on update.
    security_update_password_require_reauthentication: false,
  };
}

export function authConfigurationEndpoint(projectRef) {
  if (!/^[a-z]{20}$/.test(projectRef)) throw new Error("SUPABASE_PROJECT_ID must be a 20-character project ref");
  return `${managementApiBaseUrl}/projects/${projectRef}/config/auth`;
}

export function verifyHostedAuthConfiguration(actual, expected) {
  const mismatches = [];
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (actual?.[key] !== expectedValue) {
      mismatches.push({ key, expected: expectedValue, actual: actual?.[key] });
    }
  }
  return { valid: mismatches.length === 0, mismatches };
}

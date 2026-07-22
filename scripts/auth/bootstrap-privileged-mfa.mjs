import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { generateTotp } from "./totp.mjs";

export const privilegedSmokeRoles = ["creator", "company_head", "construction_director"];

function required(values, name) {
  const value = values[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function parseMfaBootstrapConfig(argv = process.argv.slice(2), values = process.env) {
  const enroll = argv.includes("--enroll");
  const verify = argv.includes("--verify");
  if (enroll === verify) throw new Error("Pass exactly one mode: --enroll or --verify");

  const target = values.MFA_BOOTSTRAP_CONFIRM?.trim();
  if (!['STAGING', 'PRODUCTION'].includes(target)) {
    throw new Error("Set MFA_BOOTSTRAP_CONFIRM=STAGING or MFA_BOOTSTRAP_CONFIRM=PRODUCTION");
  }

  const outputPath = values.MFA_BOOTSTRAP_OUTPUT?.trim();
  if (enroll && !outputPath) throw new Error("MFA_BOOTSTRAP_OUTPUT is required for --enroll");
  if (outputPath && !path.isAbsolute(outputPath)) throw new Error("MFA_BOOTSTRAP_OUTPUT must be an absolute path");

  const url = required({ ...values, AUTH_SMOKE_SUPABASE_URL: values.AUTH_SMOKE_SUPABASE_URL ?? values.VITE_SUPABASE_URL }, "AUTH_SMOKE_SUPABASE_URL");
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("VITE_SUPABASE_URL must be a hosted Supabase HTTPS URL");
  }

  const accounts = privilegedSmokeRoles.map((role) => {
    const prefix = `AUTH_SMOKE_${role.toUpperCase()}`;
    return {
      role,
      prefix,
      email: required(values, `${prefix}_EMAIL`).toLowerCase(),
      password: required(values, `${prefix}_PASSWORD`),
      secret: values[`${prefix}_TOTP_SECRET`]?.trim() || "",
    };
  });

  return {
    mode: enroll ? "enroll" : "verify",
    target,
    outputPath: outputPath || "",
    overwrite: values.MFA_BOOTSTRAP_OVERWRITE === "1",
    url,
    anonKey: required({ ...values, AUTH_SMOKE_SUPABASE_ANON_KEY: values.AUTH_SMOKE_SUPABASE_ANON_KEY ?? values.VITE_SUPABASE_ANON_KEY }, "AUTH_SMOKE_SUPABASE_ANON_KEY"),
    accounts,
  };
}

export function writeMfaSecretsFile(filePath, target, secrets, overwrite = false) {
  const payload = `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    target,
    secrets,
  }, null, 2)}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, payload, { encoding: "utf8", flag: overwrite ? "w" : "wx", mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

async function verifyFactor(client, factors, secret, role) {
  let lastError;
  for (const factor of factors) {
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) {
      lastError = challengeError;
      continue;
    }
    const { error: verifyError } = await client.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: generateTotp(secret),
    });
    if (!verifyError) return factor.id;
    lastError = verifyError;
  }
  throw new Error(`${role}: MFA verification failed (${lastError?.message ?? "no matching TOTP factor"})`);
}

async function requireAal2WriteGuard(client, role) {
  const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== "aal2") {
    throw new Error(`${role}: session did not reach aal2`);
  }
  const { data: guardSatisfied, error: guardError } = await client.rpc("privileged_mfa_satisfied");
  if (guardError) throw new Error(`${role}: database MFA guard unavailable (${guardError.message})`);
  if (guardSatisfied !== true) throw new Error(`${role}: database MFA guard rejected the aal2 session`);
}

async function prepareAccount(config, account) {
  const client = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const { data: authData, error: signInError } = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (signInError || !authData.user) {
      throw new Error(`${account.role}: sign-in failed (${signInError?.message ?? "missing user"})`);
    }

    const { data: factorData, error: factorError } = await client.auth.mfa.listFactors();
    if (factorError) throw new Error(`${account.role}: MFA factors unavailable (${factorError.message})`);
    const allFactors = factorData.all ?? factorData.totp ?? [];
    const verified = allFactors.filter((factor) => factor.status === "verified" && (factor.factor_type ?? factor.factorType) === "totp");

    let secret = account.secret;
    if (verified.length) {
      if (!secret) {
        throw new Error(`${account.prefix}_TOTP_SECRET is required because a verified factor already exists and cannot be recovered`);
      }
      await verifyFactor(client, verified, secret, account.role);
    } else {
      if (config.mode === "verify") throw new Error(`${account.role}: verified TOTP factor is required`);
      for (const factor of allFactors.filter((item) => item.status === "unverified")) {
        const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw new Error(`${account.role}: unable to remove stale MFA enrollment (${error.message})`);
      }
      const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `GROSS ${config.target} smoke ${account.role}`,
      });
      if (enrollmentError || !enrollment?.totp?.secret) {
        throw new Error(`${account.role}: MFA enrollment failed (${enrollmentError?.message ?? "secret missing"})`);
      }
      secret = enrollment.totp.secret;
      await verifyFactor(client, [{ id: enrollment.id }], secret, account.role);
    }

    await requireAal2WriteGuard(client, account.role);
    return secret;
  } finally {
    await client.auth.signOut().catch(() => {});
  }
}

export async function runMfaBootstrap(config) {
  if (config.mode === "enroll" && fs.existsSync(config.outputPath) && !config.overwrite) {
    throw new Error("MFA_BOOTSTRAP_OUTPUT already exists; choose another path or set MFA_BOOTSTRAP_OVERWRITE=1");
  }

  const secrets = {};
  for (const account of config.accounts) {
    const secret = await prepareAccount(config, account);
    secrets[`${account.prefix}_TOTP_SECRET`] = secret;
    console.log(`OK ${account.role}: aal2 and database guard verified`);
  }

  if (config.mode === "enroll") {
    writeMfaSecretsFile(config.outputPath, config.target, secrets, config.overwrite);
    console.log(`MFA bootstrap completed. Secret bundle written with mode 0600: ${config.outputPath}`);
  } else {
    console.log(`MFA verification passed for all privileged ${config.target.toLowerCase()} smoke accounts.`);
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const config = parseMfaBootstrapConfig();
  await runMfaBootstrap(config);
}

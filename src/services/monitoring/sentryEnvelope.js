export function parseSentryDsn(value) {
  if (!value) throw new Error("Sentry DSN is required.");

  let dsn;
  try {
    dsn = new URL(value);
  } catch {
    throw new Error("Sentry DSN must be a valid URL.");
  }

  if (!["https:", "http:"].includes(dsn.protocol)) {
    throw new Error("Sentry DSN must use HTTP or HTTPS.");
  }
  if (!dsn.username) throw new Error("Sentry DSN public key is missing.");

  const pathParts = dsn.pathname.split("/").filter(Boolean);
  const projectId = pathParts.pop();
  if (!projectId) throw new Error("Sentry DSN project id is missing.");

  const pathPrefix = pathParts.length ? `/${pathParts.join("/")}` : "";
  return {
    dsn: value,
    projectId,
    publicKey: dsn.username,
    envelopeUrl: `${dsn.protocol}//${dsn.host}${pathPrefix}/api/${projectId}/envelope/`,
  };
}

export function createSentrySmokeEnvelope({ dsn, environment, release, eventId, timestamp }) {
  const event = {
    event_id: eventId,
    timestamp,
    platform: "javascript",
    level: "info",
    environment,
    release,
    logger: "gross.release-smoke",
    message: `GROSS release monitoring smoke: ${environment} ${release}`,
    tags: {
      smoke_test: "deployment",
      service: "gross-lean-montage",
    },
  };

  return [
    JSON.stringify({ event_id: eventId, sent_at: timestamp, dsn }),
    JSON.stringify({ type: "event", content_type: "application/json" }),
    JSON.stringify(event),
  ].join("\n");
}

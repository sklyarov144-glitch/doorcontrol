import { describe, expect, it } from "vitest";
import { createSentrySmokeEnvelope, parseSentryDsn } from "./sentryEnvelope";

describe("Sentry deployment smoke envelope", () => {
  it("builds the project envelope endpoint from a hosted DSN", () => {
    expect(parseSentryDsn("https://public-key@o123.ingest.sentry.io/456")).toEqual({
      dsn: "https://public-key@o123.ingest.sentry.io/456",
      projectId: "456",
      publicKey: "public-key",
      envelopeUrl: "https://o123.ingest.sentry.io/api/456/envelope/",
    });
  });

  it("preserves a relay path prefix", () => {
    expect(parseSentryDsn("https://key@example.test/sentry/42").envelopeUrl)
      .toBe("https://example.test/sentry/api/42/envelope/");
  });

  it("creates a release-scoped event without user data", () => {
    const envelope = createSentrySmokeEnvelope({
      dsn: "https://key@example.test/42",
      environment: "staging",
      release: "abc123",
      eventId: "0123456789abcdef0123456789abcdef",
      timestamp: "2026-07-16T12:00:00.000Z",
    });
    const event = JSON.parse(envelope.split("\n")[2]);

    expect(event).toMatchObject({
      event_id: "0123456789abcdef0123456789abcdef",
      environment: "staging",
      release: "abc123",
      logger: "gross.release-smoke",
    });
    expect(envelope).not.toContain("email");
    expect(envelope).not.toContain("phone");
  });

  it("rejects an incomplete DSN", () => {
    expect(() => parseSentryDsn("https://example.test/42")).toThrow("public key");
  });
});

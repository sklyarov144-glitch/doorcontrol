import { describe, expect, it } from "vitest";
import { assertSameOriginResponse, validateSpaDocument } from "./smokeValidation";

const release = "a".repeat(40);
const document = `<!doctype html><html><head>
  <title>ГРОСС Бережливый Монтаж</title>
  <meta name="gross-release" content="${release}">
  <script type="module" crossorigin src="/assets/index.js"></script>
</head><body><div id="root"></div></body></html>`;

describe("deployment smoke validation", () => {
  it("accepts the expected SPA release", () => {
    expect(validateSpaDocument(document, release)).toBe(true);
  });

  it("rejects stale releases and login interception pages", () => {
    expect(validateSpaDocument(document, "b".repeat(40))).toBe(false);
    expect(validateSpaDocument("<html>Sign in to Vercel</html>", release)).toBe(false);
  });

  it("rejects redirects to external deployment protection", () => {
    expect(() => assertSameOriginResponse(
      "https://staging.example.ru/",
      "https://vercel.com/login",
    )).toThrow("redirected outside");
  });
});

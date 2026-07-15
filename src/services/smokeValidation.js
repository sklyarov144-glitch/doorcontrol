export function validateSpaDocument(body, expectedRelease = "") {
  if (!body.includes('id="root"')) return false;
  if (!body.includes("<title>ГРОСС Бережливый Монтаж</title>")) return false;
  if (!/<script[^>]+type="module"[^>]+src="\/(?:assets\/[^"]+\.js|src\/frontend\/main\.jsx)"/.test(body)) return false;
  if (!expectedRelease) return true;
  return body.includes(`<meta name="gross-release" content="${expectedRelease}">`)
    || body.includes(`<meta name="gross-release" content="${expectedRelease}" />`);
}

export function assertSameOriginResponse(requestUrl, responseUrl) {
  const requestedOrigin = new URL(requestUrl).origin;
  const responseOrigin = new URL(responseUrl).origin;
  if (requestedOrigin !== responseOrigin) {
    throw new Error(`request was redirected outside the application origin to ${responseOrigin}`);
  }
}

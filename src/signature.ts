// Verifies HubSpot webhook requests (signature v3).
// Signed string: method + full URI + raw body + timestamp, HMAC-SHA256 with the app's client secret, base64.

export const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

// HubSpot signs the URI with these characters decoded.
const URI_DECODES: Record<string, string> = {
  "%3A": ":", "%2F": "/", "%3F": "?", "%40": "@", "%21": "!", "%24": "$",
  "%27": "'", "%28": "(", "%29": ")", "%2A": "*", "%2C": ",", "%3B": ";",
};

export function normalizeUri(uri: string): string {
  return uri.replace(/%(3A|2F|3F|40|21|24|27|28|29|2A|2C|3B)/gi, (m) => URI_DECODES[m.toUpperCase()] ?? m);
}

export async function computeSignature(
  secret: string,
  method: string,
  uri: string,
  body: string,
  timestamp: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(method + normalizeUri(uri) + body + timestamp));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyHubSpotSignature(
  secret: string,
  method: string,
  uri: string,
  body: string,
  signature: string | null,
  timestamp: string | null,
  now: number = Date.now(),
): Promise<boolean> {
  if (!signature || !timestamp) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SIGNATURE_AGE_MS) return false;
  const expected = await computeSignature(secret, method, uri, body, timestamp);
  return timingSafeEqual(expected, signature);
}

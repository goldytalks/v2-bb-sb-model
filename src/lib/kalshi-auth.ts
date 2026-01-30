/**
 * Kalshi RSA Authentication
 *
 * Signs requests using RSA-PSS with SHA256 for authenticated endpoints.
 * Requires KALSHI_API_KEY and KALSHI_PRIVATE_KEY env vars.
 */

import crypto from 'crypto';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

export function getKalshiCredentials(): { apiKey: string; privateKey: string } | null {
  const apiKey = process.env.KALSHI_API_KEY;
  const privateKey = process.env.KALSHI_PRIVATE_KEY;
  if (!apiKey || !privateKey) return null;
  return { apiKey, privateKey };
}

export function signRequest(
  privateKeyPem: string,
  timestampMs: string,
  method: string,
  path: string
): string {
  const message = timestampMs + method.toUpperCase() + path;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  sign.end();
  return sign.sign(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 },
    'base64'
  );
}

export async function kalshiAuthFetch(
  path: string,
  method: string = 'GET'
): Promise<Response | null> {
  const creds = getKalshiCredentials();
  if (!creds) return null;

  const timestampMs = Date.now().toString();
  const signature = signRequest(creds.privateKey, timestampMs, method, path);

  return fetch(`${KALSHI_API}${path}`, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'KALSHI-ACCESS-KEY': creds.apiKey,
      'KALSHI-ACCESS-TIMESTAMP': timestampMs,
      'KALSHI-ACCESS-SIGNATURE': signature,
    },
  });
}

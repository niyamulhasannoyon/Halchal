/**
 * Halchal (হালচাল) - Device Pseudonymization Module
 * Computes irreversible HMAC-SHA256 device_id_hash using a server secret.
 *
 * Privacy Principle:
 * device_id is a random UUID generated client-side and persisted in local storage.
 * Fingerprinting (canvas, audio, UA, WebGL) is strictly forbidden because it is
 * spoofable by attackers and privacy-hostile to legitimate citizens.
 */

export async function computeDeviceIdHash(
  deviceId: string,
  serverSecret?: string
): Promise<string> {
  const secret = serverSecret || Deno.env.get('DEVICE_SECRET') || Deno.env.get('SERVER_SECRET') || 'halchal-default-secret-change-in-prod';

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(deviceId.trim().toLowerCase())
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

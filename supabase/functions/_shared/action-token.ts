/**
 * Halchal (হালচাল) - Signed Action Token Module
 * Powers one-tap notification restoration voting ("ঠিক হয়ে গেছে / এখনো নেই").
 *
 * Security Guarantees:
 * 1. Cryptographically signed with HMAC-SHA256 server secret.
 * 2. Short-lived 15-minute expiration (900 seconds).
 * 3. Enforced SINGLE-USE via Redis atomic SET NX.
 * 4. Tamper-proof payload contains user_id, device_id, h3_index, and category.
 */

import { ActionTokenPayload, UtilityCategory } from './types.ts';
import { IRedisClient } from './redis.ts';
import { Errors } from './errors.ts';

const ACTION_TOKEN_HEADER = { alg: 'HS256', typ: 'JWT' };

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Generates a signed, single-use action token for notification buttons
 */
export async function createActionToken(
  params: {
    userId: string;
    deviceId: string;
    h3Index: string;
    category: UtilityCategory;
  },
  serverSecret?: string,
  ttlSeconds = 900 // 15 minutes default
): Promise<string> {
  const secret = serverSecret || Deno.env.get('ACTION_TOKEN_SECRET') || Deno.env.get('SERVER_SECRET') || 'halchal-action-secret-replace-in-prod';
  const now = Math.floor(Date.now() / 1000);

  const payload: ActionTokenPayload = {
    sub: params.userId,
    dev: params.deviceId,
    h3: params.h3Index,
    cat: params.category,
    vid: crypto.randomUUID(),
    iat: now,
    exp: now + ttlSeconds,
  };

  const headerPart = base64UrlEncode(JSON.stringify(ACTION_TOKEN_HEADER));
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerPart}.${payloadPart}`;

  const key = await getCryptoKey(secret);
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  const signaturePart = base64UrlEncode(new Uint8Array(signatureBytes));

  return `${message}.${signaturePart}`;
}

/**
 * Verifies HMAC signature, checks expiration, and consumes single-use nonce via Redis.
 */
export async function verifyAndConsumeActionToken(
  token: string,
  redis: IRedisClient,
  serverSecret?: string
): Promise<ActionTokenPayload> {
  const secret = serverSecret || Deno.env.get('ACTION_TOKEN_SECRET') || Deno.env.get('SERVER_SECRET') || 'halchal-action-secret-replace-in-prod';

  if (!token || typeof token !== 'string') {
    throw Errors.INVALID_ACTION_TOKEN('টোকেন প্রদান করা হয়নি');
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw Errors.INVALID_ACTION_TOKEN('টোকেন ফরম্যাট অবৈধ');
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const message = `${headerPart}.${payloadPart}`;

  // 1. Verify HMAC Signature
  const key = await getCryptoKey(secret);
  const signatureBytes = base64UrlDecode(signaturePart);
  const isValidSig = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    new TextEncoder().encode(message)
  );

  if (!isValidSig) {
    throw Errors.INVALID_ACTION_TOKEN('টোকেনের স্বাক্ষর সঠিক নয়');
  }

  // 2. Decode and Validate Payload
  let payload: ActionTokenPayload;
  try {
    const jsonStr = new TextDecoder().decode(base64UrlDecode(payloadPart));
    payload = JSON.parse(jsonStr) as ActionTokenPayload;
  } catch {
    throw Errors.INVALID_ACTION_TOKEN('টোকেন ডিকোড করা সম্ভব হয়নি');
  }

  // 3. Expiration Check (15 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw Errors.TOKEN_EXPIRED();
  }

  // 4. Single-Use Replay Prevention via Redis SET NX
  const replayKey = `token:used:${payload.vid}`;
  const ttl = Math.max(60, payload.exp - now);
  const setResult = await redis.set(replayKey, '1', { ex: ttl, nx: true });

  if (setResult === null) {
    // Key already existed -> Replay attack detected!
    throw Errors.TOKEN_ALREADY_USED();
  }

  return payload;
}

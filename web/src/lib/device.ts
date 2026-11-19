/**
 * Halchal - Privacy-Preserving Device Identity
 * Architecture: ADR-0008, CLAUDE.md Non-Negotiable Privacy Rules
 * Rule: Persistent random UUID upon install. Fingerprinting is strictly forbidden.
 */

const DEVICE_ID_KEY = 'halchal-device-id';

/**
 * Generates a standard RFC4122 v4 UUID
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback RFC4122 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns the persistent local device UUID, generating one if not present
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-4000-8000-000000000000';
  }

  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || !isValidUUID(id)) {
      id = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

/**
 * Validates standard UUID format
 */
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

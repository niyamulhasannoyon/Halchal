/**
 * Halchal Admin - Authorized Administrative Identities
 * Architecture: ADR-0018
 *
 * System Operators designated with permanent administrative privileges:
 * - niyamulhasanbd@gmail.com (Owner)
 * - niyamulhasan1089@gmail.com (Owner)
 */

export const AUTHORIZED_ADMIN_EMAILS = new Set([
  'niyamulhasanbd@gmail.com',
  'niyamulhasan1089@gmail.com',
]);

/**
 * Checks whether an email address is on the designated administrator allowlist
 */
export function isAuthorizedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return AUTHORIZED_ADMIN_EMAILS.has(email.toLowerCase().trim());
}

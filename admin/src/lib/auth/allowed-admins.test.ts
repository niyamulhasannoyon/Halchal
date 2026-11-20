import { describe, it, expect } from 'vitest';
import { isAuthorizedAdminEmail, AUTHORIZED_ADMIN_EMAILS } from './allowed-admins';

describe('Authorized Admin Identities Whitelist', () => {
  it('confirms niyamulhasanbd@gmail.com and niyamulhasan1089@gmail.com are the designated admin accounts', () => {
    expect(isAuthorizedAdminEmail('niyamulhasanbd@gmail.com')).toBe(true);
    expect(isAuthorizedAdminEmail('niyamulhasan1089@gmail.com')).toBe(true);
  });

  it('handles casing and leading/trailing whitespace correctly', () => {
    expect(isAuthorizedAdminEmail('  NIYAMULHASANBD@GMAIL.COM  ')).toBe(true);
    expect(isAuthorizedAdminEmail('NiyamulHasan1089@gmail.com')).toBe(true);
  });

  it('strictly rejects any other email address', () => {
    expect(isAuthorizedAdminEmail('hacker@gmail.com')).toBe(false);
    expect(isAuthorizedAdminEmail('random.user@gmail.com')).toBe(false);
    expect(isAuthorizedAdminEmail('admin@halchal.bd')).toBe(false);
    expect(isAuthorizedAdminEmail(null)).toBe(false);
    expect(isAuthorizedAdminEmail(undefined)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { validateAdminPassword } from './password-policy.js';

describe('Admin Password Policy Validation', () => {
  it('rejects passwords shorter than 14 characters', () => {
    const res = validateAdminPassword('Short@123');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password must be at least 14 characters long.');
  });

  it('rejects passwords without uppercase letters', () => {
    const res = validateAdminPassword('lowercase_only_12345!');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password must contain at least one uppercase letter (A-Z).');
  });

  it('rejects passwords without lowercase letters', () => {
    const res = validateAdminPassword('UPPERCASE_ONLY_12345!');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password must contain at least one lowercase letter (a-z).');
  });

  it('rejects passwords without digits', () => {
    const res = validateAdminPassword('NoDigitsHereAtAll!@#');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password must contain at least one numeric digit (0-9).');
  });

  it('rejects passwords without special characters', () => {
    const res = validateAdminPassword('NoSpecialChars123456');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password must contain at least one special character or symbol.');
  });

  it('rejects blacklisted common passwords', () => {
    const res = validateAdminPassword('password12345678');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password is in the common password blacklist and is easily guessable.');
  });

  it('rejects excessive repeating character sequences', () => {
    const res = validateAdminPassword('ValidStartaaaaaa123!@#');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Password contains excessive consecutive repeating characters.');
  });

  it('accepts strong compliant passwords', () => {
    const res = validateAdminPassword('H@lch4l-Operat0r-2026!Secure');
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});

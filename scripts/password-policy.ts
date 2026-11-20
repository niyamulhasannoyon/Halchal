/**
 * Halchal Admin Password Policy Validator
 * Architecture: ADR-0018
 *
 * Rules:
 * 1. Minimum length >= 14 characters
 * 2. Maximum length <= 128 characters
 * 3. Contains at least one uppercase letter (A-Z)
 * 4. Contains at least one lowercase letter (a-z)
 * 5. Contains at least one numeric digit (0-9)
 * 6. Contains at least one special character / symbol
 * 7. Not present in common password blacklist
 * 8. No repeated character sequences (e.g., 'aaaaa')
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const COMMON_PASSWORDS_BLACKLIST = new Set([
  'password123456',
  'password1234567',
  'password12345678',
  'admin123456789',
  'administrator1',
  'halchaladmin123',
  'bangladesh12345',
  'dhaka1234567890',
  'qwertyuiop12345',
  '123456789012345',
  'iloveyou1234567',
  'welcome12345678',
  'correcthorsebatterystaple',
  'changeme1234567',
]);

export function validateAdminPassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password cannot be empty.'],
    };
  }

  // 1. Length check
  if (password.length < 14) {
    errors.push('Password must be at least 14 characters long.');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters.');
  }

  // 2. Character diversity
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z).');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z).');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one numeric digit (0-9).');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` ]/.test(password)) {
    errors.push('Password must contain at least one special character or symbol.');
  }

  // 3. Blacklist check
  const normalized = password.toLowerCase().trim();
  if (COMMON_PASSWORDS_BLACKLIST.has(normalized)) {
    errors.push('Password is in the common password blacklist and is easily guessable.');
  }

  // 4. Repetition check (more than 4 identical consecutive characters)
  if (/(.)\1{4,}/.test(password)) {
    errors.push('Password contains excessive consecutive repeating characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

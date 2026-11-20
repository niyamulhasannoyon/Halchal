import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Security & Secret Leakage Prevention Scanner', () => {
  it('confirms repository contains zero hardcoded credentials, plaintext passwords, or private keys', () => {
    const scannerPath = path.resolve(rootDir, 'scripts/check-secrets-leakage.mjs');
    const result = execSync(`node "${scannerPath}"`, {
      encoding: 'utf-8',
      cwd: rootDir,
    });

    expect(result).toContain('PASS: No exposed secrets or hardcoded credentials detected.');
  });
});

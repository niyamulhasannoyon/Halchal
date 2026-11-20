#!/usr/bin/env node
/**
 * Halchal - Credential & Secret Leakage Scanner
 * Architecture: ADR-0018
 *
 * Scans repository files for accidentally hardcoded secrets, private keys,
 * production tokens, or plaintext credentials.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Directories and file patterns to ignore
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  '.turbo',
  'coverage',
  '.vercel',
  'baseline-reports',
  'optimized-reports',
  'reports',
]);

const IGNORE_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'deno.lock',
  '.env.example',
  'benchmark-summary.json',
  'optimized-summary.json',
]);

const SECRET_PATTERNS = [
  {
    name: 'Private Cryptographic Key',
    regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP)?\s?PRIVATE KEY-----/,
  },
  {
    name: 'AWS Access Key ID',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/,
  },
  {
    name: 'Slack Token',
    regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/,
  },
  {
    name: 'Stripe Live Secret Key',
    regex: /sk_live_[0-9a-zA-Z]{24,}/,
  },
  {
    name: 'Google OAuth Client Secret',
    regex: /"client_secret"\s*:\s*"[a-zA-Z0-9-_]{24,}"/,
  },
  {
    name: 'Hardcoded Plaintext Admin Password in assignment',
    regex: /(?:ADMIN_PASSWORD|admin_password|adminPassword)\s*[:=]\s*["'](?!placeholder|your-|example|\$\{)[^"']{6,}["']/,
  },
];

// Whitelisted benign strings/fixtures used in documentation or dummy tests
const WHITELIST = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example_service_role_key',
  'your-super-secret-jwt-token-with-at-least-32-characters',
  'your_upstash_rest_token_here',
  '0x4AAAAAAABBBBBBBBCCCCCC_your_turnstile_secret_key',
  'ya29.your_google_cloud_oauth_bearer_token',
  'your-private-vapid-key-here',
  'ya29.your_firebase_messaging_oauth_access_token',
];

let violations = 0;

function isWhitelisted(content) {
  return WHITELIST.some((safe) => content.includes(safe));
}

function scanFile(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  const baseName = path.basename(filePath);

  if (IGNORE_FILES.has(baseName)) return;
  if (baseName.endsWith('.png') || baseName.endsWith('.ico') || baseName.endsWith('.ttf') || baseName.endsWith('.woff2')) return;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return; // binary or unreadable
  }

  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // Check if line contains whitelisted placeholder
    if (isWhitelisted(line)) return;

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        // Exclude check-secrets-leakage itself testing patterns
        if (relativePath.includes('check-secrets-leakage.mjs')) continue;

        console.error(
          `🚨 [SECRET LEAK DETECTED] ${pattern.name} found in ${relativePath}:${lineIndex + 1}`
        );
        console.error(`   ${line.trim().slice(0, 80)}...`);
        violations++;
      }
    }
  });
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        walkDir(path.join(dir, entry.name));
      }
    } else {
      scanFile(path.join(dir, entry.name));
    }
  }
}

console.log('🔍 Scanning repository for hardcoded credentials and secrets...');
walkDir(REPO_ROOT);

if (violations > 0) {
  console.error(`\n❌ FAILED: ${violations} potential secret leakage violation(s) found!`);
  process.exit(1);
} else {
  console.log('✅ PASS: No exposed secrets or hardcoded credentials detected.');
  process.exit(0);
}

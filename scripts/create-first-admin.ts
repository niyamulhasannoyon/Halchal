#!/usr/bin/env tsx
/**
 * Halchal - First Admin Bootstrap CLI
 * Architecture: ADR-0018
 *
 * Usage:
 *   npx tsx scripts/create-first-admin.ts
 * Or with runtime environment variables:
 *   ADMIN_EMAIL="owner@domain.bd" ADMIN_PASSWORD="..." npx tsx scripts/create-first-admin.ts
 *
 * Security:
 * - Hidden password terminal prompt when run interactively.
 * - Password complexity policy validation (min 14 chars, complexity, blacklist check).
 * - Never prints passwords, tokens, or credentials to stdout/stderr.
 * - Enforces MFA requirement flag on user account.
 */

import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import { validateAdminPassword } from './password-policy.js';

function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    const isTTY = Boolean(stdin.isTTY);

    if (!isTTY) {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    // Interactive hidden input in TTY mode
    process.stdout.write(query);
    let input = '';
    const onData = (char: Buffer) => {
      const str = char.toString('utf-8');
      switch (str) {
        case '\n':
        case '\r':
        case '\u0004': // EOT
          stdin.removeListener('data', onData);
          if (stdin.isTTY && stdin.setRawMode) {
            stdin.setRawMode(false);
          }
          process.stdout.write('\n');
          rl.close();
          resolve(input.trim());
          break;
        case '\u0003': // Ctrl+C
          process.stdout.write('\n');
          process.exit(130);
          break;
        case '\b':
        case '\x7f': // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
          break;
        default:
          input += str;
          break;
      }
    };

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on('data', onData);
  });
}

function promptVisible(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('================================================================');
  console.log(' Halchal Admin Panel — First Admin Bootstrap CLI');
  console.log(' Architecture: ADR-0018 (Role: owner, Mandatory TOTP MFA)');
  console.log('================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Acquire Email
  let email = process.env.ADMIN_EMAIL?.trim();
  if (!email) {
    email = await promptVisible('Enter Admin Email: ');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    console.error('❌ Error: Valid email address is required.');
    process.exit(1);
  }

  // 2. Acquire Password (hidden)
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await promptHidden('Enter Admin Password (hidden): ');
    const confirmPassword = await promptHidden('Confirm Admin Password (hidden): ');
    if (password !== confirmPassword) {
      console.error('❌ Error: Passwords do not match.');
      process.exit(1);
    }
  }

  // 3. Validate Password Policy
  const validation = validateAdminPassword(password);
  if (!validation.valid) {
    console.error('\n❌ Password does not satisfy Halchal Admin security policy:');
    validation.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log('\n🔒 Password meets policy requirements. Creating initial owner account...');

  // 4. Create user in Supabase Auth via Admin API
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      requires_mfa: true,
      role: 'owner',
    },
  });

  if (createError) {
    console.error(`❌ Failed to create auth user: ${createError.message}`);
    process.exit(1);
  }

  const userId = userData.user.id;

  // 5. Insert owner record in admin_users
  const { error: dbError } = await supabase.from('admin_users').upsert(
    {
      user_id: userId,
      email,
      role: 'owner',
      is_active: true,
      created_by: userId,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (dbError) {
    console.error(`❌ Failed to assign owner role in admin_users: ${dbError.message}`);
    // Roll back auth user
    await supabase.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  // 6. Record audit log
  await supabase.from('admin_audit_log').insert({
    admin_id: userId,
    action: 'FIRST_ADMIN_BOOTSTRAP',
    entity_type: 'admin_user',
    entity_id: userId,
    before: null,
    after: { email, role: 'owner', requires_mfa: true },
    reason: 'Initial system bootstrap via create-first-admin CLI',
    ip_hash: 'cli_bootstrap',
    user_agent: 'Halchal CLI',
  });

  console.log('✅ Owner account created successfully!');
  console.log(`   User ID: ${userId}`);
  console.log(`   Email: ${email}`);
  console.log(`   Role: owner`);
  console.log(`   MFA Requirement: Mandatory TOTP enrolled on first sign-in.`);
  console.log('\n⚠️  Next Steps:');
  console.log('   1. Sign in at https://admin.halchal.bd/login');
  console.log('   2. Enroll your Authenticator App (AAL2 TOTP).');
  console.log('   3. Store your backup recovery codes securely.');
  console.log('================================================================');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Fatal bootstrap error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

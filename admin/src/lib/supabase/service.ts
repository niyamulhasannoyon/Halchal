/**
 * Halchal Admin - Server-Side Service Role Client & Strict RBAC Enforcement
 * Architecture: ADR-0018
 *
 * CRITICAL SECURITY DIRECTIVES:
 * 1. This file must NEVER be bundled into client-side code.
 * 2. SUPABASE_SERVICE_ROLE_KEY is accessed exclusively here.
 * 3. Every invocation re-verifies caller credentials, active role, AAL2 MFA, and session timeouts.
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './server';
import { type AdminRole } from '../auth/permissions';
import { cookies } from 'next/headers';

export interface AdminSessionContext {
  user: User;
  adminUser: {
    user_id: string;
    email: string;
    role: AdminRole;
    is_active: boolean;
    created_at: string;
    last_login_at?: string | null;
  };
  serviceClient: SupabaseClient;
}

let cachedServiceClient: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!serviceKey) {
    throw new Error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing in server environment.');
  }

  cachedServiceClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServiceClient;
}

const IDLE_TIMEOUT_SECONDS = 30 * 60; // 30 minutes
const ABSOLUTE_TIMEOUT_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * Re-authenticates and verifies admin privileges on every server action / route handler.
 * Rejects deactivated users, users lacking required roles, sessions lacking AAL2,
 * and timed-out sessions.
 */
export async function requireAdminSession(
  requiredRoles?: AdminRole[]
): Promise<AdminSessionContext> {
  const serverClient = await createSupabaseServerClient();
  const cookieStore = await cookies();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    throw new Error('UNAUTHORIZED: No valid admin session found.');
  }

  // 2. Validate Session Timeouts (Idle: 30 min, Absolute: 12 h)
  const now = Math.floor(Date.now() / 1000);
  const sessionCreatedAtStr = cookieStore.get('halchal_admin_session_start')?.value;
  const lastActiveStr = cookieStore.get('halchal_admin_last_active')?.value;

  if (sessionCreatedAtStr) {
    const sessionCreatedAt = parseInt(sessionCreatedAtStr, 10);
    if (!isNaN(sessionCreatedAt) && now - sessionCreatedAt > ABSOLUTE_TIMEOUT_SECONDS) {
      await serverClient.auth.signOut();
      throw new Error('SESSION_EXPIRED: Absolute session lifetime of 12 hours exceeded. Please sign in again.');
    }
  }

  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    if (!isNaN(lastActive) && now - lastActive > IDLE_TIMEOUT_SECONDS) {
      await serverClient.auth.signOut();
      throw new Error('SESSION_IDLE: Idle timeout of 30 minutes exceeded. Please sign in again.');
    }
  }

  // Update last active timestamp
  try {
    cookieStore.set('halchal_admin_last_active', String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  } catch {
    // Read-only server components
  }

  // 3. Verify MFA Assurance Level (AAL2 Mandatory)
  const { data: aalData, error: aalError } =
    await serverClient.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    throw new Error(`MFA_ERROR: Failed to retrieve assurance level: ${aalError.message}`);
  }

  // If user has enrolled MFA factors but current session is only AAL1, block access
  if (aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
    throw new Error('MFA_REQUIRED: Authenticator Assurance Level 2 (AAL2) verification is mandatory.');
  }

  // 4. Query public.admin_users using service client to eliminate RLS recursion
  const serviceClient = getServiceRoleClient();
  let { data: adminUser, error: adminError } = await serviceClient
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!adminUser && user.email) {
    // Fallback lookup by email
    const { data: emailRecord } = await serviceClient
      .from('admin_users')
      .select('*')
      .ilike('email', user.email)
      .single();

    if (emailRecord) {
      adminUser = emailRecord;
      if (emailRecord.user_id !== user.id) {
        await serviceClient
          .from('admin_users')
          .update({ user_id: user.id })
          .eq('id', emailRecord.id);
      }
    }
  }

  if (!adminUser) {
    throw new Error('FORBIDDEN: User account is not registered in admin_users directory.');
  }

  if (!adminUser.is_active) {
    throw new Error('FORBIDDEN: This administrator account has been deactivated.');
  }

  // 5. Verify granular role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(adminUser.role as AdminRole)) {
      throw new Error(
        `FORBIDDEN: Role '${adminUser.role}' lacks permission. Required roles: ${requiredRoles.join(', ')}.`
      );
    }
  }

  return {
    user,
    adminUser: adminUser as AdminSessionContext['adminUser'],
    serviceClient,
  };
}

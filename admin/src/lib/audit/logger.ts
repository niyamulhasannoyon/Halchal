/**
 * Halchal Admin - Append-Only Audit Logging Subsystem
 * Architecture: ADR-0018
 *
 * Enforces mandatory audit trail generation on every administrative mutation:
 * - Immutable insertion into `public.admin_audit_log`
 * - Mandatory non-empty reason validation for sensitive mutations
 * - Cryptographic IP pseudonymization (SHA-256 hashing)
 * - Automatic redaction of credentials, tokens, and secrets
 */

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogRecord {
  id?: string;
  at?: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ip_hash?: string | null;
  user_agent?: string | null;
}

export interface AuditLogFilter {
  adminId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

const SENSITIVE_KEY_REGEX = /(?:password|secret|token|credential|key|auth|cookie|authorization|jwt)/i;

/**
 * Deeply sanitizes JSON payloads, replacing sensitive keys with '[REDACTED]'
 */
export function redactSecrets(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Mask potential token strings
    if (data.startsWith('eyJ') && data.length > 50) return '[REDACTED_JWT]';
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSecrets);
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSecrets(val);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Generates privacy-preserving SHA-256 hash of caller IP
 */
export function hashIp(ip: string | null | undefined): string {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip.trim()).digest('hex').slice(0, 32);
}

const SENSITIVE_ACTIONS = new Set([
  'ADMIN_INVITE',
  'ADMIN_ROLE_CHANGE',
  'ADMIN_DEACTIVATE',
  'ADMIN_MFA_RESET',
  'FLAG_UPDATE',
  'PRICE_UPDATE',
  'MODERATION_SHADOWBAN',
  'MODERATION_HARD_BLOCK',
  'MODERATION_LOCK_ZONE',
  'MODERATION_REVERT_ZONE',
  'NOTIFICATIONS_EMERGENCY_STOP',
  'ACCOUNT_DELETION',
]);

const SENSITIVE_ENTITIES = new Set([
  'admin_user',
  'feature_flag',
  'official_price',
  'moderation_action',
  'zone_lock',
  'notification_engine',
  'user_account',
]);

/**
 * Returns whether a mutation strictly requires a non-empty rationale
 */
export function isReasonRequired(action: string, entityType: string): boolean {
  return SENSITIVE_ACTIONS.has(action) || SENSITIVE_ENTITIES.has(entityType);
}

/**
 * Persists an audit log entry in PostgreSQL
 */
export async function logAdminMutation(
  supabase: SupabaseClient,
  entry: {
    adminId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  // Validate reason requirement
  const requiresReason = isReasonRequired(entry.action, entry.entityType);
  const cleanReason = entry.reason?.trim();

  if (requiresReason && (!cleanReason || cleanReason.length < 5)) {
    throw new Error(
      `Audit requirement: A valid non-empty reason (at least 5 characters) is required for mutation '${entry.action}' on '${entry.entityType}'.`
    );
  }

  const payload = {
    admin_id: entry.adminId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId || null,
    before: entry.before ? (redactSecrets(entry.before) as Record<string, unknown>) : null,
    after: entry.after ? (redactSecrets(entry.after) as Record<string, unknown>) : null,
    reason: cleanReason || null,
    ip_hash: hashIp(entry.ip),
    user_agent: entry.userAgent?.slice(0, 255) || null,
  };

  const { error } = await supabase.from('admin_audit_log').insert(payload);

  if (error) {
    console.error('Audit logging failure:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

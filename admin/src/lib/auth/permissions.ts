/**
 * Halchal Admin Panel - Granular Permission Matrix & Role-Based Access Control
 * Architecture: ADR-0018
 */

export type AdminRole = 'owner' | 'moderator' | 'content_editor' | 'analyst';

export const ADMIN_ROLES: AdminRole[] = ['owner', 'moderator', 'content_editor', 'analyst'];

export type AdminPermission =
  // Admin Management
  | 'admin_users:read'
  | 'admin_users:invite'
  | 'admin_users:deactivate'
  | 'admin_users:role_change'
  | 'admin_users:mfa_reset'
  // Audit Trail
  | 'audit_log:read'
  | 'audit_log:export'
  // System Health & Telemetry
  | 'system_health:read'
  | 'system_health:edit_thresholds'
  // Geographic Zones & Redirects
  | 'zones:read'
  | 'zones:write'
  | 'zones:merge'
  // Official Utility Prices
  | 'prices:read'
  | 'prices:write'
  // Feature Flags & Kill Switches
  | 'flags:read'
  | 'flags:write'
  // Abuse & Moderation
  | 'moderation:read'
  | 'moderation:action'
  | 'moderation:view_user_history'
  // Editorial Content & Metadata
  | 'content:read'
  | 'content:write'
  // Push Notifications & Alerts
  | 'notifications:read'
  | 'notifications:send'
  | 'notifications:emergency_stop'
  // Data Subject Requests (GDPR/Compliance)
  | 'account_deletion:execute';

/**
 * Explicit mapping of roles to granted permissions
 */
export const ROLE_PERMISSIONS: Record<AdminRole, Set<AdminPermission>> = {
  owner: new Set<AdminPermission>([
    'admin_users:read',
    'admin_users:invite',
    'admin_users:deactivate',
    'admin_users:role_change',
    'admin_users:mfa_reset',
    'audit_log:read',
    'audit_log:export',
    'system_health:read',
    'system_health:edit_thresholds',
    'zones:read',
    'zones:write',
    'zones:merge',
    'prices:read',
    'prices:write',
    'flags:read',
    'flags:write',
    'moderation:read',
    'moderation:action',
    'moderation:view_user_history',
    'content:read',
    'content:write',
    'notifications:read',
    'notifications:send',
    'notifications:emergency_stop',
    'account_deletion:execute',
  ]),

  moderator: new Set<AdminPermission>([
    'audit_log:read',
    'system_health:read',
    'zones:read',
    'zones:write',
    'prices:read',
    'flags:read',
    'moderation:read',
    'moderation:action',
    'moderation:view_user_history',
    'content:read',
    'notifications:read',
    'notifications:send',
  ]),

  content_editor: new Set<AdminPermission>([
    'audit_log:read',
    'system_health:read',
    'zones:read',
    'zones:write',
    'prices:read',
    'prices:write',
    'flags:read',
    'content:read',
    'content:write',
    'notifications:read',
  ]),

  analyst: new Set<AdminPermission>([
    'admin_users:read',
    'audit_log:read',
    'audit_log:export',
    'system_health:read',
    'zones:read',
    'prices:read',
    'flags:read',
    'moderation:read',
    'content:read',
    'notifications:read',
  ]),
};

/**
 * Checks whether an admin role has a specific permission
 */
export function hasPermission(role: AdminRole | null | undefined, permission: AdminPermission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

/**
 * Evaluates route accessibility based on role
 */
export function canAccessPath(role: AdminRole | null | undefined, pathname: string): boolean {
  if (!role) return false;

  // Unprotected / auth utility paths
  if (pathname === '/login' || pathname.startsWith('/auth/')) return true;

  // Owner-only route: admin user management
  if (pathname.startsWith('/admins')) {
    return hasPermission(role, 'admin_users:read');
  }

  // Audit logs: all admins can read, owner and analyst can export
  if (pathname.startsWith('/audit-log')) {
    return hasPermission(role, 'audit_log:read');
  }

  // Moderation / Abuse center: owner and moderator
  if (pathname.startsWith('/moderation')) {
    return hasPermission(role, 'moderation:read');
  }

  // Dashboard / Health: all roles
  if (pathname === '/' || pathname.startsWith('/health')) {
    return hasPermission(role, 'system_health:read');
  }

  // Zones: all roles can view
  if (pathname.startsWith('/zones')) {
    return hasPermission(role, 'zones:read');
  }

  // Prices: all roles can view
  if (pathname.startsWith('/prices')) {
    return hasPermission(role, 'prices:read');
  }

  // Feature Flags: all roles can view
  if (pathname.startsWith('/flags')) {
    return hasPermission(role, 'flags:read');
  }

  // Content: all roles can view
  if (pathname.startsWith('/content')) {
    return hasPermission(role, 'content:read');
  }

  // Notifications: all roles can view
  if (pathname.startsWith('/notifications')) {
    return hasPermission(role, 'notifications:read');
  }

  return true;
}

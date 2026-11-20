import { describe, it, expect } from 'vitest';
import { hasPermission, canAccessPath, AdminRole, AdminPermission } from './permissions';

describe('Admin Permission Matrix & RBAC', () => {
  it('grants owner all operational, destructive, and administrative permissions', () => {
    const ownerPermissions: AdminPermission[] = [
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
    ];

    for (const perm of ownerPermissions) {
      expect(hasPermission('owner', perm)).toBe(true);
    }
  });

  it('denies moderator administrative user management and emergency kill switches', () => {
    expect(hasPermission('moderator', 'admin_users:invite')).toBe(false);
    expect(hasPermission('moderator', 'admin_users:deactivate')).toBe(false);
    expect(hasPermission('moderator', 'flags:write')).toBe(false);
    expect(hasPermission('moderator', 'notifications:emergency_stop')).toBe(false);
    expect(hasPermission('moderator', 'account_deletion:execute')).toBe(false);

    // But allows active moderation
    expect(hasPermission('moderator', 'moderation:action')).toBe(true);
    expect(hasPermission('moderator', 'moderation:view_user_history')).toBe(true);
    expect(hasPermission('moderator', 'zones:write')).toBe(true);
  });

  it('restricts content_editor to editorial and price controls', () => {
    expect(hasPermission('content_editor', 'content:write')).toBe(true);
    expect(hasPermission('content_editor', 'prices:write')).toBe(true);
    expect(hasPermission('content_editor', 'moderation:action')).toBe(false);
    expect(hasPermission('content_editor', 'admin_users:read')).toBe(false);
    expect(hasPermission('content_editor', 'account_deletion:execute')).toBe(false);
  });

  it('enforces read-only permissions for analyst with audit log export', () => {
    expect(hasPermission('analyst', 'audit_log:export')).toBe(true);
    expect(hasPermission('analyst', 'system_health:read')).toBe(true);
    expect(hasPermission('analyst', 'zones:read')).toBe(true);
    expect(hasPermission('analyst', 'zones:write')).toBe(false);
    expect(hasPermission('analyst', 'moderation:action')).toBe(false);
    expect(hasPermission('analyst', 'flags:write')).toBe(false);
    expect(hasPermission('analyst', 'prices:write')).toBe(false);
  });

  it('denies permissions to null or invalid roles', () => {
    expect(hasPermission(null, 'audit_log:read')).toBe(false);
    expect(hasPermission(undefined, 'system_health:read')).toBe(false);
  });

  describe('Route Access Control (canAccessPath)', () => {
    it('allows owner to access /admins and /audit-log', () => {
      expect(canAccessPath('owner', '/admins')).toBe(true);
      expect(canAccessPath('owner', '/audit-log')).toBe(true);
      expect(canAccessPath('owner', '/')).toBe(true);
    });

    it('denies moderator and content_editor from accessing /admins', () => {
      expect(canAccessPath('moderator', '/admins')).toBe(false);
      expect(canAccessPath('content_editor', '/admins')).toBe(false);
    });

    it('allows analyst to access /admins read-only view and /audit-log', () => {
      expect(canAccessPath('analyst', '/admins')).toBe(true);
      expect(canAccessPath('analyst', '/audit-log')).toBe(true);
    });

    it('allows all roles to access public auth paths', () => {
      expect(canAccessPath('moderator', '/login')).toBe(true);
      expect(canAccessPath('content_editor', '/auth/mfa')).toBe(true);
    });
  });
});

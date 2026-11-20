import { describe, it, expect, vi } from 'vitest';
import { redactSecrets, hashIp, isReasonRequired, logAdminMutation } from './logger';

describe('Admin Audit Logger Subsystem', () => {
  it('redacts sensitive keys including passwords, secrets, tokens, and cookies', () => {
    const sensitivePayload = {
      email: 'admin@halchal.test',
      password: 'SuperSecretPassword123!',
      api_key: 'sk_live_1234567890',
      nested: {
        access_token: 'token_xyz',
        auth_header: 'Bearer 12345',
        safe_param: 'public_value',
      },
      tags: ['a', 'b'],
    };

    const sanitized = redactSecrets(sensitivePayload) as Record<string, unknown>;
    expect(sanitized.email).toBe('admin@halchal.test');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.api_key).toBe('[REDACTED]');
    expect((sanitized.nested as Record<string, unknown>).access_token).toBe('[REDACTED]');
    expect((sanitized.nested as Record<string, unknown>).auth_header).toBe('[REDACTED]');
    expect((sanitized.nested as Record<string, unknown>).safe_param).toBe('public_value');
  });

  it('hashes caller IP into privacy-preserving SHA-256 digest', () => {
    const h1 = hashIp('192.168.1.1');
    const h2 = hashIp('192.168.1.1');
    const h3 = hashIp('10.0.0.1');

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(32);
  });

  it('identifies sensitive mutations requiring a reason', () => {
    expect(isReasonRequired('ADMIN_INVITE', 'admin_user')).toBe(true);
    expect(isReasonRequired('FLAG_UPDATE', 'feature_flag')).toBe(true);
    expect(isReasonRequired('PRICE_UPDATE', 'official_price')).toBe(true);
    expect(isReasonRequired('VIEW_DASHBOARD', 'analytics')).toBe(false);
  });

  it('throws an error when sensitive mutation lacks a reason', async () => {
    const mockSupabase = {
      from: vi.fn(),
    } as any;

    await expect(
      logAdminMutation(mockSupabase, {
        adminId: '11111111-1111-1111-1111-111111111111',
        action: 'FLAG_UPDATE',
        entityType: 'feature_flag',
        reason: '', // Empty reason
      })
    ).rejects.toThrow(/Audit requirement/);
  });

  it('successfully persists sanitized audit record with valid reason', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    } as any;

    const res = await logAdminMutation(mockSupabase, {
      adminId: '11111111-1111-1111-1111-111111111111',
      action: 'ADMIN_INVITE',
      entityType: 'admin_user',
      entityId: '22222222-2222-2222-2222-222222222222',
      after: { email: 'new@halchal.test', role: 'moderator' },
      reason: 'Onboarding new Dhaka city moderator',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test',
    });

    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: '11111111-1111-1111-1111-111111111111',
        action: 'ADMIN_INVITE',
        entity_type: 'admin_user',
        reason: 'Onboarding new Dhaka city moderator',
        user_agent: 'Mozilla/5.0 Test',
      })
    );
  });
});

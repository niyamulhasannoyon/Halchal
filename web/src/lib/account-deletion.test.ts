/**
 * Halchal - Account & Data Deletion Tests
 * Verifies Right to Erasure (ADR-0005):
 * 1. Unauthorized request rejected with 401
 * 2. Invalid or expired token rejected with 401
 * 3. Authenticated user's reports, push subscriptions, and profile purged
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist mocks before route import
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  getSupabaseServiceClient: () => ({
    rpc: mockRpc,
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
  }),
}));

vi.mock('@/lib/redis', () => ({
  getRedisClient: () => ({
    del: vi.fn().mockResolvedValue(1),
  }),
}));

import { POST } from '@/app/api/user/delete/route';

describe('Account Deletion API (/api/user/delete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401 and Bengali error message', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/delete', {
      method: 'POST',
      headers: {},
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('অননুমোদিত');
  });

  it('rejects invalid or malformed bearer token with 401', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid token' },
    });

    const req = new NextRequest('http://localhost:3000/api/user/delete', {
      method: 'POST',
      headers: {
        authorization: 'Bearer invalid-token-xyz',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('মেয়াদোত্তীর্ণ বা অবৈধ');
  });

  it('successfully purges account, reports, push subscriptions and returns 200 OK', async () => {
    const fakeUserId = '99999999-9999-4999-9999-999999999999';

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: fakeUserId, email: null } },
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        user_id: fakeUserId,
        reports_deleted: 3,
        subscriptions_deleted: 1,
        profile_deleted: true,
      },
      error: null,
    });

    mockDeleteUser.mockResolvedValueOnce({ data: {}, error: null });

    const req = new NextRequest('http://localhost:3000/api/user/delete', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-user-jwt',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('স্থায়ীভাবে মুছে ফেলা হয়েছে');
    expect(mockRpc).toHaveBeenCalledWith('delete_user_account', {
      p_user_id: fakeUserId,
    });
    expect(mockDeleteUser).toHaveBeenCalledWith(fakeUserId);
  });
});

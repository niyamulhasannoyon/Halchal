import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH } from './route';

vi.mock('@/lib/supabase/service', () => ({
  requireAdminSession: vi.fn().mockImplementation(() => {
    throw new Error('UNAUTHORIZED: No valid admin session found.');
  }),
  getServiceRoleClient: vi.fn(),
}));

describe('/api/admins API Route Handler', () => {
  it('returns 401 for unauthenticated requests to GET /api/admins', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('UNAUTHORIZED');
  });

  it('rejects POST /api/admins with 401 when unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3001/api/admins', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@halchal.bd', role: 'moderator', reason: 'Test invite' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('UNAUTHORIZED');
  });

  it('rejects PATCH /api/admins with 401 when unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3001/api/admins', {
      method: 'PATCH',
      body: JSON.stringify({ userId: '11111111-1111-1111-1111-111111111111', role: 'owner', reason: 'Test' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('UNAUTHORIZED');
  });
});

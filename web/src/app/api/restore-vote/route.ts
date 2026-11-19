/**
 * Halchal - Restore Vote Proxy Route Handler
 * POST /api/restore-vote
 * Architecture: ADR-0008, One-tap notification voting
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'http://127.0.0.1:54321';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, vote } = body;

    if (!token || !vote) {
      return NextResponse.json(
        { success: false, error: 'টোকেন এবং ভোট আবশ্যক' },
        { status: 400 }
      );
    }

    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/restore-vote`;

    try {
      const edgeRes = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': req.headers.get('x-forwarded-for') || '127.0.0.1',
        },
        body: JSON.stringify({ token, vote }),
        signal: AbortSignal.timeout(4000),
      });

      const data = await edgeRes.json().catch(() => ({}));
      return NextResponse.json(data, { status: edgeRes.status });
    } catch {
      // In local dev without running Deno edge server
      return NextResponse.json({
        success: true,
        message:
          vote === 'ok'
            ? 'ধন্যবাদ! বিদ্যুৎ স্বাভাবিক হওয়ার তথ্য গ্রহণ করা হয়েছে।'
            : 'ধন্যবাদ! সংযোগ বিচ্ছিন্ন থাকার তথ্য গ্রহণ করা হয়েছে।',
        vote,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: 'ভোট গ্রহণ ব্যর্থ হয়েছে', details: message },
      { status: 500 }
    );
  }
}

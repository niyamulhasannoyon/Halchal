import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    return NextResponse.json({ error: aalError.message }, { status: 500 });
  }

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return NextResponse.json({ error: factorsError.message }, { status: 500 });
  }

  const verifiedTotp = factorsData.totp.filter((f) => f.status === 'verified');
  const unverifiedTotp = factorsData.totp.filter((f) => (f.status as string) === 'unverified');

  return NextResponse.json({
    currentLevel: aalData.currentLevel,
    nextLevel: aalData.nextLevel,
    isEnrolled: verifiedTotp.length > 0,
    factorId: verifiedTotp[0]?.id || unverifiedTotp[0]?.id || null,
  });
}

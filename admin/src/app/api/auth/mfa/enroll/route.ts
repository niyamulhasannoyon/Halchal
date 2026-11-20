import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Clean up existing unverified factors if any
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp) {
    for (const factor of factors.totp) {
      if ((factor.status as string) === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
  }

  // Enroll new TOTP factor
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Halchal Admin',
    friendlyName: `Admin (${user.email})`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    id: data.id,
    type: data.type,
    totp: {
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  });
}

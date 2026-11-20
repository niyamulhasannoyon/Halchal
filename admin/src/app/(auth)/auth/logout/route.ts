import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const searchParams = request.nextUrl.searchParams;
  const reason = searchParams.get('reason');

  const loginUrl = new URL('/login', request.url);
  if (reason) {
    loginUrl.searchParams.set('reason', reason);
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete('halchal_admin_session_start');
  response.cookies.delete('halchal_admin_last_active');

  return response;
}

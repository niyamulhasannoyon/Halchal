import Link from 'next/link';
import { requireAdminSession } from '@/lib/supabase/service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ScrollText, Users, Activity, ArrowRight, Lock } from 'lucide-react';

export default async function DashboardHomePage() {
  const { adminUser } = await requireAdminSession();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Halchal Operations Command
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            স্বাগতম, {adminUser.email} — লাইভ ইউটিলিটি পর্যবেক্ষণ ও নিয়ন্ত্রণ কেন্দ্র
          </p>
        </div>
        <Badge variant="success" className="px-3 py-1">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
          MFA AAL2 Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Identity & Permissions</CardTitle>
            <Lock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{adminUser.role}</div>
            <p className="text-xs text-zinc-500 mt-1">
              Search-path isolated PostgreSQL SECURITY DEFINER authorization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Audit Trail Status</CardTitle>
            <ScrollText className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Append-Only</div>
            <p className="text-xs text-zinc-500 mt-1">
              Immutability trigger active • UPDATE / DELETE blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Public Privacy Shield</CardTitle>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Zero Raw GPS</div>
            <p className="text-xs text-zinc-500 mt-1">
              Only Uber H3 Res 8 indices and hashed device IDs retained
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminUser.role === 'owner' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Administrator Directory
              </CardTitle>
              <CardDescription>
                Manage administrator credentials, assign roles, enforce MFA resets, and view login activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admins">
                <Button variant="default">
                  Open Admin Directory
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-emerald-500" />
              Administrative Audit Log
            </CardTitle>
            <CardDescription>
              Review the immutable record of all administrative actions, configuration changes, and bans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/audit-log">
              <Button variant="outline">
                View Audit Trail
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

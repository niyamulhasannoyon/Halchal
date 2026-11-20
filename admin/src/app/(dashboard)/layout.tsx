import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/supabase/service';
import { AdminSidebar } from '@/components/dashboard/admin-sidebar';
import { AdminHeader } from '@/components/dashboard/admin-header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let sessionContext;
  try {
    sessionContext = await requireAdminSession();
  } catch {
    redirect('/login');
  }

  const { adminUser } = sessionContext;

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      <AdminSidebar role={adminUser.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader adminUser={adminUser} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

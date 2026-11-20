'use client';

import * as React from 'react';
import { LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { AdminRole } from '@/lib/auth/permissions';

interface AdminHeaderProps {
  adminUser: {
    email: string;
    role: AdminRole;
  };
}

export function AdminHeader({ adminUser }: AdminHeaderProps) {
  const getRoleVariant = (role: AdminRole) => {
    switch (role) {
      case 'owner':
        return 'destructive';
      case 'moderator':
        return 'warning';
      case 'content_editor':
        return 'default';
      case 'analyst':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabelBn = (role: AdminRole) => {
    switch (role) {
      case 'owner':
        return 'মালিক (Owner)';
      case 'moderator':
        return 'মডারেটর';
      case 'content_editor':
        return 'কনটেন্ট এডিটর';
      case 'analyst':
        return 'অ্যানালিস্ট (রিড-অনলি)';
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          Operational Security Dashboard
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant={getRoleVariant(adminUser.role)}>
            {getRoleLabelBn(adminUser.role)}
          </Badge>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden sm:inline">
            {adminUser.email}
          </span>
        </div>

        <ThemeToggle />

        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = '/auth/logout')}
          title="Sign out of administrative session"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}

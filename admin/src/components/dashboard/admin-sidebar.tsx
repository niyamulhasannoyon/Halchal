'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  MapPin,
  Tag,
  ToggleLeft,
  ShieldAlert,
  FileText,
  Bell,
  Users,
  ScrollText,
  Lock,
} from 'lucide-react';
import { canAccessPath, type AdminRole } from '@/lib/auth/permissions';

interface NavItem {
  title: string;
  subtitleBn: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    title: 'Health & KPIs',
    subtitleBn: 'সিস্টেম স্ট্যাটাস',
    href: '/',
    icon: Activity,
  },
  {
    title: 'Zones & Slugs',
    subtitleBn: 'এলাকা ব্যবস্থাপনা',
    href: '/zones',
    icon: MapPin,
  },
  {
    title: 'Official Prices',
    subtitleBn: 'সরকারি মূল্যতালিকা',
    href: '/prices',
    icon: Tag,
  },
  {
    title: 'Feature Flags',
    subtitleBn: 'কিল সুইচ ও ফিচার',
    href: '/flags',
    icon: ToggleLeft,
  },
  {
    title: 'Abuse & Moderation',
    subtitleBn: 'নজরদারি ও প্রতিরোধ',
    href: '/moderation',
    icon: ShieldAlert,
  },
  {
    title: 'Content & SEO',
    subtitleBn: 'কনটেন্ট ও এসইও',
    href: '/content',
    icon: FileText,
  },
  {
    title: 'Push Notifications',
    subtitleBn: 'জরুরি নোটিফিকেশন',
    href: '/notifications',
    icon: Bell,
  },
  {
    title: 'Admin Directory',
    subtitleBn: 'অ্যাডমিন ইউজার',
    href: '/admins',
    icon: Users,
  },
  {
    title: 'Audit Log',
    subtitleBn: 'অডিট হিস্ট্রি',
    href: '/audit-log',
    icon: ScrollText,
  },
];

export function AdminSidebar({ role }: { role: AdminRole }) {
  const pathname = usePathname();

  const visibleItems = ALL_NAV_ITEMS.filter((item) => canAccessPath(role, item.href));

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">
            Halchal Operations
          </div>
          <div className="text-xs text-zinc-500 font-medium">হালচাল অ্যাডমিন</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{item.title}</span>
                <span
                  className={`text-[10px] truncate ${
                    isActive ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {item.subtitleBn}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 text-center">
        Halchal v0.1.0 • Bangladesh
      </div>
    </aside>
  );
}

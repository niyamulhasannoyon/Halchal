import type { Metadata } from 'next';
import SettingsPage from '@/app/settings/page';

export const metadata: Metadata = {
  title: 'নোটিফিকেশন সেটিংস',
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <SettingsPage />;
}

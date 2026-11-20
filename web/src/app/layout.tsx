import type { Metadata, Viewport } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali'],
  display: 'swap',
  fallback: ['sans-serif'],
  variable: '--font-bengali-custom',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://halchal.bd'),
  title: 'হালচাল — এলাকার লাইভ ইউটিলিটি খবর',
  description: 'এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস।',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: '4mbgGQs3PoTcMTbCYLFypmE_u9bbwfwW4_F85kWGmXA',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070A0F' },
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
  ],
};

const themeInitScript = `
(function() {
  try {
    const stored = localStorage.getItem('halchal-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark) || (stored === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={hindSiliguri.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-bengali antialiased min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] selection:bg-emerald-500/20 selection:text-emerald-400">
        <AuthProvider>
          {children}
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}

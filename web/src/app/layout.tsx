import type { Metadata, Viewport } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import dynamic from 'next/dynamic';
import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { siteConfig } from '@/config/site';
import { RootJsonLd } from '@/components/seo/JsonLd';
import { getTimeBucket } from '@/lib/seo';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';

// Dynamic import AuthModal so auth forms are code-split into a separate chunk
const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal));

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '600', '700'],
  subsets: ['bengali'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  variable: '--font-bengali-custom',
});

const isNonProduction =
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
  process.env.APP_ENV === 'staging' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
  process.env.IS_STAGING === 'true' ||
  process.env.NEXT_PUBLIC_NOINDEX === 'true';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: `${siteConfig.tagline}। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস জানুন।`,
  alternates: {
    canonical: siteConfig.url,
  },
  robots: isNonProduction
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
  openGraph: {
    type: 'website',
    locale: siteConfig.ogLocale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: `${siteConfig.tagline}। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস জানুন।`,
    images: [
      {
        url: `${siteConfig.url}/api/og?t=${getTimeBucket()}`,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: `${siteConfig.tagline}। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস জানুন।`,
    images: [`${siteConfig.url}/api/og?t=${getTimeBucket()}`],
  },
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
        <RootJsonLd />
      </head>
      <body className="font-bengali antialiased min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] selection:bg-emerald-500/20 selection:text-emerald-400">
        <AuthProvider>
          {children}
          <AuthModal />
          <WebVitalsReporter />
        </AuthProvider>
      </body>
    </html>
  );
}

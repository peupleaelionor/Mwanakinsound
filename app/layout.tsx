import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Providers } from './providers';
import { AppShell } from '@/components/layout/app-shell';
import { AudioController } from '@/features/player/audio-controller';
import { PlayerBar } from '@/features/player/player-bar';
import { PwaRegister } from '@/components/pwa-register';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { env } from '@/lib/env';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description:
    "Plateforme musicale née en RDC, pensée pour l'Afrique et ouverte au monde. Découvrez et soutenez les artistes africains.",
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: APP_NAME },
  openGraph: {
    type: 'website',
    title: APP_NAME,
    description: APP_TAGLINE,
    siteName: APP_NAME,
  },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-dvh font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
          <AudioController />
          <PlayerBar />
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}

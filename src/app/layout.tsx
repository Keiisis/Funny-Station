import type { Metadata, Viewport } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { TrophyOverlay } from '@/shell/TrophyOverlay';
import { ThemeManager } from '@/shell/ThemeManager';
import { AppInit } from '@/shell/AppInit';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Funny Station - Universal Web-Console & Social OS',
  description: 'Une console de jeux universelle inspirée de la PS5 fonctionnant entièrement dans le navigateur, supportant le multi-runtime JS, WASM, Python et l\'haptique DualSense.',
  keywords: 'Cloud Gaming, WebGL, WebAssembly, Pyodide, DualSense, WebHID, Next.js, PS5 UI',
  authors: [{ name: 'Funny Station Team' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Funny Station' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full antialiased no-scrollbar", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* Préconnexion au CDN des émulateurs : supprime la latence DNS/TLS au 1ᵉʳ lancement. */}
        <link rel="preconnect" href="https://cdn.emulatorjs.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.emulatorjs.org" />
      </head>
      <body className={`${inter.className} min-h-full bg-zinc-950 text-slate-100 overflow-hidden relative`} suppressHydrationWarning>
        {/* Init client : accessibilité (réduction animations / daltonien) + PWA (SW). */}
        <AppInit />

        {/* Gestionnaire de thème aléatoire */}
        <ThemeManager />
        
        {/* Notifications globales de trophées débloqués */}
        <TrophyOverlay />
        
        {/* Contenu principal */}
        <main className="relative w-screen h-screen overflow-hidden flex flex-col z-10">
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Funny Station - Manette Virtuelle',
  description: 'Manette virtuelle plein écran pour Funny Station',
  // PWA-like fullscreen behavior
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function ControllerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="controller-root" style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100dvh',
      overflow: 'hidden',
      background: '#020617',
      zIndex: 99999,
    }}>
      {children}
    </div>
  );
}

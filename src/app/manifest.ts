import type { MetadataRoute } from 'next';

// Manifeste PWA → /manifest.webmanifest. Rend Funny Station installable
// (bureau/mobile) et lançable en plein écran comme une appli native.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Funny Station',
    short_name: 'FunnyStation',
    description: 'Console de jeux universelle inspirée de la PS5, dans le navigateur.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#020617',
    theme_color: '#020617',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}

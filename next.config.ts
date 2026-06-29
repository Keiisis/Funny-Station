import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixe la racine du workspace (un package-lock.json traîne dans le dossier parent).
  turbopack: {
    root: import.meta.dirname,
  },
  // Optimisation d'images (next/image) : AVIF/WebP, redimensionnement, lazy-load.
  // On autorise les hôtes de jaquettes : Unsplash (placeholders), Supabase Storage
  // (uploads), et le Worker Cloudflare R2 (assets volumineux).
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.workers.dev' },
      { protocol: 'https', hostname: '*.r2.dev' },
    ],
    // Certaines jaquettes locales sont en .svg (assets de confiance fournis par le
    // créateur). On autorise leur optimisation, avec une CSP restrictive par sécurité.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // NB: on NE proxy PAS les gros jeux R2 par Vercel (limites plateforme → 502).
  // Les assets R2 volumineux sont chargés DIRECTEMENT par le navigateur (cf. le
  // Cloudflare Worker qui ajoute le CORS). COEP `credentialless` autorise ce
  // chargement cross-origin tout en gardant l'isolation (threads émulateur).
  async headers() {
    return [
      {
        source: '/((?!games/).*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // `credentialless` (au lieu de require-corp) : garde l'isolation cross-origin
          // — donc SharedArrayBuffer + cœurs émulateur multi-thread restent actifs —
          // MAIS autorise le chargement de ressources externes (Cloudflare R2) sans
          // qu'elles aient besoin d'un en-tête CORP. Indispensable pour les gros jeux R2.
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
      // Runners émulateur (HTML léger) : toujours revalider pour que les correctifs
      // de clarté/manette s'appliquent immédiatement (pas de vieille version en cache).
      {
        source: '/games/:name(gba-runner|psp-runner|nes-runner|snes-runner).html',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
      // Builds Unity/émulateurs pré-compressés (.gz) : le navigateur décompresse à la volée
      // → transfert réduit (~3x) et démarrage bien plus rapide, sans re-build.
      {
        source: '/games/:path*.wasm.gz',
        headers: [
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/games/:path*.js.gz',
        headers: [
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/games/:path*.data.gz',
        headers: [
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Content-Type', value: 'application/octet-stream' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;

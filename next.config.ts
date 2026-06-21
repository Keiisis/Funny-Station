import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixe la racine du workspace (un package-lock.json traîne dans le dossier parent).
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      // Runners émulateur (HTML léger) : toujours revalider pour que les correctifs
      // de clarté/manette s'appliquent immédiatement (pas de vieille version en cache).
      {
        source: '/games/:name(gba-runner|psp-runner|psx-runner).html',
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

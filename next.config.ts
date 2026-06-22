import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixe la racine du workspace (un package-lock.json traîne dans le dossier parent).
  turbopack: {
    root: import.meta.dirname,
  },
  /**
   * Proxy SAME-ORIGIN des assets Cloudflare R2 via un rewrite edge.
   * `/r2/<chemin>` → <R2_PUBLIC_BASE_URL>/<chemin>
   *
   * Avantages vs un proxy serverless (/api/...) :
   *  - Géré au niveau EDGE/CDN de Vercel → PAS de limite 4,5 Mo (streaming des gros
   *    fichiers PSP/PS1 de plusieurs centaines de Mo, fin des erreurs 502).
   *  - Réponse en MÊME ORIGINE → aucun CORS R2 requis, aucun blocage COEP.
   *
   * Requiert la variable d'env R2_PUBLIC_BASE_URL (ex: https://xxx.r2.dev).
   */
  async rewrites() {
    const r2 = process.env.R2_PUBLIC_BASE_URL;
    if (!r2) return [];
    return [
      { source: '/r2/:path*', destination: `${r2.replace(/\/$/, '')}/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
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

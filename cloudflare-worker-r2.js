/**
 * ════════════════════════════════════════════════════════════════════════════
 *  Cloudflare Worker — sert un bucket R2 au NAVIGATEUR avec CORS + Range
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  POURQUOI : les gros jeux (PSP/PS1, plusieurs centaines de Mo) ne peuvent PAS
 *  être proxifiés par Vercel (limites plateforme → erreurs 502). Le navigateur doit
 *  donc charger DIRECTEMENT depuis R2. Mais l'URL publique `*.r2.dev` n'expose pas
 *  le CORS → erreur « Failed to fetch ». Ce Worker ajoute le CORS (et le support des
 *  requêtes Range, indispensable au streaming des émulateurs) → le chargement direct
 *  fonctionne sur FunnyStation.
 *
 *  ─── DÉPLOIEMENT (Cloudflare Dashboard, ~3 min) ───────────────────────────────
 *  1. Workers & Pages → Create application → Create Worker → colle ce code → Deploy.
 *  2. Le Worker → Settings → Variables and Bindings → ajoute un binding R2 :
 *        • Variable name : BUCKET
 *        • R2 bucket     : funnystation-roms
 *     (Save, puis redeploy si demandé.)
 *  3. Récupère l'URL du Worker, ex : https://funny-roms.TON-COMPTE.workers.dev
 *  4. Dans Supabase (SQL Editor), fais pointer les jeux R2 vers cette URL, ex :
 *
 *        UPDATE public.games
 *        SET assets_bucket_path =
 *          'https://funny-roms.TON-COMPTE.workers.dev/games/street-fighter-alpha-2-gold'
 *        WHERE slug = 'street-fighter-alpha-2-gold';
 *
 *     (Garde le même chemin /games/<dossier> que dans ton bucket R2.)
 *
 *  C'est tout : plus de « Failed to fetch » ni de 502, et les ROMs se streament.
 * ════════════════════════════════════════════════════════════════════════════
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    // Préflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    // Clé de l'objet = chemin de l'URL (sans le / initial), décodé.
    const key = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ''));
    if (!key) {
      return new Response('Bad Request', { status: 400, headers: CORS });
    }

    // Support des requêtes Range (lecture partielle / seek des émulateurs).
    const rangeHeader = request.headers.get('range');
    let range;
    if (rangeHeader) {
      const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : undefined;
        const end = m[2] ? parseInt(m[2], 10) : undefined;
        if (start !== undefined && end !== undefined) range = { offset: start, length: end - start + 1 };
        else if (start !== undefined) range = { offset: start };
        else if (end !== undefined) range = { suffix: end };
      }
    }

    const object = await env.BUCKET.get(key, range ? { range } : undefined);
    if (!object) {
      return new Response('Not Found: ' + key, { status: 404, headers: CORS });
    }

    const headers = new Headers(CORS);
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400');
    // Compatible avec l'isolation COEP `credentialless` de FunnyStation.
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    let status = 200;
    if (object.range && rangeHeader) {
      status = 206;
      const size = object.size;
      const start = object.range.offset ?? 0;
      const length = object.range.length ?? size - start;
      headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${size}`);
      headers.set('Content-Length', String(length));
    }

    if (request.method === 'HEAD') {
      return new Response(null, { status, headers });
    }
    return new Response(object.body, { status, headers });
  },
};

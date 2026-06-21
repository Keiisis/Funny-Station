import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy SAME-ORIGIN pour les assets externes (Cloudflare R2, etc.).
 *
 * Pourquoi : la FunnyStation impose COEP `require-corp`. Un jeu hébergé sur R2
 * (cross-origin) déclenche « Failed to fetch » car le navigateur bloque la ressource.
 * Ce proxy récupère le fichier côté serveur (Vercel → R2, aucun souci CORS) et le
 * renvoie en même origine, avec les bons en-têtes → le jeu se charge normalement.
 *
 * Usage : /api/ext?url=<URL_ENCODÉE_DE_L_ASSET_R2>
 * Sécurité : liste blanche de domaines (pas un proxy ouvert → évite le SSRF).
 */

// Domaines R2 publics par défaut + domaine personnalisé optionnel via env.
const ALLOWED_SUFFIXES = ['.r2.dev', '.r2.cloudflarestorage.com'];
const CUSTOM_HOST = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST; // ex: cdn.mon-jeu.com

function isAllowedHost(host: string): boolean {
  if (CUSTOM_HOST && host === CUSTOM_HOST) return true;
  return ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Paramètre url manquant.' }, { status: 400 });
  }

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return NextResponse.json({ error: 'URL invalide.' }, { status: 400 });
  }

  if (u.protocol !== 'https:' || !isAllowedHost(u.hostname)) {
    return NextResponse.json(
      { error: `Domaine non autorisé : ${u.hostname}. Ajoute-le à la liste blanche (NEXT_PUBLIC_R2_PUBLIC_HOST).` },
      { status: 403 }
    );
  }

  try {
    // Transmet le Range (lecture partielle) pour le streaming/seek des ROMs volumineuses.
    const range = req.headers.get('range');
    const upstream = await fetch(u.toString(), {
      headers: range ? { Range: range } : {},
      // Pas de cache côté fetch : on gère le cache via nos propres en-têtes.
      cache: 'no-store',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: 'Asset introuvable sur R2.' }, { status: upstream.status });
    }

    const headers = new Headers();
    const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];
    passthrough.forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    });
    // Compatible COEP require-corp (même origine) + cache long (assets immuables).
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    headers.set('Cache-Control', 'public, max-age=86400');
    if (!headers.has('accept-ranges')) headers.set('Accept-Ranges', 'bytes');

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    console.error('[api/ext] Échec de récupération R2 :', e);
    return NextResponse.json({ error: 'Asset externe indisponible.' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

/**
 * Proxy SAME-ORIGIN des assets de jeux stockés dans Supabase Storage.
 *
 * Pourquoi : l'app impose COEP `require-corp`. Charger un <script src> cross-origin
 * depuis *.supabase.co échouerait. En servant les fichiers via cette route
 * (même origine que l'app), les jeux uploadés par les créateurs se chargent sans souci,
 * y compris en production sur Vercel.
 *
 * assets_bucket_path d'un jeu uploadé = '/api/games/<gameId>'
 * → le runtime fetch '/api/games/<gameId>/<entry_point>'.
 */

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.wasm': 'application/wasm',
  '.py': 'text/x-python',
  '.lua': 'text/x-lua',
  '.jar': 'application/java-archive',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.txt': 'text/plain',
  '.gba': 'application/octet-stream',
  '.cso': 'application/octet-stream',
  '.iso': 'application/octet-stream',
  '.apk': 'application/vnd.android.package-archive',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'Chemin manquant.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Supabase non configuré.' }, { status: 503 });
  }

  // game-assets est public : on lit via l'URL publique de l'objet.
  const objectPath = `games/${segments.map(encodeURIComponent).join('/')}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/game-assets/${objectPath}`;

  try {
    const upstream = await fetch(publicUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Asset introuvable.' }, { status: 404 });
    }

    const ext = path.extname(segments[segments.length - 1]).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? upstream.headers.get('content-type') ?? 'application/octet-stream';

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Compatible COEP require-corp (même origine).
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    console.error('[api/games] Échec de récupération de l\'asset:', e);
    return NextResponse.json({ error: 'Asset indisponible.' }, { status: 404 });
  }
}

import { NextResponse } from 'next/server';

/**
 * Proxy média « anti-IDM » — sert vidéos/audios en `application/octet-stream`
 * (IDM ne les détecte pas) MAIS avec un STREAMING FLUIDE :
 *  - supporte les requêtes HTTP Range (206 Partial Content) → lecture progressive,
 *    seek instantané, et lecture possible sur iOS/Safari (qui EXIGENT le 206) ;
 *  - passe le corps en flux (pas de mise en mémoire du fichier entier).
 */
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) {
    return new NextResponse('Missing key', { status: 400 });
  }

  try {
    const filePath = Buffer.from(key, 'base64').toString('utf-8');

    // Déterminer l'URL cible
    let targetUrl: string;
    if (/^https?:\/\//i.test(filePath)) {
      targetUrl = filePath;
    } else {
      // Chemin local servi via HTTP same-origin (évite que Vercel bundle /public de 1,5 Go).
      const origin = new URL(request.url).origin;
      const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      targetUrl = `${origin}${cleanPath}`;
    }

    // On RELAIE le Range du navigateur à la source → réponse partielle (206),
    // condition du seek/streaming fluide et de la lecture iOS.
    const range = request.headers.get('range');
    const upstream = await fetch(targetUrl, {
      headers: range ? { Range: range } : {},
      cache: 'no-store',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Failed to fetch asset: ${upstream.statusText}`, { status: upstream.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream'); // anti-IDM
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Recopie les en-têtes de plage de la source (indispensables au seek/streaming).
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    // 206 si la source a honoré le Range, sinon 200 (flux complet).
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error('Error serving media via HTTP fetch:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

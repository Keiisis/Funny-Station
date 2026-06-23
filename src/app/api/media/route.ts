import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) {
    return new NextResponse('Missing key', { status: 400 });
  }

  try {
    let filePath = Buffer.from(key, 'base64').toString('utf-8');
    
    // Déterminer l'URL cible
    let targetUrl: string;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      targetUrl = filePath;
    } else {
      // Chemin local : on l'appelle via HTTP sur le même hôte
      // pour éviter que Vercel ne bundle le dossier public de 1.5 Go
      const urlObj = new URL(request.url);
      const baseUrl = urlObj.origin;
      const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      targetUrl = `${baseUrl}${cleanPath}`;
    }

    // Récupérer le fichier via HTTP
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return new NextResponse(`Failed to fetch asset: ${response.statusText}`, { status: response.status });
    }
    
    // Renvoyer en octet-stream pour bypasser IDM
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('Error serving media via HTTP fetch:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

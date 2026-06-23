import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) {
    return new NextResponse('Missing key', { status: 400 });
  }

  try {
    let filePath = Buffer.from(key, 'base64').toString('utf-8');
    
    // Si c'est une URL externe absolue (Supabase storage, R2, Unsplash, etc.)
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const response = await fetch(filePath);
      if (!response.ok) {
        return new NextResponse('Failed to fetch remote asset', { status: response.status });
      }
      
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Sinon, c'est un chemin local
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }

    // Protection contre les directory traversals
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.join(process.cwd(), 'public', normalizedPath);
    
    if (!fs.existsSync(absolutePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      return new NextResponse('Not a file', { status: 400 });
    }

    const fileStream = fs.createReadStream(absolutePath);
    // @ts-ignore
    const webStream = Readable.toWeb(fileStream);

    return new NextResponse(webStream as any, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('Error serving media:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

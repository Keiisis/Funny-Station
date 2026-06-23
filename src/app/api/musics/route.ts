import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const musicsDir = path.join(process.cwd(), 'public', 'musics');
    if (!fs.existsSync(musicsDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(musicsDir);
    // Filtrer pour ne garder que les fichiers audio
    const musicFiles = files
      .filter((file) => /\.(mp3|ogg|wav|m4a|aac|webm)$/i.test(file))
      .map((file) => `/musics/${encodeURIComponent(file)}`);

    return NextResponse.json(musicFiles);
  } catch (error) {
    console.error('Error reading musics directory:', error);
    return NextResponse.json([], { status: 500 });
  }
}

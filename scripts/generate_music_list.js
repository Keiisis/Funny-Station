const fs = require('fs');
const path = require('path');

const musicsDir = path.join(__dirname, '..', 'public', 'musics');
const routeFile = path.join(__dirname, '..', 'src', 'app', 'api', 'musics', 'route.ts');

if (!fs.existsSync(musicsDir)) {
  console.error("Le dossier public/musics n'existe pas.");
  process.exit(1);
}

const files = fs.readdirSync(musicsDir);
const musicFiles = files
  .filter((file) => /\.(mp3|ogg|wav|m4a|aac|webm)$/i.test(file))
  .map((file) => `/musics/${encodeURIComponent(file)}`);

const codeContent = `import { NextResponse } from 'next/server';

// Liste statique générée automatiquement pour éviter que Vercel n'inclue
// les fichiers MP3 de 720 Mo dans le bundle de la fonction serverless.
const MUSIC_PLAYLIST = ${JSON.stringify(musicFiles, null, 2)};

export async function GET() {
  return NextResponse.json(MUSIC_PLAYLIST);
}
`;

fs.writeFileSync(routeFile, codeContent, 'utf-8');
console.log(`Successfully generated static music playlist inside ${routeFile} (${musicFiles.length} tracks).`);

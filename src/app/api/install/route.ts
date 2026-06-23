import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import path from 'path';
import { createClient, createAdmin } from '@/utils/supabase/server';

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
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
  return map[ext] ?? 'application/octet-stream';
}

/** Détecte le runtime et le point d'entrée à partir des fichiers du ZIP. */
function detectRuntimeAndEntry(fileNames: string[]): { runtime: string; entryPoint: string } {
  if (fileNames.some((f) => f === 'AndroidManifest.xml' || f.endsWith('AndroidManifest.xml'))) {
    const hasWebAssets = fileNames.some((f) => f.includes('assets/www/index.html'));
    if (hasWebAssets) {
      return { runtime: 'android', entryPoint: 'index.html' };
    } else {
      return { runtime: 'android', entryPoint: 'game.apk' };
    }
  }
  if (fileNames.some((f) => f.endsWith('.py')))
    return { runtime: 'python', entryPoint: fileNames.find((f) => f === 'main.py') || fileNames.find((f) => f.endsWith('.py'))! };
  if (fileNames.some((f) => f.endsWith('.wasm')))
    return { runtime: 'wasm', entryPoint: fileNames.find((f) => f.endsWith('.wasm'))! };
  if (fileNames.some((f) => f.endsWith('.jar')))
    return { runtime: 'java', entryPoint: fileNames.find((f) => f.endsWith('.jar'))! };
  if (fileNames.some((f) => f.endsWith('.lua')))
    return { runtime: 'lua', entryPoint: fileNames.find((f) => f.endsWith('.lua'))! };
  if (fileNames.some((f) => f.endsWith('.gba')))
    return { runtime: 'gba', entryPoint: fileNames.find((f) => f.endsWith('.gba'))! };
  if (fileNames.some((f) => f.endsWith('.cso')))
    return { runtime: 'psp', entryPoint: fileNames.find((f) => f.endsWith('.cso'))! };
  if (fileNames.some((f) => f.endsWith('.iso')))
    return { runtime: 'psp', entryPoint: fileNames.find((f) => f.endsWith('.iso'))! };
  // Nintendo (NES / Super Nintendo) : ROMs légères, parfaites en navigateur.
  if (fileNames.some((f) => f.endsWith('.nes')))
    return { runtime: 'nes', entryPoint: fileNames.find((f) => f.endsWith('.nes'))! };
  if (fileNames.some((f) => f.endsWith('.sfc') || f.endsWith('.smc') || f.endsWith('.fig')))
    return { runtime: 'snes', entryPoint: fileNames.find((f) => f.endsWith('.sfc') || f.endsWith('.smc') || f.endsWith('.fig'))! };
  // Par défaut : JS / HTML5
  const entry =
    fileNames.find((f) => f === 'index.html') ||
    fileNames.find((f) => f === 'index.js') ||
    fileNames.find((f) => f.endsWith('.js')) ||
    'index.js';
  return { runtime: 'js', entryPoint: entry };
}

/** Analyse simple des dépendances (Dependency Resolver). */
function resolveDependencies(zip: AdmZip): { python_libs?: string[]; js_deps?: string[] } {
  const out: { python_libs?: string[]; js_deps?: string[] } = {};
  const req = zip.getEntry('requirements.txt');
  if (req) {
    out.python_libs = req
      .getData()
      .toString('utf8')
      .split('\n')
      .map((l) => l.trim().split(/[=<>!~ ]/)[0])
      .filter(Boolean);
  }
  const pkg = zip.getEntry('package.json');
  if (pkg) {
    try {
      const json = JSON.parse(pkg.getData().toString('utf8'));
      out.js_deps = Object.keys(json.dependencies ?? {});
    } catch {
      /* package.json invalide : ignoré */
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const gameId = formData.get('gameId') as string | null;

    if (!file || !gameId) {
      return NextResponse.json({ error: 'Fichier ZIP ou Game ID manquant.' }, { status: 400 });
    }

    // 1. Authentification + vérification de propriété (RLS-safe).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }
    const { data: game } = await supabase.from('games').select('id, author_id').eq('id', gameId).single();
    if (!game) return NextResponse.json({ error: 'Jeu introuvable.' }, { status: 404 });
    if (game.author_id !== user.id) {
      return NextResponse.json({ error: "Vous n'êtes pas l'auteur de ce jeu." }, { status: 403 });
    }

    // 2. Client admin requis pour écrire dans Storage (bypass RLS, jamais exposé au client).
    const admin = createAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Upload indisponible : SUPABASE_SERVICE_ROLE_KEY non configurée côté serveur.' },
        { status: 503 }
      );
    }

    // 3. Décompression + détection.
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().filter((e) => !e.isDirectory);
    const fileNames = entries.map((e) => e.entryName);
    if (fileNames.length === 0) {
      return NextResponse.json({ error: 'Archive ZIP vide.' }, { status: 400 });
    }

    const { runtime, entryPoint } = detectRuntimeAndEntry(fileNames);
    const dependencies = resolveDependencies(zip);

    // 4. Upload de chaque fichier dans le bucket Storage (compatible Vercel, pas de FS).
    const basePath = `games/${gameId}`;
    if (runtime === 'android') {
      if (entryPoint === 'index.html') {
        // APK Hybride Cordova / Capacitor : extraire uniquement assets/www/
        const webEntries = entries.filter((e) => e.entryName.startsWith('assets/www/'));
        for (const entry of webEntries) {
          const relativePath = entry.entryName.substring('assets/www/'.length);
          if (!relativePath) continue; // éviter d'uploader le dossier vide
          
          const { error } = await admin.storage
            .from('game-assets')
            .upload(`${basePath}/${relativePath}`, entry.getData(), {
              contentType: getContentType(relativePath),
              upsert: true,
            });
          if (error) {
            return NextResponse.json(
              { error: `Échec d'upload de ${relativePath} : ${error.message}` },
              { status: 500 }
            );
          }
        }
      } else {
        // APK Natif : uploader l'APK brut sous le nom game.apk
        const { error } = await admin.storage
          .from('game-assets')
          .upload(`${basePath}/game.apk`, buffer, {
            contentType: 'application/vnd.android.package-archive',
            upsert: true,
          });
        if (error) {
          return NextResponse.json(
            { error: `Échec d'upload de l'APK natif : ${error.message}` },
            { status: 500 }
          );
        }
      }
    } else {
      // Runtimes standard
      for (const entry of entries) {
        const { error } = await admin.storage
          .from('game-assets')
          .upload(`${basePath}/${entry.entryName}`, entry.getData(), {
            contentType: getContentType(entry.entryName),
            upsert: true,
          });
        if (error) {
          return NextResponse.json(
            { error: `Échec d'upload de ${entry.entryName} : ${error.message}` },
            { status: 500 }
          );
        }
      }
    }

    // 5. Base d'assets SAME-ORIGIN (proxy /api/games) pour rester compatible COEP.
    //    Le runtime fetch ${assets_bucket_path}/${entry_point}.
    const assetsBaseUrl = `/api/games/${gameId}`;

    // 6. Mise à jour de la fiche du jeu.
    const { error: dbError } = await admin
      .from('games')
      .update({
        runtime,
        entry_point: entryPoint,
        assets_bucket_path: assetsBaseUrl,
        manifest: dependencies,
      })
      .eq('id', gameId);

    if (dbError) {
      return NextResponse.json({ error: `Mise à jour DB échouée : ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      runtime,
      entryPoint,
      assetsBaseUrl,
      dependencies,
      message: 'Jeu installé avec succès dans le cloud.',
    });
  } catch (error) {
    console.error('[Install API] Erreur :', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}

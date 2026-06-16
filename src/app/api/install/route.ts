import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.js') return 'application/javascript';
  if (ext === '.wasm') return 'application/wasm';
  if (ext === '.py') return 'text/x-python';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.json') return 'application/json';
  if (ext === '.html') return 'text/html';
  if (ext === '.css') return 'text/css';
  return 'application/octet-stream';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const gameId = formData.get('gameId') as string | null;

    if (!file || !gameId) {
      return NextResponse.json({ error: "Fichier ZIP ou Game ID manquant" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Décompresser le binaire en utilisant adm-zip
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const fileNames = zipEntries.map(entry => entry.entryName);

    let isPython = false;
    let isWasm = false;
    let isJs = false;
    let entryPoint = '';

    // Détection du point d'entrée
    if (fileNames.includes('main.py') || fileNames.some(f => f.endsWith('.py'))) {
      isPython = true;
      entryPoint = fileNames.find(f => f.endsWith('.py')) || 'main.py';
    } else if (fileNames.some(f => f.endsWith('.wasm'))) {
      isWasm = true;
      entryPoint = fileNames.find(f => f.endsWith('.wasm')) || 'game.wasm';
    } else if (fileNames.includes('index.html') || fileNames.includes('index.js') || fileNames.some(f => f.endsWith('.js'))) {
      isJs = true;
      entryPoint = fileNames.find(f => f.endsWith('.js') || f === 'index.html') || 'index.js';
    }

    const language = isWasm ? 'wasm' : isPython ? 'python' : 'js';

    // 1. Essai d'écriture Cloud (Supabase Storage)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      console.log(`[Install API] Déploiement cloud détecté pour ${gameId}...`);
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const fileContent = entry.getData();
          const storagePath = `games/${gameId}/${entry.entryName}`;
          
          const { error } = await supabaseAdmin.storage
            .from('game-assets')
            .upload(storagePath, fileContent, {
              contentType: getContentType(entry.entryName),
              upsert: true
            });

          if (error) {
            console.error(`Erreur d'upload Supabase pour ${entry.entryName}:`, error);
          }
        }
      }

      // Mettre à jour les informations du jeu en base de données Supabase
      const { error: dbError } = await supabaseAdmin
        .from('games')
        .update({
          runtime: language,
          entry_point: entryPoint,
          assets_bucket_path: `games/${gameId}`
        })
        .eq('id', gameId);

      if (dbError) {
        console.warn("[Install API] Impossible de mettre à jour le jeu dans la DB.");
      }
    } 
    
    // 2. Fallback d'écriture local (FS public/games) pour test de développement local
    console.log(`[Install API] Sauvegarde locale active pour le jeu ${gameId}...`);
    const localDestDir = path.join(process.cwd(), 'public', 'games', gameId);
    
    if (!fs.existsSync(localDestDir)) {
      fs.mkdirSync(localDestDir, { recursive: true });
    }

    for (const entry of zipEntries) {
      const fullPath = path.join(localDestDir, entry.entryName);
      
      if (entry.isDirectory) {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      } else {
        const fileDir = path.dirname(fullPath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        const fileContent = entry.getData();
        fs.writeFileSync(fullPath, fileContent);
      }
    }

    return NextResponse.json({ 
      success: true, 
      language, 
      entryPoint,
      localPath: `/games/${gameId}`,
      message: "Installation complétée avec succès !" 
    });

  } catch (error: any) {
    console.error("[Install API] Erreur d'installation :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de serveur" }, { status: 500 });
  }
}

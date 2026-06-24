// ════════════════════════════════════════════════════════════════════════════
//  OPTIMIZE COVERS — redimensionne/recompresse les jaquettes de public/images/.
//
//  Certaines covers font jusqu'a 2,9 Mo → chargement lent qui « tue l'aura ».
//  On les ramene a 640 px de large max (largement suffisant pour un affichage
//  ~160 px, meme retina) et on recompresse → typiquement 2,9 Mo → ~80-200 Ko.
//  Le FORMAT et le NOM sont conserves (les references DB restent valides).
//
//  Lancer :  node scripts/optimize_covers.js
// ════════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'public', 'images');
const MAX_WIDTH = 640;
const MIN_BYTES = 150 * 1024; // on ne touche pas aux fichiers deja legers (<150 Ko)

async function run() {
  const files = fs.readdirSync(DIR).filter((f) => !f.startsWith('.'));
  let savedTotal = 0;
  let processed = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.svg') continue; // vectoriel : deja leger, ne pas rasteriser

    const full = path.join(DIR, file);
    const before = fs.statSync(full).size;
    if (before < MIN_BYTES) continue;

    try {
      // On lit le fichier en BUFFER d'abord (evite tout verrou Windows lecture/ecriture
      // sur le meme chemin, qui faisait echouer les .jpg/.webp).
      const input = fs.readFileSync(full);
      const img = sharp(input, { failOn: 'none' });
      const meta = await img.metadata();
      let pipe = img.rotate(); // respecte l'orientation EXIF
      if (meta.width && meta.width > MAX_WIDTH) {
        pipe = pipe.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }

      // Recompression selon le format d'origine (on garde l'extension/nom).
      if (ext === '.png') {
        pipe = pipe.png({ quality: 80, compressionLevel: 9, palette: true });
      } else if (ext === '.webp') {
        pipe = pipe.webp({ quality: 78 });
      } else {
        // jpg / jpeg / jfif → JPEG (le .jfif EST du JPEG, le nom reste inchange).
        pipe = pipe.jpeg({ quality: 74, mozjpeg: true, progressive: true });
      }

      const out = await pipe.toBuffer();
      // On n'ecrit que si on a vraiment gagne de la place.
      if (out.length < before) {
        fs.writeFileSync(full, out);
        savedTotal += before - out.length;
        processed++;
        console.log(`  ${(before / 1024).toFixed(0).padStart(5)} Ko → ${(out.length / 1024).toFixed(0).padStart(5)} Ko   ${file}`);
      }
    } catch (e) {
      console.warn(`  ⚠️  ${file}: ${e.message}`);
    }
  }

  console.log(`\n✅ ${processed} image(s) optimisee(s), ${(savedTotal / (1024 * 1024)).toFixed(1)} Mo economises.`);
}

run().catch((e) => { console.error(e); process.exit(1); });

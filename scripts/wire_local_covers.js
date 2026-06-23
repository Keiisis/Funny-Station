// ════════════════════════════════════════════════════════════════════════════
//  WIRE LOCAL COVERS — branche les vraies jaquettes de public/images/ aux jeux.
//
//  100% HORS-LIGNE : lit les fichiers d'insertion SQL (titre + slug) et le dossier
//  public/images/, matche chaque jeu a son image (par slug OU par titre, via une
//  normalisation alphanumerique), et ECRIT un fichier `update_local_covers.sql`.
//  Ne touche PAS la base — tu executes le SQL toi-meme dans Supabase.
//
//  Lancer :  node scripts/wire_local_covers.js
// ════════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'public', 'images');

// Normalisation : minuscules, sans accents, alphanumerique uniquement.
// "Street Fighter Alpha 2" / "street-fighter-alpha-2" → "streetfighteralpha2"
function norm(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// 1) Recense les jeux (title, slug) depuis les fichiers d'insertion + le seed.
const sqlFiles = fs.readdirSync(ROOT).filter(f =>
  (f.startsWith('insert_') && f.endsWith('.sql')) || f === 'supabase_seed.sql'
);
const games = new Map(); // slug -> { title, slug }
const rowRe = /\(\s*'((?:[^']|'')*)'\s*,\s*'([a-z0-9-]+)'/g;
for (const f of sqlFiles) {
  const txt = fs.readFileSync(path.join(ROOT, f), 'utf8');
  // On NE traite que les blocs `INSERT INTO public.games ... ;` (pas les trophees,
  // dont les lignes ressemblent aussi a ('slug','key',...) et fausseraient le match).
  const insertRe = /INSERT\s+INTO\s+public\.games\b[\s\S]*?(?=INSERT\s+INTO|$)/gi;
  let blk;
  while ((blk = insertRe.exec(txt)) !== null) {
    const segment = blk[0];
    let m;
    rowRe.lastIndex = 0;
    while ((m = rowRe.exec(segment)) !== null) {
      const title = m[1].replace(/''/g, "'");
      const slug = m[2];
      if (!games.has(slug)) games.set(slug, { title, slug });
    }
  }
}

// 2) Indexe les images par cle normalisee (slug ET titre).
const files = fs.readdirSync(IMG_DIR).filter(f => !f.startsWith('.'));
const byKey = new Map(); // normKey -> filename
for (const file of files) {
  const base = file.replace(/\.[^.]+$/, '');
  byKey.set(norm(base), file);
}

// 3) Matche et genere le SQL.
const updates = [];
const unmatchedGames = [];
const usedFiles = new Set();
for (const { title, slug } of games.values()) {
  const file = byKey.get(norm(slug)) || byKey.get(norm(title));
  if (!file) { unmatchedGames.push(`${slug}  (${title})`); continue; }
  usedFiles.add(file);
  const url = encodeURI('/images/' + file);            // espaces → %20, garde & ( )
  const sqlUrl = url.replace(/'/g, "''");              // echappe l'apostrophe pour SQL
  const sqlSlug = slug.replace(/'/g, "''");
  updates.push(`UPDATE public.games SET background_url='${sqlUrl}' WHERE slug='${sqlSlug}';`);
}

const unusedFiles = files.filter(f => !usedFiles.has(f));

const header = `-- ══════════════════════════════════════════════════════════════════════════
-- BRANCHEMENT DES JAQUETTES LOCALES (public/images/) — genere automatiquement
-- par scripts/wire_local_covers.js. A executer dans Supabase > SQL Editor.
-- ${updates.length} jeux mis a jour.
-- ══════════════════════════════════════════════════════════════════════════
`;
fs.writeFileSync(path.join(ROOT, 'update_local_covers.sql'), header + updates.join('\n') + '\n', 'utf8');

console.log(`✅ ${updates.length} correspondances → update_local_covers.sql`);
if (unmatchedGames.length) {
  console.log(`\n⚠️  ${unmatchedGames.length} jeux SANS image trouvee :`);
  unmatchedGames.forEach(g => console.log('   - ' + g));
}
if (unusedFiles.length) {
  console.log(`\nℹ️  ${unusedFiles.length} images NON rattachees (aucun jeu correspondant) :`);
  unusedFiles.forEach(f => console.log('   - ' + f));
}

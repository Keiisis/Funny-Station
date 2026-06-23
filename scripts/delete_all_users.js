// ════════════════════════════════════════════════════════════════════════════
//  DELETE ALL USERS — repart de zero (ex: pour migrer vers les PIN 6 chiffres).
//
//  DESTRUCTIF : supprime TOUS les comptes auth (et leurs profils via ON DELETE
//  CASCADE). Necessite SUPABASE_SERVICE_ROLE_KEY dans .env.local.
//
//  Lancer :  node scripts/delete_all_users.js --yes
// ════════════════════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    let v = (m[2] || '').trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('⚠️  Action DESTRUCTIVE. Relance avec --yes pour confirmer :');
  console.error('    node scripts/delete_all_users.js --yes');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  let deleted = 0;
  let page = 1;
  // listUsers est pagine ; on boucle jusqu'a epuisement.
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error('❌ listUsers:', error.message); process.exit(1); }
    const users = data.users || [];
    if (users.length === 0) break;
    for (const u of users) {
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (delErr) console.warn(`   ⚠️  ${u.email || u.id}: ${delErr.message}`);
      else { deleted++; console.log(`   🗑️  ${u.email || u.id}`); }
    }
    // Apres suppression, on relit la 1re page (les index ont bouge).
    page = 1;
  }
  console.log(`\n✅ ${deleted} utilisateur(s) supprime(s). Tu peux recreer des comptes (PIN 6 chiffres).`);
}

run().catch((e) => { console.error(e); process.exit(1); });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('games')
    .select('title, slug, assets_bucket_path, entry_point')
    .in('slug', ['assassins-creed-bloodlines', 'god-of-war-ghost-of-sparta', 'gta-vice-city-stories', 'street-fighter-alpha-2-gold', 'racing-game', 'spiderman-3-gba']);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Paths for verification:");
  data.forEach(g => {
    console.log(`- ${g.title} (${g.slug})`);
    console.log(`  Path:  ${g.assets_bucket_path}`);
    console.log(`  Entry: ${g.entry_point}`);
  });
}

run();

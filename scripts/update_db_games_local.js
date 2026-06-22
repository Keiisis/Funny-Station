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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const updates = [
    { slug: 'street-fighter-alpha-2-gold', path: 'https://funnystation.agavoubj.workers.dev/games/street-fighter-alpha-2-gold' },
    { slug: 'assassins-creed-bloodlines', path: 'https://funnystation.agavoubj.workers.dev/games/assassins-creed-bloodlines' },
    { slug: 'god-of-war-ghost-of-sparta', path: 'https://funnystation.agavoubj.workers.dev/games/god-of-war-ghost-of-sparta' },
    { slug: 'gta-vice-city-stories', path: 'https://funnystation.agavoubj.workers.dev/games/gta-vice-city-stories' }
  ];

  for (const item of updates) {
    console.log(`Attempting to update ${item.slug} to ${item.path}...`);
    const { data, error } = await supabase
      .from('games')
      .update({ assets_bucket_path: item.path })
      .eq('slug', item.slug)
      .select();

    if (error) {
      console.error(`Error updating ${item.slug}:`, error.message);
    } else {
      console.log(`Success! Updated ${item.slug}. Rows returned:`, data.length);
    }
  }
}

run();

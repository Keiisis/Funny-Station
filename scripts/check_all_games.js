const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
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
    .select('*')
    .order('title');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`\n=== ALL GAMES IN DATABASE (${data.length} total) ===\n`);
  if (data.length > 0) {
    console.log("=== COLUMNS AVAILABLE ===");
    console.log(Object.keys(data[0]).join(', '));
    console.log('');
  }
  data.forEach(g => {
    const lang = g.game_language || g.lang || g.type || '?';
    console.log(`[${lang}] ${g.title} (${g.slug})`);
    console.log(`  Path:  ${g.assets_bucket_path}`);
    console.log(`  Entry: ${g.entry_point}`);
    console.log('');
  });
}

run();

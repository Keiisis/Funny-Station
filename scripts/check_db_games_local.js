const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local from the workspace root
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
  const { data: games, error } = await supabase
    .from('games')
    .select('title, slug, runtime, entry_point, assets_bucket_path, status');

  if (error) {
    console.error("Error fetching games:", error);
    process.exit(1);
  }

  console.log("Current games in DB:");
  games.forEach(g => {
    console.log(`- ${g.title} (${g.slug})`);
    console.log(`  Runtime: ${g.runtime}`);
    console.log(`  Entry:   ${g.entry_point}`);
    console.log(`  Path:    ${g.assets_bucket_path}`);
    console.log(`  Status:  ${g.status}`);
  });
}

run();

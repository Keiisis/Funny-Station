const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
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
  console.log("Registering Top Down Horror game in Supabase...");

  // 1. Check if game already exists
  const { data: existingGame, error: selectError } = await supabase
    .from('games')
    .select('id')
    .eq('slug', 'top-down-horror')
    .maybeSingle();

  if (selectError) {
    console.error("Error checking existing game:", selectError);
    process.exit(1);
  }

  let gameId;
  if (existingGame) {
    console.log("Game already exists in DB. ID:", existingGame.id);
    gameId = existingGame.id;
  } else {
    // Insert game
    const { data: newGame, error } = await supabase
      .from('games')
      .insert({
        title: 'Top Down Horror Survival',
        slug: 'top-down-horror',
        description: 'Un jeu de survie d\'horreur en vue de dessus réalisé avec Unity WebGL.',
        runtime: 'js',
        entry_point: 'index.html',
        assets_bucket_path: '/games/top-down-horror',
        background_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1000&auto=format&fit=crop',
        price: 0,
        status: 'published'
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting game:", error);
      process.exit(1);
    }

    console.log("Game inserted successfully! ID:", newGame.id);
    gameId = newGame.id;
  }

  // 2. Insert Trophies
  const trophies = [
    {
      game_id: gameId,
      trophy_key: 'first_blood',
      name: 'Premier Sang',
      description: 'Éliminer votre premier zombie.',
      tier: 'bronze',
      coin_reward: 25
    },
    {
      game_id: gameId,
      trophy_key: 'survivor_10min',
      name: 'Survivant Tenace',
      description: 'Survivre plus de 10 minutes sans mourir.',
      tier: 'silver',
      coin_reward: 50
    },
    {
      game_id: gameId,
      trophy_key: 'all_weapons',
      name: 'Arsenal Complet',
      description: 'Débloquer toutes les armes disponibles.',
      tier: 'gold',
      coin_reward: 150
    },
    {
      game_id: gameId,
      trophy_key: 'nightmare_clear',
      name: 'Cauchemar Vaincu',
      description: 'Terminer le mode Cauchemar.',
      tier: 'platinum',
      coin_reward: 300
    }
  ];

  for (const trophy of trophies) {
    const { data: existingTrophy } = await supabase
      .from('trophies')
      .select('id')
      .eq('game_id', gameId)
      .eq('trophy_key', trophy.trophy_key)
      .maybeSingle();

    if (existingTrophy) {
      console.log(`Trophy ${trophy.name} already exists.`);
    } else {
      const { error } = await supabase
        .from('trophies')
        .insert(trophy);

      if (error) {
        console.error(`Error inserting trophy ${trophy.name}:`, error);
      } else {
        console.log(`Trophy ${trophy.name} inserted successfully.`);
      }
    }
  }

  console.log("Done!");
}

run();

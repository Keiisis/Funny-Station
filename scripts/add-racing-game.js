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
  console.log("Registering Racing Game Fall 2 in Supabase...");

  // 1. Check if game already exists
  const { data: existingGame, error: selectError } = await supabase
    .from('games')
    .select('id')
    .eq('slug', 'racing-game')
    .maybeSingle();

  if (selectError) {
    console.error("Error checking existing game:", selectError);
    process.exit(1);
  }

  let gameId;
  const gameData = {
    title: 'Racing Game Fall 2',
    slug: 'racing-game',
    description: 'Pilotez des bolides dans ce jeu de course palpitant en 3D développé avec Unity.',
    runtime: 'js',
    entry_point: 'index.html',
    assets_bucket_path: '/games/racing-game',
    background_url: '/images/racing-game.png',
    price: 0,
    manifest: { screen_ratio: '16/9' },
    status: 'published'
  };

  if (existingGame) {
    console.log("Game already exists in DB. Updating... ID:", existingGame.id);
    gameId = existingGame.id;
    const { error: updateError } = await supabase
      .from('games')
      .update(gameData)
      .eq('id', gameId);

    if (updateError) {
      console.error("Error updating game:", updateError);
      process.exit(1);
    }
    console.log("Game updated successfully!");
  } else {
    // Insert game
    const { data: newGame, error } = await supabase
      .from('games')
      .insert(gameData)
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
      trophy_key: 'first_win',
      name: 'Première Victoire',
      description: 'Remporter votre première course.',
      tier: 'bronze',
      coin_reward: 20
    },
    {
      game_id: gameId,
      trophy_key: 'top_speed',
      name: 'Vitesse Maximale',
      description: "Atteindre la vitesse maximale d'un bolide.",
      tier: 'silver',
      coin_reward: 50
    },
    {
      game_id: gameId,
      trophy_key: 'drift_master',
      name: 'Dérapage Contrôlé',
      description: 'Réaliser un dérapage parfait.',
      tier: 'silver',
      coin_reward: 50
    },
    {
      game_id: gameId,
      trophy_key: 'cup_champion',
      name: 'Champion de la Coupe',
      description: 'Terminer toutes les pistes en première place.',
      tier: 'gold',
      coin_reward: 150
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
      console.log(`Trophy ${trophy.name} already exists. Updating...`);
      const { error: updateTrophyError } = await supabase
        .from('trophies')
        .update(trophy)
        .eq('id', existingTrophy.id);

      if (updateTrophyError) {
        console.error(`Error updating trophy ${trophy.name}:`, updateTrophyError);
      } else {
        console.log(`Trophy ${trophy.name} updated successfully.`);
      }
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

  console.log("Database registration complete!");
}

run();

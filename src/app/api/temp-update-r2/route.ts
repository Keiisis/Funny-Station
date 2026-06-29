import { NextResponse } from 'next/server';
import { createAdmin } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const WORKER_BASE = "https://funnystation.agavoubj.workers.dev/games";

export async function GET() {
  console.log("[Temp Update R2] Starting database updates...");
  
  const supabaseAdmin = createAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Admin client could not be created. Is SUPABASE_SERVICE_ROLE_KEY configured?" },
      { status: 500 }
    );
  }

  // Fetch all games
  const { data: games, error: fetchError } = await supabaseAdmin
    .from('games')
    .select('id, title, slug, assets_bucket_path');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const updatedGames = [];

  for (const game of games) {
    let newPath = game.assets_bucket_path;

    if (game.assets_bucket_path && game.assets_bucket_path.startsWith('/games')) {
      newPath = game.assets_bucket_path.replace('/games', WORKER_BASE);
    } else if (game.slug === 'street-fighter-alpha-2-gold') {
      newPath = WORKER_BASE;
    }

    if (newPath !== game.assets_bucket_path) {
      console.log(`[Temp Update R2] Updating ${game.slug}: ${game.assets_bucket_path} -> ${newPath}`);
      const { data, error: updateError } = await supabaseAdmin
        .from('games')
        .update({ assets_bucket_path: newPath })
        .eq('id', game.id)
        .select();

      if (updateError) {
        console.error(`[Temp Update R2] Failed to update ${game.slug}:`, updateError.message);
        updatedGames.push({ slug: game.slug, status: 'failed', error: updateError.message });
      } else {
        const rowsCount = data ? data.length : 0;
        console.log(`[Temp Update R2] Successfully updated ${game.slug}. Affected rows: ${rowsCount}`);
        updatedGames.push({ slug: game.slug, status: 'success', rowsCount });
      }
    } else {
      updatedGames.push({ slug: game.slug, status: 'no_change' });
    }
  }

  return NextResponse.json({
    message: "Path updates processed.",
    results: updatedGames
  });
}

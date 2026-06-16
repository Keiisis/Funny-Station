import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isServerSupabaseConfigured = supabaseUrl !== '' && supabaseServiceRoleKey !== '';

export const supabase = isServerSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : (createMockServerSupabaseClient() as any);

function createMockServerSupabaseClient() {
  return {
    storage: {
      from: () => ({
        upload: async (path: string, content: any, options: any) => {
          console.log(`[Mock Storage Server] Upload du fichier vers ${path} (Taille : ${content.length} octets)`);
          return { data: { path }, error: null };
        }
      })
    },
    from: () => ({
      update: () => ({
        eq: async () => ({ error: null })
      })
    })
  };
}

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Client serveur lié à la session de l'utilisateur (cookies). À utiliser dans
 * les Server Components, Route Handlers et Server Actions pour respecter la RLS.
 */
export async function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('[Supabase] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY manquants.');
  }
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Appelé depuis un Server Component : ignoré (le middleware rafraîchit la session).
        }
      },
    },
  });
}

/**
 * Client ADMIN (service_role) — bypass RLS. RÉSERVÉ au serveur (jamais exposé au client).
 * Utilisé par /api/install pour écrire dans Storage et la table games.
 * Renvoie null si la clé n'est pas configurée (l'appelant doit gérer ce cas).
 */
export function createAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

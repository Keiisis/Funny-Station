'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Plus de mock silencieux : si la config manque, on le sait immédiatement.
  throw new Error(
    "[Supabase] Configuration manquante. Définis NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local."
  );
}

/**
 * Client navigateur unique (cookie-based) partagé avec le rendu SSR via @supabase/ssr.
 * `createBrowserClient` renvoie un singleton mémoïsé : sûr à appeler plusieurs fois.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}

// Compat rétro : la plupart du code importe `{ supabase }` directement.
export const supabase = createClient();

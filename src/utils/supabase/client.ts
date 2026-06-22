'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Crée un client navigateur (cookie-based) partagé avec le rendu SSR via @supabase/ssr.
 * `createBrowserClient` est mémoïsé : sûr à appeler plusieurs fois.
 */
export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquants. " +
      "Définis-les en local (.env.local) ET dans les variables d'env Vercel."
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Singleton PARESSEUX : le client n'est créé qu'à la PREMIÈRE utilisation réelle
 * (au runtime navigateur), jamais à l'évaluation du module. Crucial : pendant le
 * build / prerender statique (Vercel), importer ce module ne déclenche AUCUN effet
 * de bord → plus de crash « Configuration manquante » au build.
 */
type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;
let _client: SupabaseBrowserClient | null = null;

export const supabase: SupabaseBrowserClient = new Proxy({} as SupabaseBrowserClient, {
  get(_target, prop, receiver) {
    if (!_client) _client = createClient();
    const value = Reflect.get(_client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(_client) : value;
  },
});

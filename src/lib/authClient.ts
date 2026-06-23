'use client';

import { supabase } from '@/utils/supabase/client';

/**
 * Authentification CÔTÉ NAVIGATEUR — instantanée, sans rechargement.
 *
 * Pourquoi : les server actions posent le cookie de session côté SERVEUR, mais la
 * racine lit la session via le client navigateur → désynchro (« il faut rafraîchir »).
 * En authentifiant directement avec le client navigateur, la session est en mémoire
 * IMMÉDIATEMENT (et onAuthStateChange se déclenche), donc la redirection est instantanée
 * et fiable. En bonus : 1 seul aller réseau pour le login, 1 pour l'inscription.
 *
 * Modèle « console » : identité = pseudo + PIN (6 chiffres). Email synthétique
 * déterministe `<pseudo>@funnystation.local` ; le PIN sert de mot de passe (≥ 6 car.).
 */

const SYNTH_DOMAIN = 'funnystation.local';

export type AuthResult = { ok: true } | { ok: false; error: string };

export function synthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTH_DOMAIN}`;
}

function validateUsername(username: string): string | null {
  const u = username.trim();
  if (u.length < 3) return 'Le pseudo doit faire au moins 3 caractères.';
  if (u.length > 20) return 'Le pseudo ne doit pas dépasser 20 caractères.';
  if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'Pseudo invalide (lettres, chiffres, - et _ uniquement).';
  return null;
}

function validatePin(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'Le code PIN doit comporter exactement 6 chiffres.';
  return null;
}

export async function signInClient(input: { username: string; pin: string }): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: synthEmail(input.username),
    password: input.pin,
  });
  if (error) return { ok: false, error: 'Pseudo ou code PIN incorrect.' };
  return { ok: true };
}

export async function signUpClient(input: {
  username: string;
  pin: string;
  email?: string;
  accountType: 'gamer' | 'creator';
  avatarUrl?: string;
}): Promise<AuthResult> {
  const usernameErr = validateUsername(input.username);
  if (usernameErr) return { ok: false, error: usernameErr };
  const pinErr = validatePin(input.pin);
  if (pinErr) return { ok: false, error: pinErr };

  const recovery = input.email?.trim() || '';
  if (recovery && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recovery)) {
    return { ok: false, error: "Format d'email de récupération invalide." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: synthEmail(input.username),
    password: input.pin,
    options: {
      data: {
        username: input.username.trim(),
        account_type: input.accountType,
        avatar_url: input.avatarUrl ?? null,
        recovery_email: recovery || null,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { ok: false, error: 'Ce pseudo est déjà utilisé. Choisis-en un autre.' };
    }
    return { ok: false, error: error.message };
  }

  // Si la confirmation par email est requise, signUp ne renvoie pas de session.
  // L'email synthétique ne peut pas être confirmé → on tente un login direct (cas
  // où l'auto-confirmation est active, ou où le compte existait déjà avec ce PIN).
  if (!data.session) {
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: synthEmail(input.username),
      password: input.pin,
    });
    if (loginErr) {
      return { ok: false, error: 'Ce pseudo existe déjà. Vérifie ton code PIN ou crée un autre profil.' };
    }
  }

  return { ok: true };
}

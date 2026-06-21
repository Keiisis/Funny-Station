'use server';

import { createClient, createAdmin } from '@/utils/supabase/server';

/**
 * Authentification Funny Station — modèle « console ».
 * - Identité de connexion = username + PIN.
 * - L'email Supabase est synthétique et déterministe : `<username>@funnystation.local`,
 *   ce qui permet de se connecter avec le seul username (sans lookup).
 * - L'email de récupération (facultatif) est stocké à part pour réinitialiser le PIN.
 */

const SYNTH_DOMAIN = 'funnystation.local';

export type AuthResult = { ok: true } | { ok: false; error: string };

function synthEmail(username: string): string {
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
  if (!/^\d{4}$/.test(pin)) return 'Le code PIN doit comporter exactement 4 chiffres.';
  return null;
}

/**
 * Convertit un PIN 4 chiffres en mot de passe acceptable par Supabase (min 6 caractères).
 * On préfixe avec 'FS' pour atteindre 6 caractères tout en gardant la simplicité côté UX.
 */
function pinToPassword(pin: string): string {
  return `FS${pin}`;
}

// ── INSCRIPTION ─────────────────────────────────────────────────────────────
export async function signUpAction(input: {
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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: synthEmail(input.username),
    password: pinToPassword(input.pin),
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
    // Email synthétique déjà pris = pseudo déjà utilisé.
    if (error.message.toLowerCase().includes('already')) {
      return { ok: false, error: 'Ce pseudo est déjà utilisé. Choisis-en un autre.' };
    }
    return { ok: false, error: error.message };
  }

  // Supabase signUp retourne un user SANS identities si l'email existe déjà
  // (comportement de sécurité pour ne pas révéler l'existence du compte).
  // On détecte cela et on tente un login direct.
  if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
    // Supabase renvoie un user sans identities quand l'email existe déjà (sécurité).
    // On tente une connexion directe : si le PIN est bon, c'est le compte de l'utilisateur.
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: synthEmail(input.username),
      password: pinToPassword(input.pin),
    });
    if (!loginError) {
      return { ok: true };
    }
    return { ok: false, error: 'Ce pseudo existe déjà. Vérifie ton code PIN ou crée un autre profil.' };
  }

  return { ok: true };
}

// ── CONNEXION ───────────────────────────────────────────────────────────────
export async function signInAction(input: {
  username: string;
  pin: string;
}): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: synthEmail(input.username),
    password: pinToPassword(input.pin),
  });

  if (error) {
    return { ok: false, error: 'Pseudo ou code PIN incorrect.' };
  }
  return { ok: true };
}

// ── DÉCONNEXION ─────────────────────────────────────────────────────────────
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// ── RÉINITIALISATION DU PIN (via email de récupération) ─────────────────────
/**
 * Vérifie que (username, recoveryEmail) correspond à un profil ayant rattaché
 * cet email, puis met à jour le PIN via l'API admin. Nécessite SUPABASE_SERVICE_ROLE_KEY.
 *
 * Note sécurité : flux direct (pas de magic-link). Suffisant pour démarrer ;
 * peut être renforcé plus tard par un code envoyé par email.
 */
export async function resetPinAction(input: {
  username: string;
  recoveryEmail: string;
  newPin: string;
}): Promise<AuthResult> {
  const pinErr = validatePin(input.newPin);
  if (pinErr) return { ok: false, error: pinErr };

  const admin = createAdmin();
  if (!admin) {
    return { ok: false, error: 'Récupération indisponible (service non configuré côté serveur).' };
  }

  // Retrouver le profil par username + email de récupération.
  const { data: profile } = await admin
    .from('profiles')
    .select('id, recovery_email')
    .eq('username', input.username.trim())
    .single();

  if (!profile || !profile.recovery_email) {
    return { ok: false, error: 'Aucun compte récupérable trouvé pour ce pseudo.' };
  }
  if (profile.recovery_email.toLowerCase() !== input.recoveryEmail.trim().toLowerCase()) {
    return { ok: false, error: "L'email de récupération ne correspond pas." };
  }

  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: pinToPassword(input.newPin),
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

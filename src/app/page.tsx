'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/shell/Dashboard';
import { GamepadController } from '@/drivers/GamepadController';
import { AudioEngine } from '@/drivers/AudioEngine';
import { supabase } from '@/utils/supabase/client';
import { fetchProfileData } from '@/lib/db';
import { ProfileData } from '@/types';
import { BootScreen } from '@/shell/BootScreen';

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Recharge le profil applicatif depuis Supabase (source de vérité).
  // On lit la session LOCALEMENT (getSession = pas d'aller réseau) → gating instantané ;
  // la RLS protège déjà les données au fetch. Beaucoup plus rapide que getUser().
  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.replace('/auth/login');
      return;
    }
    const data = await fetchProfileData(session.user.id);
    setProfile(data);
    setLoaded(true);
  }, [router]);

  useEffect(() => {
    // Init manette + reprise audio au premier geste utilisateur.
    GamepadController.getInstance();
    const resumeAudio = () => {
      const isBooted = sessionStorage.getItem('funnystation_booted') === 'true';
      if (!isBooted) return;
      AudioEngine.getInstance().playAmbientMusic();
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('keydown', resumeAudio);

    loadProfile();

    // Réagit INSTANTANÉMENT à une connexion/déconnexion (fini le « rafraîchir la page »).
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN') loadProfile();
      else if (event === 'SIGNED_OUT') { setProfile(null); setLoaded(false); }
    });

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, [loadProfile]);

  // Mise à jour optimiste locale ; la DB reste la vérité (refetch via refreshProfile).
  const handleUpdateProfile = (updated: ProfileData) => {
    setProfile(updated);
  };

  const handleSignOut = async () => {
    AudioEngine.getInstance().playSFX('select');
    AudioEngine.getInstance().stopAmbientMusic();
    // Déconnexion côté navigateur → session vidée immédiatement (onAuthStateChange).
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  if (!loaded || !profile) {
    return (
      <div className="w-screen h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <BootScreen>
      <Dashboard
        profile={profile}
        onSignOut={handleSignOut}
        onUpdateProfile={handleUpdateProfile}
        onRefreshProfile={loadProfile}
      />
    </BootScreen>
  );
}

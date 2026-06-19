'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/shell/Dashboard';
import { GamepadController } from '@/drivers/GamepadController';
import { AudioEngine } from '@/drivers/AudioEngine';
import { supabase } from '@/utils/supabase/client';
import { fetchProfileData } from '@/lib/db';
import { signOutAction } from './auth/actions';
import { ProfileData } from '@/types';
import { BootScreen } from '@/shell/BootScreen';

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Recharge le profil applicatif depuis Supabase (source de vérité).
  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    const data = await fetchProfileData(user.id);
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

    return () => {
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
    await signOutAction();
    router.replace('/auth/login');
    router.refresh();
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

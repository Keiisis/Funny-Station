'use client';

import React, { useState, useEffect } from 'react';
import { ProfileSelector } from '@/shell/ProfileSelector';
import { Dashboard } from '@/shell/Dashboard';
import { GamepadController } from '@/drivers/GamepadController';
import { AudioEngine } from '@/drivers/AudioEngine';
import { ProfileData } from '@/types';

export default function Home() {
  const [activeProfile, setActiveProfile] = useState<ProfileData | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  useEffect(() => {
    // Initialiser le contrôleur de manette globale
    const controller = GamepadController.getInstance();
    
    // Essayer de reprendre le contexte audio lors du premier clic utilisateur
    const resumeAudio = () => {
      AudioEngine.getInstance().playAmbientMusic(); // Lance la musique douce PS5
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };

    window.addEventListener('click', resumeAudio);
    window.addEventListener('keydown', resumeAudio);

    // Restaurer la session utilisateur
    const storedActiveProfile = localStorage.getItem('funny_station_active_profile');
    if (storedActiveProfile) {
      try {
        const parsed: ProfileData = JSON.parse(storedActiveProfile);
        const storedProfiles = localStorage.getItem('funny_station_profiles');
        if (storedProfiles) {
          const list: ProfileData[] = JSON.parse(storedProfiles);
          const found = list.find(p => p.id === parsed.id);
          if (found) {
            setActiveProfile(found);
          }
        } else {
          setActiveProfile(parsed);
        }
      } catch (e) {
        console.error('Erreur restauration session profil actif:', e);
      }
    }
    setIsSessionLoaded(true);

    return () => {
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, []);

  const handleSelectProfile = (profile: ProfileData) => {
    setActiveProfile(profile);
    localStorage.setItem('funny_station_active_profile', JSON.stringify(profile));
  };

  const handleUpdateProfile = (updatedProfile: ProfileData) => {
    setActiveProfile(updatedProfile);
    localStorage.setItem('funny_station_active_profile', JSON.stringify(updatedProfile));
    
    // Update profile list in local storage
    const stored = localStorage.getItem('funny_station_profiles');
    if (stored) {
      const list: ProfileData[] = JSON.parse(stored);
      const idx = list.findIndex(p => p.id === updatedProfile.id);
      if (idx !== -1) {
        list[idx] = updatedProfile;
        localStorage.setItem('funny_station_profiles', JSON.stringify(list));
      }
    }
  };

  const handleSignOut = () => {
    AudioEngine.getInstance().playSFX('select');
    setActiveProfile(null);
    localStorage.removeItem('funny_station_active_profile');
    sessionStorage.removeItem('funny_station_active_tab');
    sessionStorage.removeItem('funny_station_focused_index');
    sessionStorage.removeItem('funny_station_selected_game_slug');
  };

  if (!isSessionLoaded) {
    return (
      <div className="w-screen h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!activeProfile) {
    return <ProfileSelector onSelectProfile={handleSelectProfile} />;
  }

  return (
    <Dashboard
      profile={activeProfile}
      onSignOut={handleSignOut}
      onUpdateProfile={handleUpdateProfile}
    />
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { ProfileSelector } from '@/shell/ProfileSelector';
import { Dashboard } from '@/shell/Dashboard';
import { GamepadController } from '@/drivers/GamepadController';
import { AudioEngine } from '@/drivers/AudioEngine';
import { ProfileData } from '@/types';

export default function Home() {
  const [activeProfile, setActiveProfile] = useState<ProfileData | null>(null);

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

    return () => {
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, []);

  const handleSelectProfile = (profile: ProfileData) => {
    setActiveProfile(profile);
  };

  const handleUpdateProfile = (updatedProfile: ProfileData) => {
    setActiveProfile(updatedProfile);
    
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
  };

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

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Power } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';

interface BootScreenProps {
  children: React.ReactNode;
}

export const BootScreen: React.FC<BootScreenProps> = ({ children }) => {
  const [hasBooted, setHasBooted] = useState<boolean>(true); // Default to true until mounted
  const [powerPressed, setPowerPressed] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');

  useEffect(() => {
    // Check if console is already booted in this tab session
    const booted = sessionStorage.getItem('funnystation_booted') === 'true';
    setHasBooted(booted);

    if (!booted) {
      // Précharger la vidéo via le proxy d'obfuscation
      const loadVideo = async () => {
        try {
          const rawUrl = '/videos/startup.mp4';
          const base64Key = btoa(unescape(encodeURIComponent(rawUrl)));
          const res = await fetch(`/api/media?key=${base64Key}`);
          if (!res.ok) throw new Error('Failed to fetch boot video');
          const blob = await res.blob();
          const mediaBlob = new Blob([blob], { type: 'video/mp4' });
          const blobUrl = URL.createObjectURL(mediaBlob);
          setVideoSrc(blobUrl);
        } catch (e) {
          console.warn('Failed to load boot video via obfuscated route, falling back to direct url:', e);
          setVideoSrc('/videos/startup.mp4');
        }
      };
      loadVideo();
    }

    return () => {
      // Nettoyage de l'Object URL s'il y en a un
      setVideoSrc(prev => {
        if (prev && prev.startsWith('blob:')) {
          try { URL.revokeObjectURL(prev); } catch (e) {}
        }
        return '';
      });
    };
  }, []);

  const playConsoleBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5 note
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Boot beep play failed:', e);
    }
  };

  const handleBootComplete = useCallback(() => {
    setIsFadingOut(true);
    
    // Start ambient background music
    AudioEngine.getInstance().playAmbientMusic();
    
    setTimeout(() => {
      sessionStorage.setItem('funnystation_booted', 'true');
      setHasBooted(true);
    }, 800); // Sync with CSS transition
  }, []);

  const handleTurnOn = () => {
    playConsoleBeep();
    setPowerPressed(true);
    
    const vid = videoRef.current;
    if (!vid) {
      // Fallback: no video element, skip directly
      handleBootComplete();
      return;
    }

    // Start MUTED to guarantee the browser allows play(), then unmute once playing
    vid.muted = true;
    vid.currentTime = 0;

    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
          .then(() => {
            // Playback started — unmute now (user gesture context is still active)
            vid.muted = false;
            vid.volume = 1.0;
          })
          .catch((err) => {
            console.warn('Video playback was blocked/failed:', err);
            handleBootComplete();
          });
    }
  };

  if (hasBooted) {
    return <>{children}</>;
  }

  return (
    <div 
      className={`fixed inset-0 w-screen h-screen bg-black z-[9999] flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-700 ease-out will-change-opacity ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ transform: 'translate3d(0,0,0)' }}
    >
      {/* 1. POWER BUTTON INTERFACE (BEFORE CLICK) */}
      {!powerPressed && (
        <div className="flex flex-col items-center gap-6 animate-fade-in" style={{ transform: 'translate3d(0,0,0)' }}>
          <div className="relative">
            {/* Outer pulsing ring */}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-75 duration-[2.5s]" />
            
            {/* Clickable Power Button */}
            <button
              onClick={handleTurnOn}
              className="relative w-24 h-24 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-blue-500 hover:text-blue-400 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
            >
              <Power 
                size={36} 
                className="transition-transform duration-500 group-hover:rotate-12 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
              />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-bold tracking-[0.25em] text-zinc-300 uppercase animate-pulse">
              Funny Station
            </span>
            <span className="text-[9px] font-black tracking-widest text-zinc-650 uppercase">
              Appuyer pour allumer la console
            </span>
          </div>
        </div>
      )}

      {/* 2. BOOT CINEMATIC VIDEO — always mounted, visibility controlled by CSS */}
      <div 
        className={`w-full h-full absolute inset-0 transition-opacity duration-200 ${
          powerPressed ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none -z-10'
        }`}
        style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}
      >
        <video
          ref={videoRef}
          src={videoSrc || undefined}
          className="w-full h-full object-cover"
          preload="auto"
          playsInline
          muted
          onEnded={handleBootComplete}
          style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}
        />
      </div>
    </div>
  );
};

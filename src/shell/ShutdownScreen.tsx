'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '@/drivers/AudioEngine';

interface ShutdownScreenProps {
  isShuttingDown: boolean;
  onCancel?: () => void; // Optional if we want to support cancelling, though usually shutdown is final
}

export const ShutdownScreen: React.FC<ShutdownScreenProps> = ({ isShuttingDown }) => {
  const [showFallback, setShowFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const safetyTimeoutRef = useRef<any>(null);

  const triggerCloseSequence = () => {
    // 2. ATTEMPT WINDOW CLOSE
    console.log('[System] Tentative de fermeture de la fenêtre...');
    
    // Try standard close
    window.close();

    // Try standard hacks for closing current tab
    try {
      window.open('about:blank', '_self');
      window.close();
    } catch (e) {}

    // Check after 150ms if window was closed successfully
    setTimeout(() => {
      // If document is still visible, show fallback screen
      if (!document.hidden) {
        setShowFallback(true);
      }
    }, 150);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const durationSec = video.duration;
    if (durationSec && !isNaN(durationSec)) {
      const ms = Math.ceil(durationSec * 1000) + 1500; // duration + 1.5s margin
      console.log(`[System] Shutdown video duration loaded: ${durationSec}s. Safety timeout set to ${ms}ms.`);
      
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      
      safetyTimeoutRef.current = setTimeout(() => {
        console.warn('[System] Fallback safety timeout reached. Forcing close sequence.');
        triggerCloseSequence();
      }, ms);
    }
  };

  useEffect(() => {
    if (!isShuttingDown) return;

    // 1. CLEANUP ALL RESOURCES
    console.log('[System] Démarrage de la séquence d\'extinction...');
    
    // Stop all system audio
    AudioEngine.getInstance().stopAmbientMusic();

    // Close active WebSockets (simulate by notifying parent or clearing active loops)
    try {
      // Find and stop any other active videos or media in the document
      const elements = document.querySelectorAll('video, audio');
      elements.forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
        } catch (e) {}
      });
    } catch (e) {
      console.warn('Failed to pause secondary media:', e);
    }

    // Check for debug flag in URL or sessionStorage
    const isDebug = 
      sessionStorage.getItem('funnystation_debug_shutdown') === 'true' || 
      (typeof window !== 'undefined' && window.location.search.includes('debug_shutdown=true'));

    if (isDebug) {
      console.log('[System] Mode Debug actif : Bypassing de l\'animation d\'extinction.');
      triggerCloseSequence();
      return;
    }

    // Default safety timeout (11 seconds fallback if metadata doesn't load)
    safetyTimeoutRef.current = setTimeout(() => {
      console.warn('[System] Default fallback safety timeout reached. Forcing close sequence.');
      triggerCloseSequence();
    }, 11000);

    // Play video
    const video = videoRef.current;
    if (video) {
      // Robust start muted, then unmute
      video.muted = true;
      video.currentTime = 0;
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            video.muted = false;
            video.volume = 1.0;
            console.log('[System] Shutdown video started playing and was unmuted.');
          })
          .catch((err) => {
            console.warn('Shutdown video blocked/failed, bypassing to close:', err);
            triggerCloseSequence();
          });
      }
    }

    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, [isShuttingDown]);

  if (!isShuttingDown) return null;

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-black z-[10000] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ pointerEvents: 'all' }} // Intercepts all clicks
    >
      {/* Fallback Display Screen */}
      {showFallback ? (
        <div className="flex flex-col items-center gap-4 animate-fade-in text-center px-6">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-800 flex items-center justify-center text-zinc-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">OFF</span>
          </div>
          <h2 className="text-sm font-black tracking-widest text-zinc-300 uppercase">
            FunnyStation éteinte
          </h2>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest max-w-xs leading-normal">
            Vous pouvez à présent fermer cet onglet de navigateur en toute sécurité.
          </p>
        </div>
      ) : (
        /* Dynamic Shutdown video playing */
        <video
          ref={videoRef}
          src="/videos/shutdown.mp4"
          className="w-full h-full object-cover"
          preload="auto"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={triggerCloseSequence}
        />
      )}
    </div>
  );
};

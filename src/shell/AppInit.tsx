'use client';

import { useEffect } from 'react';

/**
 * Initialisation client globale :
 *  - applique les réglages d'ACCESSIBILITÉ persistés (réduction des animations,
 *    mode daltonien), en respectant par défaut la préférence système ;
 *  - enregistre le SERVICE WORKER (PWA installable) en production et en dev ;
 *  - synchronise les sauvegardes virtuelles automatiquement au retour en ligne.
 * Réagit à l'événement `funny_a11y_changed` pour s'actualiser à chaud.
 */
export function AppInit() {
  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const stored = localStorage.getItem('fs_reduce_motion');
      const reduceOn = stored === null ? !!prefersReduced : stored === '1';
      root.classList.toggle('reduce-motion', reduceOn);
      root.classList.toggle('colorblind', localStorage.getItem('fs_colorblind') === '1');
    };
    apply();
    window.addEventListener('funny_a11y_changed', apply);

    const handleOnline = () => {
      console.log('[PWA] Network online restored, triggering save sync...');
      window.dispatchEvent(new CustomEvent('funny_station_online'));
    };
    window.addEventListener('online', handleOnline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[PWA] Service Worker registered scope:', reg.scope))
        .catch(err => console.error('[PWA] Service Worker registration error:', err));
    }

    return () => {
      window.removeEventListener('funny_a11y_changed', apply);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}

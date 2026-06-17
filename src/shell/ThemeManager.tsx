'use client';

import { useEffect } from 'react';

const THEMES = ['noir', 'blanc', 'vert', 'rouge', 'jaune', 'bleu'];

export const ThemeManager: React.FC = () => {
  useEffect(() => {
    // Restaurer ou générer un thème aléatoire
    let savedTheme = localStorage.getItem('funny_station_theme');
    if (!savedTheme || !THEMES.includes(savedTheme)) {
      const randomIdx = Math.floor(Math.random() * THEMES.length);
      savedTheme = THEMES[randomIdx];
      localStorage.setItem('funny_station_theme', savedTheme);
    }
    
    // Appliquer le thème sur l'élément HTML
    const html = document.documentElement;
    THEMES.forEach(t => html.classList.remove(`theme-${t}`));
    html.classList.add(`theme-${savedTheme}`);
    
    // Émettre un événement personnalisé pour le shader WebGL
    window.dispatchEvent(new CustomEvent('funny_theme_changed', { detail: { theme: savedTheme } }));
  }, []);

  return null;
};

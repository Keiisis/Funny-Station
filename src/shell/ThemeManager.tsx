'use client';

import { useEffect, useState, useRef } from 'react';

const COLOR_THEMES = ['noir', 'blanc', 'vert', 'rouge', 'jaune', 'bleu'];
const ALL_THEMES = [...COLOR_THEMES, 'auto'];

export const ThemeManager: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<string>('auto');
  const autoCycleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAutoIdxRef = useRef<number>(0);

  const applyTheme = (themeName: string) => {
    const html = document.documentElement;
    ALL_THEMES.forEach(t => html.classList.remove(`theme-${t}`));
    html.classList.add(`theme-${themeName}`);
    
    // Dispatch custom event for the WebGLBackground shader
    window.dispatchEvent(new CustomEvent('funny_theme_changed', { detail: { theme: themeName } }));
  };

  useEffect(() => {
    // Restore saved theme from localStorage
    let savedTheme = localStorage.getItem('funny_station_theme');
    if (!savedTheme || !ALL_THEMES.includes(savedTheme)) {
      savedTheme = 'auto'; // Default to auto
      localStorage.setItem('funny_station_theme', savedTheme);
    }
    
    setActiveTheme(savedTheme);

    // Watch for manual theme changes from the Control Center or other components
    const handleManualThemeChange = (e: Event) => {
      const newTheme = (e as CustomEvent<{ theme: string }>).detail.theme;
      setActiveTheme(newTheme);
    };
    
    window.addEventListener('funny_theme_action_change', handleManualThemeChange);
    return () => {
      window.removeEventListener('funny_theme_action_change', handleManualThemeChange);
    };
  }, []);

  useEffect(() => {
    // Clean up previous interval if any
    if (autoCycleIntervalRef.current) {
      clearInterval(autoCycleIntervalRef.current);
      autoCycleIntervalRef.current = null;
    }

    if (activeTheme === 'auto') {
      // In auto mode, we cycle color themes automatically every 45 seconds
      const cycleThemes = () => {
        const nextTheme = COLOR_THEMES[currentAutoIdxRef.current];
        applyTheme(nextTheme);
        currentAutoIdxRef.current = (currentAutoIdxRef.current + 1) % COLOR_THEMES.length;
      };

      cycleThemes(); // Run immediately

      autoCycleIntervalRef.current = setInterval(cycleThemes, 45000); // Cycle every 45s
    } else {
      // Manual mode: just apply the selected theme
      applyTheme(activeTheme);
    }

    return () => {
      if (autoCycleIntervalRef.current) {
        clearInterval(autoCycleIntervalRef.current);
      }
    };
  }, [activeTheme]);

  return null;
};

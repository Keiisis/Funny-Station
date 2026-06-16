import { useEffect } from 'react';
import { GamepadDirection } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';

export const useGamepadNavigation = (
  itemsCount: number,
  currentIndex: number,
  setCurrentIndex: (index: number) => void,
  onConfirm: () => void,
  onBack?: () => void,
  cols: number = 4,
  disabled: boolean = false
) => {
  useEffect(() => {
    if (disabled) return;
    
    // 1. Gestion des touches du clavier pour émuler la manette
    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: GamepadDirection | null = null;

      switch (e.key) {
        case 'ArrowLeft':
          direction = 'LEFT';
          break;
        case 'ArrowRight':
          direction = 'RIGHT';
          break;
        case 'ArrowUp':
          direction = 'UP';
          break;
        case 'ArrowDown':
          direction = 'DOWN';
          break;
        case 'Enter':
        case ' ':
          direction = 'CONFIRM';
          break;
        case 'Escape':
        case 'Backspace':
          direction = 'BACK';
          break;
        default:
          return; // ignorer les autres touches
      }

      // Empêcher le défilement de la page par défaut lors de l'utilisation des flèches/espace
      e.preventDefault();

      // Dispatch l'action comme si elle venait de la manette
      const event = new CustomEvent('funny_gamepad_action', { detail: { direction } });
      window.dispatchEvent(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;

    // 2. Gestion de l'action de manette (et clavier émulé)
    const handleGamepadInput = (e: CustomEvent<{ direction: GamepadDirection }>) => {
      const direction = e.detail.direction;
      let nextIndex = currentIndex;

      switch (direction) {
        case 'LEFT':
          if (currentIndex > 0) nextIndex = currentIndex - 1;
          break;
        case 'RIGHT':
          if (currentIndex < itemsCount - 1) nextIndex = currentIndex + 1;
          break;
        case 'UP':
          if (currentIndex - cols >= 0) nextIndex = currentIndex - cols;
          break;
        case 'DOWN':
          if (currentIndex + cols < itemsCount) nextIndex = currentIndex + cols;
          break;
        case 'CONFIRM':
          onConfirm();
          break;
        case 'BACK':
          if (onBack) onBack();
          break;
        default:
          break;
      }

      if (nextIndex !== currentIndex) {
        setCurrentIndex(nextIndex);
        // Jouer le son de navigation système
        AudioEngine.getInstance().playSFX('navigate');
      }
    };

    window.addEventListener('funny_gamepad_action', handleGamepadInput as EventListener);
    return () => {
      window.removeEventListener('funny_gamepad_action', handleGamepadInput as EventListener);
    };
  }, [currentIndex, itemsCount, cols, onConfirm, onBack, setCurrentIndex, disabled]);
};

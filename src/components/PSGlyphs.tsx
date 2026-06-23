import React from 'react';

// Glyphes PlayStation (style DualSense), dessinés en SVG net — bien plus réalistes
// que les caractères unicode ✕◯■▲. `stroke="currentColor"` → ils adoptent la couleur
// (themée) du bouton parent. Tailles par défaut ajustées à l'optique des symboles.

interface GlyphProps { size?: number; className?: string; }
const common = (size: number, className?: string) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const, className,
});

export const PSCross: React.FC<GlyphProps> = ({ size = 16, className }) => (
  <svg {...common(size, className)}>
    <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
    <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
  </svg>
);

export const PSCircle: React.FC<GlyphProps> = ({ size = 15, className }) => (
  <svg {...common(size, className)}>
    <circle cx="12" cy="12" r="6.5" />
  </svg>
);

export const PSSquare: React.FC<GlyphProps> = ({ size = 14, className }) => (
  <svg {...common(size, className)}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
  </svg>
);

export const PSTriangle: React.FC<GlyphProps> = ({ size = 16, className }) => (
  <svg {...common(size, className)}>
    <path d="M12 5.5 L18.2 17.5 L5.8 17.5 Z" />
  </svg>
);

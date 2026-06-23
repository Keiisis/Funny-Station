'use client';

import React, { useEffect, useRef } from 'react';

interface DynamicAuraProps {
  gameSlug?: string;
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

// Preset color palettes for the games in the seed
const COMPONENT_PALETTES: Record<string, string[]> = {
  'neon-runner': ['#3b82f6', '#8b5cf6', '#1d4ed8'],       // Blue, Purple, Dark Blue
  'pypyodide-math': ['#10b981', '#f59e0b', '#047857'],    // Green, Amber, Dark Green
  'wasm-raytracer': ['#ef4444', '#f97316', '#b91c1c'],    // Red, Orange, Dark Red
  'lua-adventure': ['#6366f1', '#0ea5e9', '#4338ca'],     // Indigo, Sky, Dark Indigo
  'java-retro': ['#dc2626', '#d97706', '#991b1b'],        // Red, Amber, Dark Red
  'top-down-horror': ['#1e1b4b', '#581c87', '#0f172a'],   // Dark Indigo, Purple, Slate
  'gba-test': ['#10b981', '#06b6d4', '#065f46'],          // Emerald, Cyan, Dark Emerald
  'jackie-chan': ['#f59e0b', '#ec4899', '#d97706'],       // Amber, Pink, Dark Amber
  '007-everything-or-nothing': ['#ef4444', '#1e293b', '#991b1b'],
  'super-mario-advance-4': ['#ef4444', '#3b82f6', '#facc15'],
  'dbz-buus-fury-gt-transformation': ['#f97316', '#3b82f6', '#ea580c'],
  'dragon-ball-advanced-adventure': ['#f97316', '#facc15', '#b45309'],
  'gta-advance': ['#8b5cf6', '#10b981', '#4c1d95'],
  'naruto-ninja-council-2': ['#f97316', '#3b82f6', '#c2410c'],
  'nfs-most-wanted': ['#10b981', '#06b6d4', '#064e3b'],
  'one-piece': ['#facc15', '#3b82f6', '#b45309'],
  'street-fighter-alpha-3': ['#ef4444', '#a855f7', '#7e22ce'],
  'street-fighter-alpha-2-gold': ['#dc2626', '#f59e0b', '#7f1d1d'],
  'default': ['#1e3a8a', '#581c87', '#0f172a']            // Deep Blue, Purple, Dark Slate
};

// Helper to convert hex to RGB components
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return { r, g, b };
};

export const DynamicAura: React.FC<DynamicAuraProps> = ({ gameSlug = 'default' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Keep track of target colors and current active colors for interpolation
  const targetColorsRef = useRef<string[]>(COMPONENT_PALETTES.default);
  const currentColorsRef = useRef<{r: number; g: number; b: number}[]>([
    { r: 30, g: 58, b: 138 },
    { r: 88, g: 28, b: 135 },
    { r: 15, g: 23, b: 42 }
  ]);

  // Handle color palette updates
  useEffect(() => {
    const palette = COMPONENT_PALETTES[gameSlug] || COMPONENT_PALETTES.default;
    targetColorsRef.current = palette;
  }, [gameSlug]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a small resolution for high performance
    const width = 300;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    // Initialize floating blobs
    const blobs: Blob[] = [
      { x: width * 0.2, y: height * 0.3, vx: 0.15, vy: 0.1, radius: 110, color: '' },
      { x: width * 0.8, y: height * 0.7, vx: -0.1, vy: -0.15, radius: 130, color: '' },
      { x: width * 0.5, y: height * 0.5, vx: 0.08, vy: -0.08, radius: 150, color: '' }
    ];

    let animationId: number;

    const render = () => {
      // Interpolate colors smoothly towards target
      const targets = targetColorsRef.current;
      currentColorsRef.current = currentColorsRef.current.map((curr, i) => {
        const targetHex = targets[i] || targets[0] || '#000000';
        const targetRgb = hexToRgb(targetHex);
        
        // Lerp color components
        return {
          r: curr.r + (targetRgb.r - curr.r) * 0.03,
          g: curr.g + (targetRgb.g - curr.g) * 0.03,
          b: curr.b + (targetRgb.b - curr.b) * 0.03
        };
      });

      // Clear with very dark slate back layer to prevent color bleeding
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Render floating blurred colored blobs
      blobs.forEach((blob, i) => {
        // Move blobs with boundaries bounce
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (blob.x - blob.radius < -50 || blob.x + blob.radius > width + 50) blob.vx *= -1;
        if (blob.y - blob.radius < -50 || blob.y + blob.radius > height + 50) blob.vy *= -1;

        const rgb = currentColorsRef.current[i] || currentColorsRef.current[0];
        const colorString = `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, 0.45)`;

        // Render radial gradient on canvas
        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 10,
          blob.x, blob.y, blob.radius
        );
        gradient.addColorStop(0, colorString);
        gradient.addColorStop(1, 'rgba(2, 6, 23, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.55] select-none filter blur-[95px]"
      style={{
        zIndex: 10,
        mixBlendMode: 'screen',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform'
      }}
    />
  );
};

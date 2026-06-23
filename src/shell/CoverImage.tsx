'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface CoverImageProps {
  src?: string | null;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /** Classe du dégradé de repli si aucune image (sinon transparent). */
  fallbackClassName?: string;
}

/**
 * Jaquette robuste : tente l'optimisation next/image, et en cas d'échec (formats
 * exotiques type .jfif/.svg, hôte non optimisable, etc.) bascule sur un <img> brut
 * — qui affiche TOUT ce que le navigateur sait lire, avec lazy-load conservé.
 * Garantit qu'AUCUNE jaquette ne reste vide. À placer dans un parent `relative`.
 */
export const CoverImage: React.FC<CoverImageProps> = ({
  src,
  alt,
  sizes = '100vw',
  className = 'object-cover',
  priority = false,
  fallbackClassName = 'absolute inset-0 bg-gradient-to-tr from-blue-950 via-violet-950/60 to-zinc-950',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src) {
    return <div className={fallbackClassName} />;
  }

  if (failed) {
    // Repli universel : <img> natif (gère jfif, svg, etc.), lazy si non prioritaire.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`absolute inset-0 w-full h-full ${className}`}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

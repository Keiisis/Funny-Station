'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Film, Trash2, Download, Copy, ExternalLink, Calendar, Check, X } from 'lucide-react';
import { fetchGallery, deleteScreenshot } from '@/lib/screenshots';
import type { Screenshot } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';

interface ScreenshotGalleryProps {
  userId: string;
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ userId }) => {
  const [items, setItems] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Screenshot | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await fetchGallery(userId);
      setItems(data);
    } catch (e) {
      console.error('[Gallery] Failed to fetch gallery:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [userId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette capture ?')) return;

    try {
      AudioEngine.getInstance().playSFX('select');
      await deleteScreenshot(id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('[Gallery] Delete failed:', err);
    }
  };

  const handleCopyLink = (e: React.MouseEvent, item: Screenshot) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    AudioEngine.getInstance().playSFX('select');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" /> Galerie de Captures
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Vos screenshots et clips vidéo capturés en jeu</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" />
          <span className="text-xs">Chargement de votre galerie...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 border border-dashed border-white/5 rounded-2xl gap-4">
          <div className="p-4 bg-white/5 rounded-full">
            <Camera className="w-8 h-8 text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-300">Aucune capture pour le moment</p>
            <p className="text-xs text-zinc-500 mt-1">Utilisez le bouton de capture dans l'overlay de jeu pour enregistrer vos meilleurs moments !</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group relative aspect-video bg-zinc-900 border border-white/10 hover:border-blue-500/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] duration-200"
            >
              {/* Media Preview */}
              {item.type === 'screenshot' ? (
                <img
                  src={item.url}
                  alt={item.caption || 'Gameplay Screenshot'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full relative flex items-center justify-center bg-black">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover opacity-80"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/10 transition-all">
                    <Film className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                </div>
              )}

              {/* Overlay with details */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                {/* Top Actions */}
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={(e) => handleCopyLink(e, item)}
                    className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                    title="Copier le lien"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-red-900/90 text-zinc-300 hover:text-red-200 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Details */}
                <div>
                  <div className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-md inline-block mb-1">
                    {item.game_title || 'Jeu inconnu'}
                  </div>
                  {item.caption && (
                    <p className="text-[11px] text-white line-clamp-1 font-medium">{item.caption}</p>
                  )}
                  <p className="text-[9px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-2.5 h-2.5" /> {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Quick Type Badge */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] text-zinc-400 flex items-center gap-1 font-medium pointer-events-none group-hover:opacity-0 transition-opacity">
                {item.type === 'screenshot' ? (
                  <>
                    <Camera className="w-2.5 h-2.5 text-blue-400" /> Screenshot
                  </>
                ) : (
                  <>
                    <Film className="w-2.5 h-2.5 text-red-400" /> Clip
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-zinc-950/50">
              <div>
                <h3 className="font-bold text-white text-base">
                  {selectedItem.game_title || 'Gameplay Capture'}
                </h3>
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" /> Capturé le {new Date(selectedItem.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Player / Container */}
            <div className="w-full flex-1 aspect-video bg-black flex items-center justify-center relative">
              {selectedItem.type === 'screenshot' ? (
                <img
                  src={selectedItem.url}
                  alt={selectedItem.caption || 'Full Preview'}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <video
                  src={selectedItem.url}
                  className="w-full h-full max-h-full object-contain"
                  controls
                  autoPlay
                  loop
                />
              )}
            </div>

            {/* Modal Footer / Details */}
            <div className="px-6 py-4 bg-zinc-950/50 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                {selectedItem.caption ? (
                  <p className="text-sm text-zinc-200 italic">"{selectedItem.caption}"</p>
                ) : (
                  <p className="text-xs text-zinc-500">Aucune description pour cette capture.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleCopyLink(e, selectedItem)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedId === selectedItem.id ? 'Copié !' : 'Copier le lien'}</span>
                </button>
                <a
                  href={selectedItem.url}
                  download={`funnystation-${selectedItem.type}-${selectedItem.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

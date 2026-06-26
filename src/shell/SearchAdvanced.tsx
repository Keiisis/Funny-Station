'use client';

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Star, HelpCircle, Gamepad2, Layers, DollarSign, X } from 'lucide-react';
import { Game, GameLanguage } from '@/types';
import { supabase } from '@/utils/supabase/client';

interface SearchAdvancedProps {
  games: Game[];
  onFilterChange: (filteredGames: Game[]) => void;
  className?: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export const SearchAdvanced: React.FC<SearchAdvancedProps> = ({
  games,
  onFilterChange,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRuntime, setSelectedRuntime] = useState<string>('all');
  const [selectedPrice, setSelectedPrice] = useState<string>('all'); // all, free, paid
  const [selectedRating, setSelectedRating] = useState<number>(0); // 0, 3, 4
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('popular'); // popular, new, rating, alpha
  const [tags, setTags] = useState<Tag[]>([]);
  const [gameTagMaps, setGameTagMaps] = useState<Record<string, string[]>>({}); // gameId -> tagIds[]
  const [showFilters, setShowFilters] = useState(false);

  // Fetch tags and maps
  useEffect(() => {
    const loadTagsData = async () => {
      try {
        const { data: tagsData } = await supabase
          .from('game_tags')
          .select('*');
        if (tagsData) setTags(tagsData);

        const { data: mapData } = await supabase
          .from('game_tag_map')
          .select('game_id, tag_id');

        if (mapData) {
          const mapping: Record<string, string[]> = {};
          mapData.forEach((item: any) => {
            if (!mapping[item.game_id]) {
              mapping[item.game_id] = [];
            }
            mapping[item.game_id].push(item.tag_id);
          });
          setGameTagMaps(mapping);
        }
      } catch (err) {
        console.error('Error loading tags/filters info:', err);
      }
    };

    loadTagsData();
  }, []);

  // Filter and sort logic
  useEffect(() => {
    let result = [...games];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        g =>
          g.title.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          g.slug.toLowerCase().includes(q)
      );
    }

    // Runtime
    if (selectedRuntime !== 'all') {
      result = result.filter(g => g.runtime === selectedRuntime);
    }

    // Price
    if (selectedPrice !== 'all') {
      if (selectedPrice === 'free') {
        result = result.filter(g => !g.price || g.price === 0);
      } else if (selectedPrice === 'paid') {
        result = result.filter(g => g.price && g.price > 0);
      }
    }

    // Rating
    if (selectedRating > 0) {
      result = result.filter(g => (g.rating || 0) >= selectedRating);
    }

    // Tags
    if (selectedTags.length > 0) {
      result = result.filter(g => {
        const gameTags = gameTagMaps[g.id] || [];
        return selectedTags.every(tId => gameTags.includes(tId));
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.play_count || 0) - (a.play_count || 0);
      } else if (sortBy === 'new') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    onFilterChange(result);
  }, [
    searchTerm,
    selectedRuntime,
    selectedPrice,
    selectedRating,
    selectedTags,
    sortBy,
    games,
    gameTagMaps
  ]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRuntime('all');
    setSelectedPrice('all');
    setSelectedRating(0);
    setSelectedTags([]);
    setSortBy('popular');
  };

  const activeFiltersCount =
    (selectedRuntime !== 'all' ? 1 : 0) +
    (selectedPrice !== 'all' ? 1 : 0) +
    (selectedRating > 0 ? 1 : 0) +
    selectedTags.length;

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher un jeu (ex: Street Fighter, Celeste...)"
            className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:bg-white/10 focus:ring-1 focus:ring-blue-500 text-white rounded-xl pl-12 pr-4 py-3 outline-none transition-all placeholder-zinc-500 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
            showFilters || activeFiltersCount > 0
              ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtres</span>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Runtime Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" /> Platform / Runtime
              </label>
              <select
                value={selectedRuntime}
                onChange={e => setSelectedRuntime(e.target.value)}
                className="bg-zinc-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Toutes les plateformes</option>
                <option value="gba">Game Boy Advance (GBA)</option>
                <option value="psp">PlayStation Portable (PSP)</option>
                <option value="nes">Nintendo (NES)</option>
                <option value="snes">Super Nintendo (SNES)</option>
                <option value="js">JavaScript (HTML5)</option>
                <option value="wasm">WebAssembly (WASM)</option>
                <option value="python">Python</option>
                <option value="lua">Lua</option>
                <option value="java">Java</option>
                <option value="android">Android</option>
              </select>
            </div>

            {/* Price Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Tarif
              </label>
              <select
                value={selectedPrice}
                onChange={e => setSelectedPrice(e.target.value)}
                className="bg-zinc-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Tous les prix</option>
                <option value="free">Gratuit</option>
                <option value="paid">Payant (FunnyCoins)</option>
              </select>
            </div>

            {/* Note/Rating Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" /> Note minimum
              </label>
              <div className="flex gap-1 bg-zinc-800/80 border border-white/10 rounded-xl p-1 justify-around">
                {[0, 3, 4, 4.5].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setSelectedRating(stars)}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedRating === stars
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    {stars === 0 ? 'Toutes' : `${stars} ★+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Trier par
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-zinc-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="popular">Popularité (Joués)</option>
                <option value="new">Nouveautés</option>
                <option value="rating">Mieux notés</option>
                <option value="alpha">Ordre alphabétique</option>
              </select>
            </div>
          </div>

          {/* Tags / Categories Filter */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Catégories & Tags</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        backgroundColor: isSelected ? `${tag.color}33` : 'rgba(255,255,255,0.03)',
                        borderColor: isSelected ? tag.color : 'rgba(255,255,255,0.1)'
                      }}
                      className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className={isSelected ? 'text-white' : 'text-zinc-400'}>
                        {tag.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clean / Reset filters */}
          <div className="flex justify-end border-t border-white/5 pt-4">
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-all"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

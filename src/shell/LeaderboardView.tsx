'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award, Users, Calendar, Globe, ChevronDown } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';
import { fetchLeaderboard, fetchPlayerRank } from '@/lib/leaderboard';
import type { LeaderboardEntry, LeaderboardPeriod, Game, ProfileData } from '@/types';

interface LeaderboardViewProps {
  profile: ProfileData;
  games: Game[];
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ profile, games, isOpen, onClose }) => {
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<{ rank: number; score: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);

  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      setSelectedGame(games[0].id);
    }
  }, [games]);

  useEffect(() => {
    if (!selectedGame || !isOpen) return;
    loadLeaderboard();
  }, [selectedGame, period, isOpen]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const [lb, rank] = await Promise.all([
        fetchLeaderboard(selectedGame, period, 50),
        fetchPlayerRank(profile.id, selectedGame, period),
      ]);
      setEntries(lb);
      setPlayerRank(rank);
    } catch (e) {
      console.error('[Leaderboard] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedGameObj = games.find(g => g.id === selectedGame);
  const PODIUM_STYLES = [
    { bg: 'from-yellow-500/30 to-amber-600/20', text: 'text-yellow-400', icon: <Crown size={18} /> },
    { bg: 'from-zinc-300/20 to-zinc-400/10', text: 'text-zinc-300', icon: <Medal size={18} /> },
    { bg: 'from-amber-700/20 to-orange-800/10', text: 'text-amber-600', icon: <Award size={18} /> },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-lg h-[85vh] bg-zinc-900/95 border border-zinc-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Trophy size={20} className="text-yellow-400" />
              <h2 className="text-lg font-black text-white">Classement</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl cursor-pointer">
              <span className="text-zinc-400 text-lg">✕</span>
            </button>
          </div>

          {/* Game picker */}
          <div className="relative mb-3">
            <button
              onClick={() => setShowGamePicker(!showGamePicker)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-sm text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <span>{selectedGameObj?.title || 'Sélectionner un jeu'}</span>
              <ChevronDown size={16} className={`transition-transform ${showGamePicker ? 'rotate-180' : ''}`} />
            </button>
            {showGamePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-zinc-800 border border-zinc-700/50 rounded-xl shadow-xl z-10">
                {games.map(g => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGame(g.id); setShowGamePicker(false); AudioEngine.getInstance().playSFX('navigate'); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700/50 transition-colors cursor-pointer ${
                      g.id === selectedGame ? 'text-blue-400 font-bold' : 'text-zinc-300'
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Period tabs */}
          <div className="flex gap-2">
            {([
              { key: 'alltime' as const, label: 'All-time', icon: <Globe size={12} /> },
              { key: 'weekly' as const, label: 'Semaine', icon: <Calendar size={12} /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => { setPeriod(key); AudioEngine.getInstance().playSFX('navigate'); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === key
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/20 hover:text-zinc-300'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Your rank */}
        {playerRank && (
          <div className="mx-4 mt-3 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
            <span className="text-lg font-black text-blue-400">#{playerRank.rank}</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">{profile.username}</p>
              <p className="text-[10px] text-zinc-400">Ton classement</p>
            </div>
            <span className="text-sm font-black text-blue-300">{playerRank.score.toLocaleString()}</span>
          </div>
        )}

        {/* Leaderboard */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Chargement...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Trophy size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold">Pas encore de scores</p>
              <p className="text-xs mt-1">Sois le premier à jouer !</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map((entry, index) => {
                const isPodium = index < 3;
                const isCurrentUser = entry.user_id === profile.id;
                const podiumStyle = isPodium ? PODIUM_STYLES[index] : null;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                      isCurrentUser
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : isPodium
                        ? `bg-gradient-to-r ${podiumStyle?.bg} border border-zinc-700/20`
                        : 'bg-zinc-800/30 border border-zinc-700/10 hover:bg-zinc-800/50'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center font-black text-sm ${podiumStyle?.text || 'text-zinc-500'}`}>
                      {isPodium ? podiumStyle?.icon : `#${index + 1}`}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-xs font-black text-zinc-300">
                      {entry.username?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isCurrentUser ? 'text-blue-300' : 'text-white'}`}>
                        {entry.username || 'Joueur inconnu'}
                      </p>
                    </div>

                    {/* Score */}
                    <span className={`text-sm font-black tabular-nums ${isPodium ? podiumStyle?.text : 'text-zinc-300'}`}>
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

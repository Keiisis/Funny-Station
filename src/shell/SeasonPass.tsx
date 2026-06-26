'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Gift, Lock, CheckCircle, Sparkles, Coins, Flame } from 'lucide-react';
import { fetchCurrentSeason, fetchSeasonRewards, fetchSeasonProgress, claimSeasonReward, getSeasonTimeRemaining } from '@/lib/seasons';
import type { Season, SeasonReward, SeasonProgress } from '@/types';
import { supabase } from '@/utils/supabase/client';
import { AudioEngine } from '@/drivers/AudioEngine';

interface SeasonPassProps {
  userId: string;
  funnyCoins: number;
  onRefreshProfile?: () => void;
}

export const SeasonPass: React.FC<SeasonPassProps> = ({ userId, funnyCoins, onRefreshProfile }) => {
  const [season, setSeason] = useState<Season | null>(null);
  const [rewards, setRewards] = useState<SeasonReward[]>([]);
  const [progress, setProgress] = useState<SeasonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });
  const [buyingPremium, setBuyingPremium] = useState(false);

  const loadSeasonData = async () => {
    try {
      setLoading(true);
      const activeSeason = await fetchCurrentSeason();
      if (activeSeason) {
        setSeason(activeSeason);
        const [rewardsData, progressData] = await Promise.all([
          fetchSeasonRewards(activeSeason.id),
          fetchSeasonProgress(userId, activeSeason.id)
        ]);
        setRewards(rewardsData);
        setProgress(progressData);

        // Set initial timer
        setTimeRemaining(getSeasonTimeRemaining(activeSeason.ends_at));
      }
    } catch (e) {
      console.error('[SeasonPass] Error loading:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeasonData();
  }, [userId]);

  // Update timer every minute
  useEffect(() => {
    if (!season) return;
    const interval = setInterval(() => {
      setTimeRemaining(getSeasonTimeRemaining(season.ends_at));
    }, 60000);
    return () => clearInterval(interval);
  }, [season]);

  const handleClaim = async (reward: SeasonReward) => {
    if (!season || !progress) return;
    try {
      AudioEngine.getInstance().playSFX('select');
      await claimSeasonReward(season.id, reward.id);
      
      // Update progress locally
      setProgress(prev => {
        if (!prev) return null;
        return {
          ...prev,
          claimed_rewards: [...prev.claimed_rewards, reward.id]
        };
      });

      if (onRefreshProfile) {
        onRefreshProfile();
      }
    } catch (err: any) {
      console.error('[SeasonPass] Claim failed:', err);
      alert(err.message || 'Impossible de récupérer la récompense');
    }
  };

  const handleBuyPremium = async () => {
    if (!season || !progress) return;
    if (funnyCoins < 500) {
      alert('Pas assez de FunnyCoins ! Le Pass Premium coûte 500 FunnyCoins.');
      return;
    }

    try {
      setBuyingPremium(true);
      AudioEngine.getInstance().playSFX('select');

      // Deduct coins from profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ funny_coins: funnyCoins - 500 })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update season progress
      const { error: progressError } = await supabase
        .from('season_progress')
        .update({ is_premium: true })
        .eq('user_id', userId)
        .eq('season_id', season.id);

      if (progressError) throw progressError;

      setProgress(prev => prev ? { ...prev, is_premium: true } : null);
      if (onRefreshProfile) onRefreshProfile();

      alert('Félicitations ! Vous avez activé le Pass Premium.');
    } catch (e) {
      console.error('[SeasonPass] Buying premium error:', e);
      alert('Une erreur est survenue lors de l\'achat.');
    } finally {
      setBuyingPremium(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" />
        <span className="text-xs">Chargement du Season Pass...</span>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500 border border-dashed border-white/5 rounded-2xl gap-4">
        <Trophy className="w-10 h-10 text-zinc-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-300">Aucune saison active</p>
          <p className="text-xs text-zinc-500 mt-1">Revenez plus tard pour la prochaine saison !</p>
        </div>
      </div>
    );
  }

  const currentTier = progress?.tier_reached || 0;
  const currentXP = progress?.xp ? Number(progress.xp) : 0;
  const xpInCurrentTier = currentXP % 1000;
  const progressPercent = (xpInCurrentTier / 1000) * 100;

  // Mock standard tiers if database season_rewards is empty
  const defaultRewards: SeasonReward[] = rewards.length > 0 ? rewards : [
    { id: '1-free', season_id: season.id, tier: 1, name: '100 FunnyCoins', description: 'Bonus de bienvenue', reward_type: 'coins', reward_value: 100, is_premium: false },
    { id: '1-prem', season_id: season.id, tier: 1, name: 'Cadre Néon Violet', description: 'Cadre exclusif de profil', reward_type: 'cosmetic', reward_value: 0, is_premium: true },
    { id: '2-free', season_id: season.id, tier: 2, name: 'Trophée Débutant', description: 'Badge spécial de saison', reward_type: 'badge', reward_value: 0, is_premium: false },
    { id: '2-prem', season_id: season.id, tier: 2, name: '300 FunnyCoins', description: 'Bonus Premium', reward_type: 'coins', reward_value: 300, is_premium: true },
    { id: '3-free', season_id: season.id, tier: 3, name: '150 FunnyCoins', description: 'Bonus', reward_type: 'coins', reward_value: 150, is_premium: false },
    { id: '3-prem', season_id: season.id, tier: 3, name: 'Titre "Néon Rider"', description: 'Titre de profil légendaire', reward_type: 'cosmetic', reward_value: 0, is_premium: true },
    { id: '4-free', season_id: season.id, tier: 4, name: '200 FunnyCoins', description: 'Récompense', reward_type: 'coins', reward_value: 200, is_premium: false },
    { id: '4-prem', season_id: season.id, tier: 4, name: '500 FunnyCoins', description: 'Super Jackpot', reward_type: 'coins', reward_value: 500, is_premium: true },
  ];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-zinc-900 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider">
              Saison Active
            </span>
            <span className="text-zinc-400 text-xs flex items-center gap-1">
              • Fin dans : {timeRemaining.days}j {timeRemaining.hours}h {timeRemaining.minutes}m
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400" /> {season.name}
          </h2>
          <p className="text-sm text-zinc-300 max-w-xl">{season.description}</p>
        </div>

        {/* Premium Upgrade Button */}
        <div className="relative shrink-0 flex flex-col gap-2 bg-zinc-950/40 backdrop-blur-md border border-white/5 p-4 rounded-xl text-center sm:text-left">
          {progress?.is_premium ? (
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Crown className="w-4 h-4 fill-amber-400" /> Pass Premium Actif
            </div>
          ) : (
            <>
              <div className="text-xs text-zinc-400">Débloquez la piste Premium pour <span className="text-amber-400 font-bold">500 FC</span></div>
              <button
                onClick={handleBuyPremium}
                disabled={buyingPremium}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-zinc-950 font-black rounded-lg text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-yellow-500/10"
              >
                {buyingPremium ? 'Achat...' : 'Acheter le Pass Premium'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress & XP tracker */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex flex-col items-center justify-center text-purple-400">
            <span className="text-[10px] font-bold uppercase opacity-60">Palier</span>
            <span className="text-lg font-black leading-none">{currentTier}</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Progression de la saison</div>
            <div className="text-xs text-zinc-400 mt-0.5">{currentXP} XP de saison au total</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-md">
          <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
            <span>XP du Palier : {xpInCurrentTier} / 1000 XP</span>
            <span>Palier {currentTier + 1}</span>
          </div>
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tiers List */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <Gift className="w-4 h-4" /> Récompenses par Paliers
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {defaultRewards.map((reward) => {
            const isClaimed = progress?.claimed_rewards.includes(reward.id);
            const isUnlocked = currentTier >= reward.tier;
            const canClaim = isUnlocked && !isClaimed && (!reward.is_premium || progress?.is_premium);

            return (
              <div
                key={reward.id}
                className={`relative rounded-xl border p-4 flex flex-col justify-between min-h-[160px] transition-all overflow-hidden ${
                  reward.is_premium
                    ? progress?.is_premium
                      ? 'bg-gradient-to-b from-amber-950/20 to-zinc-900 border-amber-500/20 hover:border-amber-500/40'
                      : 'bg-zinc-900/60 border-zinc-800 opacity-60'
                    : 'bg-zinc-900/80 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Premium / Free Ribbon */}
                <div className="absolute top-2 right-2">
                  {reward.is_premium ? (
                    <span className="flex items-center gap-1 bg-amber-500 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                      <Crown className="w-2.5 h-2.5 fill-zinc-950" /> Premium
                    </span>
                  ) : (
                    <span className="bg-zinc-700 text-zinc-300 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                      Gratuit
                    </span>
                  )}
                </div>

                {/* Tier Circle */}
                <div className="text-[10px] text-zinc-500 font-bold uppercase">
                  Palier {reward.tier}
                </div>

                {/* Reward Info */}
                <div className="my-3 flex items-start gap-2.5">
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    reward.is_premium ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-600/10 text-blue-400'
                  }`}>
                    {reward.reward_type === 'coins' ? (
                      <Coins className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{reward.name}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{reward.description}</p>
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-2">
                  {isClaimed ? (
                    <div className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-green-400 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                      <CheckCircle className="w-3 h-3" /> Réclamé
                    </div>
                  ) : canClaim ? (
                    <button
                      onClick={() => handleClaim(reward)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                        reward.is_premium
                          ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-md hover:shadow-amber-500/10'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-blue-600/10'
                      }`}
                    >
                      Réclamer
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-zinc-500 py-1.5 bg-zinc-950/40 rounded-lg border border-white/5">
                      <Lock className="w-3 h-3" /> Verrouillé
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

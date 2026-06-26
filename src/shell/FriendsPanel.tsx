'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Search, Check, X, Clock, Gamepad2, MessageCircle, UserX, Globe } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';
import { fetchFriends, fetchPendingRequests, sendFriendRequest, acceptFriend, removeFriend, searchUsers } from '@/lib/social';
import type { FriendWithProfile, ProfileData } from '@/types';

interface FriendsPanelProps {
  profile: ProfileData;
  isOpen: boolean;
  onClose: () => void;
  onInviteFriend?: (friendId: string) => void;
  onOpenChat?: (friendId: string, friendUsername: string) => void;
}

export const FriendsPanel: React.FC<FriendsPanelProps> = ({ profile, isOpen, onClose, onInviteFriend, onOpenChat }) => {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pending, setPending] = useState<FriendWithProfile[]>([]);
  const [tab, setTab] = useState<'friends' | 'pending' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar_url?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen, profile.id]);

  const loadData = async () => {
    try {
      const [f, p] = await Promise.all([
        fetchFriends(profile.id),
        fetchPendingRequests(profile.id),
      ]);
      setFriends(f);
      setPending(p);
    } catch (e) {
      console.error('[FriendsPanel] Error loading:', e);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await searchUsers(searchQuery.trim(), profile.id);
      setSearchResults(results);
    } catch (e) {
      console.error('[FriendsPanel] Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'search' && searchQuery.length >= 2) {
      const debounce = setTimeout(handleSearch, 400);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, tab]);

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      AudioEngine.getInstance().playSFX('select');
      setActionMsg('Demande envoyée !');
      setTimeout(() => setActionMsg(''), 2000);
    } catch (e: any) {
      setActionMsg(e.message || 'Erreur');
      setTimeout(() => setActionMsg(''), 2000);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await acceptFriend(friendshipId);
      AudioEngine.getInstance().playSFX('select');
      loadData();
    } catch (e) {
      console.error('[FriendsPanel] Accept error:', e);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    try {
      await removeFriend(friendshipId);
      AudioEngine.getInstance().playSFX('select');
      loadData();
    } catch (e) {
      console.error('[FriendsPanel] Remove error:', e);
    }
  };

  if (!isOpen) return null;

  const onlineFriends = friends.filter(f => f.online_status);
  const offlineFriends = friends.filter(f => !f.online_status);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-md h-[80vh] bg-zinc-900/95 border border-zinc-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-blue-400" />
            <h2 className="text-lg font-black text-white">Amis</h2>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              {onlineFriends.length} en ligne
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800/60">
          {[
            { key: 'friends' as const, label: `Amis (${friends.length})`, icon: Users },
            { key: 'pending' as const, label: `Demandes (${pending.length})`, icon: Clock },
            { key: 'search' as const, label: 'Ajouter', icon: UserPlus },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); AudioEngine.getInstance().playSFX('navigate'); }}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === key
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Action message */}
        {actionMsg && (
          <div className="mx-4 mt-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold text-center">
            {actionMsg}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {tab === 'friends' && (
            <>
              {onlineFriends.length > 0 && (
                <div className="mb-3">
                  <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold px-2">En ligne</span>
                  {onlineFriends.map((f) => (
                    <FriendRow key={f.friendship_id} friend={f} isOnline onRemove={() => handleRemove(f.friendship_id)} onInvite={onInviteFriend} onChat={onOpenChat} />
                  ))}
                </div>
              )}
              {offlineFriends.length > 0 && (
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold px-2">Hors ligne</span>
                  {offlineFriends.map((f) => (
                    <FriendRow key={f.friendship_id} friend={f} isOnline={false} onRemove={() => handleRemove(f.friendship_id)} onInvite={onInviteFriend} onChat={onOpenChat} />
                  ))}
                </div>
              )}
              {friends.length === 0 && (
                <div className="text-center text-zinc-500 text-sm py-12">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Pas encore d'amis</p>
                  <p className="text-xs mt-1">Utilise l'onglet "Ajouter" pour en trouver !</p>
                </div>
              )}
            </>
          )}

          {tab === 'pending' && (
            <>
              {pending.map((p) => (
                <div key={p.friendship_id} className="flex items-center gap-3 p-3 bg-zinc-800/40 rounded-2xl border border-zinc-700/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center text-sm font-black text-amber-400">
                    {p.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{p.username}</p>
                    <p className="text-[10px] text-zinc-500">Veut devenir ton ami</p>
                  </div>
                  <button onClick={() => handleAccept(p.friendship_id)} className="p-2 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-xl transition-colors cursor-pointer">
                    <Check size={16} className="text-emerald-400" />
                  </button>
                  <button onClick={() => handleRemove(p.friendship_id)} className="p-2 bg-red-500/15 hover:bg-red-500/25 rounded-xl transition-colors cursor-pointer">
                    <X size={16} className="text-red-400" />
                  </button>
                </div>
              ))}
              {pending.length === 0 && (
                <div className="text-center text-zinc-500 text-sm py-12">
                  <Clock size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Aucune demande en attente</p>
                </div>
              )}
            </>
          )}

          {tab === 'search' && (
            <>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un joueur..."
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              {loading && <p className="text-center text-zinc-500 text-xs py-4">Recherche...</p>}
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-zinc-800/40 rounded-2xl border border-zinc-700/30">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center text-sm font-black text-blue-400">
                    {user.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{user.username}</p>
                  </div>
                  <button
                    onClick={() => handleSendRequest(user.id)}
                    className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 rounded-xl text-[10px] font-bold text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus size={12} /> Ajouter
                  </button>
                </div>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
                <p className="text-center text-zinc-500 text-xs py-4">Aucun joueur trouvé</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component
const FriendRow: React.FC<{
  friend: FriendWithProfile;
  isOnline: boolean;
  onRemove: () => void;
  onInvite?: (friendId: string) => void;
  onChat?: (friendId: string, friendUsername: string) => void;
}> = ({ friend, isOnline, onRemove, onInvite, onChat }) => (
  <div className="flex items-center gap-3 p-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-2xl border border-zinc-700/20 transition-all group">
    <div className="relative">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-sm font-black text-blue-300">
        {friend.username[0]?.toUpperCase()}
      </div>
      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-white truncate">{friend.username}</p>
      {isOnline && friend.current_game_title && (
        <p className="text-[10px] text-emerald-400 flex items-center gap-1 truncate">
          <Gamepad2 size={10} /> {friend.current_game_title}
        </p>
      )}
      {friend.level && (
        <p className="text-[9px] text-zinc-500">Nv. {friend.level} · {friend.title}</p>
      )}
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {onChat && (
        <button onClick={() => onChat(friend.friend_id, friend.username)} className="p-1.5 hover:bg-zinc-700 rounded-lg cursor-pointer" title="Message">
          <MessageCircle size={14} className="text-blue-400" />
        </button>
      )}
      {onInvite && isOnline && (
        <button onClick={() => onInvite(friend.friend_id)} className="p-1.5 hover:bg-zinc-700 rounded-lg cursor-pointer" title="Inviter">
          <Globe size={14} className="text-emerald-400" />
        </button>
      )}
      <button onClick={onRemove} className="p-1.5 hover:bg-zinc-700 rounded-lg cursor-pointer" title="Retirer">
        <UserX size={14} className="text-red-400" />
      </button>
    </div>
  </div>
);

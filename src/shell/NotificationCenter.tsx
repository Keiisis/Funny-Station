'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Users, Trophy, Gamepad2, Gift, TrendingUp, MessageCircle, Star } from 'lucide-react';
import { AudioEngine } from '@/drivers/AudioEngine';
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllRead, clearAllNotifications, subscribeToNotifications } from '@/lib/notifications';
import type { Notification, NotificationType } from '@/types';

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onNotificationCountChange?: (count: number) => void;
}

const NOTIF_ICONS: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  friend_request: { icon: <Users size={16} />, color: 'text-blue-400 bg-blue-500/15' },
  friend_accepted: { icon: <Check size={16} />, color: 'text-emerald-400 bg-emerald-500/15' },
  room_invite: { icon: <Gamepad2 size={16} />, color: 'text-purple-400 bg-purple-500/15' },
  trophy_unlocked: { icon: <Trophy size={16} />, color: 'text-yellow-400 bg-yellow-500/15' },
  new_game: { icon: <Star size={16} />, color: 'text-cyan-400 bg-cyan-500/15' },
  message: { icon: <MessageCircle size={16} />, color: 'text-pink-400 bg-pink-500/15' },
  daily_reward: { icon: <Gift size={16} />, color: 'text-amber-400 bg-amber-500/15' },
  level_up: { icon: <TrendingUp size={16} />, color: 'text-green-400 bg-green-500/15' },
  season_reward: { icon: <Star size={16} />, color: 'text-orange-400 bg-orange-500/15' },
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId, isOpen, onClose, onNotificationCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load + subscribe
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const [notifs, count] = await Promise.all([
          fetchNotifications(userId),
          fetchUnreadCount(userId),
        ]);
        setNotifications(notifs);
        setUnreadCount(count);
        onNotificationCountChange?.(count);
      } catch (e) {
        console.error('[NotifCenter] Load error:', e);
      }
    };

    load();

    // Realtime
    const unsub = subscribeToNotifications(userId, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => {
        const next = prev + 1;
        onNotificationCountChange?.(next);
        return next;
      });
      AudioEngine.getInstance().playSFX('select');
    });

    return unsub;
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => {
      const next = Math.max(0, prev - 1);
      onNotificationCountChange?.(next);
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    await markAllRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    onNotificationCountChange?.(0);
    AudioEngine.getInstance().playSFX('select');
  };

  const handleClearAll = async () => {
    await clearAllNotifications(userId);
    setNotifications([]);
    setUnreadCount(0);
    onNotificationCountChange?.(0);
    AudioEngine.getInstance().playSFX('select');
  };

  const timeAgo = (date: string): string => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `il y a ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${Math.floor(hours / 24)}j`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-end pt-16 pr-4" onClick={onClose}>
      <div
        className="w-96 max-h-[80vh] bg-zinc-900/95 border border-zinc-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-400" />
            <h3 className="text-sm font-black text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="p-1.5 hover:bg-zinc-800 rounded-lg cursor-pointer" title="Tout lire">
                <CheckCheck size={14} className="text-blue-400" />
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={handleClearAll} className="p-1.5 hover:bg-zinc-800 rounded-lg cursor-pointer" title="Tout effacer">
                <Trash2 size={14} className="text-zinc-500" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg cursor-pointer">
              <X size={14} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Bell size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold">Aucune notification</p>
              <p className="text-xs mt-1">Tu seras notifié ici de l'activité importante.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const iconData = NOTIF_ICONS[notif.type] || NOTIF_ICONS['new_game'];
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                  className={`flex items-start gap-3 px-5 py-3 border-b border-zinc-800/30 transition-all cursor-pointer hover:bg-zinc-800/30 ${
                    !notif.is_read ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconData.color}`}>
                    {iconData.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${notif.is_read ? 'text-zinc-400' : 'text-white'}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{notif.body}</p>
                    )}
                    <p className="text-[9px] text-zinc-600 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/** Badge à placer dans la TopBar. */
export const NotificationBadge: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => (
  <button
    onClick={() => { onClick(); AudioEngine.getInstance().playSFX('select'); }}
    className="relative p-2 hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer"
    title="Notifications"
  >
    <Bell size={18} className={count > 0 ? 'text-blue-400' : 'text-zinc-500'} />
    {count > 0 && (
      <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-red-500 text-white px-1 py-0 rounded-full font-bold min-w-[14px] text-center leading-[14px] animate-pulse">
        {count > 99 ? '99+' : count}
      </span>
    )}
  </button>
);

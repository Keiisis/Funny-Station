'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Smile } from 'lucide-react';
import { sendMessage, fetchMessages, subscribeToChat } from '@/lib/chat';
import type { ChatMessage, ProfileData } from '@/types';

interface ChatPanelProps {
  profile: ProfileData;
  channelType: 'room' | 'private' | 'global';
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const QUICK_EMOJIS = ['😂', '❤️', 'GG', '💀', '🔥', '😎', '👀', '🎉'];

export const ChatPanel: React.FC<ChatPanelProps> = ({ profile, channelType, channelId, isOpen, onClose, title }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !channelId) return;

    fetchMessages(channelType, channelId, 100)
      .then(setMessages)
      .catch(console.error);

    const unsub = subscribeToChat(channelType, channelId, (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return unsub;
  }, [isOpen, channelId, channelType]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendMessage(channelType, channelId, text);
    } catch (e) {
      console.error('[Chat] Send error:', e);
      setInput(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[55] w-80 h-96 bg-zinc-900/95 border border-zinc-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-800/30">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-blue-400" />
          <span className="text-xs font-bold text-white">{title || 'Chat'}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-lg cursor-pointer">
          <X size={14} className="text-zinc-400" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-zinc-600 text-[10px] py-8">Aucun message. Commence la conversation !</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === profile.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                {!isMe && (
                  <span className="text-[9px] text-zinc-500 font-bold ml-1">{msg.sender_username || '?'}</span>
                )}
                <div className={`px-3 py-1.5 rounded-2xl text-xs ${
                  isMe
                    ? 'bg-blue-500/20 text-blue-100 rounded-br-md'
                    : 'bg-zinc-800/60 text-zinc-200 rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[8px] text-zinc-600 ml-1">
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick emojis */}
      <div className="flex gap-1 px-3 py-1 border-t border-zinc-800/30">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setInput(prev => prev + emoji)}
            className="px-1.5 py-0.5 text-xs hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-zinc-800/40 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Écrire un message..."
          className="flex-1 px-3 py-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
          maxLength={500}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-colors cursor-pointer disabled:opacity-30"
        >
          <Send size={14} className="text-blue-400" />
        </button>
      </div>
    </div>
  );
};

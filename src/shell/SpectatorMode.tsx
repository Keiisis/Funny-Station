'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye, Tv, Users, Send, ShieldAlert, ArrowLeft } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import type { GameState, OnlinePlayer } from '@/types';
import { AudioEngine } from '@/drivers/AudioEngine';

interface SpectatorModeProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  onClose: () => void;
}

interface ChatMessage {
  username: string;
  content: string;
  timestamp: string;
}

export const SpectatorMode: React.FC<SpectatorModeProps> = ({
  userId,
  username,
  avatarUrl,
  onClose
}) => {
  const [roomCode, setRoomCode] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);

  const channelRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Render game loop from gameState
  useEffect(() => {
    if (!gameState || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw space background grid
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const frameOffset = (gameState.frame || 0) % gridSize;
    
    for (let x = -frameOffset; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw obstacles
    if (gameState.obstacles) {
      gameState.obstacles.forEach((obs) => {
        ctx.fillStyle = obs.color || '#ef4444';
        ctx.shadowColor = obs.color || '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.size || 15, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0; // reset shadow
    }

    // Draw players
    if (gameState.players) {
      gameState.players.forEach((player) => {
        if (!player.alive) return;
        
        ctx.fillStyle = player.color || '#3b82f6';
        ctx.shadowColor = player.color || '#3b82f6';
        ctx.shadowBlur = 15;

        // Draw small spaceship shape
        ctx.beginPath();
        ctx.moveTo(player.x + 20, player.y);
        ctx.lineTo(player.x - 15, player.y - 15);
        ctx.lineTo(player.x - 5, player.y);
        ctx.lineTo(player.x - 15, player.y + 15);
        ctx.closePath();
        ctx.fill();

        // Engine flame
        if ((gameState.frame || 0) % 2 === 0) {
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#f97316';
          ctx.beginPath();
          ctx.moveTo(player.x - 10, player.y - 5);
          ctx.lineTo(player.x - 25, player.y);
          ctx.lineTo(player.x - 10, player.y + 5);
          ctx.closePath();
          ctx.fill();
        }

        ctx.shadowBlur = 0; // reset shadow

        // Draw nickname / label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.label || 'Player', player.x, player.y - 20);
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(`Score: ${player.score || 0}`, player.x, player.y + 25);
      });
    }

    // Draw HUD
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SPECTATEUR ACTIF`, 15, 25);
    ctx.fillText(`FRAME: ${gameState.frame || 0}`, 15, 45);

    // If game over
    if (gameState.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'black 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FIN DE LA PARTIE', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('En attente du prochain round...', canvas.width / 2, canvas.height / 2 + 25);
    }
  }, [gameState]);

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setErrorMsg('Veuillez entrer un code de salon');
      return;
    }

    const code = roomCode.toUpperCase().trim();
    setErrorMsg('');

    try {
      console.log(`[Spectator] Connexion à game-room:${code}`);
      
      const channel = supabase.channel(`game-room:${code}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: userId }
        }
      });

      channelRef.current = channel;

      // Handle presence sync to find players and spectators
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activePlayers: OnlinePlayer[] = [];
        let specs = 0;

        Object.entries(state).forEach(([_key, presences]: [string, any]) => {
          presences.forEach((p: any) => {
            if (p.role === 'player') {
              activePlayers.push({
                userId: p.userId,
                username: p.username,
                playerNumber: p.playerNumber ?? -1,
                isHost: p.isHost ?? false
              });
            } else if (p.role === 'spectator') {
              specs++;
            }
          });
        });

        setPlayers(activePlayers);
        setSpectatorCount(specs);
      });

      // Listen for Game State broadcast
      channel.on('broadcast', { event: 'game_state' }, ({ payload }: any) => {
        if (payload?.state) {
          setGameState(payload.state);
        }
      });

      // Listen for chat messages
      channel.on('broadcast', { event: 'chat_msg' }, ({ payload }: any) => {
        if (payload) {
          setChatMessages(prev => [...prev, {
            username: payload.username,
            content: payload.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      });

      // Connect / Subscribe
      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          // Track as spectator
          await channel.track({
            userId,
            username,
            role: 'spectator',
            online_at: new Date().toISOString()
          });

          AudioEngine.getInstance().playSFX('select');
          setIsJoined(true);
        } else {
          setErrorMsg('Impossible de rejoindre le salon. Vérifiez le code.');
        }
      });

    } catch (err) {
      console.error(err);
      setErrorMsg('Erreur lors de la connexion.');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_msg',
      payload: {
        username,
        content: newMsg.trim()
      }
    });

    setChatMessages(prev => [...prev, {
      username: 'Moi',
      content: newMsg.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setNewMsg('');
    AudioEngine.getInstance().playSFX('navigate', 0.1);
  };

  const handleLeave = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    setGameState(null);
    setIsJoined(false);
    setChatMessages([]);
    setPlayers([]);
    setSpectatorCount(0);
    AudioEngine.getInstance().playSFX('select');
  };

  return (
    <div className="w-full h-full flex flex-col min-h-[450px]">
      {!isJoined ? (
        // Entry Screen
        <div className="max-w-md mx-auto w-full flex flex-col justify-center items-center py-16 px-6 gap-6 bg-zinc-900/60 border border-white/5 rounded-2xl backdrop-blur-md">
          <div className="p-4 bg-purple-600/10 rounded-full border border-purple-500/20 text-purple-400">
            <Tv className="w-10 h-10" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white">Mode Spectateur</h2>
            <p className="text-xs text-zinc-400 mt-1">Rejoignez la partie en cours d'un ami pour le regarder jouer en temps réel</p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Code du salon</label>
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              placeholder="Ex: NEON-X7K2"
              className="w-full bg-zinc-950 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-center font-black tracking-widest text-white text-lg outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
              maxLength={12}
            />
            {errorMsg && (
              <span className="text-xs text-red-400 flex items-center gap-1 mt-1 justify-center">
                <ShieldAlert className="w-3.5 h-3.5" /> {errorMsg}
              </span>
            )}
          </div>

          <div className="w-full flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-zinc-300 rounded-xl text-xs font-bold transition-all"
            >
              Retour
            </button>
            <button
              onClick={handleJoin}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/10"
            >
              Rejoindre
            </button>
          </div>
        </div>
      ) : (
        // Spectating Layout (Split-screen: Game view and chat)
        <div className="w-full flex flex-col lg:flex-row border border-white/10 bg-zinc-950 rounded-2xl overflow-hidden min-h-[500px]">
          {/* Main game display */}
          <div className="flex-1 flex flex-col bg-zinc-950 relative">
            {/* Topbar info */}
            <div className="flex justify-between items-center px-4 py-3 bg-zinc-900 border-b border-white/5">
              <button
                onClick={handleLeave}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Quitter
              </button>
              <div className="flex items-center gap-4 text-xs font-semibold text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" /> {players.length} Joueurs
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-400" /> {spectatorCount} Spectateurs
                </span>
              </div>
            </div>

            {/* Game Canvas Container */}
            <div className="flex-1 flex items-center justify-center p-4 bg-black min-h-[300px]">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="max-w-full max-h-full aspect-video bg-[#09090b] rounded-lg border border-white/5"
              />
              {!gameState && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-purple-500 animate-spin" />
                  <span className="text-xs text-zinc-400 font-medium">Attente du flux vidéo du jeu...</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Spectator Chat */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col bg-zinc-900">
            <div className="px-4 py-3 bg-zinc-900 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Spectator Chat
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-h-[300px] lg:max-h-none min-h-[150px]">
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                  Aucun message. Dites salut !
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-baseline">
                      <span className={`text-[10px] font-extrabold ${msg.username === 'Moi' ? 'text-purple-400' : 'text-blue-400'}`}>
                        {msg.username}
                      </span>
                      <span className="text-[8px] text-zinc-500">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-tight bg-white/5 rounded-lg px-2.5 py-1.5 mt-0.5">
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 bg-zinc-950 flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 bg-zinc-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/10"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

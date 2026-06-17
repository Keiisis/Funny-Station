'use client';

import { supabase } from '@/utils/supabase/client';
import type { OnlinePlayer, OnlineRoom } from '@/types';

// Génère un code de room lisible (ex: NEON-X7K2)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Pas de I, O, 0, 1 pour éviter la confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export type RoomEvent = 
  | { type: 'player_joined'; player: OnlinePlayer }
  | { type: 'player_left'; player: OnlinePlayer }
  | { type: 'game_start'; gameId: string }
  | { type: 'room_closed' };

export class GameRoom {
  private channel: any = null;
  private roomCode: string;
  private hostId: string;
  private gameId: string;
  private localPlayer: OnlinePlayer;
  private players: OnlinePlayer[] = [];
  private isHost: boolean;
  private listeners: ((event: RoomEvent) => void)[] = [];
  private playersChangedListeners: ((players: OnlinePlayer[]) => void)[] = [];

  constructor(config: {
    roomCode: string;
    hostId: string;
    gameId: string;
    localPlayer: OnlinePlayer;
    isHost: boolean;
  }) {
    this.roomCode = config.roomCode;
    this.hostId = config.hostId;
    this.gameId = config.gameId;
    this.localPlayer = config.localPlayer;
    this.isHost = config.isHost;
  }

  static createRoom(hostProfile: { id: string; username: string }, gameId: string): GameRoom {
    const roomCode = generateRoomCode();
    const hostPlayer: OnlinePlayer = {
      userId: hostProfile.id,
      username: hostProfile.username,
      playerNumber: 0,
      isHost: true
    };

    return new GameRoom({
      roomCode,
      hostId: hostProfile.id,
      gameId,
      localPlayer: hostPlayer,
      isHost: true
    });
  }

  static joinRoom(roomCode: string, playerProfile: { id: string; username: string }): GameRoom {
    const player: OnlinePlayer = {
      userId: playerProfile.id,
      username: playerProfile.username,
      playerNumber: -1, // Sera assigné par l'hôte
      isHost: false
    };

    return new GameRoom({
      roomCode: roomCode.toUpperCase().trim(),
      hostId: '', // On ne connaît pas l'hôte encore
      gameId: '',
      localPlayer: player,
      isHost: false
    });
  }

  getRoomCode(): string { return this.roomCode; }
  getPlayers(): OnlinePlayer[] { return this.players; }
  getIsHost(): boolean { return this.isHost; }
  getLocalPlayer(): OnlinePlayer { return this.localPlayer; }
  getGameId(): string { return this.gameId; }

  onEvent(listener: (event: RoomEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onPlayersChanged(listener: (players: OnlinePlayer[]) => void) {
    this.playersChangedListeners.push(listener);
    return () => {
      this.playersChangedListeners = this.playersChangedListeners.filter(l => l !== listener);
    };
  }

  private emit(event: RoomEvent) {
    this.listeners.forEach(l => l(event));
  }

  private emitPlayersChanged() {
    this.playersChangedListeners.forEach(l => l([...this.players]));
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`[GameRoom] Connexion au canal: game-room:${this.roomCode}`);

      this.channel = supabase.channel(`game-room:${this.roomCode}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: this.localPlayer.userId }
        }
      });

      // Écouter les actions de l'hôte (assignation des joueurs, démarrage du jeu)
      this.channel.on('broadcast', { event: 'room_action' }, ({ payload }: any) => {
        if (payload.action === 'player_assignment' && payload.userId === this.localPlayer.userId) {
          this.localPlayer.playerNumber = payload.playerNumber;
          this.gameId = payload.gameId || this.gameId;
          this.hostId = payload.hostId || this.hostId;
          console.log(`[GameRoom] Assigné comme Joueur ${payload.playerNumber + 1}`);
        }
        if (payload.action === 'game_start') {
          this.gameId = payload.gameId;
          this.emit({ type: 'game_start', gameId: payload.gameId });
        }
        if (payload.action === 'room_closed') {
          this.emit({ type: 'room_closed' });
        }
      });

      // Gérer les présences pour la liste des joueurs
      this.channel
        .on('presence', { event: 'sync' }, () => {
          const state = this.channel.presenceState();
          const newPlayers: OnlinePlayer[] = [];

          Object.entries(state).forEach(([_key, presences]: [string, any]) => {
            presences.forEach((p: any) => {
              if (p.role === 'player') {
                newPlayers.push({
                  userId: p.userId,
                  username: p.username,
                  playerNumber: p.playerNumber ?? -1,
                  isHost: p.isHost ?? false
                });
              }
            });
          });

          // Trier par ordre d'arrivée et assigner les numéros si on est l'hôte
          this.players = newPlayers;

          if (this.isHost) {
            this.assignPlayerNumbers();
          }

          this.emitPlayersChanged();
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await this.channel.track({
              userId: this.localPlayer.userId,
              username: this.localPlayer.username,
              isHost: this.isHost,
              playerNumber: this.localPlayer.playerNumber,
              role: 'player',
              online_at: new Date().toISOString()
            });
            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            resolve(false);
          }
        });
    });
  }

  private lastAssignment: Map<string, number> = new Map();

  private assignPlayerNumbers() {
    // L'hôte est toujours joueur 0, les autres sont triés par userId
    // pour un ordre déterministe et stable
    this.players.sort((a, b) => {
      if (a.isHost) return -1;
      if (b.isHost) return 1;
      // Trier les non-hôtes par userId pour un ordre stable
      return a.userId.localeCompare(b.userId);
    });

    let hasChanges = false;
    this.players.forEach((p, idx) => {
      const newNumber = Math.min(idx, 3);
      if (this.lastAssignment.get(p.userId) !== newNumber) {
        hasChanges = true;
      }
      p.playerNumber = newNumber;
    });

    // Ne broadcaster que si les assignations ont changé
    if (!hasChanges) return;

    // Mettre à jour le cache d'assignation
    this.lastAssignment.clear();
    this.players.forEach(p => {
      this.lastAssignment.set(p.userId, p.playerNumber);
    });

    // Envoyer l'assignation à chaque joueur
    this.players.forEach(p => {
      this.channel?.send({
        type: 'broadcast',
        event: 'room_action',
        payload: {
          action: 'player_assignment',
          userId: p.userId,
          playerNumber: p.playerNumber,
          gameId: this.gameId,
          hostId: this.hostId
        }
      });
    });
  }

  startGame() {
    if (!this.isHost) return;
    this.channel?.send({
      type: 'broadcast',
      event: 'room_action',
      payload: { action: 'game_start', gameId: this.gameId }
    });
  }

  getChannel() {
    return this.channel;
  }

  async disconnect() {
    if (this.isHost) {
      this.channel?.send({
        type: 'broadcast',
        event: 'room_action',
        payload: { action: 'room_closed' }
      });
    }
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.players = [];
    this.listeners = [];
    this.playersChangedListeners = [];
  }
}

'use client';

import type { GameState } from '@/types';

/**
 * GameStateSync — Synchronisation de l'état de jeu entre l'hôte et les clients.
 * 
 * Mode Hôte : Broadcast l'état du jeu à 30fps vers tous les clients
 * Mode Client : Reçoit l'état et déclenche le rendu, envoie les inputs au host
 */
export class GameStateSync {
  private channel: any;
  private isHost: boolean;
  private stateListeners: ((state: GameState) => void)[] = [];
  private inputListeners: ((input: { direction: string; playerNumber: number; userId: string }) => void)[] = [];
  private lastBroadcastTime = 0;
  private broadcastInterval = 33; // ~30fps

  constructor(channel: any, isHost: boolean) {
    this.channel = channel;
    this.isHost = isHost;
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.channel) return;

    if (this.isHost) {
      // L'hôte écoute les inputs des clients
      this.channel.on('broadcast', { event: 'player_input' }, ({ payload }: any) => {
        this.inputListeners.forEach(l => l({
          direction: payload.direction,
          playerNumber: payload.playerNumber,
          userId: payload.userId
        }));
      });
    } else {
      // Le client écoute l'état du jeu envoyé par l'hôte
      this.channel.on('broadcast', { event: 'game_state' }, ({ payload }: any) => {
        this.stateListeners.forEach(l => l(payload.state));
      });
    }
  }

  /**
   * [HOST] Diffuse l'état du jeu aux clients (throttled à 30fps)
   */
  broadcastState(state: GameState) {
    if (!this.isHost || !this.channel) return;

    const now = performance.now();
    if (now - this.lastBroadcastTime < this.broadcastInterval) return;
    this.lastBroadcastTime = now;

    this.channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { state }
    });
  }

  /**
   * [CLIENT] Envoie un input au host
   */
  sendInput(direction: string, playerNumber: number, userId: string) {
    if (this.isHost || !this.channel) return;

    this.channel.send({
      type: 'broadcast',
      event: 'player_input',
      payload: { direction, playerNumber, userId }
    });
  }

  /**
   * [CLIENT] Écoute les mises à jour d'état du jeu
   */
  onStateReceived(listener: (state: GameState) => void) {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  /**
   * [HOST] Écoute les inputs des joueurs distants
   */
  onInputReceived(listener: (input: { direction: string; playerNumber: number; userId: string }) => void) {
    this.inputListeners.push(listener);
    return () => {
      this.inputListeners = this.inputListeners.filter(l => l !== listener);
    };
  }

  destroy() {
    this.stateListeners = [];
    this.inputListeners = [];
  }
}

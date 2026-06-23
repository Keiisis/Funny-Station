/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FUNNY STATION — NETPLAY SDK  (window.FunnyNet)
 *  Protocole de multijoueur en ligne RÉUTILISABLE pour tous les jeux Funny Station.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  Modèle : « host authoritative » (l'hôte fait tourner la logique, les clients
 *  envoient leurs inputs et affichent l'état diffusé). Côté client, le SDK
 *  INTERPOLE entre les états reçus → rendu fluide 60 fps même si le réseau
 *  n'envoie que 20-30 paquets/s. C'est ce qui rend le tout « ultra-dynamique ».
 *
 *  Le runner Funny Station relaie déjà les messages via Supabase Realtime :
 *    - hôte  → GAME_STATE_EXPORT  (état diffusé aux clients)
 *    - hôte  ← REMOTE_PLAYER_INPUT (inputs des clients)
 *    - client→ GAME_INPUT          (input local envoyé à l'hôte)
 *    - client← GAME_STATE_IMPORT   (état reçu de l'hôte)
 *  Le SDK encapsule tout ça.
 *
 *  ─── UTILISATION (dans n'importe quel jeu) ───────────────────────────────────
 *    <script src="/funny-netplay.js"></script>
 *
 *    FunnyNet.init({ tickRate: 20, interpDelay: 100 });
 *
 *    if (FunnyNet.isHost) {
 *      // L'hôte applique les inputs distants :
 *      FunnyNet.onInput(inp => applyInput(inp.playerNumber, inp.direction, inp.action));
 *      // …et dans sa boucle de jeu, après mise à jour, diffuse l'état :
 *      FunnyNet.broadcastState({ players:[{x,y,...}], entities:[...], frame, ... });
 *    }
 *
 *    if (FunnyNet.isClient) {
 *      // Le client envoie ses inputs locaux :
 *      onKey(dir => FunnyNet.sendInput({ direction: dir, action: 'down' }));
 *      // …et reçoit l'état INTERPOLÉ chaque frame pour un rendu fluide :
 *      FunnyNet.onRenderState(state => render(state));
 *    }
 *
 *  Solo / local : FunnyNet.isOnline === false → le jeu tourne normalement,
 *  broadcastState/sendInput sont des no-ops. Aucun branchement conditionnel lourd.
 * ════════════════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  var MSG = {
    EXPORT: 'GAME_STATE_EXPORT',   // game(host) -> runner
    IMPORT: 'GAME_STATE_IMPORT',   // runner -> game(client)
    SEND_INPUT: 'GAME_INPUT',      // game(client) -> runner
    RECV_INPUT: 'REMOTE_PLAYER_INPUT' // runner -> game(host)
  };

  var fs = (typeof window !== 'undefined' && window.funnyStation) || {};
  var mode = fs.networkMode || 'local';

  // Interpolation générique : lerp récursif de tous les nombres (objets + tableaux),
  // les champs non numériques prennent la valeur cible. Marche pour {players:[{x,y}], ...}.
  function lerp(a, b, t) {
    if (typeof b === 'number') return typeof a === 'number' ? a + (b - a) * t : b;
    if (Array.isArray(b)) {
      var out = new Array(b.length);
      for (var i = 0; i < b.length; i++) out[i] = lerp(a && a[i], b[i], t);
      return out;
    }
    if (b && typeof b === 'object') {
      var o = {};
      for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = lerp(a ? a[k] : undefined, b[k], t);
      return o;
    }
    return b;
  }

  var FunnyNet = {
    // ── État de connexion ──
    mode: mode,
    isHost: mode === 'host',
    isClient: mode === 'client',
    isOnline: mode === 'host' || mode === 'client',
    playerNumber: (fs.playerNumber != null ? fs.playerNumber : 0),

    // ── Réglages ──
    tickRate: 20,       // diffusions/seconde côté hôte
    interpDelay: 100,   // ms de tampon d'interpolation côté client (fluidité vs latence)
    interpolate: true,  // interpolation auto du rendu client

    // ── interne ──
    _stateCbs: [], _inputCbs: [], _renderCbs: [], _roleCbs: [],
    _lastSend: 0,
    _buffer: [],        // [{t, state}] côté client
    _loopOn: false,
    _latest: null,

    init: function (opts) {
      opts = opts || {};
      if (opts.tickRate) this.tickRate = opts.tickRate;
      if (opts.interpDelay != null) this.interpDelay = opts.interpDelay;
      if (opts.interpolate != null) this.interpolate = opts.interpolate;
      return this;
    },

    // ════════ CÔTÉ HÔTE ════════
    /** Diffuse l'état du monde aux clients (throttlé au tickRate). */
    broadcastState: function (state) {
      if (!this.isHost) return;
      var now = (performance && performance.now) ? performance.now() : Date.now();
      if (now - this._lastSend < 1000 / this.tickRate) return;
      this._lastSend = now;
      try { window.parent.postMessage({ type: MSG.EXPORT, state: state }, '*'); } catch (e) {}
    },
    /** Reçoit les inputs des joueurs distants. cb({ direction, action, playerNumber, userId }). */
    onInput: function (cb) { if (typeof cb === 'function') this._inputCbs.push(cb); return this; },

    // ════════ MIGRATION D'HÔTE ════════
    /**
     * S'abonne aux changements de rôle (migration d'hôte). Le callback reçoit
     * { mode, isHost, isClient, playerNumber, seed } où `seed` = dernier état reçu
     * (utile au nouvel hôte pour reprendre la partie EXACTEMENT où elle en était).
     */
    onRoleChange: function (cb) { if (typeof cb === 'function') this._roleCbs.push(cb); return this; },

    /** Applique un nouveau rôle à chaud (appelé via le message FUNNY_ROLE_CHANGE du runner). */
    _applyMode: function (mode, playerNumber) {
      if (mode !== 'host' && mode !== 'client' && mode !== 'local') return;
      var changed = mode !== this.mode;
      this.mode = mode;
      this.isHost = mode === 'host';
      this.isClient = mode === 'client';
      this.isOnline = this.isHost || this.isClient;
      if (playerNumber != null) this.playerNumber = playerNumber;
      this._lastSend = 0; // autorise une diffusion immédiate si on devient hôte
      if (changed) {
        var info = { mode: mode, isHost: this.isHost, isClient: this.isClient, playerNumber: this.playerNumber, seed: this._latest };
        for (var i = 0; i < this._roleCbs.length; i++) { try { this._roleCbs[i](info); } catch (e) {} }
      }
    },

    // ════════ CÔTÉ CLIENT ════════
    /** Envoie un input local à l'hôte. ex: sendInput({ direction:'LEFT', action:'down' }). */
    sendInput: function (input) {
      if (!this.isClient) return;
      var payload = { type: MSG.SEND_INPUT, playerNumber: this.playerNumber };
      if (input) for (var k in input) payload[k] = input[k];
      try { window.parent.postMessage(payload, '*'); } catch (e) {}
    },
    /** Reçoit l'état brut tel qu'envoyé par l'hôte (sans interpolation). */
    onState: function (cb) { if (typeof cb === 'function') this._stateCbs.push(cb); return this; },
    /**
     * Reçoit l'état INTERPOLÉ chaque frame (rendu fluide). À utiliser pour dessiner.
     * cb(stateInterpolé) est appelé via requestAnimationFrame.
     */
    onRenderState: function (cb) {
      if (typeof cb !== 'function') return this;
      this._renderCbs.push(cb);
      if (!this._loopOn) { this._loopOn = true; this._renderLoop(); }
      return this;
    },

    // ── boucle de rendu interpolé (client) ──
    _renderLoop: function () {
      var self = this;
      var now = (performance && performance.now) ? performance.now() : Date.now();
      var buf = self._buffer;
      var rendered = null;

      if (self.interpolate && buf.length >= 2) {
        var renderT = now - self.interpDelay;
        var prev = null, next = null;
        for (var i = buf.length - 1; i >= 0; i--) {
          if (buf[i].t <= renderT) { prev = buf[i]; next = buf[i + 1] || buf[i]; break; }
        }
        if (!prev) { prev = buf[0]; next = buf[1] || buf[0]; }
        var span = (next.t - prev.t) || 1;
        var alpha = Math.max(0, Math.min(1, (renderT - prev.t) / span));
        rendered = lerp(prev.state, next.state, alpha);
      } else if (buf.length) {
        rendered = buf[buf.length - 1].state;
      } else if (self._latest) {
        rendered = self._latest;
      }

      if (rendered) for (var c = 0; c < self._renderCbs.length; c++) self._renderCbs[c](rendered);

      // purge des vieux états (garde un petit historique)
      while (buf.length > 3 && buf[0].t < now - self.interpDelay - 1000) buf.shift();
      requestAnimationFrame(function () { self._renderLoop(); });
    },

    // ── réception (appelé par le pont message ci-dessous) ──
    _onStateMsg: function (state) {
      this._latest = state;
      var t = (performance && performance.now) ? performance.now() : Date.now();
      this._buffer.push({ t: t, state: state });
      for (var i = 0; i < this._stateCbs.length; i++) this._stateCbs[i](state);
    },
    _onInputMsg: function (input) {
      for (var i = 0; i < this._inputCbs.length; i++) this._inputCbs[i](input);
    }
  };

  // ── Pont message ⇄ runner Funny Station ──
  if (typeof window !== 'undefined') {
    window.addEventListener('message', function (ev) {
      var d = ev.data; if (!d || !d.type) return;
      if (d.type === MSG.IMPORT && d.state) FunnyNet._onStateMsg(d.state);
      else if (d.type === MSG.RECV_INPUT) FunnyNet._onInputMsg(d);
      else if (d.type === 'FUNNY_ROLE_CHANGE') FunnyNet._applyMode(d.mode, d.playerNumber);
    });
    window.FunnyNet = FunnyNet;
  }
})();

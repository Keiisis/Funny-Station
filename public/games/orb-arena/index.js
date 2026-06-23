// ════════════════════════════════════════════════════════════════════════════
//  ORB ARENA — exemple multijoueur en ligne (SDK FunnyNet) AVEC MIGRATION D'HÔTE.
//
//  Modèle host-authoritative + interpolation client. Le RÔLE est DYNAMIQUE : si
//  l'hôte se déconnecte, FunnyNet promeut un client (onRoleChange) qui reprend la
//  partie depuis le dernier état reçu (seed) — sans interruption.
//
//  Contrôles : flèches / D-pad / joystick gauche. But : ramasser les orbes.
// ════════════════════════════════════════════════════════════════════════════

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
document.getElementById('game-canvas-container')?.appendChild(canvas) || document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
window.addEventListener('resize', () => { canvas.width = innerWidth; canvas.height = innerHeight; });

const W = 1280, H = 720;
const COLORS = ['#3b82f6', '#f43f5e', '#22c55e', '#f59e0b'];
const LABELS = ['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4'];

const net = window.FunnyNet ? window.FunnyNet.init({ tickRate: 22, interpDelay: 90 }) : null;
// Le rôle et le numéro de joueur peuvent CHANGER en cours de partie (migration).
function isHost() { return net ? net.isHost : true; }       // solo = autorité
function isClient() { return net ? net.isClient : false; }
function me() { return net ? net.playerNumber : 0; }
function modeTag() { return net ? net.mode : 'local'; }

// ── État du monde (autorité = hôte ou solo) ──
let players = [];
let orbs = [];
let frame = 0;
const held = {}; // inputs maintenus par joueur

function pdir(p) { held[p] = held[p] || { UP: false, DOWN: false, LEFT: false, RIGHT: false }; return held[p]; }
function spawnOrb() { return { x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120) }; }
function makePlayer(i) { return { x: W * (0.25 + 0.5 * Math.random()), y: H * (0.25 + 0.5 * Math.random()), score: 0, color: COLORS[i], label: LABELS[i], n: i }; }

function initWorld(count) {
  players = []; for (let i = 0; i < count; i++) players.push(makePlayer(i));
  orbs = []; for (let i = 0; i < 6; i++) orbs.push(spawnOrb());
}

// Recopie un état reçu dans le monde local (utilisé par le nouvel hôte au moment
// de la migration, pour reprendre EXACTEMENT là où l'ancien hôte s'était arrêté).
function seedFromState(s) {
  if (!s) return false;
  if (Array.isArray(s.players)) players = s.players.map((p) => ({ ...p }));
  if (Array.isArray(s.orbs)) orbs = s.orbs.map((o) => ({ ...o }));
  if (typeof s.frame === 'number') frame = s.frame;
  return true;
}

// Démarrage selon le rôle initial.
const startMode = modeTag();
if (startMode === 'local') initWorld(2);
else if (startMode === 'host') initWorld(Math.max(2, me() + 1));
// client : le monde se remplit via les états reçus (lastRaw) puis l'interpolation.

// ════════ INPUTS ════════
const KEYMAP = {
  ArrowUp: ['UP', 0], ArrowDown: ['DOWN', 0], ArrowLeft: ['LEFT', 0], ArrowRight: ['RIGHT', 0],
  z: ['UP', 1], s: ['DOWN', 1], q: ['LEFT', 1], d: ['RIGHT', 1], w: ['UP', 1], a: ['LEFT', 1],
};
function localPlayerForKey(localIdx) { return modeTag() === 'local' ? localIdx : me(); }

function setKey(key, down) {
  const m = KEYMAP[key]; if (!m) return;
  const [dir, localIdx] = m;
  if (isClient()) {
    // Client : pas d'autorité → on envoie l'input à l'hôte (uniquement le J local).
    if (localIdx === 0) net.sendInput({ direction: dir, action: down ? 'down' : 'up' });
  } else {
    pdir(localPlayerForKey(localIdx))[dir] = down; // hôte / solo : applique localement
  }
}
window.addEventListener('keydown', (e) => setKey(e.key, true));
window.addEventListener('keyup', (e) => setKey(e.key, false));

// HÔTE : reçoit les inputs des clients distants (garde aussi le sens après migration).
if (net) {
  net.onInput((inp) => {
    if (!net.isHost) return;
    const p = inp.playerNumber; if (p == null) return;
    while (players.length <= p) players.push(makePlayer(players.length));
    pdir(p)[inp.direction] = (inp.action !== 'up');
  });
}

// CLIENT : on garde le dernier état BRUT reçu (pour la graine de migration) ET
// l'état INTERPOLÉ (pour un rendu fluide).
let lastRaw = null;
let renderState = null;
if (net) {
  net.onState((s) => { lastRaw = s; });
  net.onRenderState((s) => { renderState = s; });

  // MIGRATION : promu hôte → on reprend depuis la graine (état reçu le plus récent).
  net.onRoleChange((info) => {
    if (info.isHost) {
      if (!seedFromState(info.seed || lastRaw)) {
        if (players.length === 0) initWorld(Math.max(2, info.playerNumber + 1));
      }
      console.log('[Orb Arena] Promu HÔTE (migration) — reprise de la partie.');
    }
  });
}

// ════════ LOGIQUE (autorité) ════════
const SPEED = 4.2, ORB_R = 14, P_R = 18;
function step() {
  frame++;
  players.forEach((p) => {
    const h = pdir(p.n);
    if (h.LEFT) p.x -= SPEED; if (h.RIGHT) p.x += SPEED;
    if (h.UP) p.y -= SPEED; if (h.DOWN) p.y += SPEED;
    p.x = Math.max(P_R, Math.min(W - P_R, p.x));
    p.y = Math.max(P_R, Math.min(H - P_R, p.y));
    orbs.forEach((o, i) => {
      if (Math.hypot(p.x - o.x, p.y - o.y) < ORB_R + P_R) { p.score++; orbs[i] = spawnOrb(); }
    });
  });
}

// ════════ RENDU ════════
function draw(state) {
  const sx = canvas.width / W, sy = canvas.height / H, s = Math.min(sx, sy);
  const ox = (canvas.width - W * s) / 2, oy = (canvas.height - H * s) / 2;
  ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(120,160,255,0.25)'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, W, H);
  (state.orbs || []).forEach((o) => {
    ctx.beginPath(); ctx.arc(o.x, o.y, ORB_R, 0, 7);
    ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
  });
  (state.players || []).forEach((p) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, P_R, 0, 7);
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
    if (p.n === me() && modeTag() !== 'local') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
  });
  ctx.restore();
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'left';
  (state.players || []).forEach((p, i) => {
    ctx.fillStyle = p.color; ctx.fillText(`${p.label}: ${p.score}`, 16, 28 + i * 22);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px system-ui'; ctx.textAlign = 'right';
  const tag = isHost() ? (modeTag() === 'local' ? '🎮 LOCAL' : '🌐 HÔTE') : '🌐 EN LIGNE';
  ctx.fillText(tag + ' — ramasse les orbes !', canvas.width - 14, canvas.height - 14);
}

// ════════ BOUCLE UNIFIÉE (le rôle est ré-évalué à CHAQUE frame) ════════
let acc = 0, last = performance.now();
function loop(now) {
  const dt = now - last; last = now;
  if (isHost()) {
    // Autorité : logique à tick fixe + rendu temps réel + diffusion.
    acc += dt;
    while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
    draw({ players, orbs, frame });
    if (net && net.isHost) net.broadcastState({ players, orbs, frame });
  } else {
    // Client : affiche l'état interpolé reçu de l'hôte.
    acc = 0;
    if (renderState) draw(renderState);
    else if (lastRaw) draw(lastRaw);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('[Orb Arena] Mode initial:', startMode, '· Joueur', me() + 1, '· FunnyNet', net ? 'OK' : 'absent');

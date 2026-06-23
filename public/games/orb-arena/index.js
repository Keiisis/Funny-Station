// ════════════════════════════════════════════════════════════════════════════
//  ORB ARENA — jeu d'EXEMPLE multijoueur en ligne utilisant le SDK FunnyNet.
//  Démontre le protocole réutilisable : host-authoritative + interpolation client.
//
//  Modèle :
//   - HÔTE : fait tourner toute la logique (déplacements, collisions, score) et
//            diffuse l'état du monde. Reçoit les inputs des clients via FunnyNet.onInput.
//   - CLIENT : envoie ses inputs (FunnyNet.sendInput) et AFFICHE l'état interpolé
//              (FunnyNet.onRenderState) → rendu fluide même à 20 paquets/s réseau.
//   - LOCAL (hors-ligne) : 2 joueurs sur le même clavier (flèches + ZQSD).
//
//  Contrôles : flèches / D-pad / joystick gauche = déplacement. But : ramasser les orbes.
// ════════════════════════════════════════════════════════════════════════════

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
document.getElementById('game-canvas-container')?.appendChild(canvas) || document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
window.addEventListener('resize', () => { canvas.width = innerWidth; canvas.height = innerHeight; });

const W = 1280, H = 720;            // monde logique (mis à l'échelle à l'écran)
const COLORS = ['#3b82f6', '#f43f5e', '#22c55e', '#f59e0b'];
const LABELS = ['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4'];

const net = window.FunnyNet ? window.FunnyNet.init({ tickRate: 22, interpDelay: 90 }) : null;
const MODE = net ? net.mode : 'local';
const ME = net ? net.playerNumber : 0;

// ── État du monde (autorité = hôte ou solo) ──
let players = [];
let orbs = [];
let frame = 0;
// Inputs maintenus par joueur : { 0:{UP,DOWN,LEFT,RIGHT}, 1:{...} }
const held = {};

function pdir(p) { held[p] = held[p] || { UP: false, DOWN: false, LEFT: false, RIGHT: false }; return held[p]; }
function spawnOrb() { return { x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120) }; }
function makePlayer(i) { return { x: W * (0.25 + 0.5 * Math.random()), y: H * (0.25 + 0.5 * Math.random()), score: 0, color: COLORS[i], label: LABELS[i], n: i }; }

function initWorld(count) {
  players = []; for (let i = 0; i < count; i++) players.push(makePlayer(i));
  orbs = []; for (let i = 0; i < 6; i++) orbs.push(spawnOrb());
}

// ── Combien de joueurs ? En ligne, on accueille jusqu'à 4 (rejoints au fil de l'eau). ──
const isAuthority = (MODE === 'host' || MODE === 'local');
if (MODE === 'local') initWorld(2);
if (MODE === 'host') initWorld(Math.max(2, ME + 1));

// ════════ INPUTS ════════
const KEYMAP = {
  // Joueur local (flèches) — la manette virtuelle envoie aussi ces flèches.
  ArrowUp: ['UP', 0], ArrowDown: ['DOWN', 0], ArrowLeft: ['LEFT', 0], ArrowRight: ['RIGHT', 0],
  // 2e joueur local (ZQSD) en mode hors-ligne.
  z: ['UP', 1], s: ['DOWN', 1], q: ['LEFT', 1], d: ['RIGHT', 1], w: ['UP', 1], a: ['LEFT', 1]
};
function localPlayerForKey(idx) { return MODE === 'local' ? idx : ME; }

function setKey(key, down) {
  const m = KEYMAP[key]; if (!m) return;
  const [dir, localIdx] = m;
  const player = localPlayerForKey(localIdx);
  if (MODE === 'client') {
    // Le client n'a pas l'autorité : il envoie l'input à l'hôte.
    if (localIdx === 0) net.sendInput({ direction: dir, action: down ? 'down' : 'up' });
  } else {
    pdir(player)[dir] = down; // hôte / solo : applique localement
  }
}
window.addEventListener('keydown', e => { setKey(e.key, true); });
window.addEventListener('keyup', e => { setKey(e.key, false); });

// HÔTE : reçoit les inputs des clients distants.
if (MODE === 'host' && net) {
  net.onInput(inp => {
    const p = inp.playerNumber; if (p == null) return;
    if (!players[p]) { while (players.length <= p) players.push(makePlayer(players.length)); }
    pdir(p)[inp.direction] = (inp.action !== 'up');
  });
}

// ════════ LOGIQUE (autorité) ════════
const SPEED = 4.2, ORB_R = 14, P_R = 18;
function step() {
  frame++;
  players.forEach(p => {
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
  // arène
  ctx.strokeStyle = 'rgba(120,160,255,0.25)'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, W, H);
  // orbes
  (state.orbs || []).forEach(o => {
    ctx.beginPath(); ctx.arc(o.x, o.y, ORB_R, 0, 7);
    ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
  });
  // joueurs
  (state.players || []).forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, P_R, 0, 7);
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
    if (p.n === ME && MODE !== 'local') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
  });
  ctx.restore();
  // HUD scores
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'left';
  (state.players || []).forEach((p, i) => {
    ctx.fillStyle = p.color; ctx.fillText(`${p.label}: ${p.score}`, 16, 28 + i * 22);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px system-ui'; ctx.textAlign = 'right';
  const tag = MODE === 'host' ? '🌐 HÔTE' : MODE === 'client' ? '🌐 EN LIGNE' : '🎮 LOCAL';
  ctx.fillText(tag + ' — ramasse les orbes !', canvas.width - 14, canvas.height - 14);
}

// ════════ BOUCLES ════════
if (MODE === 'client') {
  // Le client n'exécute PAS la logique : il affiche l'état interpolé reçu de l'hôte.
  net.onRenderState(state => draw(state));
} else {
  // Hôte / solo : logique à tick fixe + rendu temps réel + diffusion réseau.
  let acc = 0, last = performance.now();
  function loop(now) {
    const dt = now - last; last = now; acc += dt;
    while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
    draw({ players, orbs, frame });
    if (MODE === 'host' && net) net.broadcastState({ players, orbs, frame });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

console.log('[Orb Arena] Mode:', MODE, '· Joueur', ME + 1, '· FunnyNet', net ? 'OK' : 'absent');

// === Neon Runner (Funny Station JS Game) — Local + Online Multiplayer ===
// Supports 3 modes:
//   - 'local':  Classic local play (1-2 players on same screen)
//   - 'host':   Online host — runs game logic + exports state via postMessage
//   - 'client': Online client — receives state, renders only, sends inputs to parent

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.getElementById('game-canvas-container').appendChild(canvas);
const ctx = canvas.getContext('2d');

// Network mode (injected by UniversalRuntimeRunner via funnyStation SDK)
const networkMode = (window.funnyStation && window.funnyStation.networkMode) || 'local';
const localPlayerNumber = (window.funnyStation && window.funnyStation.playerNumber) || 0;

console.log(`[Neon Runner] Mode: ${networkMode}, Player: ${localPlayerNumber}`);

// Players setup (P1: blue, P2: pink, P3: green, P4: amber)
const PLAYER_CONFIGS = [
  { color: '#00d2ff', glow: '#00d2ff', label: 'P1' },
  { color: '#ff6eb4', glow: '#ff6eb4', label: 'P2' },
  { color: '#34d399', glow: '#34d399', label: 'P3' },
  { color: '#fbbf24', glow: '#fbbf24', label: 'P4' },
];

let players = [];
let obstacles = [];
let keys = {};
let gameOver = false;
let frame = 0;
let trophyUnlocked = false;
let isMultiplayer = networkMode !== 'local'; // Online is always multiplayer
let receivedState = null; // For client mode

function initPlayers(count) {
  players = [];
  for (let i = 0; i < count; i++) {
    const cfg = PLAYER_CONFIGS[i] || PLAYER_CONFIGS[0];
    players.push({
      x: canvas.width / (count + 1) * (i + 1),
      y: canvas.height - 120,
      size: 20,
      speed: 10,
      color: cfg.color,
      glow: cfg.glow,
      alive: true,
      score: 0,
      label: cfg.label,
    });
  }
}

// Start with 1 player in local, wait for host info in online
if (networkMode === 'local') {
  initPlayers(1);
} else {
  initPlayers(2); // Default, will be updated by host
}

// === CONTROLS ===
// P1 keys: Arrows, P2 keys: WASD
const P1_LEFT = ['ArrowLeft'];
const P1_RIGHT = ['ArrowRight'];
const P2_LEFT = ['a', 'q'];
const P2_RIGHT = ['d'];

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (['a', 'q', 'd', 'w', 's', 'e', 'f'].includes(e.key.toLowerCase())) {
    isMultiplayer = true;
    if (players.length < 2 && networkMode === 'local') initPlayers(2);
  }

  // In CLIENT mode, forward inputs to parent instead of handling locally
  if (networkMode === 'client') {
    const directionMap = {
      'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
      'Enter': 'CONFIRM', ' ': 'CONFIRM', 'Escape': 'BACK'
    };
    const direction = directionMap[e.key];
    if (direction && window.parent) {
      window.parent.postMessage({
        type: 'GAME_INPUT',
        direction: direction,
        playerNumber: localPlayerNumber,
        action: 'down'
      }, '*');
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;

  // In CLIENT mode, forward key release to parent
  if (networkMode === 'client') {
    const directionMap = {
      'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
      'Enter': 'CONFIRM', ' ': 'CONFIRM', 'Escape': 'BACK'
    };
    const direction = directionMap[e.key];
    if (direction && window.parent) {
      window.parent.postMessage({
        type: 'GAME_INPUT',
        direction: direction,
        playerNumber: localPlayerNumber,
        action: 'up'
      }, '*');
    }
  }
});

// Listen for parent window keyboard events (mobile controller relay)
try {
  if (window.parent && window.parent !== window) {
    window.parent.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      if (['a', 'q', 'd', 'w', 's', 'e', 'f'].includes(e.key.toLowerCase())) {
        isMultiplayer = true;
        if (players.length < 2 && networkMode === 'local') initPlayers(2);
      }
    });
    window.parent.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });
  }
} catch (e) { /* Cross-origin */ }

// Listen for funny_gamepad_action events
function handleGamepadAction(e) {
  const playerNum = e.detail?.playerNumber || 0;
  const direction = e.detail?.direction;
  const action = e.detail?.action || 'down';
  if (playerNum >= 1) {
    isMultiplayer = true;
    if (players.length < 2 && networkMode === 'local') initPlayers(2);
  }
  const keyMap = playerNum === 0
    ? { 'UP': 'ArrowUp', 'DOWN': 'ArrowDown', 'LEFT': 'ArrowLeft', 'RIGHT': 'ArrowRight', 'CONFIRM': 'Enter', 'BACK': 'Escape', 'TRIANGLE': 'ArrowUp', 'SQUARE': ' ' }
    : { 'UP': 'w', 'DOWN': 's', 'LEFT': 'a', 'RIGHT': 'd', 'CONFIRM': 'e', 'BACK': 'q', 'TRIANGLE': 'w', 'SQUARE': 'f' };
  const key = keyMap[direction];
  if (key) {
    if (action === 'up') {
      keys[key] = false;
    } else {
      keys[key] = true;
    }
  }
}
window.addEventListener('funny_gamepad_action', handleGamepadAction);
try {
  if (window.parent && window.parent !== window) {
    window.parent.addEventListener('funny_gamepad_action', handleGamepadAction);
  }
} catch (e) { /* Cross-origin */ }

// === CLIENT MODE: Receive game state from host via parent ===
if (networkMode === 'client') {
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'GAME_STATE_IMPORT') {
      receivedState = e.data.state;
    }
  });
}

// === HOST MODE: Listen for remote player inputs via parent ===
if (networkMode === 'host') {
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'REMOTE_PLAYER_INPUT') {
      const { direction, playerNumber, action } = e.data;
      // Translate remote input to key presses for the appropriate player
      const keyMaps = [
        { 'UP': 'ArrowUp', 'DOWN': 'ArrowDown', 'LEFT': 'ArrowLeft', 'RIGHT': 'ArrowRight', 'CONFIRM': 'Enter' },
        { 'UP': 'w', 'DOWN': 's', 'LEFT': 'a', 'RIGHT': 'd', 'CONFIRM': 'e' },
        { 'UP': 'i', 'DOWN': 'k', 'LEFT': 'j', 'RIGHT': 'l', 'CONFIRM': 'o' },
        { 'UP': '8', 'DOWN': '5', 'LEFT': '4', 'RIGHT': '6', 'CONFIRM': '0' },
      ];
      const map = keyMaps[playerNumber] || keyMaps[0];
      const key = map[direction];
      if (key) {
        if (action === 'up') {
          keys[key] = false;
        } else {
          keys[key] = true;
        }
      }
    }
    // Host can receive player count updates
    if (e.data && e.data.type === 'SET_PLAYER_COUNT') {
      const count = Math.min(Math.max(e.data.count, 1), 4);
      if (count !== players.length) initPlayers(count);
      isMultiplayer = count > 1;
    }
  });
}

// Resizing
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  players.forEach(p => { p.y = canvas.height - 120; });
});

function spawnObstacle() {
  if (frame % 15 === 0 && !gameOver) {
    obstacles.push({
      x: Math.random() * canvas.width,
      y: -20,
      size: 15 + Math.random() * 20,
      speed: 4 + Math.random() * 6,
      color: `hsl(${280 + Math.random() * 60}, 100%, 60%)`
    });
  }
}

function getActivePlayerKeys(playerIndex) {
  switch (playerIndex) {
    case 0: return { left: ['ArrowLeft'], right: ['ArrowRight'], restart: ['Enter', ' '] };
    case 1: return { left: ['a', 'q'], right: ['d'], restart: ['e'] };
    case 2: return { left: ['j'], right: ['l'], restart: ['o'] };
    case 3: return { left: ['4'], right: ['6'], restart: ['0'] };
    default: return { left: ['ArrowLeft'], right: ['ArrowRight'], restart: ['Enter'] };
  }
}

function update() {
  const activePlayers = isMultiplayer ? players : [players[0]];

  if (gameOver) {
    let anyRestart = false;
    activePlayers.forEach((p, idx) => {
      const pk = getActivePlayerKeys(idx);
      pk.restart.forEach(k => { if (keys[k]) anyRestart = true; });
    });
    if (anyRestart) {
      obstacles = [];
      gameOver = false;
      players.forEach((p, idx) => {
        p.x = canvas.width / (players.length + 1) * (idx + 1);
        p.alive = true;
        p.score = 0;
      });
    }
    return;
  }

  activePlayers.forEach((p, idx) => {
    if (!p.alive) return;
    const pk = getActivePlayerKeys(idx);
    pk.left.forEach(k => { if (keys[k]) p.x = Math.max(p.size, p.x - p.speed); });
    pk.right.forEach(k => { if (keys[k]) p.x = Math.min(canvas.width - p.size, p.x + p.speed); });
  });

  obstacles.forEach((obs, idx) => {
    obs.y += obs.speed;
    activePlayers.forEach(p => {
      if (!p.alive) return;
      const dist = Math.hypot(obs.x - p.x, obs.y - p.y);
      if (dist < (obs.size / 2 + p.size)) p.alive = false;
    });
    if (obs.y > canvas.height + 20) {
      obstacles.splice(idx, 1);
      activePlayers.forEach(p => { if (p.alive) p.score += 10; });
      if (players[0].score >= 200 && !trophyUnlocked) {
        trophyUnlocked = true;
        if (window.funnyStation && window.funnyStation.unlockTrophy) {
          window.funnyStation.unlockTrophy('t1');
        }
      }
    }
  });

  if (activePlayers.every(p => !p.alive)) gameOver = true;
  frame++;
}

function exportGameState() {
  return {
    players: players.map(p => ({
      x: p.x, y: p.y, alive: p.alive, score: p.score, color: p.color, label: p.label
    })),
    obstacles: obstacles.map(o => ({
      x: o.x, y: o.y, size: o.size, speed: o.speed, color: o.color
    })),
    gameOver,
    frame,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height
  };
}

function applyGameState(state) {
  if (!state) return;
  // Scale positions if canvas sizes differ
  const scaleX = canvas.width / (state.canvasWidth || canvas.width);
  const scaleY = canvas.height / (state.canvasHeight || canvas.height);

  // Update players
  state.players.forEach((sp, idx) => {
    if (idx < players.length) {
      players[idx].x = sp.x * scaleX;
      players[idx].y = sp.y * scaleY;
      players[idx].alive = sp.alive;
      players[idx].score = sp.score;
      players[idx].color = sp.color;
      players[idx].label = sp.label;
    } else {
      players.push({
        x: sp.x * scaleX, y: sp.y * scaleY,
        size: 20, speed: 10,
        color: sp.color, glow: sp.color,
        alive: sp.alive, score: sp.score, label: sp.label
      });
    }
  });
  // Remove extra players
  while (players.length > state.players.length) players.pop();
  isMultiplayer = players.length > 1;

  // Update obstacles
  obstacles = state.obstacles.map(o => ({
    x: o.x * scaleX, y: o.y * scaleY,
    size: o.size, speed: o.speed, color: o.color
  }));

  gameOver = state.gameOver;
  frame = state.frame;
}

function draw() {
  ctx.fillStyle = 'rgba(10, 10, 18, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activePlayers = isMultiplayer ? players : [players[0]];

  activePlayers.forEach(p => {
    if (!p.alive) return;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.glow || p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.size);
    ctx.lineTo(p.x - p.size, p.y + p.size);
    ctx.lineTo(p.x + p.size, p.y + p.size);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.color;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, p.y - p.size - 8);
    ctx.textAlign = 'left';
  });

  obstacles.forEach(obs => {
    ctx.shadowBlur = 10;
    ctx.shadowColor = obs.color;
    ctx.fillStyle = obs.color;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;

  if (isMultiplayer && players.length > 1) {
    players.forEach((p, idx) => {
      ctx.fillStyle = p.color;
      ctx.font = 'bold 16px "Courier New", monospace';
      if (idx === 0) {
        ctx.textAlign = 'left';
        ctx.fillText(`${p.label}: ${p.score}${!p.alive ? ' ☠️' : ''}`, 30, 35 + idx * 25);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(`${p.label}: ${p.score}${!p.alive ? ' ☠️' : ''}`, canvas.width - 30, 35 + (idx - 1) * 25);
      }
    });
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${players[0]?.score || 0}`, 30, 45);
  }

  // Network mode indicator
  if (networkMode !== 'local') {
    ctx.fillStyle = networkMode === 'host' ? '#3b82f6' : '#a855f7';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(networkMode === 'host' ? '🌐 HOST' : '🌐 ONLINE', canvas.width - 15, canvas.height - 15);
    ctx.textAlign = 'left';
  }

  const totalScore = players[0]?.score || 0;
  if (totalScore < 200) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('🏆 200 pts pour le trophée', 30, canvas.height - 15);
  } else {
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('🏆 Trophée Débloqué !', 30, canvas.height - 15);
  }

  if (gameOver) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    const restartMsg = networkMode === 'client'
      ? "L'hôte peut relancer la partie"
      : 'Appuyez sur ESPACE ou ENTRÉE pour rejouer';
    ctx.fillText(restartMsg, canvas.width / 2, canvas.height / 2 + 30);

    if (isMultiplayer && players.length > 1) {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = sorted[0].color;
      ctx.fillText(`${sorted[0].label} GAGNE ! (${sorted[0].score} pts)`, canvas.width / 2, canvas.height / 2 + 65);
    }
    ctx.textAlign = 'left';
  }
}

function gameLoop() {
  if (networkMode === 'client') {
    // Client mode: only render the received state
    if (receivedState) {
      applyGameState(receivedState);
      receivedState = null;
    }
    draw();
  } else {
    // Host or Local mode: run full game logic
    spawnObstacle();
    update();
    draw();

    // Host mode: export state to parent for broadcasting
    if (networkMode === 'host') {
      const state = exportGameState();
      window.parent.postMessage({ type: 'GAME_STATE_EXPORT', state }, '*');
    }
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();

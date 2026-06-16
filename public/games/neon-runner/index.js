// === Neon Runner (Funny Station JS Game) — 2 Player Support ===

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.getElementById('game-canvas-container').appendChild(canvas);
const ctx = canvas.getContext('2d');

// Players setup (P1: blue, P2: pink)
let players = [
  {
    x: canvas.width / 3,
    y: canvas.height - 120,
    size: 20,
    speed: 10,
    color: '#00d2ff',
    glow: '#00d2ff',
    alive: true,
    score: 0,
    label: 'P1',
    keys: { left: ['ArrowLeft'], right: ['ArrowRight'], restart: ['Enter'] }
  },
  {
    x: (canvas.width / 3) * 2,
    y: canvas.height - 120,
    size: 20,
    speed: 10,
    color: '#ff6eb4',
    glow: '#ff6eb4',
    alive: true,
    score: 0,
    label: 'P2',
    keys: { left: ['a', 'q'], right: ['d'], restart: ['e'] }
  }
];

let obstacles = [];
let keys = {};
let gameOver = false;
let frame = 0;
let trophyUnlocked = false;
let isMultiplayer = false; // Auto-detect when P2 presses a key

// Controls
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  // Auto-detect P2 when WASD is pressed
  if (['a', 'q', 'd', 'w', 's', 'e', 'f'].includes(e.key.toLowerCase())) {
    isMultiplayer = true;
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Listen for parent window keyboard events (mobile controller via Supabase Realtime)
try {
  if (window.parent && window.parent !== window) {
    window.parent.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      if (['a', 'q', 'd', 'w', 's', 'e', 'f'].includes(e.key.toLowerCase())) {
        isMultiplayer = true;
      }
    });
    window.parent.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });
  }
} catch (e) {
  // Cross-origin - parent access blocked
}

// Listen for funny_gamepad_action custom events (mobile controller direct bridge)
const directionToKeyP1 = {
  'UP': 'ArrowUp',
  'DOWN': 'ArrowDown',
  'LEFT': 'ArrowLeft',
  'RIGHT': 'ArrowRight',
  'CONFIRM': 'Enter',
  'BACK': 'Escape',
  'OPTION': 'Escape',
  'TRIANGLE': 'ArrowUp',
  'SQUARE': ' '
};

function handleGamepadAction(e) {
  const playerNum = e.detail?.playerNumber || 0;
  const direction = e.detail?.direction;

  if (playerNum >= 1) {
    isMultiplayer = true;
  }

  // Use the correct key mapping based on player number
  const keyMap = playerNum === 0 ? directionToKeyP1 : {
    'UP': 'w', 'DOWN': 's', 'LEFT': 'a', 'RIGHT': 'd',
    'CONFIRM': 'e', 'BACK': 'q', 'OPTION': 'q', 'TRIANGLE': 'w', 'SQUARE': 'f'
  };

  const key = keyMap[direction];
  if (key) {
    keys[key] = true;
    setTimeout(() => { keys[key] = false; }, 120);
  }
}

window.addEventListener('funny_gamepad_action', handleGamepadAction);
try {
  if (window.parent && window.parent !== window) {
    window.parent.addEventListener('funny_gamepad_action', handleGamepadAction);
  }
} catch (e) {
  // Cross-origin
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

function update() {
  const activePlayers = isMultiplayer ? players : [players[0]];

  if (gameOver) {
    if (keys['Enter'] || keys[' '] || keys['e']) {
      // Restart all players
      obstacles = [];
      gameOver = false;
      players[0].x = isMultiplayer ? canvas.width / 3 : canvas.width / 2;
      players[0].alive = true;
      players[0].score = 0;
      players[1].x = (canvas.width / 3) * 2;
      players[1].alive = true;
      players[1].score = 0;
    }
    return;
  }

  // Move each player
  activePlayers.forEach(p => {
    if (!p.alive) return;

    p.keys.left.forEach(k => {
      if (keys[k]) p.x = Math.max(p.size, p.x - p.speed);
    });
    p.keys.right.forEach(k => {
      if (keys[k]) p.x = Math.min(canvas.width - p.size, p.x + p.speed);
    });
  });

  // Move obstacles & check collisions for each player
  obstacles.forEach((obs, idx) => {
    obs.y += obs.speed;

    activePlayers.forEach(p => {
      if (!p.alive) return;
      const dist = Math.hypot(obs.x - p.x, obs.y - p.y);
      if (dist < (obs.size / 2 + p.size)) {
        p.alive = false;
      }
    });

    // Dodged - score for alive players
    if (obs.y > canvas.height + 20) {
      obstacles.splice(idx, 1);
      activePlayers.forEach(p => {
        if (p.alive) p.score += 10;
      });

      // Trophy check for P1
      const totalScore = players[0].score;
      if (totalScore >= 200 && !trophyUnlocked) {
        trophyUnlocked = true;
        if (window.funnyStation && window.funnyStation.unlockTrophy) {
          window.funnyStation.unlockTrophy('t1');
        }
      }
    }
  });

  // Game over when all active players are dead
  const allDead = activePlayers.every(p => !p.alive);
  if (allDead) {
    gameOver = true;
  }

  frame++;
}

function draw() {
  // Clear
  ctx.fillStyle = 'rgba(10, 10, 18, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activePlayers = isMultiplayer ? players : [players[0]];

  // Draw each player (glowing triangle)
  activePlayers.forEach(p => {
    if (!p.alive) return;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.glow;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.size);
    ctx.lineTo(p.x - p.size, p.y + p.size);
    ctx.lineTo(p.x + p.size, p.y + p.size);
    ctx.closePath();
    ctx.fill();

    // Player label above
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.color;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, p.y - p.size - 8);
    ctx.textAlign = 'left';
  });

  // Draw obstacles
  obstacles.forEach(obs => {
    ctx.shadowBlur = 10;
    ctx.shadowColor = obs.color;
    ctx.fillStyle = obs.color;
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // UI info
  ctx.shadowBlur = 0;

  if (isMultiplayer) {
    // P1 score (left)
    ctx.fillStyle = players[0].color;
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText(`P1: ${players[0].score}${!players[0].alive ? ' ☠️' : ''}`, 30, 45);

    // P2 score (right)
    ctx.fillStyle = players[1].color;
    ctx.textAlign = 'right';
    ctx.fillText(`P2: ${players[1].score}${!players[1].alive ? ' ☠️' : ''}`, canvas.width - 30, 45);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`SCORE: ${players[0].score}`, 30, 45);
  }

  // Trophy indicator
  const totalScore = players[0].score;
  if (totalScore < 200) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Atteignez 200 points pour débloquer le trophée!', 30, 70);
  } else {
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('🏆 Trophée Débloqué !', 30, 70);
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
    ctx.fillText(isMultiplayer ? 'Appuyez sur ENTRÉE ou E pour rejouer' : 'Appuyez sur ESPACE ou ENTRÉE pour rejouer', canvas.width / 2, canvas.height / 2 + 30);

    if (isMultiplayer) {
      ctx.font = 'bold 20px sans-serif';
      const winner = players[0].score >= players[1].score ? 'P1' : 'P2';
      const winColor = players[0].score >= players[1].score ? players[0].color : players[1].color;
      ctx.fillStyle = winColor;
      ctx.fillText(`${winner} GAGNE ! (${Math.max(players[0].score, players[1].score)} pts)`, canvas.width / 2, canvas.height / 2 + 65);
    }

    ctx.textAlign = 'left'; // reset
  }
}

function gameLoop() {
  spawnObstacle();
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

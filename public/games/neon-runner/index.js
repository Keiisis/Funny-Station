// === Neon Runner (Funny Station JS Game) ===

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.getElementById('game-canvas-container').appendChild(canvas);
const ctx = canvas.getContext('2d');

// Game state
let player = {
  x: canvas.width / 2,
  y: canvas.height - 120,
  size: 20,
  speed: 10
};

let obstacles = [];
let particles = [];
let keys = {};
let score = 0;
let gameOver = false;
let frame = 0;
let trophyUnlocked = false;

// Controls
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Listen for parent window keyboard events (mobile controller via Supabase Realtime)
try {
  if (window.parent && window.parent !== window) {
    window.parent.addEventListener('keydown', (e) => {
      keys[e.key] = true;
    });
    window.parent.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });
  }
} catch (e) {
  // Cross-origin - parent access blocked
}

// Listen for funny_gamepad_action custom events (mobile controller direct bridge)
const directionToKey = {
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
  const key = directionToKey[e.detail?.direction];
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
  player.y = canvas.height - 120;
});

function spawnObstacle() {
  if (frame % 15 === 0 && !gameOver) {
    obstacles.push({
      x: Math.random() * canvas.width,
      y: -20,
      size: 15 + Math.random() * 20,
      speed: 4 + Math.random() * 6,
      color: `hsl(${280 + Math.random() * 60}, 100%, 60%)` // Neon pinks/violets
    });
  }
}

function update() {
  if (gameOver) {
    if (keys['Enter'] || keys[' ']) {
      // Restart
      obstacles = [];
      score = 0;
      gameOver = false;
      player.x = canvas.width / 2;
    }
    return;
  }

  // Move player
  if (keys['ArrowLeft'] || keys['q'] || keys['a']) {
    player.x = Math.max(player.size, player.x - player.speed);
  }
  if (keys['ArrowRight'] || keys['d']) {
    player.x = Math.min(canvas.width - player.size, player.x + player.speed);
  }

  // Move obstacles
  obstacles.forEach((obs, idx) => {
    obs.y += obs.speed;

    // Collision check
    const dist = Math.hypot(obs.x - player.x, obs.y - player.y);
    if (dist < (obs.size / 2 + player.size)) {
      gameOver = true;
      // Trigger haptics via parent if supported
      if (window.funnyStation && window.funnyStation.save) {
        // Just an SDK trigger example
      }
    }

    // Dodged
    if (obs.y > canvas.height + 20) {
      obstacles.splice(idx, 1);
      score += 10;

      // Unlock trophy at 200 points
      if (score >= 200 && !trophyUnlocked) {
        trophyUnlocked = true;
        if (window.funnyStation && window.funnyStation.unlockTrophy) {
          window.funnyStation.unlockTrophy('t1');
        }
      }
    }
  });

  frame++;
}

function draw() {
  // Clear
  ctx.fillStyle = 'rgba(10, 10, 18, 0.2)'; // Trailing effect
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw player (glowing triangle)
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00d2ff';
  ctx.fillStyle = '#00d2ff';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - player.size);
  ctx.lineTo(player.x - player.size, player.y + player.size);
  ctx.lineTo(player.x + player.size, player.y + player.size);
  ctx.closePath();
  ctx.fill();

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
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillText(`SCORE: ${score}`, 30, 45);

  if (score < 200) {
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
    ctx.fillText('Appuyez sur ESPACE ou ENTRÉE pour rejouer', canvas.width / 2, canvas.height / 2 + 30);
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

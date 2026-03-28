const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  distance: document.getElementById("distance"),
  status: document.getElementById("status"),
};

const state = {
  keys: { left: false, right: false, jump: false },
  jumpLatch: false,
  cameraX: 0,
  score: 0,
  mode: "ready",
  worldWidth: 0,
  finishX: 0,
  collectibles: [],
  enemies: [],
  platforms: [],
  clouds: [],
  bushes: [],
};

const SCALE = 4;
const GRAVITY = 0.52;
const MOVE_ACCEL = 0.45;
const FRICTION = 0.8;
const MAX_SPEED = 4.2;
const JUMP_VELOCITY = -10.5;
const FLOOR_Y = 454;

const hero = {
  x: 56,
  y: FLOOR_Y - 48,
  w: 28,
  h: 40,
  vx: 0,
  vy: 0,
  grounded: false,
  coyote: 0,
  facing: 1,
};

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function resetWorld() {
  state.score = 0;
  state.mode = "running";
  state.cameraX = 0;
  state.collectibles = [
    rect(224, 320, 16, 16),
    rect(612, 266, 16, 16),
    rect(958, 206, 16, 16),
    rect(1236, 252, 16, 16),
    rect(1688, 186, 16, 16),
    rect(2048, 328, 16, 16),
  ];
  state.platforms = [
    rect(0, FLOOR_Y, 2450, 86),
    rect(180, 360, 120, 18),
    rect(340, 314, 84, 18),
    rect(520, 306, 104, 18),
    rect(700, 252, 96, 18),
    rect(872, 222, 96, 18),
    rect(1080, 286, 118, 18),
    rect(1260, 266, 86, 18),
    rect(1410, 222, 92, 18),
    rect(1586, 192, 92, 18),
    rect(1780, 342, 118, 18),
    rect(1952, 356, 96, 18),
    rect(2144, 280, 104, 18),
  ];
  state.enemies = [
    { x: 430, y: FLOOR_Y - 24, w: 24, h: 24, minX: 398, maxX: 492, dir: 1, speed: 1.2 },
    { x: 1010, y: FLOOR_Y - 24, w: 24, h: 24, minX: 972, maxX: 1126, dir: -1, speed: 1.4 },
    { x: 1872, y: FLOOR_Y - 24, w: 24, h: 24, minX: 1824, maxX: 2010, dir: 1, speed: 1.3 },
  ];
  state.clouds = [
    { x: 120, y: 80, size: 1.1 },
    { x: 420, y: 110, size: 0.9 },
    { x: 880, y: 74, size: 1.25 },
    { x: 1310, y: 104, size: 1.0 },
    { x: 1710, y: 66, size: 1.2 },
    { x: 2140, y: 94, size: 0.95 },
  ];
  state.bushes = [
    { x: 110, y: FLOOR_Y - 30, size: 1.1 },
    { x: 620, y: FLOOR_Y - 28, size: 1.3 },
    { x: 1180, y: FLOOR_Y - 24, size: 0.9 },
    { x: 1490, y: FLOOR_Y - 24, size: 1.2 },
    { x: 2090, y: FLOOR_Y - 26, size: 1.15 },
  ];
  state.finishX = 2305;
  state.worldWidth = 2450;

  hero.x = 56;
  hero.y = FLOOR_Y - 48;
  hero.vx = 0;
  hero.vy = 0;
  hero.grounded = false;
  hero.coyote = 0;
  hero.facing = 1;
  syncUI();
}

function syncUI() {
  ui.score.textContent = String(state.score);
  ui.distance.textContent = `${Math.max(0, Math.floor(hero.x / 10))}m`;
  ui.status.textContent =
    state.mode === "win" ? "Beacon" : state.mode === "dead" ? "Retry" : "Run";
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function handleInput() {
  if (state.keys.left) {
    hero.vx -= MOVE_ACCEL;
    hero.facing = -1;
  }
  if (state.keys.right) {
    hero.vx += MOVE_ACCEL;
    hero.facing = 1;
  }
  if (!state.keys.left && !state.keys.right) {
    hero.vx *= FRICTION;
  }
  hero.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, hero.vx));

  if (state.keys.jump && !state.jumpLatch && (hero.grounded || hero.coyote > 0)) {
    hero.vy = JUMP_VELOCITY;
    hero.grounded = false;
    hero.coyote = 0;
  }
  state.jumpLatch = state.keys.jump;
}

function updateHero() {
  handleInput();

  hero.vy += GRAVITY;
  hero.x += hero.vx;
  hero.y += hero.vy;
  hero.coyote = Math.max(0, hero.coyote - 1);

  if (hero.x < 0) {
    hero.x = 0;
    hero.vx = 0;
  }

  hero.grounded = false;

  for (const platform of state.platforms) {
    const body = { x: hero.x, y: hero.y, w: hero.w, h: hero.h };
    if (!overlap(body, platform)) {
      continue;
    }

    const prevY = hero.y - hero.vy;
    const wasAbove = prevY + hero.h <= platform.y + 4;
    if (hero.vy >= 0 && wasAbove) {
      hero.y = platform.y - hero.h;
      hero.vy = 0;
      hero.grounded = true;
      hero.coyote = 6;
    } else if (hero.vy < 0) {
      hero.y = platform.y + platform.h;
      hero.vy = 1.2;
    }
  }

  if (hero.y > canvas.height + 120) {
    triggerDefeat();
  }

  const hitbox = { x: hero.x, y: hero.y, w: hero.w, h: hero.h };
  state.collectibles = state.collectibles.filter((item) => {
    if (!overlap(hitbox, item)) {
      return true;
    }
    state.score += 1;
    return false;
  });

  for (const enemy of state.enemies) {
    enemy.x += enemy.speed * enemy.dir;
    if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
      enemy.dir *= -1;
    }
    if (overlap(hitbox, enemy)) {
      const stomp = hero.vy > 0 && hero.y + hero.h - enemy.y < 18;
      if (stomp) {
        hero.vy = -7.5;
        enemy.dead = true;
      } else {
        triggerDefeat();
      }
    }
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);

  if (hero.x + hero.w >= state.finishX) {
    state.mode = "win";
    hero.vx *= 0.9;
  }

  state.cameraX += ((hero.x - canvas.width * 0.38) - state.cameraX) * 0.12;
  state.cameraX = Math.max(0, Math.min(state.cameraX, state.worldWidth - canvas.width));
  syncUI();
}

function triggerDefeat() {
  if (state.mode !== "running") {
    return;
  }
  state.mode = "dead";
  ui.status.textContent = "Retry";
  setTimeout(resetWorld, 900);
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#dbe88d");
  grad.addColorStop(0.62, "#9bbc0f");
  grad.addColorStop(1, "#567d46");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const cloud of state.clouds) {
    const x = cloud.x - state.cameraX * 0.25;
    drawCloud(x, cloud.y, cloud.size);
  }

  for (let i = 0; i < 16; i += 1) {
    const hillX = i * 180 - (state.cameraX * 0.45) % 180;
    drawHill(hillX, 308 + (i % 3) * 18, 94, i % 2 === 0 ? "#5e8c3f" : "#4a6c34");
  }

  for (const bush of state.bushes) {
    const x = bush.x - state.cameraX * 0.82;
    drawBush(x, bush.y, bush.size);
  }
}

function drawCloud(x, y, size) {
  ctx.fillStyle = "#f7ffd4";
  const w = 50 * size;
  ctx.fillRect(x, y, w, 16 * size);
  ctx.fillRect(x + 12 * size, y - 12 * size, w * 0.72, 20 * size);
  ctx.fillRect(x + 26 * size, y + 12 * size, w * 0.4, 10 * size);
}

function drawHill(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, canvas.height);
  ctx.lineTo(x + size / 2, y);
  ctx.lineTo(x + size, canvas.height);
  ctx.closePath();
  ctx.fill();
}

function drawBush(x, y, size) {
  ctx.fillStyle = "#31572c";
  ctx.fillRect(x, y, 56 * size, 24 * size);
  ctx.fillRect(x + 10 * size, y - 12 * size, 36 * size, 20 * size);
}

function drawPlatform(platform) {
  const x = platform.x - state.cameraX;
  ctx.fillStyle = platform.y >= FLOOR_Y ? "#7f5539" : "#936639";
  ctx.fillRect(x, platform.y, platform.w, platform.h);
  ctx.fillStyle = "#ddb892";
  for (let i = 0; i < platform.w; i += 28) {
    ctx.fillRect(x + i + 2, platform.y + 2, 18, 6);
  }
  ctx.fillStyle = "#583101";
  for (let i = 0; i < platform.w; i += 28) {
    ctx.fillRect(x + i + 10, platform.y + 10, 4, platform.h - 12);
  }
}

function drawGem(item) {
  const x = item.x - state.cameraX;
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.moveTo(x + 8, item.y);
  ctx.lineTo(x + 16, item.y + 8);
  ctx.lineTo(x + 8, item.y + 16);
  ctx.lineTo(x, item.y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff3bf";
  ctx.fillRect(x + 5, item.y + 3, 6, 6);
}

function drawBeacon() {
  const x = state.finishX - state.cameraX;
  ctx.fillStyle = "#1b4332";
  ctx.fillRect(x, 180, 16, FLOOR_Y - 180);
  ctx.fillStyle = "#f28482";
  ctx.beginPath();
  ctx.moveTo(x + 16, 182);
  ctx.lineTo(x + 62, 196);
  ctx.lineTo(x + 16, 220);
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(enemy) {
  const x = enemy.x - state.cameraX;
  const y = enemy.y;
  ctx.fillStyle = "#6d597a";
  ctx.fillRect(x, y + 6, 24, 18);
  ctx.fillStyle = "#b56576";
  ctx.fillRect(x + 4, y, 16, 12);
  ctx.fillStyle = "#081c15";
  ctx.fillRect(x + 6, y + 4, 3, 3);
  ctx.fillRect(x + 15, y + 4, 3, 3);
}

function drawHero() {
  const x = hero.x - state.cameraX;
  const y = hero.y;
  const step = Math.abs(hero.vx) > 0.3 ? Math.floor(Date.now() / 120) % 2 : 0;
  const dir = hero.facing;

  ctx.save();
  ctx.translate(x + hero.w / 2, 0);
  ctx.scale(dir, 1);
  ctx.translate(-(x + hero.w / 2), 0);

  ctx.fillStyle = "#081c15";
  ctx.fillRect(x + 8, y, 12, 8);
  ctx.fillStyle = "#efc84a";
  ctx.fillRect(x + 4, y + 6, 20, 8);
  ctx.fillStyle = "#f6bd60";
  ctx.fillRect(x + 7, y + 14, 14, 12);
  ctx.fillStyle = "#2d6a4f";
  ctx.fillRect(x + 4, y + 24, 20, 10);
  ctx.fillStyle = "#1b4332";
  ctx.fillRect(x + 4, y + 34, 7, 6 + step);
  ctx.fillRect(x + 17, y + 34, 7, 6 + (1 - step));
  ctx.fillStyle = "#bc4749";
  ctx.fillRect(x + 1, y + 8, 4, 16);
  ctx.fillRect(x + 23, y + 8, 4, 16);
  ctx.restore();
}

function drawMessage() {
  if (state.mode === "running") {
    return;
  }
  ctx.fillStyle = "rgba(8, 28, 21, 0.72)";
  ctx.fillRect(180, 170, 600, 160);
  ctx.fillStyle = "#f7ffd4";
  ctx.textAlign = "center";
  ctx.font = "24px 'Press Start 2P'";
  ctx.fillText(state.mode === "win" ? "Beacon Reached" : "Rebooting", canvas.width / 2, 228);
  ctx.font = "14px 'Press Start 2P'";
  ctx.fillText(
    state.mode === "win" ? "You cleared the demo stage." : "Stand by for another run.",
    canvas.width / 2,
    272,
  );
}

function render() {
  drawBackground();
  state.platforms.forEach(drawPlatform);
  state.collectibles.forEach(drawGem);
  state.enemies.forEach(drawEnemy);
  drawBeacon();
  drawHero();
  drawMessage();
}

function frame() {
  if (state.mode === "running") {
    updateHero();
  }
  render();
  requestAnimationFrame(frame);
}

function bindKeyboard() {
  const on = (event, value) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyZ"].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === "ArrowLeft") state.keys.left = value;
    if (event.code === "ArrowRight") state.keys.right = value;
    if (event.code === "ArrowUp" || event.code === "Space" || event.code === "KeyZ") {
      state.keys.jump = value;
    }
  };

  window.addEventListener("keydown", (event) => on(event, true));
  window.addEventListener("keyup", (event) => on(event, false));
}

function bindTouch() {
  document.querySelectorAll(".touch-btn").forEach((button) => {
    const action = button.dataset.action;
    const setPressed = (pressed) => {
      button.classList.toggle("is-active", pressed);
      state.keys[action] = pressed;
    };
    ["pointerdown", "pointerenter"].forEach((name) => {
      button.addEventListener(name, (event) => {
        if (event.buttons !== 1 && name === "pointerenter") {
          return;
        }
        event.preventDefault();
        setPressed(true);
      });
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
      button.addEventListener(name, (event) => {
        event.preventDefault();
        setPressed(false);
      });
    });
  });
}

resetWorld();
bindKeyboard();
bindTouch();
frame();

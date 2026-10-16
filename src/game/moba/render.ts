import type { GameState, Vec2 } from "./types";
import { MAP_SIZE, LANE_PATHS, JUNGLE_CAMPS, RIVER_WIDTH } from "./map";

const COLORS = {
  grass: "#1a2e1a",
  grassDark: "#152615",
  lane: "#3d5c3d",
  laneEdge: "#2d452d",
  river: "#1a3a5c",
  riverEdge: "#152f4a",
  jungle: "#0f1f0f",
  blue: "#4a9eff",
  blueDark: "#2d6bcc",
  red: "#ff4a4a",
  redDark: "#cc2d2d",
  turret: "#8a9099",
  turretBlue: "#4a9eff",
  turretRed: "#ff4a4a",
  nexus: "#d6dde4",
  nexusBlue: "#4a9eff",
  nexusRed: "#ff4a4a",
  player: "#d6dde4",
  playerOutline: "#ffffff",
  camp: "#5ea38a",
  hpBar: "#5ea38a",
  hpBarBg: "#2a2a30",
  minionBlue: "#6bb3ff",
  minionRed: "#ff6b6b",
  projectileBlue: "#9ecbff",
  projectileRed: "#ffb3b3",
  xpBar: "#c8ccd4",
};

export function render(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number): void {
  const { camera } = state;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  drawMap(ctx);
  drawRiver(ctx);
  drawJungle(ctx);
  drawLanes(ctx);
  drawCamps(ctx);
  drawNexus(ctx, state);
  drawTurrets(ctx, state);
  drawMinions(ctx, state);
  drawBots(ctx, state);
  drawGolem(ctx, state);
  drawProjectiles(ctx, state);
  drawAbilityEffects(ctx, state);
  drawPlayer(ctx, state);

  ctx.restore();
}

function drawMap(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  const gridSize = 128;
  for (let x = 0; x <= MAP_SIZE; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= MAP_SIZE; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_SIZE, y);
    ctx.stroke();
  }
}

function drawRiver(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = COLORS.river;
  ctx.lineWidth = RIVER_WIDTH;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, MAP_SIZE);
  ctx.lineTo(MAP_SIZE, 0);
  ctx.stroke();

  ctx.strokeStyle = COLORS.riverEdge;
  ctx.lineWidth = RIVER_WIDTH + 8;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(0, MAP_SIZE);
  ctx.lineTo(MAP_SIZE, 0);
  ctx.stroke();
  ctx.restore();
}

function drawJungle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.jungle;
  const jungleAreas = [
    { x: 500, y: 500, w: 700, h: 700 },
    { x: 1360, y: 1360, w: 700, h: 700 },
    { x: 500, y: 1360, w: 700, h: 700 },
    { x: 1360, y: 500, w: 700, h: 700 },
  ];
  for (const area of jungleAreas) {
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.w, area.h, 20);
    ctx.fill();
  }
}

function drawLanes(ctx: CanvasRenderingContext2D): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const path of Object.values(LANE_PATHS)) {
    ctx.strokeStyle = COLORS.laneEdge;
    ctx.lineWidth = 90;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.lane;
    ctx.lineWidth = 70;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  }
}

function drawCamps(ctx: CanvasRenderingContext2D): void {
  for (const camp of JUNGLE_CAMPS) {
    ctx.fillStyle = COLORS.camp;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(camp.pos.x, camp.pos.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.camp;
    ctx.beginPath();
    ctx.arc(camp.pos.x, camp.pos.y, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTurrets(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const turret of state.turrets) {
    if (!turret.alive) continue;

    const color = turret.team === "blue" ? COLORS.turretBlue : COLORS.turretRed;
    const size = 20 + turret.tier * 6;

    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(turret.pos.x - size / 2, turret.pos.y - size / 2, size, size, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.roundRect(turret.pos.x - size / 2 + 4, turret.pos.y - size / 2 + 4, size - 8, size / 3, 4);
    ctx.fill();

    drawHealthBar(ctx, turret.pos.x, turret.pos.y - size / 2 - 12, 40, 5, turret.hp / turret.maxHp, color);
  }
}

function drawNexus(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawNexusStructure(ctx, state.nexusBlue, COLORS.nexusBlue);
  drawNexusStructure(ctx, state.nexusRed, COLORS.nexusRed);
}

function drawNexusStructure(ctx: CanvasRenderingContext2D, nexus: { pos: Vec2; hp: number; maxHp: number; alive: boolean }, color: string): void {
  if (!nexus.alive) return;

  const size = 50;

  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(nexus.pos.x, nexus.pos.y - size);
  ctx.lineTo(nexus.pos.x + size, nexus.pos.y);
  ctx.lineTo(nexus.pos.x, nexus.pos.y + size);
  ctx.lineTo(nexus.pos.x - size, nexus.pos.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(nexus.pos.x, nexus.pos.y - size + 10);
  ctx.lineTo(nexus.pos.x + size - 10, nexus.pos.y);
  ctx.lineTo(nexus.pos.x, nexus.pos.y + size - 10);
  ctx.lineTo(nexus.pos.x - size + 10, nexus.pos.y);
  ctx.closePath();
  ctx.fill();

  drawHealthBar(ctx, nexus.pos.x, nexus.pos.y - size - 16, 60, 6, nexus.hp / nexus.maxHp, color);
}

function drawMinions(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const minion of state.minions) {
    if (!minion.alive) continue;

    const color = minion.team === "blue" ? COLORS.minionBlue : COLORS.minionRed;

    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(minion.pos.x, minion.pos.y, minion.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (minion.isRanged) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(minion.pos.x, minion.pos.y, minion.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawHealthBar(ctx, minion.pos.x, minion.pos.y - minion.radius - 8, 24, 3, minion.hp / minion.maxHp, color);
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const proj of state.projectiles) {
    if (!proj.alive) continue;

    const color = proj.team === "blue" ? COLORS.projectileBlue : COLORS.projectileRed;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(proj.pos.x, proj.pos.y, proj.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(proj.pos.x, proj.pos.y, proj.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

function drawBots(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const bot of state.bots) {
    if (!bot.alive) continue;

    const color = COLORS.red;
    const r = bot.radius;

    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bot.pos.x, bot.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(bot.pos.x - r * 0.3, bot.pos.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    drawHealthBar(ctx, bot.pos.x, bot.pos.y - r - 12, 36, 4, bot.hp / bot.maxHp, color);
  }
}

function drawGolem(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { golem } = state;
  if (!golem.alive) return;

  const r = golem.radius;
  const pulse = 1 + Math.sin(state.time * 2) * 0.05;

  ctx.fillStyle = "#5ea38a";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(golem.pos.x, golem.pos.y, r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(golem.pos.x - r * 0.3, golem.pos.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  drawHealthBar(ctx, golem.pos.x, golem.pos.y - r - 14, 50, 5, golem.hp / golem.maxHp, "#5ea38a");

  if (state.golemBuffActive) {
    ctx.save();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + Math.sin(state.time * 4) * 0.3;
    ctx.beginPath();
    ctx.arc(golem.pos.x, golem.pos.y, r + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawAbilityEffects(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const fx of state.abilityEffects) {
    if (!fx.alive) continue;

    if (fx.type === "bolt") {
      ctx.save();
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(fx.pos.x - fx.vel.x * 0.03, fx.pos.y - fx.vel.y * 0.03);
      ctx.lineTo(fx.pos.x, fx.pos.y);
      ctx.stroke();

      ctx.fillStyle = fx.color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(fx.pos.x, fx.pos.y, fx.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (fx.type === "combo") {
      ctx.save();
      const progress = fx.elapsed / fx.duration;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(fx.pos.x, fx.pos.y, fx.radius * progress, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = fx.color;
      ctx.globalAlpha = 0.15 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.pos.x, fx.pos.y, fx.radius * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  if (state.shieldActive) {
    ctx.save();
    ctx.strokeStyle = "#5ea38a";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6 + Math.sin(state.time * 10) * 0.2;
    ctx.beginPath();
    ctx.arc(state.player.pos.x, state.player.pos.y, state.player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player } = state;
  if (!player.alive) return;

  const r = player.radius;

  ctx.save();
  ctx.translate(player.pos.x, player.pos.y);
  ctx.rotate(player.facing);

  ctx.fillStyle = COLORS.player;
  ctx.strokeStyle = COLORS.playerOutline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.blue;
  ctx.beginPath();
  ctx.moveTo(r + 8, 0);
  ctx.lineTo(r - 4, -6);
  ctx.lineTo(r - 4, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  drawHealthBar(ctx, player.pos.x, player.pos.y - r - 14, 44, 5, player.hp / player.maxHp, COLORS.hpBar);
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  color: string,
): void {
  ctx.fillStyle = COLORS.hpBarBg;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y, w, h, 2);
  ctx.fill();

  if (pct > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w * Math.max(0, pct), h, 2);
    ctx.fill();
  }
}

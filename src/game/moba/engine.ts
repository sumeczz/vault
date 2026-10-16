import type { GameState, Player, Camera, Minion, Projectile, Team, Lane, AbilityId, AbilityEffect, Bot, Golem } from "./types";
import {
  MAP_SIZE,
  LANE_PATHS,
  createTurrets,
  createNexusBlue,
  createNexusRed,
  WAVE_INTERVAL,
  MINIONS_PER_WAVE,
  MINION_MELEE_HP,
  MINION_RANGED_HP,
  MINION_MELEE_DMG,
  MINION_RANGED_DMG,
  MINION_SPEED,
  MINION_MELEE_RANGE,
  MINION_RANGED_RANGE,
  PLAYER_ATTACK_RANGE,
  PLAYER_ATTACK_DMG,
  PLAYER_ATTACK_SPEED,
} from "./map";

const BOLT_COST = 20;
const BOLT_DMG = 40;
const BOLT_SPEED = 600;
const BOLT_RANGE = 300;
const SHIELD_COST = 30;
const SHIELD_DURATION = 2;
const SHIELD_HP = 80;
const BLINK_COST = 15;
  const BLINK_DISTANCE = 200;
const COMBO_WINDOW = 1.5;
const COMBO_DMG = 60;
const COMBO_RADIUS = 120;

const PLAYER_SPEED = 220;
const PLAYER_RADIUS = 18;
const CAMERA_LERP = 0.12;
const MAP_MARGIN = 50;
const XP_PER_MINION = 20;
const XP_PER_LEVEL = 100;
const MAX_LEVEL = 10;
const RESPAWN_BASE = 5;
const RESPAWN_PER_LEVEL = 2;
const BOT_SPEED = 120;
const BOT_HP = 400;
const BOT_DMG = 20;
const BOT_ATTACK_RANGE = 100;
const BOT_RESPAWN = 15;
const GOLEM_HP = 800;
const GOLEM_DMG = 30;
const GOLEM_RESPAWN = 30;
const GOLEM_BUFF_DURATION = 10;

let nextMinionId = 0;
let nextProjectileId = 0;

export function createInitialState(): GameState {
  const player: Player = {
    id: "player",
    pos: { x: 350, y: 2210 },
    vel: { x: 0, y: 0 },
    hp: 600,
    maxHp: 600,
    energy: 100,
    maxEnergy: 100,
    level: 1,
    xp: 0,
    xpToNext: XP_PER_LEVEL,
    speed: PLAYER_SPEED,
    radius: PLAYER_RADIUS,
    facing: -Math.PI / 4,
    attackCooldown: PLAYER_ATTACK_SPEED,
    lastAttackTime: 0,
    alive: true,
    respawnTimer: 0,
  };

  const camera: Camera = {
    x: player.pos.x,
    y: player.pos.y,
    zoom: 1,
  };

  const bots: Bot[] = [
    { id: "bot-top", team: "red", lane: "top", pos: { x: 2210, y: 350 }, hp: BOT_HP, maxHp: BOT_HP, damage: BOT_DMG, speed: BOT_SPEED, radius: 16, alive: true, respawnTimer: 0, attackCooldown: 1, lastAttackTime: 0, waypointIndex: 1, targetId: null, state: "push" },
    { id: "bot-mid", team: "red", lane: "mid", pos: { x: 2210, y: 350 }, hp: BOT_HP, maxHp: BOT_HP, damage: BOT_DMG, speed: BOT_SPEED, radius: 16, alive: true, respawnTimer: 0, attackCooldown: 1, lastAttackTime: 0, waypointIndex: 1, targetId: null, state: "push" },
    { id: "bot-bot", team: "red", lane: "bot", pos: { x: 2210, y: 350 }, hp: BOT_HP, maxHp: BOT_HP, damage: BOT_DMG, speed: BOT_SPEED, radius: 16, alive: true, respawnTimer: 0, attackCooldown: 1, lastAttackTime: 0, waypointIndex: 1, targetId: null, state: "push" },
  ];

  const golem: Golem = {
    id: "golem",
    pos: { x: 1280, y: 1280 },
    hp: GOLEM_HP,
    maxHp: GOLEM_HP,
    damage: GOLEM_DMG,
    radius: 25,
    alive: true,
    respawnTimer: 0,
    attackCooldown: 1,
    lastAttackTime: 0,
    targetId: null,
  };

  return {
    player,
    camera,
    turrets: createTurrets(),
    nexusBlue: createNexusBlue(),
    nexusRed: createNexusRed(),
    minions: [],
    projectiles: [],
    abilityEffects: [],
    bots,
    golem,
    time: 0,
    gameOver: false,
    winner: null,
    lastWaveTime: 0,
    waveNumber: 0,
    lastAbilityUsed: null,
    comboActive: false,
    comboTimer: 0,
    shieldActive: false,
    shieldTimer: 0,
    golemBuffActive: false,
    golemBuffTimer: 0,
  };
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  ability1: boolean;
  ability2: boolean;
  ability3: boolean;
}

export function updateGame(state: GameState, input: InputState, dt: number): void {
  if (state.gameOver) return;

  state.time += dt;

  updatePlayer(state, input, dt);
  handleAbilities(state, input);
  spawnWaves(state);
  updateMinions(state, dt);
  updateBots(state, dt);
  updateGolem(state, dt);
  updateTurrets(state, dt);
  updateProjectiles(state, dt);
  updateAbilityEffects(state, dt);
  updateCamera(state, dt);
  checkWinCondition(state);
}

function updatePlayer(state: GameState, input: InputState, dt: number): void {
  const { player } = state;

  if (!player.alive) {
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) {
      player.alive = true;
      player.hp = player.maxHp;
      player.pos = { x: 350, y: 2210 };
    }
    return;
  }

  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
    player.facing = Math.atan2(dy, dx);
  }

  player.vel.x = dx * player.speed;
  player.vel.y = dy * player.speed;

  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;

  player.pos.x = Math.max(MAP_MARGIN, Math.min(MAP_SIZE - MAP_MARGIN, player.pos.x));
  player.pos.y = Math.max(MAP_MARGIN, Math.min(MAP_SIZE - MAP_MARGIN, player.pos.y));

  player.energy = Math.min(player.maxEnergy, player.energy + 8 * dt);
  player.lastAttackTime += dt;

  tryPlayerAttack(state);
}

function handleAbilities(state: GameState, input: InputState): void {
  const { player } = state;
  if (!player.alive) return;

  if (input.ability1) {
    input.ability1 = false;
    useAbility(state, "bolt");
  }
  if (input.ability2) {
    input.ability2 = false;
    useAbility(state, "shield");
  }
  if (input.ability3) {
    input.ability3 = false;
    useAbility(state, "blink");
  }

  if (state.comboActive) {
    state.comboTimer -= 1 / 60;
    if (state.comboTimer <= 0) {
      state.comboActive = false;
    }
  }

  if (state.shieldActive) {
    state.shieldTimer -= 1 / 60;
    if (state.shieldTimer <= 0) {
      state.shieldActive = false;
    }
  }
}

function useAbility(state: GameState, id: AbilityId): void {
  const { player } = state;
  if (!player.alive) return;

  const now = state.time;

  if (state.lastAbilityUsed && now - state.lastAbilityUsed.time < COMBO_WINDOW) {
    if (state.lastAbilityUsed.id !== id) {
      triggerCombo(state);
    }
  }

  state.lastAbilityUsed = { id, time: now };

  switch (id) {
    case "bolt": {
      if (player.energy < BOLT_COST) return;
      player.energy -= BOLT_COST;
      const effect: AbilityEffect = {
        id: `fx-${Date.now()}-${Math.random()}`,
        type: "bolt",
        pos: { ...player.pos },
        vel: { x: Math.cos(player.facing) * BOLT_SPEED, y: Math.sin(player.facing) * BOLT_SPEED },
        damage: BOLT_DMG + player.level * 5,
        team: "blue",
        radius: 10,
        maxRange: BOLT_RANGE,
        distanceTraveled: 0,
        alive: true,
        color: "#9ecbff",
        duration: BOLT_RANGE / BOLT_SPEED,
        elapsed: 0,
      };
      state.abilityEffects.push(effect);
      break;
    }
    case "shield": {
      if (player.energy < SHIELD_COST) return;
      player.energy -= SHIELD_COST;
      state.shieldActive = true;
      state.shieldTimer = SHIELD_DURATION;
      player.hp = Math.min(player.maxHp, player.hp + SHIELD_HP);
      break;
    }
    case "blink": {
      if (player.energy < BLINK_COST) return;
      player.energy -= BLINK_COST;
      const bx = player.pos.x + Math.cos(player.facing) * BLINK_DISTANCE;
      const by = player.pos.y + Math.sin(player.facing) * BLINK_DISTANCE;
      player.pos.x = Math.max(50, Math.min(MAP_SIZE - 50, bx));
      player.pos.y = Math.max(50, Math.min(MAP_SIZE - 50, by));
      break;
    }
  }
}

function triggerCombo(state: GameState): void {
  const { player } = state;
  state.comboActive = true;
  state.comboTimer = 1.0;

  const effect: AbilityEffect = {
    id: `combo-${Date.now()}`,
    type: "combo",
    pos: { ...player.pos },
    vel: { x: 0, y: 0 },
    damage: COMBO_DMG + player.level * 8,
    team: "blue",
    radius: COMBO_RADIUS,
    maxRange: 0,
    distanceTraveled: 0,
    alive: true,
    color: "#ffd700",
    duration: 0.5,
    elapsed: 0,
  };
  state.abilityEffects.push(effect);

  for (const minion of state.minions) {
    if (!minion.alive || minion.team === "blue") continue;
    const dist = distance(player.pos, minion.pos);
    if (dist < COMBO_RADIUS) {
      dealDamage(state, minion, effect.damage, "blue");
    }
  }

  for (const turret of state.turrets) {
    if (!turret.alive || turret.team === "blue") continue;
    const dist = distance(player.pos, turret.pos);
    if (dist < COMBO_RADIUS) {
      dealDamage(state, turret, effect.damage, "blue");
    }
  }
}

function updateAbilityEffects(state: GameState, dt: number): void {
  for (const fx of state.abilityEffects) {
    if (!fx.alive) continue;
    fx.elapsed += dt;

    if (fx.type === "bolt") {
      const dx = fx.vel.x * dt;
      const dy = fx.vel.y * dt;
      fx.pos.x += dx;
      fx.pos.y += dy;
      fx.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

      if (fx.distanceTraveled > fx.maxRange) {
        fx.alive = false;
        continue;
      }

      for (const minion of state.minions) {
        if (!minion.alive || minion.team === fx.team) continue;
        if (distance(fx.pos, minion.pos) < fx.radius + minion.radius) {
          dealDamage(state, minion, fx.damage, fx.team);
          fx.alive = false;
          break;
        }
      }

      if (!fx.alive) continue;

      for (const turret of state.turrets) {
        if (!turret.alive || turret.team === fx.team) continue;
        if (distance(fx.pos, turret.pos) < fx.radius + 20) {
          dealDamage(state, turret, fx.damage, fx.team);
          fx.alive = false;
          break;
        }
      }
    } else if (fx.type === "combo") {
      if (fx.elapsed >= fx.duration) {
        fx.alive = false;
      }
    }
  }

  state.abilityEffects = state.abilityEffects.filter((fx) => fx.alive);
}

function tryPlayerAttack(state: GameState): void {
  const { player } = state;
  if (!player.alive || player.lastAttackTime < player.attackCooldown) return;

  const target = findNearestEnemy(state, player.pos, PLAYER_ATTACK_RANGE, "blue");
  if (!target) return;

  player.lastAttackTime = 0;
  player.facing = Math.atan2(target.pos.y - player.pos.y, target.pos.x - player.pos.x);

  const projectile: Projectile = {
    id: `proj-${nextProjectileId++}`,
    pos: { ...player.pos },
    vel: {
      x: Math.cos(player.facing) * 400,
      y: Math.sin(player.facing) * 400,
    },
    damage: PLAYER_ATTACK_DMG + (player.level - 1) * 5,
    team: "blue",
    radius: 6,
    maxRange: PLAYER_ATTACK_RANGE + 20,
    distanceTraveled: 0,
    alive: true,
  };
  state.projectiles.push(projectile);
}

function spawnWaves(state: GameState): void {
  if (state.time - state.lastWaveTime < WAVE_INTERVAL) return;
  state.lastWaveTime = state.time;
  state.waveNumber++;

  const lanes: Lane[] = ["top", "mid", "bot"];
  for (const lane of lanes) {
    for (const team of ["blue", "red"] as Team[]) {
      spawnWave(state, lane, team);
    }
  }
}

function spawnWave(state: GameState, lane: Lane, team: Team): void {
  const path = LANE_PATHS[lane];
  const start = path[0];

  for (let i = 0; i < MINIONS_PER_WAVE; i++) {
    const isRanged = i >= 3;
    const offset = (i - 2) * 30;

    const minion: Minion = {
      id: `min-${nextMinionId++}`,
      team,
      lane,
      pos: { x: start.x + offset, y: start.y + offset },
      hp: isRanged ? MINION_RANGED_HP : MINION_MELEE_HP,
      maxHp: isRanged ? MINION_RANGED_HP : MINION_MELEE_HP,
      damage: isRanged ? MINION_RANGED_DMG : MINION_MELEE_DMG,
      speed: MINION_SPEED,
      radius: isRanged ? 10 : 12,
      alive: true,
      isRanged,
      range: isRanged ? MINION_RANGED_RANGE : MINION_MELEE_RANGE,
      attackCooldown: 1,
      lastAttackTime: 0,
      waypointIndex: 1,
      targetId: null,
    };
    state.minions.push(minion);
  }
}

function updateMinions(state: GameState, dt: number): void {
  for (const minion of state.minions) {
    if (!minion.alive) continue;

    minion.lastAttackTime += dt;

    const target = findMinionTarget(state, minion);
    if (target) {
      const dist = distance(minion.pos, target.pos);
      if (dist <= minion.range) {
        if (minion.lastAttackTime >= minion.attackCooldown) {
          minion.lastAttackTime = 0;
          dealDamage(state, target, minion.damage, minion.team);
        }
      } else {
        moveToward(state, minion, target.pos, dt);
      }
    } else {
      moveAlongLane(state, minion, dt);
    }
  }

  state.minions = state.minions.filter((m) => m.alive);
}

function findMinionTarget(state: GameState, minion: Minion): { pos: { x: number; y: number }; id: string; hp: number; alive: boolean } | null {
  const enemyTeam = minion.team === "blue" ? "red" : "blue";

  for (const other of state.minions) {
    if (!other.alive || other.team === minion.team) continue;
    if (distance(minion.pos, other.pos) < minion.range + 50) {
      return other;
    }
  }

  for (const turret of state.turrets) {
    if (!turret.alive || turret.team === minion.team) continue;
    if (distance(minion.pos, turret.pos) < minion.range + 50) {
      return turret;
    }
  }

  if (enemyTeam === "red" && state.player.alive) {
    if (distance(minion.pos, state.player.pos) < minion.range + 50) {
      return state.player;
    }
  }

  const nexus = enemyTeam === "blue" ? state.nexusBlue : state.nexusRed;
  if (nexus.alive && distance(minion.pos, nexus.pos) < minion.range + 100) {
    return nexus;
  }

  return null;
}

function moveAlongLane(state: GameState, minion: Minion, dt: number): void {
  const path = LANE_PATHS[minion.lane];
  if (minion.waypointIndex >= path.length) return;

  const target = path[minion.waypointIndex];
  const dist = distance(minion.pos, target);

  if (dist < 20) {
    minion.waypointIndex++;
    return;
  }

  moveToward(state, minion, target, dt);
}

function moveToward(state: GameState, minion: Minion, target: { x: number; y: number }, dt: number): void {
  const dx = target.x - minion.pos.x;
  const dy = target.y - minion.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  minion.pos.x += (dx / dist) * minion.speed * dt;
  minion.pos.y += (dy / dist) * minion.speed * dt;
}

function updateBots(state: GameState, dt: number): void {
  for (const bot of state.bots) {
    if (!bot.alive) {
      bot.respawnTimer -= dt;
      if (bot.respawnTimer <= 0) {
        bot.alive = true;
        bot.hp = bot.maxHp;
        bot.pos = { x: 2210, y: 350 };
        bot.state = "push";
      }
      continue;
    }

    bot.lastAttackTime += dt;

    if (bot.hp < bot.maxHp * 0.3) {
      bot.state = "retreat";
    } else if (bot.hp > bot.maxHp * 0.7) {
      bot.state = "push";
    }

    const target = findBotTarget(state, bot);
    if (target) {
      const dist = distance(bot.pos, target.pos);
      if (dist <= BOT_ATTACK_RANGE) {
        if (bot.lastAttackTime >= bot.attackCooldown) {
          bot.lastAttackTime = 0;
          dealDamage(state, target, bot.damage, bot.team);
        }
      } else {
        moveTowardBot(state, bot, target.pos, dt);
      }
    } else if (bot.state === "retreat") {
      moveTowardBot(state, bot, { x: 2210, y: 350 }, dt);
    } else {
      moveAlongLaneBot(state, bot, dt);
    }
  }
}

function findBotTarget(state: GameState, bot: Bot): { pos: { x: number; y: number }; id: string; hp: number; alive: boolean } | null {
  for (const minion of state.minions) {
    if (!minion.alive || minion.team === bot.team) continue;
    if (distance(bot.pos, minion.pos) < BOT_ATTACK_RANGE + 50) {
      return minion;
    }
  }

  if (state.player.alive && distance(bot.pos, state.player.pos) < BOT_ATTACK_RANGE + 50) {
    return state.player;
  }

  for (const turret of state.turrets) {
    if (!turret.alive || turret.team === bot.team) continue;
    if (distance(bot.pos, turret.pos) < BOT_ATTACK_RANGE + 50) {
      return turret;
    }
  }

  return null;
}

function moveAlongLaneBot(state: GameState, bot: Bot, dt: number): void {
  const path = LANE_PATHS[bot.lane];
  if (bot.waypointIndex >= path.length) return;

  const target = path[path.length - 1 - bot.waypointIndex + 1] || path[path.length - 1];
  const dist = distance(bot.pos, target);

  if (dist < 30) {
    bot.waypointIndex = Math.min(bot.waypointIndex + 1, path.length - 1);
    return;
  }

  moveTowardBot(state, bot, target, dt);
}

function moveTowardBot(state: GameState, bot: Bot, target: { x: number; y: number }, dt: number): void {
  const dx = target.x - bot.pos.x;
  const dy = target.y - bot.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  bot.pos.x += (dx / dist) * bot.speed * dt;
  bot.pos.y += (dy / dist) * bot.speed * dt;
}

function updateGolem(state: GameState, dt: number): void {
  const { golem } = state;

  if (!golem.alive) {
    golem.respawnTimer -= dt;
    if (golem.respawnTimer <= 0) {
      golem.alive = true;
      golem.hp = golem.maxHp;
      golem.pos = { x: 1280, y: 1280 };
    }
    return;
  }

  golem.lastAttackTime += dt;

  if (state.player.alive && distance(golem.pos, state.player.pos) < 80) {
    if (golem.lastAttackTime >= golem.attackCooldown) {
      golem.lastAttackTime = 0;
      dealDamage(state, state.player, golem.damage, "red");
    }
  }

  for (const minion of state.minions) {
    if (!minion.alive) continue;
    if (distance(golem.pos, minion.pos) < 80) {
      if (golem.lastAttackTime >= golem.attackCooldown) {
        golem.lastAttackTime = 0;
        dealDamage(state, minion, golem.damage, "red");
      }
      break;
    }
  }

  if (state.golemBuffActive) {
    state.golemBuffTimer -= dt;
    if (state.golemBuffTimer <= 0) {
      state.golemBuffActive = false;
    }
  }
}

function updateTurrets(state: GameState, dt: number): void {
  for (const turret of state.turrets) {
    if (!turret.alive) continue;

    turret.lastAttackTime += dt;

    const target = findNearestEnemy(state, turret.pos, turret.range, turret.team);
    if (!target) {
      turret.targetId = null;
      continue;
    }

    turret.targetId = target.id;

    if (turret.lastAttackTime >= turret.attackCooldown) {
      turret.lastAttackTime = 0;

      const angle = Math.atan2(target.pos.y - turret.pos.y, target.pos.x - turret.pos.x);
      const projectile: Projectile = {
        id: `proj-${nextProjectileId++}`,
        pos: { ...turret.pos },
        vel: { x: Math.cos(angle) * 500, y: Math.sin(angle) * 500 },
        damage: turret.damage,
        team: turret.team,
        radius: 8,
        maxRange: turret.range + 20,
        distanceTraveled: 0,
        alive: true,
      };
      state.projectiles.push(projectile);
    }
  }
}

function updateProjectiles(state: GameState, dt: number): void {
  for (const proj of state.projectiles) {
    if (!proj.alive) continue;

    const dx = proj.vel.x * dt;
    const dy = proj.vel.y * dt;
    proj.pos.x += dx;
    proj.pos.y += dy;
    proj.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

    if (proj.distanceTraveled > proj.maxRange) {
      proj.alive = false;
      continue;
    }

    for (const minion of state.minions) {
      if (!minion.alive || minion.team === proj.team) continue;
      if (distance(proj.pos, minion.pos) < proj.radius + minion.radius) {
        dealDamage(state, minion, proj.damage, proj.team);
        proj.alive = false;
        break;
      }
    }

    if (!proj.alive) continue;

    for (const turret of state.turrets) {
      if (!turret.alive || turret.team === proj.team) continue;
      if (distance(proj.pos, turret.pos) < proj.radius + 20) {
        dealDamage(state, turret, proj.damage, proj.team);
        proj.alive = false;
        break;
      }
    }

    if (!proj.alive) continue;

    if (proj.team === "red" && state.player.alive) {
      if (distance(proj.pos, state.player.pos) < proj.radius + state.player.radius) {
        dealDamage(state, state.player, proj.damage, proj.team);
        proj.alive = false;
      }
    }
  }

  state.projectiles = state.projectiles.filter((p) => p.alive);
}

function dealDamage(
  state: GameState,
  target: { hp: number; alive: boolean; id: string },
  damage: number,
  sourceTeam: Team,
): void {
  target.hp -= damage;
  if (target.hp > 0) return;

  target.hp = 0;
  target.alive = false;

  if (sourceTeam === "blue" && "xp" in state.player) {
    if (target.id.startsWith("min-")) {
      gainXp(state, XP_PER_MINION);
    }
  }
}

function gainXp(state: GameState, amount: number): void {
  const { player } = state;
  player.xp += amount;

  while (player.xp >= player.xpToNext && player.level < MAX_LEVEL) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = XP_PER_LEVEL * player.level;
    player.maxHp += 50;
    player.hp = player.maxHp;
  }
}

function findNearestEnemy(
  state: GameState,
  pos: { x: number; y: number },
  range: number,
  team: Team,
): { pos: { x: number; y: number }; id: string; hp: number; alive: boolean } | null {
  const enemyTeam = team === "blue" ? "red" : "blue";
  let nearest: { pos: { x: number; y: number }; id: string; hp: number; alive: boolean } | null = null;
  let nearestDist = range;

  for (const minion of state.minions) {
    if (!minion.alive || minion.team !== enemyTeam) continue;
    const dist = distance(pos, minion.pos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = minion;
    }
  }

  for (const turret of state.turrets) {
    if (!turret.alive || turret.team !== enemyTeam) continue;
    const dist = distance(pos, turret.pos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = turret;
    }
  }

  if (enemyTeam === "blue" && state.player.alive) {
    const dist = distance(pos, state.player.pos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = state.player;
    }
  }

  return nearest;
}

function updateCamera(state: GameState, _dt: number): void {
  const { player, camera } = state;
  camera.x += (player.pos.x - camera.x) * CAMERA_LERP;
  camera.y += (player.pos.y - camera.y) * CAMERA_LERP;
}

function checkWinCondition(state: GameState): void {
  if (state.nexusBlue.hp <= 0 && state.nexusBlue.alive) {
    state.nexusBlue.alive = false;
    state.gameOver = true;
    state.winner = "red";
  }
  if (state.nexusRed.hp <= 0 && state.nexusRed.alive) {
    state.nexusRed.alive = false;
    state.gameOver = true;
    state.winner = "blue";
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

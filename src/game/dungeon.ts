import { BOSS_POS, difficultyForLevel, ELITE_POS, SECTOR_SIZE } from "./difficulty";
import { ENEMY_SPAWN } from "./bestiary";
import { pick, randInt, randRange, type Rng } from "./rng";
import { ROOM_H, ROOM_W, WALL, type EnemyKind } from "./types";

export type Obstacle = { x: number; y: number; r: number };

export type RoomSpec = {
  w: number;
  h: number;
  obstacles: Obstacle[];
  isBoss: boolean;
  isElite: boolean;
  waves: Wave[];
};

export type WaveSpawn = { kind: EnemyKind; count: number };
export type Wave = { delay: number; spawns: WaveSpawn[] };
export type RoomPlan = {
  isBoss: boolean;
  isElite: boolean;
  obstacleCount: number;
  waves: Wave[];
};

export function generateRoom(rng: Rng, index: number, plan?: RoomPlan, globalLevel = index + 1): RoomSpec {
  const pos = ((index % SECTOR_SIZE) + SECTOR_SIZE) % SECTOR_SIZE;
  const isBoss = plan?.isBoss ?? pos === BOSS_POS;
  const isElite = plan?.isElite ?? ELITE_POS.includes(pos);
  const obstacles: Obstacle[] = [];
  const count = plan?.obstacleCount ?? (isBoss ? 3 : randInt(rng, 4, 8));
  const cx = ROOM_W / 2;
  const cy = ROOM_H / 2;
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 18; tries++) {
      const r = isBoss ? randRange(rng, 28, 46) : randRange(rng, 22, 48);
      const x = randRange(rng, WALL + r + 40, ROOM_W - WALL - r - 40);
      const y = randRange(rng, WALL + r + 40, ROOM_H - WALL - r - 40);
      if (Math.hypot(x - cx, y - cy) < 110) continue;
      let ok = true;
      for (const o of obstacles) {
        if (Math.hypot(o.x - x, o.y - y) < o.r + r + 36) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      obstacles.push({ x, y, r });
      break;
    }
  }
  const waves = plan
    ? plan.waves.map((wave) => ({ delay: wave.delay, spawns: wave.spawns.map((spawn) => ({ ...spawn })) }))
    : planWaves(rng, pos, globalLevel, isBoss, isElite);
  return { w: ROOM_W, h: ROOM_H, obstacles, isBoss, isElite, waves };
}

export function defaultRoomPlan(rng: Rng, index: number, globalLevel = index + 1): RoomPlan {
  const pos = ((index % SECTOR_SIZE) + SECTOR_SIZE) % SECTOR_SIZE;
  const isBoss = pos === BOSS_POS;
  const isElite = ELITE_POS.includes(pos);
  return {
    isBoss,
    isElite,
    obstacleCount: isBoss ? 3 : randInt(rng, 4, 8),
    waves: planWaves(rng, pos, globalLevel, isBoss, isElite),
  };
}

function planWaves(rng: Rng, pos: number, globalLevel: number, isBoss: boolean, isElite: boolean): Wave[] {
  const diff = difficultyForLevel(globalLevel);
  if (isBoss) {
    const tier = diff.bossTier;
    const waves: Wave[] = [{ delay: 0.6, spawns: [{ kind: "boss", count: 1 }] }];
    // T1+: adds, T2+: víc adds / druhá vlna elit, T3+: tlak od začátku
    const addShooters = Math.min(4, 2 + tier);
    const addGrunts = Math.min(6, 3 + tier);
    waves.push({ delay: 8, spawns: [{ kind: "shooter", count: addShooters }, { kind: "grunt", count: addGrunts }] });
    if (tier >= 2) {
      waves.push({ delay: 10, spawns: [{ kind: "bomber", count: 2 }, { kind: "rusher", count: 2 }] });
    }
    return waves;
  }
  const t = globalLevel;
  const waves: Wave[] = [];
  const nWaves = Math.min(diff.waves, 1 + (pos >= 2 ? 1 : 0) + (pos >= 6 ? 1 : 0));
  for (let w = 0; w < nWaves; w++) {
    const spawns: WaveSpawn[] = [];
    const budget = 3 + t + diff.budgetBonus * 0.15 + (isElite ? 2 : 0) + w * 2;
    let left = budget;
    while (left > 0) {
      const kind = pickKind(rng, t);
      const cost = kindCost(kind);
      const count = Math.max(1, Math.min(4, Math.floor(left / cost)));
      spawns.push({ kind, count });
      left -= cost * count;
      if (spawns.length > 5) break;
    }
    waves.push({ delay: w === 0 ? 0.7 : 0.2, spawns });
  }
  return waves;
}

function kindCost(k: EnemyKind): number {
  if (k === "boss") return 10;
  return ENEMY_SPAWN.find((e) => e.kind === k)?.cost ?? 1;
}

function pickKind(rng: Rng, t: number): EnemyKind {
  const pool = ENEMY_SPAWN.filter((e) => t >= e.minLevel).map(
    (e) => [e.kind, e.weight] as [EnemyKind, number],
  );
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of pool) {
    r -= w;
    if (r <= 0) return k;
  }
  return "grunt";
}

export function spawnEdge(rng: Rng, obstacles: Obstacle[]): { x: number; y: number } {
  for (let i = 0; i < 20; i++) {
    const side = randInt(rng, 0, 3);
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = randRange(rng, WALL + 40, ROOM_W - WALL - 40);
      y = WALL + 50;
    } else if (side === 1) {
      x = randRange(rng, WALL + 40, ROOM_W - WALL - 40);
      y = ROOM_H - WALL - 50;
    } else if (side === 2) {
      x = WALL + 50;
      y = randRange(rng, WALL + 40, ROOM_H - WALL - 40);
    } else {
      x = ROOM_W - WALL - 50;
      y = randRange(rng, WALL + 40, ROOM_H - WALL - 40);
    }
    let ok = true;
    for (const o of obstacles) {
      if (Math.hypot(o.x - x, o.y - y) < o.r + 28) ok = false;
    }
    if (ok) return { x, y };
  }
  return { x: WALL + 80, y: WALL + 80 };
}



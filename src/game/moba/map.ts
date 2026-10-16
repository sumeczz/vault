import type { Vec2, Turret, Nexus, Lane, Team } from "./types";

export const MAP_SIZE = 2560;

export const NEXUS_BLUE: Vec2 = { x: 350, y: 2210 };
export const NEXUS_RED: Vec2 = { x: 2210, y: 350 };

export const LANE_PATHS: Record<Lane, Vec2[]> = {
  top: [
    { x: 350, y: 2210 },
    { x: 350, y: 350 },
    { x: 2210, y: 350 },
  ],
  mid: [
    { x: 350, y: 2210 },
    { x: 1280, y: 1280 },
    { x: 2210, y: 350 },
  ],
  bot: [
    { x: 350, y: 2210 },
    { x: 2210, y: 2210 },
    { x: 2210, y: 350 },
  ],
};

export const WAVE_INTERVAL = 20;
export const MINIONS_PER_WAVE = 5;
export const MINION_MELEE_HP = 120;
export const MINION_RANGED_HP = 80;
export const MINION_MELEE_DMG = 12;
export const MINION_RANGED_DMG = 16;
export const MINION_SPEED = 80;
export const MINION_MELEE_RANGE = 30;
export const MINION_RANGED_RANGE = 120;
export const TURRET_RANGE = 180;
export const TURRET_DPS = 40;
export const PLAYER_ATTACK_RANGE = 140;
export const PLAYER_ATTACK_DMG = 25;
export const PLAYER_ATTACK_SPEED = 0.8;

export function createTurrets(): Turret[] {
  const turrets: Turret[] = [];
  const hpByTier = { 1: 1500, 2: 2000, 3: 2500 } as const;

  const add = (id: string, team: Team, lane: Lane, tier: 1 | 2 | 3, x: number, y: number) => {
    turrets.push({
      id,
      team,
      lane,
      tier,
      pos: { x, y },
      hp: hpByTier[tier],
      maxHp: hpByTier[tier],
      alive: true,
      range: TURRET_RANGE,
      damage: TURRET_DPS,
      attackCooldown: 1,
      lastAttackTime: 0,
      targetId: null,
    });
  };

  add("bt3", "blue", "top", 3, 350, 1800);
  add("bt2", "blue", "top", 2, 350, 1200);
  add("bt1", "blue", "top", 1, 350, 600);
  add("rt1", "red", "top", 1, 1200, 350);
  add("rt2", "red", "top", 2, 1800, 350);
  add("rt3", "red", "top", 3, 2210, 350);

  add("bm3", "blue", "mid", 3, 700, 1860);
  add("bm2", "blue", "mid", 2, 950, 1610);
  add("bm1", "blue", "mid", 1, 1200, 1360);
  add("rm1", "red", "mid", 1, 1360, 1200);
  add("rm2", "red", "mid", 2, 1610, 950);
  add("rm3", "red", "mid", 3, 1860, 700);

  add("bb3", "blue", "bot", 3, 1800, 2210);
  add("bb2", "blue", "bot", 2, 1200, 2210);
  add("bb1", "blue", "bot", 1, 600, 2210);
  add("rb1", "red", "bot", 1, 2210, 1200);
  add("rb2", "red", "bot", 2, 2210, 1800);
  add("rb3", "red", "bot", 3, 2210, 2210);

  return turrets;
}

export function createNexusBlue(): Nexus {
  return { id: "nexus-blue", team: "blue", pos: { ...NEXUS_BLUE }, hp: 3000, maxHp: 3000, alive: true };
}

export function createNexusRed(): Nexus {
  return { id: "nexus-red", team: "red", pos: { ...NEXUS_RED }, hp: 3000, maxHp: 3000, alive: true };
}

export const JUNGLE_CAMPS: { pos: Vec2; name: string }[] = [
  { pos: { x: 800, y: 800 }, name: "Blue Buff" },
  { pos: { x: 1760, y: 1760 }, name: "Red Buff" },
  { pos: { x: 1280, y: 600 }, name: "Golem" },
  { pos: { x: 600, y: 1280 }, name: "Golem" },
  { pos: { x: 1760, y: 800 }, name: "Wolf" },
  { pos: { x: 800, y: 1760 }, name: "Wolf" },
];

export const RIVER_CENTER: Vec2 = { x: 1280, y: 1280 };
export const RIVER_WIDTH = 200;

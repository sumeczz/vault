import { chance, pick, randInt, randRange, type Rng } from "./rng";
import { RARITY_ORDER, type RarityWeights } from "./rarity-settings";
import { blueprintDamageMult, blueprintSlots, killsToRank, maxSlotsFor } from "./mods";
import {
  ARCHETYPE_LABEL,
  ELEMENT_COLOR,
  RARITY_COLOR,
  type Affix,
  type ArchetypeId,
  type BehaviorId,
  type Element,
  type Rarity,
  type Weapon,
  type WeaponStats,
} from "./types";

type ArchStats = {
  damage: [number, number];
  rpm: [number, number];
  spread: number;
  pellets: [number, number];
  mag: [number, number];
  reload: [number, number];
  speed: [number, number];
  size: [number, number];
  range: [number, number];
  knockback: number;
};

export type WeaponDef = {
  id: string;
  name: string;
  archetype: ArchetypeId;
  weight: number;
  element: Element;
  stats: ArchStats;
  behaviors: Partial<Record<BehaviorId, number>>;
  critChance: number;
  critMult: number;
};

type ArchDef = {
  id: ArchetypeId;
  stats: ArchStats;
  innate?: Partial<Record<BehaviorId, number>>;
};

const ARCH: ArchDef[] = [
  {
    id: "pistol",
    stats: {
      damage: [13, 19],
      rpm: [210, 290],
      spread: 0.07,
      pellets: [1, 1],
      mag: [9, 14],
      reload: [0.75, 1.05],
      speed: [620, 740],
      size: [3.6, 4.4],
      range: [520, 680],
      knockback: 90,
    },
  },
  {
    id: "smg",
    stats: {
      damage: [6, 10],
      rpm: [520, 740],
      spread: 0.16,
      pellets: [1, 1],
      mag: [26, 42],
      reload: [1.05, 1.4],
      speed: [680, 800],
      size: [2.8, 3.5],
      range: [420, 540],
      knockback: 40,
    },
  },
  {
    id: "shotgun",
    stats: {
      damage: [7, 12],
      rpm: [62, 92],
      spread: 0.42,
      pellets: [5, 9],
      mag: [4, 8],
      reload: [1.35, 1.8],
      speed: [480, 580],
      size: [3.2, 4.2],
      range: [260, 340],
      knockback: 160,
    },
  },
  {
    id: "rifle",
    stats: {
      damage: [16, 24],
      rpm: [230, 330],
      spread: 0.05,
      pellets: [1, 1],
      mag: [18, 26],
      reload: [1.2, 1.55],
      speed: [780, 900],
      size: [4, 5],
      range: [680, 860],
      knockback: 80,
    },
  },
  {
    id: "sniper",
    stats: {
      damage: [42, 68],
      rpm: [38, 58],
      spread: 0.012,
      pellets: [1, 1],
      mag: [3, 6],
      reload: [1.5, 2],
      speed: [1050, 1250],
      size: [4.5, 5.5],
      range: [1100, 1400],
      knockback: 140,
    },
    innate: { pierce: 2, pierceArmor: 0.1 },
  },
  {
    id: "launcher",
    stats: {
      damage: [32, 50],
      rpm: [32, 52],
      spread: 0.08,
      pellets: [1, 1],
      mag: [2, 5],
      reload: [1.7, 2.2],
      speed: [340, 440],
      size: [7, 9],
      range: [520, 680],
      knockback: 220,
    },
    innate: { explode: 70 },
  },
  {
    id: "beam",
    stats: {
      damage: [18, 28],
      rpm: [540, 720],
      spread: 0.01,
      pellets: [1, 1],
      mag: [36, 64],
      reload: [1.1, 1.5],
      speed: [1400, 1600],
      size: [2.4, 3.2],
      range: [480, 620],
      knockback: 20,
    },
    innate: { beam: 1, pierce: 6 },
  },
  {
    id: "flamer",
    stats: {
      damage: [5, 9],
      rpm: [640, 900],
      spread: 0.28,
      pellets: [1, 2],
      mag: [40, 70],
      reload: [1.3, 1.7],
      speed: [240, 320],
      size: [6, 8.5],
      range: [150, 210],
      knockback: 30,
    },
    innate: { burn: 8 },
  },
  {
    id: "bouncer",
    stats: {
      damage: [11, 17],
      rpm: [150, 220],
      spread: 0.1,
      pellets: [1, 2],
      mag: [10, 16],
      reload: [1.1, 1.5],
      speed: [500, 620],
      size: [4.2, 5.4],
      range: [640, 860],
      knockback: 70,
    },
    innate: { bounce: 4 },
  },
  {
    id: "minigun",
    stats: {
      damage: [5, 8],
      rpm: [760, 1020],
      spread: 0.2,
      pellets: [1, 1],
      mag: [70, 120],
      reload: [2.1, 2.8],
      speed: [700, 820],
      size: [3, 3.8],
      range: [500, 640],
      knockback: 25,
    },
  },
  {
    id: "rail",
    stats: {
      damage: [55, 88],
      rpm: [22, 38],
      spread: 0.004,
      pellets: [1, 1],
      mag: [2, 4],
      reload: [1.6, 2.1],
      speed: [1800, 2000],
      size: [3.2, 4.2],
      range: [1200, 1500],
      knockback: 180,
    },
    innate: { pierce: 12, beam: 1, pierceArmor: 0.15 },
  },
  {
    id: "helix",
    stats: {
      damage: [9, 14],
      rpm: [210, 300],
      spread: 0.12,
      pellets: [2, 3],
      mag: [16, 24],
      reload: [1.15, 1.5],
      speed: [560, 680],
      size: [3.6, 4.6],
      range: [480, 620],
      knockback: 50,
    },
    innate: { split: 1 },
  },
  {
    id: "mortar",
    stats: {
      damage: [40, 64],
      rpm: [26, 42],
      spread: 0.06,
      pellets: [1, 1],
      mag: [2, 4],
      reload: [1.9, 2.4],
      speed: [300, 400],
      size: [8, 10],
      range: [560, 720],
      knockback: 240,
    },
    innate: { explode: 90 },
  },
  {
    id: "arc",
    stats: {
      damage: [12, 19],
      rpm: [170, 250],
      spread: 0.09,
      pellets: [1, 1],
      mag: [12, 18],
      reload: [1.2, 1.6],
      speed: [640, 760],
      size: [3.8, 4.8],
      range: [520, 680],
      knockback: 60,
    },
    innate: { chain: 3 },
  },
  {
    id: "swarm",
    stats: {
      damage: [4, 7],
      rpm: [300, 430],
      spread: 0.3,
      pellets: [3, 4],
      mag: [18, 28],
      reload: [1.3, 1.7],
      speed: [420, 540],
      size: [2.6, 3.4],
      range: [380, 500],
      knockback: 30,
    },
    innate: { homing: 2.4 },
  },
  {
    id: "harpoon",
    stats: {
      damage: [48, 76],
      rpm: [46, 70],
      spread: 0.02,
      pellets: [1, 1],
      mag: [4, 7],
      reload: [1.4, 1.9],
      speed: [900, 1100],
      size: [4, 5],
      range: [760, 980],
      knockback: 200,
    },
    innate: { pierce: 8, pierceArmor: 0.1 },
  },
];

export const DEFAULT_WEAPON_DEFS: WeaponDef[] = ARCH.map((def) => ({
  id: def.id,
  name: ARCHETYPE_LABEL[def.id].name,
  archetype: def.id,
  weight: 1,
  element: "kinetic",
  stats: { ...def.stats },
  behaviors: { ...def.innate },
  critChance: 0.04,
  critMult: 1.8,
}));

const PREFIXES: Affix[] = [
  {
    id: "rapid",
    slot: "prefix",
    weight: 1,
    nameM: "Rychlý",
    nameF: "Rychlá",
    stats: { rpm: 1.28, reload: 0.85 },
  },
  {
    id: "unstable",
    slot: "prefix",
    weight: 1,
    nameM: "Nestabilní",
    nameF: "Nestabilní",
    stats: { damage: 1.22, spread: 1.45 },
    behaviors: { explode: 36 },
  },
  {
    id: "frost",
    slot: "prefix",
    weight: 1,
    nameM: "Mrazivý",
    nameF: "Mrazivá",
    element: "ice",
    stats: { projSpeed: 0.9 },
    behaviors: { freeze: 0.7 },
  },
  {
    id: "venom",
    slot: "prefix",
    weight: 1,
    nameM: "Jedovatý",
    nameF: "Jedovatá",
    element: "toxic",
    behaviors: { poison: 7 },
  },
  {
    id: "arc",
    slot: "prefix",
    weight: 1,
    nameM: "Obloukový",
    nameF: "Oblouková",
    element: "shock",
    behaviors: { chain: 3, shockstun: 0.25 },
  },
  {
    id: "void",
    slot: "prefix",
    weight: 1,
    nameM: "Dutý",
    nameF: "Dutá",
    element: "void",
    stats: { damage: 1.12 },
    behaviors: { pierce: 2 },
  },
  {
    id: "heavy",
    slot: "prefix",
    weight: 1,
    nameM: "Těžký",
    nameF: "Těžká",
    stats: { damage: 1.35, rpm: 0.78, knockback: 1.5 },
  },
  {
    id: "twin",
    slot: "prefix",
    weight: 1,
    nameM: "Dvojitý",
    nameF: "Dvojitá",
    stats: { pellets: 1, spread: 1.2 },
    behaviors: { burst: 2 },
  },
  {
    id: "seeking",
    slot: "prefix",
    weight: 1,
    nameM: "Hledající",
    nameF: "Hledající",
    behaviors: { homing: 4.2 },
  },
  {
    id: "piercing",
    slot: "prefix",
    weight: 1,
    nameM: "Pronikavý",
    nameF: "Pronikavá",
    behaviors: { pierce: 3 },
  },
  {
    id: "scorch",
    slot: "prefix",
    weight: 1,
    nameM: "Žhavý",
    nameF: "Žhavá",
    element: "fire",
    behaviors: { burn: 10 },
  },
  {
    id: "pulse",
    slot: "prefix",
    weight: 1,
    nameM: "Pulzní",
    nameF: "Pulzní",
    stats: { damage: 1.1 },
    behaviors: { burst: 3 },
  },
  {
    id: "overcharged",
    slot: "prefix",
    weight: 1,
    nameM: "Přetížený",
    nameF: "Přetížená",
    element: "shock",
    stats: { damage: 1.18, magSize: 0.85 },
    behaviors: { shockstun: 0.4 },
  },
  {
    id: "silent",
    slot: "prefix",
    weight: 1,
    nameM: "Tichý",
    nameF: "Tichá",
    stats: { spread: 0.7, critChance: 0.12 },
  },
  {
    id: "jagged",
    slot: "prefix",
    weight: 1,
    nameM: "Zubatý",
    nameF: "Zubatá",
    stats: { critChance: 0.18, critMult: 0.35 },
  },
  {
    id: "wide",
    slot: "prefix",
    weight: 1,
    nameM: "Široký",
    nameF: "Široká",
    stats: { pellets: 1, spread: 1.35, projSize: 1.2 },
  },
];

const SUFFIXES: Affix[] = [
  {
    id: "flame",
    slot: "suffix",
    weight: 1,
    nameM: "plamenů",
    nameF: "plamenů",
    element: "fire",
    behaviors: { burn: 9, explode: 28 },
  },
  {
    id: "chains",
    slot: "suffix",
    weight: 1,
    nameM: "řetězů",
    nameF: "řetězů",
    element: "shock",
    behaviors: { chain: 4 },
  },
  {
    id: "echo",
    slot: "suffix",
    weight: 1,
    nameM: "ozvěny",
    nameF: "ozvěny",
    behaviors: { echo: 0.12 },
  },
  {
    id: "storm",
    slot: "suffix",
    weight: 1,
    nameM: "bouře",
    nameF: "bouře",
    element: "shock",
    stats: { rpm: 1.12, pellets: 1 },
  },
  {
    id: "split",
    slot: "suffix",
    weight: 1,
    nameM: "tříštění",
    nameF: "tříštění",
    behaviors: { split: 3 },
  },
  {
    id: "leech",
    slot: "suffix",
    weight: 1,
    nameM: "vysátí",
    nameF: "vysátí",
    behaviors: { lifesteal: 0.08 },
  },
  {
    id: "shards",
    slot: "suffix",
    weight: 1,
    nameM: "střepin",
    nameF: "střepin",
    stats: { pellets: 2, spread: 1.15 },
  },
  {
    id: "frostbite",
    slot: "suffix",
    weight: 1,
    nameM: "mrazu",
    nameF: "mrazu",
    element: "ice",
    behaviors: { freeze: 1.1 },
  },
  {
    id: "sparks",
    slot: "suffix",
    weight: 1,
    nameM: "jisker",
    nameF: "jisker",
    element: "shock",
    behaviors: { shockstun: 0.35 },
  },
  {
    id: "blood",
    slot: "suffix",
    weight: 1,
    nameM: "krve",
    nameF: "krve",
    stats: { critChance: 0.1 },
    behaviors: { lifesteal: 0.05 },
  },
  {
    id: "vacuum",
    slot: "suffix",
    weight: 1,
    nameM: "vakua",
    nameF: "vakua",
    element: "void",
    behaviors: { homing: 2.4, pierce: 1 },
  },
  {
    id: "return",
    slot: "suffix",
    weight: 1,
    nameM: "návratu",
    nameF: "návratu",
    behaviors: { bounce: 3 },
  },
  {
    id: "impact",
    slot: "suffix",
    weight: 1,
    nameM: "nárazu",
    nameF: "nárazu",
    stats: { knockback: 1.7, damage: 1.08 },
    behaviors: { knockback: 1 },
  },
  {
    id: "orbit",
    slot: "suffix",
    weight: 1,
    nameM: "orbitálu",
    nameF: "orbitálu",
    behaviors: { orbit: 3 },
  },
  {
    id: "overkill",
    slot: "suffix",
    weight: 1,
    nameM: "přetížení",
    nameF: "přetížení",
    stats: { damage: 1.25, magSize: 0.8 },
  },
  {
    id: "horizon",
    slot: "suffix",
    weight: 1,
    nameM: "horizontu",
    nameF: "horizontu",
    stats: { range: 1.4, projSpeed: 1.15 },
  },
];

type UniqueDef = {
  id: string;
  name: string;
  arch: ArchetypeId;
  element: Element;
  rarity: Rarity;
  weight: number;
  stats: Partial<WeaponStats>;
  behaviors: Partial<Record<BehaviorId, number>>;
};

export type { UniqueDef };

const UNIQUES: UniqueDef[] = [
  {
    id: "soudce",
    name: "Soudce",
    arch: "rail",
    element: "void",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 96, rpm: 28, magSize: 3, reload: 1.6 },
    behaviors: { pierce: 20, beam: 1, explode: 48 },
  },
  {
    id: "zimni-vdova",
    name: "Zimní vdova",
    arch: "sniper",
    element: "ice",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 74, rpm: 48, critChance: 0.35, critMult: 2.6 },
    behaviors: { freeze: 1.6, pierce: 4 },
  },
  {
    id: "hlas-trezoru",
    name: "Hlas trezoru",
    arch: "shotgun",
    element: "shock",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 14, pellets: 10, rpm: 78, magSize: 6 },
    behaviors: { chain: 2, knockback: 1 },
  },
  {
    id: "cervene-poledne",
    name: "Červené poledne",
    arch: "minigun",
    element: "fire",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 9, rpm: 1100, magSize: 140 },
    behaviors: { burn: 12 },
  },
  {
    id: "klikata",
    name: "Klikatá",
    arch: "bouncer",
    element: "kinetic",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 18, rpm: 240, pellets: 2 },
    behaviors: { bounce: 8, split: 2 },
  },
  {
    id: "posledni-slovo",
    name: "Poslední slovo",
    arch: "pistol",
    element: "void",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 34, rpm: 260, critChance: 0.4, magSize: 8 },
    behaviors: { lifesteal: 0.12, pierce: 2 },
  },
  {
    id: "dychani-pece",
    name: "Dýchání pece",
    arch: "flamer",
    element: "fire",
    rarity: "mythic",
    weight: 1,
    stats: { damage: 12, rpm: 980, range: 260, magSize: 80 },
    behaviors: { burn: 16, explode: 40 },
  },
  {
    id: "nulta-osa",
    name: "Nultá osa",
    arch: "beam",
    element: "ice",
    rarity: "mythic",
    weight: 1,
    stats: { damage: 36, rpm: 800, range: 720 },
    behaviors: { beam: 1, freeze: 0.8, pierce: 10 },
  },
  {
    id: "sepot-retezu",
    name: "Šepot řetězů",
    arch: "helix",
    element: "shock",
    rarity: "mythic",
    weight: 1,
    stats: { damage: 16, pellets: 4, rpm: 280 },
    behaviors: { chain: 5, split: 2, shockstun: 0.4 },
  },
  {
    id: "jadro-trezoru",
    name: "Jádro trezoru",
    arch: "launcher",
    element: "void",
    rarity: "mythic",
    weight: 1,
    stats: { damage: 70, rpm: 44, magSize: 4, projSize: 11 },
    behaviors: { explode: 110, homing: 2.2 },
  },
  {
    id: "zvony-zkazy",
    name: "Zvony zkázy",
    arch: "mortar",
    element: "fire",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 88, rpm: 34, magSize: 3 },
    behaviors: { explode: 130, burn: 10 },
  },
  {
    id: "tesla-srdec",
    name: "Teslův srdec",
    arch: "arc",
    element: "shock",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 22, rpm: 260, pellets: 2 },
    behaviors: { chain: 6, shockstun: 0.5 },
  },
  {
    id: "vcelin",
    name: "Včelín",
    arch: "swarm",
    element: "toxic",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 8, rpm: 460, pellets: 5, magSize: 30 },
    behaviors: { homing: 3.2, poison: 6 },
  },
  {
    id: "dlouhe-kopi",
    name: "Dlouhé kopí",
    arch: "harpoon",
    element: "kinetic",
    rarity: "mythic",
    weight: 1,
    stats: { damage: 120, rpm: 60, critChance: 0.3, critMult: 2.4 },
    behaviors: { pierce: 16, knockback: 1 },
  },
  {
    id: "polarnice",
    name: "Polárnice",
    arch: "harpoon",
    element: "ice",
    rarity: "legendary",
    weight: 1,
    stats: { damage: 64, rpm: 66, magSize: 6 },
    behaviors: { pierce: 10, freeze: 1.4 },
  },
  {
    id: "posledni-hreb",
    name: "Poslední hřeb",
    arch: "mortar",
    element: "void",
    rarity: "mythic",
    weight: 1,
    stats: { damage: 110, rpm: 30, magSize: 2, projSize: 12 },
    behaviors: { explode: 150, lifesteal: 0.1 },
  },
];

/** Násobiče rarity — pravidla docs/progression-rules.md §9 (dmg / zásobník / počet affixů). */
export const RARITY_MULT: Record<Rarity, { dmg: number; mag: number; affixes: number }> = {
  common: { dmg: 1, mag: 1, affixes: 0 },
  uncommon: { dmg: 1.08, mag: 1.05, affixes: 1 },
  rare: { dmg: 1.18, mag: 1.1, affixes: 2 },
  epic: { dmg: 1.32, mag: 1.16, affixes: 2 },
  legendary: { dmg: 1.5, mag: 1.22, affixes: 3 },
  mythic: { dmg: 1.72, mag: 1.3, affixes: 3 },
};

export const DEFAULT_AFFIXES: Affix[] = [...PREFIXES, ...SUFFIXES];
export const DEFAULT_UNIQUES: UniqueDef[] = [...UNIQUES];

function pickWeighted<T extends { weight?: number }>(rng: Rng, items: readonly T[]): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight ?? 1), 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)]!;
  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight ?? 1);
    if (roll < 0) return item;
  }
  return items.at(-1)!;
}

export function rollRarity(
  rng: Rng,
  roomIndex: number,
  isBoss: boolean,
  weights?: RarityWeights,
): Rarity {
  // Tabulka progrese — pravidla docs/progression-rules.md §9.
  // roomIndex je globální (0-based) úroveň napříč sektory — t roste i po 9. úrovni,
  // cap 1.35 drží lepší loot v pozdní hře, aniž by common úplně zmizel.
  const t = isBoss ? 1 : Math.min(1.35, roomIndex / 8);
  const table: [Rarity, number][] = weights
    ? RARITY_ORDER.map((rarity) => [rarity, Math.max(0, weights[rarity]) / 100])
    : [
        ["common", Math.max(0, 0.46 - t * 0.5)],
        ["uncommon", 0.32 - t * 0.12],
        ["rare", 0.16 + t * 0.18],
        ["epic", 0.05 + t * 0.22],
        ["legendary", 0.01 + t * 0.16],
        ["mythic", isBoss ? 0.18 : t * 0.06],
      ];
  const total = table.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let r = rng() * total;
  for (const [rar, w] of table) {
    r -= Math.max(0, w);
    if (r <= 0) return rar;
  }
  return "rare";
}

function lerpPair(rng: Rng, pair: [number, number]): number {
  return randRange(rng, pair[0], pair[1]);
}

function applyStatMod(stats: WeaponStats, mod: Partial<WeaponStats>) {
  if (mod.damage !== undefined) stats.damage *= mod.damage > 3 ? 1 : mod.damage;
  if (mod.rpm !== undefined) stats.rpm *= mod.rpm > 20 ? 1 : mod.rpm;
  if (mod.spread !== undefined) stats.spread *= mod.spread;
  if (mod.pellets !== undefined) stats.pellets += mod.pellets;
  if (mod.magSize !== undefined) stats.magSize *= mod.magSize > 3 ? 1 : mod.magSize;
  if (mod.reload !== undefined) stats.reload *= mod.reload;
  if (mod.projSpeed !== undefined) stats.projSpeed *= mod.projSpeed;
  if (mod.projSize !== undefined) stats.projSize *= mod.projSize;
  if (mod.range !== undefined) stats.range *= mod.range;
  if (mod.knockback !== undefined) stats.knockback *= mod.knockback;
  if (mod.critChance !== undefined) stats.critChance += mod.critChance;
  if (mod.critMult !== undefined) stats.critMult += mod.critMult;
}

function mergeBehaviors(
  a: Partial<Record<BehaviorId, number>>,
  b?: Partial<Record<BehaviorId, number>>,
) {
  if (!b) return;
  for (const key of Object.keys(b) as BehaviorId[]) {
    a[key] = (a[key] ?? 0) + (b[key] ?? 0);
  }
}

function colorsFor(element: Element, rarity: Rarity): Weapon["colors"] {
  return {
    body: "#2a2d33",
    accent: ELEMENT_COLOR[element],
    glow: RARITY_COLOR[rarity],
  };
}

function composeName(gender: "m" | "f", archName: string, prefix?: Affix, suffix?: Affix): string {
  const p = prefix ? (gender === "f" ? prefix.nameF : prefix.nameM) : "";
  const s = suffix ? suffix.nameM : "";
  if (p && s) return `${p} ${archName} ${s}`;
  if (p) return `${p} ${archName}`;
  if (s) return `${archName} ${s}`;
  return archName.charAt(0).toUpperCase() + archName.slice(1);
}

export function starterWeapon(): Weapon {
  return {
    id: "starter",
    name: "Služební pistole",
    unique: false,
    archetype: "pistol",
    rarity: "common",
    element: "kinetic",
    gender: "f",
    stats: {
      damage: 14,
      rpm: 240,
      spread: 0.07,
      pellets: 1,
      magSize: 12,
      reload: 0.9,
      projSpeed: 680,
      projSize: 4,
      range: 560,
      knockback: 80,
      critChance: 0.05,
      critMult: 1.8,
    },
    behaviors: {},
    colors: colorsFor("kinetic", "common"),
    slots: 1,
    mods: [],
  };
}

export function generateWeapon(
  rng: Rng,
  roomIndex: number,
  isBoss = false,
  weights?: RarityWeights,
  defs: readonly WeaponDef[] = DEFAULT_WEAPON_DEFS,
  affixes: readonly Affix[] = DEFAULT_AFFIXES,
  uniques: readonly UniqueDef[] = DEFAULT_UNIQUES,
  blueprints: Partial<Record<ArchetypeId, number>> = {},
): Weapon {
  const rarity = rollRarity(rng, roomIndex, isBoss, weights);
  const prefixes = affixes.filter((a) => a.slot === "prefix");
  const suffixes = affixes.filter((a) => a.slot === "suffix");
  const wantUnique =
    (rarity === "legendary" && chance(rng, 0.42)) || (rarity === "mythic" && chance(rng, 0.7));
  if (wantUnique && uniques.length > 0) {
    const pool = uniques.filter((u) => (rarity === "mythic" ? true : u.rarity !== "mythic"));
    const u = pickWeighted(rng, pool.length > 0 ? pool : uniques);
    const def = ARCH.find((a) => a.id === u.arch)!;
    const meta = ARCHETYPE_LABEL[u.arch];
    const stats: WeaponStats = {
      damage: lerpPair(rng, def.stats.damage),
      rpm: lerpPair(rng, def.stats.rpm),
      spread: def.stats.spread,
      pellets: randInt(rng, def.stats.pellets[0], def.stats.pellets[1]),
      magSize: randInt(rng, def.stats.mag[0], def.stats.mag[1]),
      reload: lerpPair(rng, def.stats.reload),
      projSpeed: lerpPair(rng, def.stats.speed),
      projSize: lerpPair(rng, def.stats.size),
      range: lerpPair(rng, def.stats.range),
      knockback: def.stats.knockback,
      critChance: 0.08,
      critMult: 2,
    };
    Object.assign(stats, u.stats);
    const behaviors: Partial<Record<BehaviorId, number>> = { ...(def.innate ?? {}) };
    mergeBehaviors(behaviors, u.behaviors);
    const rMult = RARITY_MULT[rarity];
    stats.damage *= rMult.dmg;
    stats.magSize = Math.max(2, Math.round(stats.magSize * rMult.mag));
    // Blueprint rank archetypu: trvalý DMG bonus (§23).
    const bpRank = killsToRank(blueprints[u.arch] ?? 0);
    stats.damage = Math.round(stats.damage * blueprintDamageMult(bpRank) * 10) / 10;
    return {
      id: `u-${u.name}-${randInt(rng, 1000, 9999)}`,
      name: u.name,
      unique: true,
      archetype: u.arch,
      rarity,
      element: u.element,
      gender: meta.gender,
      stats,
      behaviors,
      colors: colorsFor(u.element, rarity),
      slots: 0,
      mods: [],
    };
  }

  const totalWeight = defs.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  let weaponRoll = rng() * totalWeight;
  let def = defs[0]!;
  for (const item of defs) {
    weaponRoll -= Math.max(0, item.weight);
    if (weaponRoll < 0) {
      def = item;
      break;
    }
  }
  const meta = ARCHETYPE_LABEL[def.archetype];
  const rMult = RARITY_MULT[rarity];
  const stats: WeaponStats = {
    damage: lerpPair(rng, def.stats.damage) * rMult.dmg,
    rpm: lerpPair(rng, def.stats.rpm),
    spread: def.stats.spread * randRange(rng, 0.88, 1.12),
    pellets: randInt(rng, def.stats.pellets[0], def.stats.pellets[1]),
    magSize: Math.max(2, Math.round(randInt(rng, def.stats.mag[0], def.stats.mag[1]) * rMult.mag)),
    reload: lerpPair(rng, def.stats.reload),
    projSpeed: lerpPair(rng, def.stats.speed),
    projSize: lerpPair(rng, def.stats.size),
    range: lerpPair(rng, def.stats.range),
    knockback: def.stats.knockback,
    critChance: def.critChance + rMult.affixes * 0.03,
    critMult: def.critMult + rMult.affixes * 0.15,
  };
  const behaviors: Partial<Record<BehaviorId, number>> = { ...def.behaviors };
  let element: Element = def.element;
  const affixCount = rMult.affixes;
  let prefix: Affix | undefined;
  let suffix: Affix | undefined;
  if (affixCount >= 1 && prefixes.length > 0 && chance(rng, 0.85)) prefix = pickWeighted(rng, prefixes);
  if (affixCount >= 2 && suffixes.length > 0) suffix = pickWeighted(rng, suffixes);
  if (affixCount >= 3 && prefixes.length > 1 && chance(rng, 0.7)) {
    const extra = pickWeighted(
      rng,
      prefixes.filter((p) => p.id !== prefix?.id),
    );
    applyStatMod(stats, extra.stats ?? {});
    mergeBehaviors(behaviors, extra.behaviors);
    if (extra.element) element = extra.element;
  }
  if (prefix) {
    applyStatMod(stats, prefix.stats ?? {});
    mergeBehaviors(behaviors, prefix.behaviors);
    if (prefix.element) element = prefix.element;
  }
  if (suffix) {
    applyStatMod(stats, suffix.stats ?? {});
    mergeBehaviors(behaviors, suffix.behaviors);
    if (suffix.element) element = suffix.element;
  }
  stats.pellets = Math.max(1, Math.round(stats.pellets));
  stats.magSize = Math.max(2, Math.round(stats.magSize));
  stats.damage = Math.round(stats.damage * 10) / 10;
  const name = composeName(meta.gender, def.name, prefix, suffix);
  // Blueprint rank archetypu: trvalý DMG bonus + slot navíc (§23).
  const rank = killsToRank(blueprints[def.archetype] ?? 0);
  stats.damage = Math.round(stats.damage * blueprintDamageMult(rank) * 10) / 10;
  return {
    id: `w-${def.id}-${randInt(rng, 10000, 99999)}`,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    unique: false,
    archetype: def.archetype,
    rarity,
    element,
    gender: meta.gender,
    stats,
    behaviors,
    colors: colorsFor(element, rarity),
    slots: maxSlotsFor(rarity) + blueprintSlots(rank),
    mods: [],
  };
}

export function weaponBehaviorsList(w: Weapon): string[] {
  const labels: [BehaviorId, string, (v: number) => string][] = [
    ["pierce", "Průraz", (v) => `${Math.round(v)}`],
    ["bounce", "Odraz", (v) => `${Math.round(v)}`],
    ["homing", "Navádění", () => "ano"],
    ["explode", "Výbuch", (v) => `${Math.round(v)}`],
    ["burn", "Hoření", (v) => `${v.toFixed(0)}/s`],
    ["freeze", "Mráz", () => "ano"],
    ["chain", "Řetěz", (v) => `${Math.round(v)}`],
    ["lifesteal", "Vysátí", (v) => `${Math.round(v * 100)}%`],
    ["split", "Tříštění", (v) => `${Math.round(v)}`],
    ["burst", "Dávka", (v) => `${Math.round(v)}`],
    ["echo", "Ozvěna", () => "ano"],
    ["beam", "Paprsek", () => "ano"],
    ["poison", "Jed", (v) => `${v.toFixed(0)}/s`],
    ["shockstun", "Šok", () => "ano"],
    ["pierceArmor", "Průraznost", (v) => `${Math.round(v * 100)}%`],
    ["orbit", "Orbitál", (v) => `${Math.round(v)}`],
    ["knockback", "Knockback", () => "ano"],
  ];
  const out: string[] = [];
  for (const [id, label, fmt] of labels) {
    const v = w.behaviors[id];
    if (v && v > 0) out.push(`${label} ${fmt(v)}`);
  }
  return out;
}

export function dpsEstimate(w: Weapon): number {
  const shotsPerSec = w.stats.rpm / 60;
  const crit = 1 + w.stats.critChance * (w.stats.critMult - 1);
  return w.stats.damage * w.stats.pellets * shotsPerSec * crit;
}

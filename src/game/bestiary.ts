import { difficultyForLevel, getDifficulty, type DifficultySettings } from "./difficulty";
import { enemyArmorForLevel } from "./scaling";
import type { Rng } from "./rng";
import type { EnemyKind } from "./types";

/**
 * Bestiář — jediný zdroj základních hodnot nepřátel.
 * Aktuální hodnoty pro danou úroveň počítá enemyStatsAt(),
 * kterou používá simulace i stats panel (vždy stejná čísla).
 */

export const ENEMY_ORDER: EnemyKind[] = [
  "grunt",
  "rusher",
  "shooter",
  "splitter",
  "bomber",
  "tank",
  "sniper",
  "lezec",
  "drtic",
  "stin",
  "stopar",
  "des",
  "cepel",
  "nosorozec",
  "kopi",
  "kanonyr",
  "ostrostrelec",
  "jiskra",
  "vrhac",
  "gardista",
  "srsen",
  "spravce",
  "tekavka",
  "bourak",
  "roztoc",
  "medik",
  "matka",
  "boss",
];

export const ENEMY_NAME: Record<EnemyKind, string> = {
  grunt: "Rváč",
  rusher: "Trhač",
  shooter: "Střelec",
  splitter: "Dělič",
  bomber: "Bomber",
  tank: "Tank",
  sniper: "Sniper",
  lezec: "Lezec",
  drtic: "Drtič",
  stin: "Stín",
  stopar: "Stopař",
  des: "Děs",
  cepel: "Čepel",
  nosorozec: "Nosorožec",
  kopi: "Kopí",
  kanonyr: "Kanónýr",
  ostrostrelec: "Ostrostřelec",
  jiskra: "Jiskra",
  vrhac: "Vrhač",
  gardista: "Gardista",
  srsen: "Sršeň",
  spravce: "Správce",
  tekavka: "Těkavka",
  bourak: "Bourák",
  roztoc: "Roztoč",
  medik: "Medik",
  matka: "Matka",
  boss: "BOSS",
};

/** Typ útoku nepřítele — vidět v kodexu i bestiáři. */
export type EnemyAttack = "melee" | "charge" | "ranged" | "suicide" | "split" | "support" | "spawner" | "boss";

export const ENEMY_ATTACK: Record<EnemyKind, EnemyAttack> = {
  grunt: "melee",
  rusher: "charge",
  shooter: "ranged",
  splitter: "split",
  bomber: "suicide",
  tank: "ranged",
  sniper: "ranged",
  lezec: "melee",
  drtic: "melee",
  stin: "melee",
  stopar: "melee",
  des: "melee",
  cepel: "charge",
  nosorozec: "charge",
  kopi: "charge",
  kanonyr: "ranged",
  ostrostrelec: "ranged",
  jiskra: "ranged",
  vrhac: "ranged",
  gardista: "ranged",
  srsen: "ranged",
  spravce: "ranged",
  tekavka: "suicide",
  bourak: "suicide",
  roztoc: "split",
  medik: "support",
  matka: "spawner",
  boss: "boss",
};

export const ENEMY_ATTACK_LABEL: Record<EnemyAttack, string> = {
  melee: "blízko",
  charge: "výpad",
  ranged: "střelba",
  suicide: "sebevrah",
  split: "dělení",
  support: "podpora",
  spawner: "líheň",
  boss: "boss",
};

/** Střelecký profil: držení vzdálenosti, dostřel, kadence, počet střel, rychlost a velikost střely. */
export type RangedProfile = {
  want: number;
  max: number;
  cd: number;
  shots: number;
  speed: number;
  size: number;
};

export const ENEMY_RANGED: Partial<Record<EnemyKind, RangedProfile>> = {
  shooter: { want: 220, max: 340, cd: 1.05, shots: 1, speed: 210, size: 4 },
  sniper: { want: 300, max: 520, cd: 1.8, shots: 1, speed: 320, size: 4 },
  tank: { want: 0, max: 260, cd: 1.4, shots: 5, speed: 210, size: 4 },
  kanonyr: { want: 240, max: 380, cd: 1.7, shots: 3, speed: 230, size: 4 },
  ostrostrelec: { want: 320, max: 560, cd: 2.2, shots: 1, speed: 340, size: 5 },
  jiskra: { want: 150, max: 220, cd: 1.3, shots: 5, speed: 260, size: 3 },
  vrhac: { want: 200, max: 320, cd: 1.5, shots: 3, speed: 200, size: 4 },
  gardista: { want: 180, max: 300, cd: 1.9, shots: 3, speed: 220, size: 4 },
  srsen: { want: 230, max: 360, cd: 0.9, shots: 1, speed: 250, size: 3 },
  spravce: { want: 170, max: 420, cd: 2.4, shots: 8, speed: 210, size: 5 },
};

/** Výpadový profil: časovač, dosah výpadu a rychlost výpadu. */
export type ChargeProfile = {
  time: number;
  range: number;
  speed: number;
};

export const ENEMY_CHARGE: Partial<Record<EnemyKind, ChargeProfile>> = {
  rusher: { time: 1.6, range: 260, speed: 420 },
  cepel: { time: 1.2, range: 300, speed: 470 },
  nosorozec: { time: 2.1, range: 240, speed: 390 },
  kopi: { time: 1, range: 340, speed: 530 },
};

/** Sebevražedný výbuch: poloměr a násobič poškození bombera. */
export const ENEMY_BLAST: Partial<Record<EnemyKind, { r: number; mult: number }>> = {
  bomber: { r: 70, mult: 1 },
  tekavka: { r: 55, mult: 0.6 },
  bourak: { r: 115, mult: 1.8 },
};

/** Maximální hloubka dělení (splitter se dělí 2×, roztoč 1×). */
export const ENEMY_SPLIT_MAX: Partial<Record<EnemyKind, number>> = {
  splitter: 2,
  roztoc: 1,
};

/** Spawn-defnice druhu: od jaké globální úrovně padá, váha losu a cena do budgetu vlny. */
export type EnemySpawnDef = {
  kind: EnemyKind;
  minLevel: number;
  weight: number;
  cost: number;
};

/**
 * Jediný zdroj pravdy pro spawnování (čte dungeon i UI obrazovka Cesta).
 * Boss se losuje zvlášť (10. místnost), proto tu není.
 */
export const ENEMY_SPAWN: EnemySpawnDef[] = [
  { kind: "grunt", minLevel: 1, weight: 1.1, cost: 1 },
  { kind: "rusher", minLevel: 1, weight: 0.7, cost: 1 },
  { kind: "shooter", minLevel: 1, weight: 0.65, cost: 2 },
  { kind: "splitter", minLevel: 3, weight: 0.45, cost: 2 },
  { kind: "bomber", minLevel: 2, weight: 0.4, cost: 2 },
  { kind: "tank", minLevel: 4, weight: 0.35, cost: 3 },
  { kind: "sniper", minLevel: 5, weight: 0.3, cost: 3 },
  { kind: "lezec", minLevel: 1, weight: 0.55, cost: 1 },
  { kind: "stopar", minLevel: 1, weight: 0.5, cost: 1 },
  { kind: "tekavka", minLevel: 2, weight: 0.35, cost: 1 },
  { kind: "cepel", minLevel: 2, weight: 0.35, cost: 2 },
  { kind: "kanonyr", minLevel: 3, weight: 0.35, cost: 2 },
  { kind: "roztoc", minLevel: 3, weight: 0.3, cost: 2 },
  { kind: "stin", minLevel: 4, weight: 0.35, cost: 2 },
  { kind: "jiskra", minLevel: 4, weight: 0.3, cost: 2 },
  { kind: "nosorozec", minLevel: 5, weight: 0.3, cost: 3 },
  { kind: "vrhac", minLevel: 5, weight: 0.3, cost: 2 },
  { kind: "medik", minLevel: 6, weight: 0.22, cost: 2 },
  { kind: "srsen", minLevel: 6, weight: 0.35, cost: 1 },
  { kind: "drtic", minLevel: 8, weight: 0.28, cost: 3 },
  { kind: "gardista", minLevel: 8, weight: 0.28, cost: 3 },
  { kind: "ostrostrelec", minLevel: 10, weight: 0.25, cost: 3 },
  { kind: "bourak", minLevel: 10, weight: 0.25, cost: 3 },
  { kind: "kopi", minLevel: 12, weight: 0.28, cost: 2 },
  { kind: "matka", minLevel: 14, weight: 0.16, cost: 4 },
  { kind: "des", minLevel: 16, weight: 0.2, cost: 4 },
  { kind: "spravce", minLevel: 20, weight: 0.14, cost: 6 },
];

const BASE_HP: Record<EnemyKind, number> = {
  grunt: 32,
  rusher: 24,
  shooter: 28,
  tank: 140,
  splitter: 36,
  bomber: 30,
  sniper: 26,
  lezec: 22,
  drtic: 200,
  stin: 26,
  stopar: 40,
  des: 260,
  cepel: 46,
  nosorozec: 170,
  kopi: 60,
  kanonyr: 54,
  ostrostrelec: 60,
  jiskra: 34,
  vrhac: 48,
  gardista: 150,
  srsen: 24,
  spravce: 420,
  tekavka: 20,
  bourak: 160,
  roztoc: 30,
  medik: 70,
  matka: 220,
  boss: 820,
};

const BASE_SPEED: Record<EnemyKind, number> = {
  grunt: 92,
  rusher: 165,
  shooter: 70,
  tank: 52,
  splitter: 88,
  bomber: 110,
  sniper: 55,
  lezec: 150,
  drtic: 48,
  stin: 185,
  stopar: 110,
  des: 55,
  cepel: 120,
  nosorozec: 70,
  kopi: 130,
  kanonyr: 62,
  ostrostrelec: 58,
  jiskra: 95,
  vrhac: 75,
  gardista: 60,
  srsen: 140,
  spravce: 55,
  tekavka: 175,
  bourak: 60,
  roztoc: 100,
  medik: 80,
  matka: 50,
  boss: 78,
};

/** Základ kontaktního poškození (před násobičem obtížnosti). */
const BASE_CONTACT: Record<EnemyKind, number> = {
  grunt: 10,
  rusher: 10,
  shooter: 10,
  splitter: 10,
  bomber: 22,
  tank: 16,
  sniper: 10,
  lezec: 8,
  drtic: 22,
  stin: 9,
  stopar: 11,
  des: 24,
  cepel: 12,
  nosorozec: 20,
  kopi: 14,
  kanonyr: 8,
  ostrostrelec: 8,
  jiskra: 7,
  vrhac: 8,
  gardista: 14,
  srsen: 7,
  spravce: 16,
  tekavka: 14,
  bourak: 18,
  roztoc: 8,
  medik: 6,
  matka: 12,
  boss: 18,
};

/** Základ poškození střely (před násobičem obtížnosti). Střely mají jen tyto druhy. */
const BASE_BULLET: Partial<Record<EnemyKind, number>> = {
  shooter: 8,
  tank: 8,
  sniper: 16,
  kanonyr: 10,
  ostrostrelec: 16,
  jiskra: 6,
  vrhac: 9,
  gardista: 11,
  srsen: 7,
  spravce: 10,
  boss: 12,
};

export type EnemyStats = {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  contact: number;
  bullet: number | null;
  /** Zbroj (zlomek 0–0,3): od LVL 10 roste k Hlubině (pravidla §21). */
  armor: number;
};

/** Kompletní hodnoty nepřítele pro danou globální úroveň (1-based). */
export function enemyStatsAt(
  kind: EnemyKind,
  level: number,
  isElite = false,
  s?: DifficultySettings,
): EnemyStats {
  const settings = s ?? getDifficulty();
  const diff = difficultyForLevel(level, settings);
  const eliteBonus = isElite ? settings.eliteBonus : 0;
  const bossBonus = kind === "boss" ? diff.bossTier * settings.bossTierBonus : 0;
  return {
    kind,
    name: ENEMY_NAME[kind],
    hp: BASE_HP[kind] * (diff.hpMult + eliteBonus + bossBonus),
    speed: BASE_SPEED[kind] * diff.speedMult,
    contact: BASE_CONTACT[kind] * diff.dmgMult,
    bullet: BASE_BULLET[kind] !== undefined ? BASE_BULLET[kind]! * diff.dmgMult : null,
    armor: enemyArmorForLevel(level),
  };
}

/** Výbuch bombera v závislosti na úrovni (dřív 22 + roomIndex*2). */
export function bomberBlastAt(level: number): number {
  return (22 + (level - 1) * 2) * difficultyForLevel(level).dmgMult;
}

/** Fáze bosse — pravidla progression-rules §5.1. */
export type BossPhase = 1 | 2 | 3;

export function bossPhaseFor(hpFrac: number): BossPhase {
  if (hpFrac <= 0.3) return 3;
  if (hpFrac <= 0.7) return 2;
  return 1;
}

export const BOSS_PHASE_NAMES: Record<BossPhase, string> = {
  1: "Jádro",
  2: "Hněv",
  3: "Zuřivost",
};

export type BossPhaseStats = {
  shots: number;
  fireCd: number;
  speedMult: number;
};

export const BOSS_PHASE_STATS: Record<BossPhase, BossPhaseStats> = {
  1: { shots: 8, fireCd: 0.7, speedMult: 1 },
  2: { shots: 10, fireCd: 0.55, speedMult: 1.15 },
  3: { shots: 12, fireCd: 0.45, speedMult: 1.3 },
};

/** Adds při přechodu do fáze (spawnují se kolem bosse). */
export const BOSS_PHASE_ADDS: Record<BossPhase, { kind: EnemyKind; count: number }[]> = {
  1: [],
  2: [
    { kind: "shooter", count: 2 },
    { kind: "grunt", count: 2 },
  ],
  3: [
    { kind: "bomber", count: 2 },
    { kind: "rusher", count: 2 },
    { kind: "tekavka", count: 2 },
  ],
};

export function baseHp(kind: EnemyKind): number {
  return BASE_HP[kind];
}

export function baseSpeed(kind: EnemyKind): number {
  return BASE_SPEED[kind];
}

/** Elitní affixy — pravidla docs/progression-rules.md §5. */
export type EliteAffixId = "swift" | "armored" | "volatile" | "malevolent" | "gigantic" | "frenzied";

export type EliteAffixDef = {
  id: EliteAffixId;
  name: string;
  desc: string;
  color: string;
};

export const ELITE_AFFIXES: EliteAffixDef[] = [
  { id: "swift", name: "Hbitý", desc: "rychlost +35 %", color: "#c9c07a" },
  { id: "armored", name: "Pancéřovaný", desc: "HP +60 %", color: "#8fb4c8" },
  { id: "volatile", name: "Třaskavý", desc: "po smrti vybuchne", color: "#c45c3e" },
  { id: "malevolent", name: "Zhoubný", desc: "kontaktní dmg +50 %", color: "#9a6bc2" },
  { id: "gigantic", name: "Obří", desc: "HP +120 %, větší tělo", color: "#7a9a72" },
  { id: "frenzied", name: "Zběsilý", desc: "rychlost +20 %, dmg +25 %", color: "#d68a4a" },
];

export function affixDef(id: EliteAffixId): EliteAffixDef {
  return ELITE_AFFIXES.find((a) => a.id === id)!;
}

/**
 * Affixy pro nově spawnutého nepřítele. Elita 1, boss 1 (od 3. sektoru 2).
 * Hlubina (§13, tier 3+): elita 2 různé affixy.
 * Bez odemknutí (profil LVL 8) nic.
 */
export function rollAffixes(
  rng: Rng,
  kind: EnemyKind,
  isElite: boolean,
  bossTier: number,
  unlocked: boolean,
): EliteAffixId[] {
  if (!unlocked) return [];
  const out: EliteAffixId[] = [];
  const roll = (): EliteAffixId => ELITE_AFFIXES[Math.floor(rng() * ELITE_AFFIXES.length)]!.id;
  const rollDifferent = (): EliteAffixId => {
    const rest = ELITE_AFFIXES.filter((a) => !out.includes(a.id));
    return rest[Math.floor(rng() * rest.length)]!.id;
  };
  if (kind === "boss") {
    out.push(roll());
    if (bossTier >= 2) {
      out.push(rollDifferent());
    }
  } else if (isElite) {
    out.push(roll());
    if (bossTier >= 3) {
      out.push(rollDifferent());
    }
  }
  return out;
}

/**
 * Sektory + obtížnostní křivka pro VAULTBREAK.
 *
 * Systém 1 + prvky 2: hra běží v sektorech po SECTOR_SIZE úrovních
 * (9 běžných + boss). Po bossovi následuje mezisektorová báze
 * (heal + volba pokračovat / banknout), checkpoint odemyká start
 * od vyššího sektoru.
 *
 * Konstants křivky jdou měnit v Admin panelu (DifficultySettings
 * v localStorage); difficultyForLevel bere aktivní nastavení,
 * takže simulace ani bestiář se při ladění nemění.
 */

export const SECTOR_SIZE = 10;
/** Pozice (0-based) elit uvnitř sektoru — odpovídá původním místnostem 3 a 6. */
export const ELITE_POS = [2, 5];
/** Pozice bosse uvnitř sektoru (10. úroveň). */
export const BOSS_POS = 9;

export type DifficultySettings = {
  hpPerLevel: number;
  hpExpo: number;
  hpExpoPow: number;
  dmgPerLevel: number;
  dmgLate: number;
  dmgLatePow: number;
  dmgLateStart: number;
  dmgCap: number;
  speedBase: number;
  speedPerLevel: number;
  speedCap: number;
  eliteBonus: number;
  bossTierBonus: number;
};

export const DEFAULT_DIFFICULTY: DifficultySettings = {
  hpPerLevel: 0.17,
  hpExpo: 0.004,
  hpExpoPow: 1.6,
  dmgPerLevel: 0.075,
  dmgLate: 0.006,
  dmgLatePow: 1.5,
  dmgLateStart: 10,
  dmgCap: 3.5,
  speedBase: 0.92,
  speedPerLevel: 0.025,
  speedCap: 1.7,
  eliteBonus: 0.25,
  bossTierBonus: 0.5,
};

const DIFFICULTY_STORAGE_KEY = "vaultbreak.difficulty.v1";

const DIFFICULTY_LIMITS: Record<keyof DifficultySettings, [number, number]> = {
  hpPerLevel: [0, 1],
  hpExpo: [0, 0.1],
  hpExpoPow: [1, 3],
  dmgPerLevel: [0, 0.5],
  dmgLate: [0, 0.1],
  dmgLatePow: [1, 3],
  dmgLateStart: [1, 30],
  dmgCap: [1, 10],
  speedBase: [0.5, 1.2],
  speedPerLevel: [0, 0.1],
  speedCap: [1, 2],
  eliteBonus: [0, 1],
  bossTierBonus: [0, 2],
};

export const DIFFICULTY_FIELDS: { key: keyof DifficultySettings; label: string; step: number }[] = [
  { key: "hpPerLevel", label: "HP / úroveň", step: 0.01 },
  { key: "hpExpo", label: "HP exponenciála", step: 0.001 },
  { key: "hpExpoPow", label: "HP mocnina", step: 0.1 },
  { key: "dmgPerLevel", label: "DMG / úroveň", step: 0.01 },
  { key: "dmgLate", label: "DMG pozdní hra", step: 0.001 },
  { key: "dmgLatePow", label: "DMG mocnina", step: 0.1 },
  { key: "dmgLateStart", label: "DMG zlom (úroveň)", step: 1 },
  { key: "dmgCap", label: "DMG strop", step: 0.1 },
  { key: "speedBase", label: "Rychlost základ", step: 0.01 },
  { key: "speedPerLevel", label: "Rychlost / úroveň", step: 0.005 },
  { key: "speedCap", label: "Rychlost strop", step: 0.05 },
  { key: "eliteBonus", label: "Elita HP bonus", step: 0.05 },
  { key: "bossTierBonus", label: "Boss tier HP bonus", step: 0.1 },
];

function clampDifficulty(raw: Partial<DifficultySettings>): DifficultySettings {
  const out = { ...DEFAULT_DIFFICULTY };
  for (const key of Object.keys(DEFAULT_DIFFICULTY) as (keyof DifficultySettings)[]) {
    const v = raw[key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const [min, max] = DIFFICULTY_LIMITS[key];
    out[key] = Math.min(max, Math.max(min, v));
  }
  return out;
}

function readDifficulty(): DifficultySettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(DIFFICULTY_STORAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_DIFFICULTY };
    return clampDifficulty(raw as Partial<DifficultySettings>);
  } catch {
    return { ...DEFAULT_DIFFICULTY };
  }
}

let activeDifficulty: DifficultySettings = readDifficulty();

export function getDifficulty(): DifficultySettings {
  return { ...activeDifficulty };
}

export function setDifficulty(next: Partial<DifficultySettings>): DifficultySettings {
  activeDifficulty = clampDifficulty({ ...activeDifficulty, ...next });
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, JSON.stringify(activeDifficulty));
  } catch {
    /* ignore quota */
  }
  return getDifficulty();
}

export function resetDifficulty(): DifficultySettings {
  activeDifficulty = { ...DEFAULT_DIFFICULTY };
  try {
    localStorage.removeItem(DIFFICULTY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return getDifficulty();
}

export function difficultyLimits(key: keyof DifficultySettings): [number, number] {
  return DIFFICULTY_LIMITS[key];
}

/** Globální úroveň 1-based: sektor (0-based) × 10 + pozice + 1. */
export function globalLevel(sector: number, roomIndex: number): number {
  return sector * SECTOR_SIZE + roomIndex + 1;
}

/** Tier bosse = kolikátý boss v pořadí (0 = první). */
export function bossTierForLevel(level: number): number {
  return Math.max(0, Math.floor((level - 1) / SECTOR_SIZE));
}

export type DifficultyStats = {
  level: number;
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  waves: number;
  budgetBonus: number;
  eliteChance: number;
  bossTier: number;
};

/**
 * Jednotná křivka obtížnosti. Roste lineárně + mírně exponenciálně,
 * damage má strop, aby pozdní hra nebyla o one-shotech.
 */
export function difficultyForLevel(level: number, s: DifficultySettings = activeDifficulty): DifficultyStats {
  const L = Math.max(1, level);
  const hpMult = 1 + (L - 1) * s.hpPerLevel + Math.pow(L - 1, s.hpExpoPow) * s.hpExpo;
  const dmgRaw =
    1 + (L - 1) * s.dmgPerLevel + Math.pow(Math.max(0, L - s.dmgLateStart), s.dmgLatePow) * s.dmgLate;
  const dmgMult = Math.min(s.dmgCap, dmgRaw);
  const speedMult = Math.min(s.speedCap, s.speedBase + L * s.speedPerLevel);
  const waves = Math.min(4, 1 + Math.floor((L - 1) / 3));
  const budgetBonus = Math.round((L - 1) * 1.15);
  const eliteChance = Math.min(0.25, 0.02 + L * 0.008);
  return { level: L, hpMult, dmgMult, speedMult, waves, budgetBonus, eliteChance, bossTier: bossTierForLevel(L) };
}

/**
 * Catch-up bonus při startu z checkpointu (sektor > 0):
 * hráč nedostane plný endgame build, ale důstojný základ.
 */
export function catchUpForSector(sector: number): { bonusMaxHp: number; freeRerolls: number } {
  if (sector <= 0) return { bonusMaxHp: 0, freeRerolls: 0 };
  return {
    bonusMaxHp: Math.min(80, sector * 25),
    freeRerolls: 1,
  };
}

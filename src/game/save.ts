import { awardCharacterXp } from "./characters";

const KEY = "vaultbreak-v1";

export type SaveData = {
  version: 6;
  bestRooms: number;
  bestKills: number;
  bestTime: number;
  runs: number;
  lastSeed: string;
  /** Nejvyšší dosažená globální úroveň (napříč sektory). */
  bestLevel: number;
  /** Nejvyšší odemčený sektor (1-based) pro start z checkpointu. */
  maxSector: number;
  /** Kumulativní statistiky pro achievementy. */
  totalKills: number;
  totalScrap: number;
  bossesKilled: number;
  /** Celkový odehraný čas (s). */
  totalPlayTime: number;
  /** Celkem vypálených střel (všechny běhy). */
  totalShotsFired: number;
  /** Celkem trefených střel (všechny běhy). */
  totalShotsHit: number;
  /** Celkem způsobeného poškození (všechny běhy). */
  totalDmgDealt: number;
  /** Celkem utrženého poškození (všechny běhy). */
  totalDmgTaken: number;
  /** Nejvyšší dosažená místnost / vlna v jednom běhu. */
  bestRoom: number;
};

const EMPTY: SaveData = {
  version: 6,
  bestRooms: 0,
  bestKills: 0,
  bestTime: 0,
  runs: 0,
  lastSeed: "",
  bestLevel: 0,
  maxSector: 1,
  totalKills: 0,
  totalScrap: 0,
  bossesKilled: 0,
  totalPlayTime: 0,
  totalShotsFired: 0,
  totalShotsHit: 0,
  totalDmgDealt: 0,
  totalDmgTaken: 0,
  bestRoom: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<SaveData> & { level?: number; xp?: number; xpTotal?: number };
    Reflect.deleteProperty(parsed, "level");
    Reflect.deleteProperty(parsed, "xp");
    Reflect.deleteProperty(parsed, "xpTotal");
    return {
      ...EMPTY,
      ...parsed,
      version: 6,
      maxSector: Math.max(1, Math.floor(parsed.maxSector ?? 1)),
      bestLevel: Math.max(0, Math.floor(parsed.bestLevel ?? parsed.bestRooms ?? 0)),
      bestRoom: Math.max(0, Math.floor(parsed.bestRoom ?? parsed.bestRooms ?? 0)),
      totalKills: Math.max(0, Math.floor(parsed.totalKills ?? 0)),
      totalScrap: Math.max(0, Math.floor(parsed.totalScrap ?? 0)),
      bossesKilled: Math.max(0, Math.floor(parsed.bossesKilled ?? 0)),
      totalPlayTime: Math.max(0, Math.floor(parsed.totalPlayTime ?? 0)),
      totalShotsFired: Math.max(0, Math.floor(parsed.totalShotsFired ?? 0)),
      totalShotsHit: Math.max(0, Math.floor(parsed.totalShotsHit ?? 0)),
      totalDmgDealt: Math.max(0, Math.floor(parsed.totalDmgDealt ?? 0)),
      totalDmgTaken: Math.max(0, Math.floor(parsed.totalDmgTaken ?? 0)),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeSave(next: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function recordRun(
  level: number,
  kills: number,
  time: number,
  seed: string,
  scrapEarned = 0,
  bossesKilled = 0,
  shotsFired = 0,
  shotsHit = 0,
  dmgDealt = 0,
  dmgTaken = 0,
  roomReached = 0,
  xpEarned = 0,
): SaveData {
  const prev = loadSave();
  awardCharacterXp(xpEarned);
  const next: SaveData = {
    version: 6,
    bestRooms: Math.max(prev.bestRooms, level, roomReached),
    bestKills: Math.max(prev.bestKills, kills),
    bestTime: level >= prev.bestRooms ? Math.max(prev.bestTime, time) : prev.bestTime,
    runs: prev.runs + 1,
    lastSeed: seed,
    bestLevel: Math.max(prev.bestLevel, level),
    maxSector: prev.maxSector,
    totalKills: prev.totalKills + Math.max(0, Math.floor(kills)),
    totalScrap: prev.totalScrap + Math.max(0, Math.floor(scrapEarned)),
    bossesKilled: prev.bossesKilled + Math.max(0, Math.floor(bossesKilled)),
    totalPlayTime: prev.totalPlayTime + Math.max(0, Math.floor(time)),
    totalShotsFired: prev.totalShotsFired + Math.max(0, Math.floor(shotsFired)),
    totalShotsHit: prev.totalShotsHit + Math.max(0, Math.floor(shotsHit)),
    totalDmgDealt: prev.totalDmgDealt + Math.max(0, Math.floor(dmgDealt)),
    totalDmgTaken: prev.totalDmgTaken + Math.max(0, Math.floor(dmgTaken)),
    bestRoom: Math.max(prev.bestRoom, roomReached),
  };
  writeSave(next);
  return next;
}

/** Odemkne checkpoint pro další sektor po poražení bosse. */
export function unlockSector(sector1Based: number): SaveData {
  const prev = loadSave();
  const next: SaveData = {
    ...prev,
    maxSector: Math.max(prev.maxSector, sector1Based + 1),
  };
  writeSave(next);
  return next;
}

/**
 * Klíče herního progressu (bez nastavení a admin katalogů).
 * Vlastníci: save (vaultbreak-v1), codex, achievements, challenges (badges), daily, weekly.
 */
export const PROGRESS_KEYS = [
  "vaultbreak-v1",
  "vaultbreak.characters.v1",
  "vaultbreak.codex.v1",
  "vaultbreak.achievements.v1",
  "vaultbreak.badges.v1",
  "vaultbreak.daily.v1",
  "vaultbreak.weekly.v1",
  "vaultbreak.board.v1",
  "vaultbreak.blueprints.v1",
  "vaultbreak.armory.v1",
];

/** Smaže celý herní progress. Nastavení (zvuk, obtížnost, katalogy) nechává. */
export function resetProgress(): void {
  try {
    for (const key of PROGRESS_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

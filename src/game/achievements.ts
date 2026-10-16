/**
 * Achievementy — trvalé mety profilu nad rámec odznaků z výzev.
 * Pravidla docs/progression-rules.md §19.
 * Odemknutí je samo o sobě odměnou (žádné další staty — ty dává kodex).
 */
import type { SaveData } from "./save";

export type AchievementId =
  | "killer-100"
  | "killer-1000"
  | "killer-5000"
  | "sector-3"
  | "sector-5"
  | "collector-15"
  | "collector-40"
  | "collector-70"
  | "tycoon-500"
  | "tycoon-2500"
  | "boss-5"
  | "veteran-50";

export type AchievementDef = {
  id: AchievementId;
  name: string;
  desc: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "killer-100", name: "Zabiják", desc: "Zabij celkem 100 nepřátel" },
  { id: "killer-1000", name: "Veterán řeže", desc: "Zabij celkem 1 000 nepřátel" },
  { id: "killer-5000", name: "Mlýnek na maso", desc: "Zabij celkem 5 000 nepřátel" },
  { id: "sector-3", name: "Průzkumník", desc: "Odemkni 3. sektor" },
  { id: "sector-5", name: "Cestovatel Hlubinou", desc: "Odemkni 5. sektor" },
  { id: "collector-15", name: "Sběratel", desc: "Odemkni 15 položek kodexu" },
  { id: "collector-40", name: "Archivář", desc: "Odemkni 40 položek kodexu" },
  { id: "collector-70", name: "Kronikář trezoru", desc: "Odemkni 70 položek kodexu" },
  { id: "tycoon-500", name: "Šmelinář", desc: "Nasbírej celkem 500 šrotu" },
  { id: "tycoon-2500", name: "Magnát", desc: "Nasbírej celkem 2 500 šrotu" },
  { id: "boss-5", name: "Lovec bossů", desc: "Poraz 5 bossů" },
  { id: "veteran-50", name: "Vytrvalec", desc: "Odehraj 50 běhů" },
];

export function achievementDef(id: AchievementId): AchievementDef {
  return ACHIEVEMENTS.find((a) => a.id === id)!;
}

export type ProfileStats = {
  totalKills: number;
  totalScrap: number;
  bossesKilled: number;
  maxSector: number;
  runs: number;
  codexCount: number;
};

export function profileStats(save: SaveData, codexCount: number): ProfileStats {
  return {
    totalKills: save.totalKills,
    totalScrap: save.totalScrap,
    bossesKilled: save.bossesKilled,
    maxSector: save.maxSector,
    runs: save.runs,
    codexCount,
  };
}

/** Které achievementy statistiky splňují (bez ohledu na to, co už je odemčené). */
export function earnedAchievements(stats: ProfileStats): AchievementId[] {
  const out: AchievementId[] = [];
  if (stats.totalKills >= 100) out.push("killer-100");
  if (stats.totalKills >= 1000) out.push("killer-1000");
  if (stats.totalKills >= 5000) out.push("killer-5000");
  if (stats.maxSector >= 3) out.push("sector-3");
  if (stats.maxSector >= 5) out.push("sector-5");
  if (stats.codexCount >= 15) out.push("collector-15");
  if (stats.codexCount >= 40) out.push("collector-40");
  if (stats.codexCount >= 70) out.push("collector-70");
  if (stats.totalScrap >= 500) out.push("tycoon-500");
  if (stats.totalScrap >= 2500) out.push("tycoon-2500");
  if (stats.bossesKilled >= 5) out.push("boss-5");
  if (stats.runs >= 50) out.push("veteran-50");
  return out;
}

const ACHIEVEMENTS_STORAGE_KEY = "vaultbreak.achievements.v1";

/** Trvale odemčené achievementy. */
export function loadAchievements(): AchievementId[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is AchievementId => typeof x === "string" && ACHIEVEMENTS.some((a) => a.id === x),
    );
  } catch {
    return [];
  }
}

function writeAchievements(ids: AchievementId[]): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota */
  }
}

/**
 * Odemkne vše splněné. Vrací nově odemčené (pro hlášku v UI).
 */
export function unlockAchievements(stats: ProfileStats): AchievementId[] {
  const have = new Set(loadAchievements());
  const fresh: AchievementId[] = [];
  for (const id of earnedAchievements(stats)) {
    if (!have.has(id)) {
      have.add(id);
      fresh.push(id);
    }
  }
  if (fresh.length > 0) writeAchievements([...have]);
  return fresh;
}

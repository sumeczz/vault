/**
 * Progrese profilu — implementace docs/progression-rules.md §1–2.
 * Jediný vstup: bestLevel (nejvyšší dosažená globální úroveň).
 * Pevný progress: odemykání roztažené na LVL 3–30, vrcholí Tormentem (§22).
 */

export type UnlockId = "scrap" | "forge" | "shop" | "arena" | "synergy" | "affix" | "veteran" | "torment";

export type UnlockDef = {
  id: UnlockId;
  level: number;
  name: string;
  desc: string;
};

export const UNLOCKS: UnlockDef[] = [
  { id: "scrap", level: 3, name: "Šrot", desc: "Rozebírání lootu na šrot." },
  { id: "forge", level: 6, name: "Kovárna", desc: "Portál: víc zbraní a reroll navíc." },
  { id: "shop", level: 9, name: "Obchod", desc: "Oprava, plátování a vliv v bázi." },
  { id: "arena", level: 12, name: "Aréna", desc: "Portál: lepší loot, boss dává 4 nabídky." },
  { id: "synergy", level: 15, name: "Synergie", desc: "Kombinace elementů (výbuch, křehkost, pára)." },
  { id: "affix", level: 20, name: "Elitní affixy", desc: "Elity a bossové nesou affixy." },
  { id: "veteran", level: 25, name: "Veterán", desc: "Pity po 3 místnostech, boss minimum epic." },
  { id: "torment", level: 30, name: "Torment", desc: "Volitelný režim: +25 % síly nepřátel za lepší loot." },
];

export type UnlockState = Record<UnlockId, boolean>;

/** Které prvky má profil s danou nejlepší úrovní odemčené. */
export function unlocksForLevel(bestLevel: number): UnlockState {
  const level = Math.max(0, Math.floor(bestLevel));
  return {
    scrap: level >= 3,
    forge: level >= 6,
    shop: level >= 9,
    arena: level >= 12,
    synergy: level >= 15,
    affix: level >= 20,
    veteran: level >= 25,
    torment: level >= 30,
  };
}

/** Nejbližší ještě neodemčený prvek (pro menu „hraješ za …"). */
export function nextUnlock(bestLevel: number): UnlockDef | null {
  const level = Math.max(0, Math.floor(bestLevel));
  return UNLOCKS.find((u) => level < u.level) ?? null;
}

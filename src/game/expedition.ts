import { RARITY_ORDER } from "./rarity-settings";
import type { Rarity } from "./types";

/** Modifikátor sektoru — volba portálu v bázi. Vše loot-side, aby se nemusela větvit simulace. */
export type SectorModId = "forge" | "arena" | "lab" | "library" | "market";

export type SectorMod = {
  id: SectorModId;
  name: string;
  desc: string;
};

export const SECTOR_MODS: SectorMod[] = [
  {
    id: "forge",
    name: "Kovárna",
    desc: "Druhá nabídka je vždy zbraň. +1 přerolování v každé místnosti.",
  },
  {
    id: "arena",
    name: "Aréna",
    desc: "Loot jako o 3 úrovně výš + boss dává 4 nabídky. Pro odvážné.",
  },
  {
    id: "lab",
    name: "Laboratoř",
    desc: "Druhá nabídka je vždy schopnost/pasivka, medkit v každém lootu. +1 přerolování.",
  },
  {
    id: "library",
    name: "Knihovna",
    desc: "Druhá nabídka je vždy schopnost, třetí vždy pasivka. +1 přerolování.",
  },
  {
    id: "market",
    name: "Tržiště",
    desc: "Vždy 4 nabídky — čtvrtá je pasivka navíc.",
  },
];

export function sectorModById(id: SectorModId | null | undefined): SectorMod | null {
  return SECTOR_MODS.find((m) => m.id === id) ?? null;
}

const SCRAP_VALUE: Record<Rarity, number> = {
  common: 4,
  uncommon: 7,
  rare: 12,
  epic: 20,
  legendary: 32,
  mythic: 50,
};

export function scrapForRarity(rarity: Rarity): number {
  return SCRAP_VALUE[rarity];
}

export function scrapForHeal(): number {
  return 5;
}

export type ShopItemId = "heal" | "maxhp" | "reroll";

export type ShopOffer = {
  id: ShopItemId;
  name: string;
  desc: string;
  cost: number;
};

/** Ceny rostou se sektorem (1-based), aby obchod neztratil smysl. */
export function shopCost(item: ShopItemId, sector1Based: number): number {
  const s = Math.max(1, sector1Based);
  switch (item) {
    case "heal":
      return 30 + s * 10;
    case "maxhp":
      return 40 + s * 15;
    case "reroll":
      return 25 + s * 10;
  }
}

export function shopOffers(sector1Based: number, rerolls: number): ShopOffer[] {
  return [
    {
      id: "heal",
      name: "Plná oprava",
      desc: "Doplní HP na maximum.",
      cost: shopCost("heal", sector1Based),
    },
    {
      id: "maxhp",
      name: "Plátování",
      desc: "+15 max. HP (i současné).",
      cost: shopCost("maxhp", sector1Based),
    },
    {
      id: "reroll",
      name: "Vliv v trezoru",
      desc: `+1 přerolování do dalšího sektoru (teď ${rerolls}).`,
      cost: shopCost("reroll", sector1Based),
    },
  ];
}

export function rarityRank(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

/**
 * Fáze hry — pravidla docs/progression-rules.md §11.
 * Early = učení (čistá pravidla), mid = anomálie, endgame (Hlubina) = maximum.
 */
export type GamePhase = "early" | "mid" | "endgame";

export function gamePhaseFor(sectorIdx: number): GamePhase {
  const s = Math.max(0, Math.floor(sectorIdx));
  if (s >= 3) return "endgame";
  if (s >= 1) return "mid";
  return "early";
}

/**
 * Anomálie sektoru — pravidla docs/progression-rules.md §12.
 * Sektor 1 (idx 0) je vždy bez anomálie (čistý start).
 * Jinak přesně 1 anomálie, deterministická ze seedu + sektoru
 * (nezávislá na RNG běhu, aby se nedala přerolovat).
 */
export type AnomalyId = "gold" | "generous" | "echoes" | "calm" | "famine" | "surge";

export type AnomalyDef = {
  id: AnomalyId;
  name: string;
  desc: string;
};

export const ANOMALIES: AnomalyDef[] = [
  { id: "gold", name: "Zlatá žíla", desc: "Loot +2 úrovně, šrot +25 %." },
  { id: "generous", name: "Štědrý trezor", desc: "+1 reroll v místnosti, medkit vždy." },
  { id: "echoes", name: "Ozvěny", desc: "Boss dává +1 nabídku s libovolným portálem." },
  { id: "calm", name: "Klid před bouří", desc: "Báze léčí 50 % místo 35 %." },
  { id: "famine", name: "Hladomor", desc: "Medkit nikdy nepadá, loot +1 úroveň." },
  { id: "surge", name: "Přepětí", desc: "+1 reroll v místnosti, loot +1 úroveň." },
];

export function anomalyForSector(seed: string, sectorIdx: number): AnomalyId | null {
  const s = Math.max(0, Math.floor(sectorIdx));
  if (s < 1) return null;
  let h = 2166136261;
  const src = `${seed.toUpperCase()}::${s}`;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ANOMALIES[(h >>> 0) % ANOMALIES.length]!.id;
}

export function anomalyDef(id: AnomalyId | null | undefined): AnomalyDef | null {
  return ANOMALIES.find((a) => a.id === id) ?? null;
}

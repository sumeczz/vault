import type { Rarity } from "./types";

export type RarityWeights = Record<Rarity, number>;

export const RARITY_ORDER: readonly Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

export const DEFAULT_RARITY_WEIGHTS: RarityWeights = {
  common: 46,
  uncommon: 32,
  rare: 16,
  epic: 5,
  legendary: 1,
  mythic: 0,
};

export const RARITY_WEIGHTS_STORAGE_KEY = "vaultbreak.rarity-weights.v1";

export function rarityChances(weights: RarityWeights): RarityWeights {
  const total = RARITY_ORDER.reduce((sum, rarity) => sum + Math.max(0, weights[rarity]), 0);
  if (total <= 0) return { ...DEFAULT_RARITY_WEIGHTS };
  return Object.fromEntries(
    RARITY_ORDER.map((rarity) => [rarity, (Math.max(0, weights[rarity]) / total) * 100]),
  ) as RarityWeights;
}

export function readRarityWeights(): RarityWeights | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RARITY_WEIGHTS_STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const weights = {} as RarityWeights;
    for (const rarity of RARITY_ORDER) {
      const weight = record[rarity];
      if (typeof weight !== "number" || !Number.isFinite(weight)) return null;
      weights[rarity] = Math.round(Math.min(100, Math.max(0, weight)));
    }
    if (Object.values(weights).every((weight) => weight === 0)) return null;
    return weights;
  } catch {
    return null;
  }
}
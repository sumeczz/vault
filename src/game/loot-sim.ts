import { generateAbility, generatePassive } from "./abilities";
import { generateMod } from "./mods";
import { hashSeed, mulberry32, type Rng } from "./rng";
import { RARITY_ORDER, type RarityWeights } from "./rarity-settings";
import { dpsEstimate, generateWeapon } from "./weapons";
import type { GameContentCatalogs } from "./content-settings";
import type { Rarity } from "./types";

export type LootSimResult = {
  offers: number;
  byType: { weapon: number; ability: number; passive: number; mod: number };
  byRarity: Record<Rarity, number>;
  avgDpsByRarity: Record<Rarity, number>;
  dpsCountByRarity: Record<Rarity, number>;
  topWeapons: { name: string; rarity: Rarity; dps: number }[];
};

const zeroRarity = (): Record<Rarity, number> => ({
  common: 0,
  uncommon: 0,
  rare: 0,
  epic: 0,
  legendary: 0,
  mythic: 0,
});

/**
 * Simulátor nabídek bez spuštění běhu: replikuje Run.generateLoot
 * (třetí nabídka = pasivka, tj. předpoklad plného HP; heal se ve hře
 * generuje jen při HP pod 60 %).
 */
export function simulateLoot(
  content: GameContentCatalogs,
  weights: RarityWeights | undefined,
  level1Based: number,
  count: number,
  seedStr = "SIM",
  isBoss = false,
): LootSimResult {
  const rng: Rng = mulberry32(hashSeed(seedStr.toUpperCase()));
  const g = Math.max(0, level1Based - 1);
  const byType = { weapon: 0, ability: 0, passive: 0, mod: 0 };
  const byRarity = zeroRarity();
  const dpsSum = zeroRarity();
  const dpsCountByRarity = zeroRarity();
  const topWeapons: { name: string; rarity: Rarity; dps: number }[] = [];

  const takeWeapon = () => {
    const w = generateWeapon(rng, g, isBoss, weights, content.weapons, content.affixes, content.uniques);
    byType.weapon += 1;
    byRarity[w.rarity] += 1;
    const dps = dpsEstimate(w);
    dpsSum[w.rarity] += dps;
    dpsCountByRarity[w.rarity] += 1;
    topWeapons.push({ name: w.name, rarity: w.rarity, dps });
  };
  const takeAbility = () => {
    const a = generateAbility(rng, g, isBoss, weights, content.abilities);
    byType.ability += 1;
    byRarity[a.rarity] += 1;
  };
  const takePassive = () => {
    const p = generatePassive(rng, g, isBoss, weights, content.passives);
    byType.passive += 1;
    byRarity[p.rarity] += 1;
  };
  const takeMod = () => {
    const m = generateMod(rng, g, weights);
    byType.mod += 1;
    byRarity[m.rarity] += 1;
  };

  for (let i = 0; i < count; i++) {
    takeWeapon();
    const roll = rng();
    if (roll < 0.3) takeAbility();
    else if (roll < 0.62) takePassive();
    else if (roll < 0.8) takeWeapon();
    else takeMod();
    takePassive();
  }

  topWeapons.sort((a, b) => b.dps - a.dps);
  const avgDpsByRarity = zeroRarity();
  for (const r of RARITY_ORDER) {
    avgDpsByRarity[r] = dpsCountByRarity[r] > 0 ? dpsSum[r] / dpsCountByRarity[r] : 0;
  }
  return {
    offers: count * 3,
    byType,
    byRarity,
    avgDpsByRarity,
    dpsCountByRarity,
    topWeapons: topWeapons.slice(0, 5),
  };
}

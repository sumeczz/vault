import {
  ARCHETYPE_LABEL,
  ELEMENT_COLOR,
  RARITY_COLOR,
  type ArchetypeId,
  type BehaviorId,
  type Element,
  type Weapon,
} from "./types";
import type { WeaponDef } from "./weapons";

export type WeaponComponentSlot = "barrel" | "magazine" | "core";
export type WeaponComponentId =
  | "barrel-precision"
  | "barrel-long-range"
  | "barrel-penetrator"
  | "barrel-heavy"
  | "mag-extended"
  | "mag-fast-feed"
  | "mag-high-pressure"
  | "core-kinetic"
  | "core-fire"
  | "core-ice"
  | "core-shock"
  | "core-toxic"
  | "core-void";

export type WeaponComponentUpgrade = { id: WeaponComponentId; rank: 1 | 2 | 3 };
export type WeaponComponentLoadout = Partial<Record<WeaponComponentSlot, WeaponComponentUpgrade>>;
export type CharacterWeaponComponents = Partial<Record<ArchetypeId, WeaponComponentLoadout>>;

type ComponentCost = {
  scrap: number;
  alloys: number;
  cores: number;
  catalyst?: Element;
  catalysts: number;
  requiredLevel: number;
};

type ComponentModifier = {
  damageMult?: number;
  rpmMult?: number;
  magMult?: number;
  reloadMult?: number;
  rangeMult?: number;
  critAdd?: number;
  element?: Element;
  behaviors?: Partial<Record<BehaviorId, number>>;
};

export type WeaponComponentDefinition = {
  id: WeaponComponentId;
  slot: WeaponComponentSlot;
  name: string;
  description: string;
  material: "alloy" | "catalyst";
  element?: Element;
  modifier: (rank: number) => ComponentModifier;
};

const damage = (amount: number): ComponentModifier => ({ damageMult: 1 + amount });

export const WEAPON_COMPONENTS: readonly WeaponComponentDefinition[] = [
  { id: "barrel-precision", slot: "barrel", name: "Přesná hlaveň", description: "+3 procentní body kritické šance za stupeň.", material: "alloy", modifier: (rank) => ({ critAdd: 0.03 * rank }) },
  { id: "barrel-long-range", slot: "barrel", name: "Prodloužená hlaveň", description: "+8 % dostřelu za stupeň.", material: "alloy", modifier: (rank) => ({ rangeMult: 1 + 0.08 * rank }) },
  { id: "barrel-penetrator", slot: "barrel", name: "Průrazná hlaveň", description: "+8 procentních bodů průraznosti zbroje za stupeň.", material: "alloy", modifier: (rank) => ({ behaviors: { pierceArmor: 0.08 * rank } }) },
  { id: "barrel-heavy", slot: "barrel", name: "Těžká hlaveň", description: "+8 % poškození a −6 % kadence za stupeň.", material: "alloy", modifier: (rank) => ({ damageMult: 1 + 0.08 * rank, rpmMult: 1 - 0.06 * rank }) },
  { id: "mag-extended", slot: "magazine", name: "Rozšířený zásobník", description: "+20 % kapacity a +8 % času přebití za stupeň.", material: "alloy", modifier: (rank) => ({ magMult: 1 + 0.2 * rank, reloadMult: 1 + 0.08 * rank }) },
  { id: "mag-fast-feed", slot: "magazine", name: "Rychlopřebíjení", description: "−8 % času přebití a −6 % kapacity za stupeň.", material: "alloy", modifier: (rank) => ({ reloadMult: 1 - 0.08 * rank, magMult: 1 - 0.06 * rank }) },
  { id: "mag-high-pressure", slot: "magazine", name: "Vysokotlaký zásobník", description: "+7 % kadence a −8 % kapacity za stupeň.", material: "alloy", modifier: (rank) => ({ rpmMult: 1 + 0.07 * rank, magMult: 1 - 0.08 * rank }) },
  { id: "core-kinetic", slot: "core", name: "Kinetické jádro", description: "+6 % poškození za stupeň. Zachovává kinetický element.", material: "alloy", element: "kinetic", modifier: (rank) => ({ ...damage(0.06 * rank), element: "kinetic" }) },
  { id: "core-fire", slot: "core", name: "Žhavé jádro", description: "Oheň a hoření; +3 % poškození za stupeň.", material: "catalyst", element: "fire", modifier: (rank) => ({ ...damage(0.03 * rank), element: "fire", behaviors: { burn: 1 } }) },
  { id: "core-ice", slot: "core", name: "Kryogenní jádro", description: "Led a zpomalení na 0,25 s za stupeň; +2 % poškození za stupeň.", material: "catalyst", element: "ice", modifier: (rank) => ({ ...damage(0.02 * rank), element: "ice", behaviors: { freeze: 0.25 * rank } }) },
  { id: "core-shock", slot: "core", name: "Výbojové jádro", description: "Šok s +10% šancí na omráčení za stupeň; +2 % poškození za stupeň.", material: "catalyst", element: "shock", modifier: (rank) => ({ ...damage(0.02 * rank), element: "shock", behaviors: { shockstun: 0.1 * rank } }) },
  { id: "core-toxic", slot: "core", name: "Toxické jádro", description: "Toxický element a jed; +3 % poškození za stupeň.", material: "catalyst", element: "toxic", modifier: (rank) => ({ ...damage(0.03 * rank), element: "toxic", behaviors: { poison: 1 } }) },
  { id: "core-void", slot: "core", name: "Jádro prázdnoty", description: "Void a řetězový zásah +1 cíl za stupeň; +2 % poškození za stupeň.", material: "catalyst", element: "void", modifier: (rank) => ({ ...damage(0.02 * rank), element: "void", behaviors: { chain: rank } }) },
];

const COMPONENT_BY_ID = new Map(WEAPON_COMPONENTS.map((component) => [component.id, component]));
const RANK_MATERIAL_COST = [2, 4, 7] as const;
const RANK_SCRAP_COST = [20, 45, 80] as const;
const RANK_CORE_COST = [0, 1, 2] as const;

export function componentDefinition(id: WeaponComponentId): WeaponComponentDefinition {
  return COMPONENT_BY_ID.get(id)!;
}

export function componentsForSlot(slot: WeaponComponentSlot): WeaponComponentDefinition[] {
  return WEAPON_COMPONENTS.filter((component) => component.slot === slot);
}

export function weaponComponentCost(id: WeaponComponentId, rank: number): ComponentCost {
  const safeRank = Math.max(1, Math.min(3, Math.floor(rank))) - 1;
  const component = componentDefinition(id);
  const elemental = component.material === "catalyst";
  return {
    scrap: RANK_SCRAP_COST[safeRank]!,
    alloys: elemental ? 0 : RANK_MATERIAL_COST[safeRank]!,
    cores: RANK_CORE_COST[safeRank]!,
    catalyst: elemental ? component.element : undefined,
    catalysts: elemental ? RANK_MATERIAL_COST[safeRank]! : 0,
    requiredLevel: safeRank === 0 ? 1 : safeRank === 1 ? 10 : 20,
  };
}

function isComponentId(value: unknown): value is WeaponComponentId {
  return typeof value === "string" && COMPONENT_BY_ID.has(value as WeaponComponentId);
}

export function isWeaponComponentId(value: unknown): value is WeaponComponentId {
  return isComponentId(value);
}

export function normalizeWeaponComponents(value: unknown, ownedWeapons: readonly ArchetypeId[]): CharacterWeaponComponents {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const rawWeapons = value as Record<string, unknown>;
  const normalized: CharacterWeaponComponents = {};
  for (const archetype of ownedWeapons) {
    const rawLoadout = rawWeapons[archetype];
    if (!rawLoadout || typeof rawLoadout !== "object" || Array.isArray(rawLoadout)) continue;
    const entries = rawLoadout as Record<string, unknown>;
    const loadout: WeaponComponentLoadout = {};
    for (const slot of ["barrel", "magazine", "core"] as const) {
      const rawUpgrade = entries[slot];
      if (!rawUpgrade || typeof rawUpgrade !== "object" || Array.isArray(rawUpgrade)) continue;
      const upgrade = rawUpgrade as { id?: unknown; rank?: unknown };
      if (!isComponentId(upgrade.id) || COMPONENT_BY_ID.get(upgrade.id)!.slot !== slot) continue;
      if (upgrade.rank !== 1 && upgrade.rank !== 2 && upgrade.rank !== 3) continue;
      loadout[slot] = { id: upgrade.id, rank: upgrade.rank };
    }
    if (Object.keys(loadout).length > 0) normalized[archetype] = loadout;
  }
  return normalized;
}

export function applyWeaponComponents(weapon: Weapon, loadout: WeaponComponentLoadout | undefined): Weapon {
  if (!loadout || Object.keys(loadout).length === 0) return weapon;
  let damageMult = 1;
  let rpmMult = 1;
  let magMult = 1;
  let reloadMult = 1;
  let rangeMult = 1;
  let critAdd = 0;
  let element = weapon.element;
  const behaviors = { ...weapon.behaviors };
  for (const upgrade of Object.values(loadout)) {
    if (!upgrade) continue;
    const component = COMPONENT_BY_ID.get(upgrade.id);
    if (!component || component.modifier(upgrade.rank).element === undefined && component.slot === "core") continue;
    const modifier = component.modifier(upgrade.rank);
    damageMult *= modifier.damageMult ?? 1;
    rpmMult *= modifier.rpmMult ?? 1;
    magMult *= modifier.magMult ?? 1;
    reloadMult *= modifier.reloadMult ?? 1;
    rangeMult *= modifier.rangeMult ?? 1;
    critAdd += modifier.critAdd ?? 0;
    if (modifier.element) element = modifier.element;
    for (const [id, amount] of Object.entries(modifier.behaviors ?? {})) {
      const behavior = id as BehaviorId;
      behaviors[behavior] = (behaviors[behavior] ?? 0) + (amount ?? 0);
    }
  }
  return {
    ...weapon,
    element,
    colors: { ...weapon.colors, accent: ELEMENT_COLOR[element] },
    stats: {
      ...weapon.stats,
      damage: Math.round(weapon.stats.damage * damageMult * 10) / 10,
      rpm: Math.round(weapon.stats.rpm * rpmMult * 10) / 10,
      magSize: Math.max(2, Math.round(weapon.stats.magSize * magMult)),
      reload: Math.max(0.25, Math.round(weapon.stats.reload * reloadMult * 100) / 100),
      range: Math.round(weapon.stats.range * rangeMult),
      critChance: weapon.stats.critChance + critAdd,
    },
    behaviors,
  };
}

export function previewComponentWeapon(def: WeaponDef, loadout?: WeaponComponentLoadout): Weapon {
  const midpoint = (range: readonly [number, number]) => (range[0] + range[1]) / 2;
  const weapon: Weapon = {
    id: `preview-${def.archetype}`,
    name: def.name,
    unique: false,
    archetype: def.archetype,
    rarity: "common",
    element: def.element,
    gender: ARCHETYPE_LABEL[def.archetype].gender,
    stats: {
      damage: midpoint(def.stats.damage),
      rpm: midpoint(def.stats.rpm),
      spread: def.stats.spread,
      pellets: midpoint(def.stats.pellets),
      magSize: midpoint(def.stats.mag),
      reload: midpoint(def.stats.reload),
      projSpeed: midpoint(def.stats.speed),
      projSize: midpoint(def.stats.size),
      range: midpoint(def.stats.range),
      knockback: def.stats.knockback,
      critChance: def.critChance,
      critMult: def.critMult,
    },
    behaviors: { ...def.behaviors },
    colors: { body: "#2a2d33", accent: ELEMENT_COLOR[def.element], glow: RARITY_COLOR.common },
    slots: 0,
    mods: [],
  };
  return applyWeaponComponents(weapon, loadout);
}

export function canAffordWeaponComponent(
  materials: { scrap: number; alloys: number; cores: number; catalysts: Partial<Record<Element, number>> },
  cost: ComponentCost,
): boolean {
  return materials.scrap >= cost.scrap
    && materials.alloys >= cost.alloys
    && materials.cores >= cost.cores
    && (!cost.catalyst || (materials.catalysts[cost.catalyst] ?? 0) >= cost.catalysts);
}

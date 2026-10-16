/**
 * Dílna — mody do zbraní, blueprinty archetypů a zbrojnice startovních rámů.
 * Pravidla docs/progression-rules.md §23.
 *
 * Rám (zbraň) má mod-sloty podle rarity. Mody padají z lootu do inventáře
 * a zasazují se v Dílně. Blueprinty rostou zabíjením daným archetypem napříč
 * běhy (ranky dají DMG, zbrojnici a sloty).
 */
import { randInt, type Rng } from "./rng";
import { RARITY_ORDER, type RarityWeights } from "./rarity-settings";
import { rollRarity } from "./weapons";
import { ARCHETYPE_LABEL, type ArchetypeId, type BehaviorId, type Element, type Rarity, type Weapon, type WeaponMod, type ModFamily } from "./types";

export const MOD_FAMILIES: Record<ModFamily, { name: string; desc: string }> = {
  straz: { name: "Stráž", desc: "Přesné a spolehlivé mody." },
  hlubina: { name: "Hlubina", desc: "Statusové mody." },
  prototyp: { name: "Prototyp", desc: "Divoké experimenty." },
};

export type ModDef = {
  id: string;
  weight: number;
  name: string;
  descTemplate: string;
  /** Jak se formátuje {value}: percent (×100) pro zlomky, raw pro kusy. */
  descKind: "percent" | "raw" | "none";
  family: ModFamily;
  element?: Element;
  behaviors?: Partial<Record<BehaviorId, number>>;
  damageMult?: number;
  magMult?: number;
  reloadMult?: number;
  critAdd?: number;
  rangeMult?: number;
};

const MOD_DEFS: ModDef[] = [
  // Stráž (precizní)
  { id: "prurazny-hrot", weight: 1, name: "Průrazný hrot", descTemplate: "Průraznost +{value} %", descKind: "percent", family: "straz", behaviors: { pierceArmor: 0.12 } },
  { id: "upiri-obvod", weight: 1, name: "Upíří obvod", descTemplate: "Vysátí +{value} %", descKind: "percent", family: "straz", behaviors: { lifesteal: 0.05 } },
  { id: "ostriz-malenka", weight: 1, name: "Ostříží muška", descTemplate: "Kritika +{value} %", descKind: "percent", family: "straz", critAdd: 0.06 },
  { id: "dlouha-hlaven", weight: 1, name: "Dlouhá hlaveň", descTemplate: "Dostřel +{value} %", descKind: "percent", family: "straz", rangeMult: 1.3 },
  // Hlubina (statusy + element)
  { id: "ohnivy-cip", weight: 1, name: "Ohnivý čip", descTemplate: "Element Oheň + hoření {value}/s", descKind: "raw", family: "hlubina", element: "fire", behaviors: { burn: 5 } },
  { id: "ledovy-cip", weight: 1, name: "Ledový čip", descTemplate: "Element Led + mráz", descKind: "none", family: "hlubina", element: "ice", behaviors: { freeze: 0.8 } },
  { id: "toxicky-cip", weight: 1, name: "Toxický čip", descTemplate: "Element Toxic + jed {value}/s", descKind: "raw", family: "hlubina", element: "toxic", behaviors: { poison: 5 } },
  { id: "vybojovy-cip", weight: 1, name: "Výbojový čip", descTemplate: "Element Šok + šok", descKind: "none", family: "hlubina", element: "shock", behaviors: { shockstun: 0.3 } },
  // Prototyp (divočina)
  { id: "tezka-hlavice", weight: 1, name: "Těžká hlavice", descTemplate: "Výbuch +{value}", descKind: "raw", family: "prototyp", behaviors: { explode: 45 } },
  { id: "navadeci-modul", weight: 1, name: "Naváděcí modul", descTemplate: "Navádění", descKind: "none", family: "prototyp", behaviors: { homing: 2.5 } },
  { id: "retezovy-clanek", weight: 1, name: "Řetězový článek", descTemplate: "Řetěz +{value}", descKind: "raw", family: "prototyp", behaviors: { chain: 3 } },
  { id: "pretlakova-komora", weight: 1, name: "Přetlaková komora", descTemplate: "Poškození +{value} %", descKind: "percent", family: "prototyp", damageMult: 1.22 },
];

export const DEFAULT_MOD_DEFS: ModDef[] = MOD_DEFS.map((d) => ({ ...d, behaviors: { ...(d.behaviors ?? {}) } }));

function pickWeighted<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return items[0]!;
  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll < 0) return item;
  }
  return items.at(-1)!;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Vygeneruje mod; síla škáluje raritou jako u pasivek (+15 % za tier). */
export function generateMod(
  rng: Rng,
  roomIndex: number,
  weights?: RarityWeights,
  defs: readonly ModDef[] = DEFAULT_MOD_DEFS,
): WeaponMod {
  const rarity = rollRarity(rng, roomIndex, false, weights);
  const def = pickWeighted(rng, defs);
  const q = RARITY_ORDER.indexOf(rarity);
  const s = 1 + q * 0.15;
  const behaviors: Partial<Record<BehaviorId, number>> = {};
  for (const [k, v] of Object.entries(def.behaviors ?? {})) {
    behaviors[k as BehaviorId] = round2((v ?? 0) * s);
  }
  const damageMult = round2(1 + ((def.damageMult ?? 1) - 1) * s);
  const magMult = round2(1 + ((def.magMult ?? 1) - 1) * s);
  const reloadMult = round2(1 - (1 - (def.reloadMult ?? 1)) * s);
  const critAdd = round2((def.critAdd ?? 0) * s);
  const rangeMult = round2(1 + ((def.rangeMult ?? 1) - 1) * s);
  const firstBehavior = behaviors[Object.keys(behaviors)[0] as BehaviorId] ?? 0;
  const shown =
    def.descKind === "none"
      ? ""
      : def.descKind === "percent"
        ? String(Math.round((def.damageMult ? damageMult - 1 : def.critAdd ? critAdd : def.rangeMult ? rangeMult - 1 : firstBehavior) * 100))
        : String(Math.round(firstBehavior * 10) / 10);
  const desc = def.descTemplate.replace("{value}", shown);
  return {
    id: `m-${def.id}-${Math.floor(rng() * 99999)}`,
    defId: def.id,
    name: def.name,
    desc,
    family: def.family,
    rarity,
    element: def.element,
    behaviors,
    damageMult,
    magMult,
    reloadMult,
    critAdd,
    rangeMult,
  };
}

/** Počet mod-slotů rámu podle rarity (unikáty 0 — relikvie se neupravují). */
export function maxSlotsFor(rarity: Rarity): number {
  switch (rarity) {
    case "common":
    case "uncommon":
      return 1;
    case "rare":
    case "epic":
      return 2;
    case "legendary":
    case "mythic":
      return 3;
  }
}

/** Setový bonus rodiny: 2 kusy +10 %, 3 kusy +25 % poškození. */
export function familyBonusOf(mods: WeaponMod[]): { mult: number; family: ModFamily | null } {
  const counts = new Map<ModFamily, number>();
  for (const m of mods) counts.set(m.family, (counts.get(m.family) ?? 0) + 1);
  let mult = 1;
  let family: ModFamily | null = null;
  for (const [f, n] of counts) {
    if (n >= 3 && 1.25 > mult) {
      mult = 1.25;
      family = f;
    } else if (n >= 2 && 1.1 > mult) {
      mult = 1.1;
      family = f;
    }
  }
  return { mult, family };
}

/**
 * Efektivní zbraň: základ + mody + setový bonus rodiny (bez mutace vstupu).
 * Bez modů vrací zbraň beze změny.
 */
export function applyMods(w: Weapon): Weapon {
  if (w.mods.length === 0) return w;
  let dmgM = 1;
  let magM = 1;
  let relM = 1;
  let rngM = 1;
  let critA = 0;
  const behaviors: Partial<Record<BehaviorId, number>> = { ...w.behaviors };
  let element = w.element;
  for (const m of w.mods) {
    dmgM *= m.damageMult;
    magM *= m.magMult;
    relM *= m.reloadMult;
    rngM *= m.rangeMult;
    critA += m.critAdd;
    for (const [k, v] of Object.entries(m.behaviors)) {
      const key = k as BehaviorId;
      behaviors[key] = (behaviors[key] ?? 0) + (v ?? 0);
    }
    if (m.element) element = m.element;
  }
  dmgM *= familyBonusOf(w.mods).mult;
  return {
    ...w,
    element,
    stats: {
      ...w.stats,
      damage: Math.round(w.stats.damage * dmgM * 10) / 10,
      magSize: Math.max(1, Math.round(w.stats.magSize * magM)),
      reload: Math.round(w.stats.reload * relM * 100) / 100,
      range: Math.round(w.stats.range * rngM),
      critChance: w.stats.critChance + critA,
    },
    behaviors,
  };
}

// ---------------------------------------------------------------------------
// Blueprinty: trvalé ranky archetypů za zabíjení napříč běhy.
// Ranky: 25 / 60 / 120 / 200 zabití → +5 % DMG → zbrojnice → +1 slot → +10 % DMG.
// ---------------------------------------------------------------------------

const BLUEPRINTS_KEY = "vaultbreak.blueprints.v1";
const ARMORY_KEY = "vaultbreak.armory.v1";

export const BLUEPRINT_RANK_KILLS = [0, 25, 60, 120, 200];

export function killsToRank(kills: number): number {
  let rank = 0;
  for (let i = 0; i < BLUEPRINT_RANK_KILLS.length; i++) {
    if (kills >= BLUEPRINT_RANK_KILLS[i]!) rank = i;
  }
  return rank;
}

/** Nasbíraná zabití podle archetypu. */
export function loadBlueprints(): Partial<Record<ArchetypeId, number>> {
  try {
    const raw = localStorage.getItem(BLUEPRINTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Partial<Record<ArchetypeId, number>> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0 && k in ARCHETYPE_LABEL) {
        out[k as ArchetypeId] = Math.floor(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Přičte zabití z běhu a přepočte ranky. */
export function recordBlueprintKills(kills: Partial<Record<string, number>>): void {
  try {
    const prev = loadBlueprints();
    for (const [k, v] of Object.entries(kills)) {
      if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) continue;
      if (!(k in ARCHETYPE_LABEL)) continue;
      prev[k as ArchetypeId] = (prev[k as ArchetypeId] ?? 0) + Math.floor(v);
    }
    localStorage.setItem(BLUEPRINTS_KEY, JSON.stringify(prev));
  } catch {
    /* ignore quota */
  }
}

/** Násobič DMG rámu z blueprint ranku: +5 % (rank 1), +10 % navíc (rank 4). */
export function blueprintDamageMult(rank: number): number {
  return Math.round((1 + (rank >= 1 ? 0.05 : 0) + (rank >= 4 ? 0.1 : 0)) * 100) / 100;
}

/** Bonusový mod-slot z blueprint ranku (rank 3+). */
export function blueprintSlots(rank: number): number {
  return rank >= 3 ? 1 : 0;
}

/** Zbrojnice: zvolený startovní archetyp (rank 2+), nebo null = služební pistole. */
export function loadArmory(): ArchetypeId | null {
  try {
    const raw = localStorage.getItem(ARMORY_KEY);
    if (!raw) return null;
    return raw in ARCHETYPE_LABEL ? (raw as ArchetypeId) : null;
  } catch {
    return null;
  }
}

export function saveArmory(arch: ArchetypeId | null): void {
  try {
    if (arch) localStorage.setItem(ARMORY_KEY, arch);
    else localStorage.removeItem(ARMORY_KEY);
  } catch {
    /* ignore quota */
  }
}

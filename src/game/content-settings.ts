import {
  DEFAULT_ABILITY_DEFS,
  DEFAULT_PASSIVE_DEFS,
  type ActiveDef,
  type PassiveDef,
} from "./abilities";
import { DEFAULT_AFFIXES, DEFAULT_UNIQUES, DEFAULT_WEAPON_DEFS, type UniqueDef, type WeaponDef } from "./weapons";
import { defaultRoomPlan, type RoomPlan } from "./dungeon";
import { hashSeed, mulberry32 } from "./rng";
import { RARITY_ORDER, type RarityWeights } from "./rarity-settings";
import {
  ARCHETYPE_LABEL,
  SECTOR_SIZE,
  type AbilityKind,
  type Affix,
  type ArchetypeId,
  type BehaviorId,
  type EnemyKind,
  type Element,
  type PassiveId,
  type Rarity,
  type WeaponStats,
} from "./types";

export type GameContentCatalogs = {
  abilities: ActiveDef[];
  passives: PassiveDef[];
  weapons: WeaponDef[];
  affixes: Affix[];
  uniques: UniqueDef[];
  roomPlans: (RoomPlan | null)[];
};

export const CONTENT_CATALOGS_STORAGE_KEY = "vaultbreak.content-catalogs.v1";

export const ABILITY_KINDS: readonly AbilityKind[] = [
  "shockwave",
  "grenade",
  "timestop",
  "orbitals",
  "shield",
  "blink",
  "drone",
  "lightning",
  "well",
  "overclock",
  "mirror",
  "fireball",
  "frostnova",
  "poisonburst",
  "execute",
  "meteor",
  "volley",
  "snipe",
  "shrapnel",
  "hail",
  "smokescreen",
  "staticfield",
  "emp",
  "thundercall",
  "lifedrain",
  "bloodpact",
  "firestorm",
  "frostarmor",
  "bulwark",
  "shadowstep",
  "frenzy",
  "guardian",
  "magnetize",
  "repair",
  "fielddress",
  "detonator",
];

export const PASSIVE_KINDS: readonly PassiveId[] = [
  "vitality",
  "haste",
  "magnet",
  "ricochet",
  "extraPellet",
  "vampirism",
  "dashBattery",
  "reloadKill",
  "frostbite",
  "overloaded",
  "splinter",
  "thickSkin",
  "regen",
  "scavenger",
  "greed",
  "focus",
];

export const WEAPON_ARCHETYPES = Object.keys(ARCHETYPE_LABEL) as ArchetypeId[];
export const ENEMY_KINDS: readonly EnemyKind[] = [
  "grunt",
  "rusher",
  "shooter",
  "tank",
  "splitter",
  "bomber",
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
export const WEAPON_ELEMENTS: readonly Element[] = ["kinetic", "fire", "ice", "shock", "void", "toxic"];
export const WEAPON_BEHAVIORS: readonly BehaviorId[] = [
  "pierce",
  "bounce",
  "homing",
  "explode",
  "burn",
  "freeze",
  "chain",
  "lifesteal",
  "split",
  "knockback",
  "burst",
  "echo",
  "beam",
  "poison",
  "shockstun",
  "orbit",
  "pierceArmor",
];

export const ABILITY_KIND_LABELS: Record<AbilityKind, string> = {
  shockwave: "Rázová vlna",
  grenade: "Granát",
  timestop: "Zpomalení času",
  orbitals: "Orbitální ostří",
  shield: "Štít",
  blink: "Teleport",
  drone: "Dron",
  lightning: "Blesk",
  well: "Gravitační studna",
  overclock: "Přetaktování",
  mirror: "Zrcadlo",
  fireball: "Ohnivá koule",
  frostnova: "Mrazivá nova",
  poisonburst: "Jedová vlna",
  execute: "Poprava",
  meteor: "Meteor",
  volley: "Salva",
  snipe: "Odstřel",
  shrapnel: "Šrapnel",
  hail: "Krupobití",
  smokescreen: "Kouřová clona",
  staticfield: "Statické pole",
  emp: "EMP výboj",
  thundercall: "Volání bouře",
  lifedrain: "Vysátí života",
  bloodpact: "Krvavá daň",
  firestorm: "Ohnivá bouře",
  frostarmor: "Ledová zbroj",
  bulwark: "Bašta",
  shadowstep: "Krok stínů",
  frenzy: "Zuřivost",
  guardian: "Věrný stín",
  magnetize: "Magnetizace",
  repair: "Polní oprava",
  fielddress: "Polní obvaz",
  detonator: "Roznětka",
};

export const PASSIVE_KIND_LABELS: Record<PassiveId, string> = {
  vitality: "Vitalita",
  haste: "Spěch",
  magnet: "Magnet",
  ricochet: "Ricochet",
  extraPellet: "Dělená hlaveň",
  vampirism: "Vampirismus",
  dashBattery: "Baterie dash",
  reloadKill: "Kořistní nabíjení",
  frostbite: "Omrzlina",
  overloaded: "Přepětí",
  splinter: "Tříska",
  thickSkin: "Tlustá kůže",
  regen: "Regenerace",
  scavenger: "Mrchožrout",
  greed: "Nenasytnost",
  focus: "Soustředění",
};

export const WEAPON_ELEMENT_LABELS: Record<Element, string> = {
  kinetic: "Kinetický",
  fire: "Oheň",
  ice: "Led",
  shock: "Elektřina",
  void: "Prázdnota",
  toxic: "Toxin",
};

export const WEAPON_BEHAVIOR_LABELS: Record<BehaviorId, string> = {
  pierce: "Průraz",
  bounce: "Odraz",
  homing: "Navádění",
  explode: "Výbuch",
  burn: "Hoření",
  freeze: "Mráz",
  chain: "Řetěz",
  lifesteal: "Vysátí",
  split: "Tříštění",
  knockback: "Odhazování",
  burst: "Dávka",
  echo: "Ozvěna",
  beam: "Paprsek",
  poison: "Jed",
  shockstun: "Omráčení",
  orbit: "Orbitální střely",
  pierceArmor: "Průraznost",
};

export const ENEMY_KIND_LABELS: Record<EnemyKind, string> = {
  grunt: "Pěšák",
  rusher: "Běžec",
  shooter: "Střelec",
  tank: "Tank",
  splitter: "Rozdělovač",
  bomber: "Bomber",
  sniper: "Odstřelovač",
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
  boss: "Boss",
};

export function roomEditorDefault(index: number): RoomPlan {
  return defaultRoomPlan(mulberry32(hashSeed(`VAULTBREAK-ROOM-EDITOR-${index}`)), index);
}

export function defaultGameContent(): GameContentCatalogs {
  return {
    abilities: DEFAULT_ABILITY_DEFS.map((def) => ({ ...def, names: [...def.names] })),
    passives: DEFAULT_PASSIVE_DEFS.map((def) => ({ ...def, range: [...def.range] })),
    weapons: DEFAULT_WEAPON_DEFS.map((def) => ({ ...def, stats: { ...def.stats }, behaviors: { ...def.behaviors } })),
    affixes: DEFAULT_AFFIXES.map((def) => ({ ...def, stats: def.stats ? { ...def.stats } : undefined, behaviors: def.behaviors ? { ...def.behaviors } : undefined })),
    uniques: DEFAULT_UNIQUES.map((def) => ({ ...def, stats: { ...def.stats }, behaviors: { ...def.behaviors } })),
    roomPlans: Array.from({ length: SECTOR_SIZE }, () => null),
  };
}

function isRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part))
  );
}

function normalizeAbility(value: unknown): ActiveDef | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.kind !== "string" ||
    !ABILITY_KINDS.includes(item.kind as AbilityKind) ||
    !Array.isArray(item.names) ||
    item.names.length !== 3 ||
    !item.names.every((name) => typeof name === "string") ||
    typeof item.desc !== "string" ||
    !isRange(item.cooldown) ||
    !isRange(item.damage) ||
    !isRange(item.radius) ||
    !isRange(item.duration) ||
    typeof item.weight !== "number" ||
    !Number.isFinite(item.weight)
  ) {
    return null;
  }
  return {
    id: item.id,
    kind: item.kind as AbilityKind,
    names: [item.names[0] as string, item.names[1] as string, item.names[2] as string],
    desc: item.desc,
    cooldown: [Math.max(0.1, item.cooldown[0]), Math.max(0.1, item.cooldown[1])],
    damage: [Math.max(0, item.damage[0]), Math.max(0, item.damage[1])],
    radius: [Math.max(0, item.radius[0]), Math.max(0, item.radius[1])],
    duration: [Math.max(0, item.duration[0]), Math.max(0, item.duration[1])],
    weight: Math.min(100, Math.max(0, item.weight)),
  };
}

function normalizePassive(value: unknown): PassiveDef | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.kind !== "string" ||
    !PASSIVE_KINDS.includes(item.kind as PassiveId) ||
    typeof item.name !== "string" ||
    typeof item.descTemplate !== "string" ||
    !["integer", "percent", "none"].includes(String(item.valueFormat)) ||
    !isRange(item.range) ||
    typeof item.weight !== "number" ||
    !Number.isFinite(item.weight)
  ) {
    return null;
  }
  return {
    id: item.id,
    kind: item.kind as PassiveId,
    name: item.name,
    descTemplate: item.descTemplate,
    valueFormat: item.valueFormat as PassiveDef["valueFormat"],
    range: [Math.max(0, item.range[0]), Math.max(0, item.range[1])],
    weight: Math.min(100, Math.max(0, item.weight)),
  };
}

function normalizeWeapon(value: unknown): WeaponDef | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const stats = item.stats as Record<string, unknown> | null;
  const behaviors = item.behaviors as Record<string, unknown> | null;
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.archetype !== "string" ||
    !WEAPON_ARCHETYPES.includes(item.archetype as ArchetypeId) ||
    typeof item.element !== "string" ||
    !WEAPON_ELEMENTS.includes(item.element as Element) ||
    typeof item.weight !== "number" ||
    !Number.isFinite(item.weight) ||
    !stats ||
    !isRange(stats.damage) ||
    !isRange(stats.rpm) ||
    typeof stats.spread !== "number" ||
    !isRange(stats.pellets) ||
    !isRange(stats.mag) ||
    !isRange(stats.reload) ||
    !isRange(stats.speed) ||
    !isRange(stats.size) ||
    !isRange(stats.range) ||
    typeof stats.knockback !== "number" ||
    typeof item.critChance !== "number" ||
    typeof item.critMult !== "number" ||
    !behaviors ||
    typeof behaviors !== "object" ||
    Array.isArray(behaviors)
  ) {
    return null;
  }
  const cleanBehaviors: Partial<Record<BehaviorId, number>> = {};
  for (const key of WEAPON_BEHAVIORS) {
    const amount = behaviors[key];
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      cleanBehaviors[key] = Math.min(1000, amount);
    }
  }
  return {
    id: item.id,
    name: item.name,
    archetype: item.archetype as ArchetypeId,
    weight: Math.min(100, Math.max(0, item.weight)),
    element: item.element as Element,
    stats: {
      damage: [Math.max(0.1, stats.damage[0]), Math.max(0.1, stats.damage[1])],
      rpm: [Math.max(1, stats.rpm[0]), Math.max(1, stats.rpm[1])],
      spread: Math.max(0, stats.spread),
      pellets: [Math.max(1, stats.pellets[0]), Math.max(1, stats.pellets[1])],
      mag: [Math.max(1, stats.mag[0]), Math.max(1, stats.mag[1])],
      reload: [Math.max(0.1, stats.reload[0]), Math.max(0.1, stats.reload[1])],
      speed: [Math.max(1, stats.speed[0]), Math.max(1, stats.speed[1])],
      size: [Math.max(0.1, stats.size[0]), Math.max(0.1, stats.size[1])],
      range: [Math.max(1, stats.range[0]), Math.max(1, stats.range[1])],
      knockback: Math.max(0, stats.knockback),
    },
    behaviors: cleanBehaviors,
    critChance: Math.min(1, Math.max(0, item.critChance)),
    critMult: Math.max(1, item.critMult),
  };
}

function normalizeAffix(value: unknown): Affix | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    (item.slot !== "prefix" && item.slot !== "suffix") ||
    typeof item.nameM !== "string" ||
    typeof item.nameF !== "string" ||
    typeof item.weight !== "number" ||
    !Number.isFinite(item.weight)
  ) {
    return null;
  }
  let element: Element | undefined;
  if (item.element !== undefined) {
    if (typeof item.element !== "string" || !WEAPON_ELEMENTS.includes(item.element as Element)) return null;
    element = item.element as Element;
  }
  return {
    id: item.id,
    slot: item.slot,
    nameM: item.nameM,
    nameF: item.nameF,
    weight: Math.min(100, Math.max(0, item.weight)),
    element,
    stats: normalizeWeaponStats(item.stats),
    behaviors: normalizeBehaviors(item.behaviors),
  };
}

function normalizeWeaponStats(raw: unknown): Partial<WeaponStats> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;
  const out: Partial<WeaponStats> = {};
  const num = (key: string): number | undefined =>
    typeof s[key] === "number" && Number.isFinite(s[key]) ? (s[key] as number) : undefined;
  for (const key of ["damage", "rpm", "spread", "pellets", "magSize", "reload", "projSpeed", "projSize", "range", "knockback", "critChance", "critMult"] as const) {
    const v = num(key);
    if (v !== undefined) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeBehaviors(raw: unknown): Partial<Record<BehaviorId, number>> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const out: Partial<Record<BehaviorId, number>> = {};
  for (const key of WEAPON_BEHAVIORS) {
    const amount = record[key];
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      out[key] = Math.min(1000, amount);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const UNIQUE_STAT_LIMITS: Record<string, [number, number]> = {
  damage: [0.1, 2000],
  rpm: [1, 3000],
  pellets: [1, 20],
  magSize: [1, 500],
  reload: [0.1, 10],
  projSpeed: [1, 3000],
  projSize: [0.1, 40],
  range: [1, 3000],
  knockback: [0, 3000],
  critChance: [0, 1],
  critMult: [1, 20],
};

function normalizeUnique(value: unknown): UniqueDef | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.arch !== "string" ||
    !WEAPON_ARCHETYPES.includes(item.arch as ArchetypeId) ||
    typeof item.element !== "string" ||
    !WEAPON_ELEMENTS.includes(item.element as Element) ||
    typeof item.rarity !== "string" ||
    (item.rarity !== "legendary" && item.rarity !== "mythic") ||
    typeof item.weight !== "number" ||
    !Number.isFinite(item.weight)
  ) {
    return null;
  }
  const stats = normalizeWeaponStats(item.stats) ?? {};
  const clamped: Partial<WeaponStats> = {};
  for (const [key, [min, max]] of Object.entries(UNIQUE_STAT_LIMITS)) {
    const v = (stats as Record<string, number | undefined>)[key];
    if (typeof v === "number") clamped[key as keyof typeof clamped] = Math.min(max, Math.max(min, v));
  }
  return {
    id: item.id,
    name: item.name,
    arch: item.arch as ArchetypeId,
    element: item.element as Element,
    rarity: item.rarity as Rarity,
    weight: Math.min(100, Math.max(0, item.weight)),
    stats: clamped,
    behaviors: normalizeBehaviors(item.behaviors) ?? {},
  };
}

function normalizeRoomPlan(value: unknown): RoomPlan | null {
  if (value === null || !value || typeof value !== "object") return null;
  const plan = value as Record<string, unknown>;
  if (
    typeof plan.isBoss !== "boolean" ||
    typeof plan.isElite !== "boolean" ||
    typeof plan.obstacleCount !== "number" ||
    !Number.isInteger(plan.obstacleCount) ||
    plan.obstacleCount < 0 ||
    plan.obstacleCount > 12 ||
    !Array.isArray(plan.waves) ||
    plan.waves.length < 1 ||
    plan.waves.length > 8
  ) {
    return null;
  }
  const waves: RoomPlan["waves"] = [];
  for (const value of plan.waves) {
    if (!value || typeof value !== "object") return null;
    const wave = value as Record<string, unknown>;
    if (
      typeof wave.delay !== "number" ||
      !Number.isFinite(wave.delay) ||
      !Array.isArray(wave.spawns) ||
      wave.spawns.length < 1 ||
      wave.spawns.length > 8
    ) {
      return null;
    }
    const spawns: RoomPlan["waves"][number]["spawns"] = [];
    for (const value of wave.spawns) {
      if (!value || typeof value !== "object") return null;
      const spawn = value as Record<string, unknown>;
      if (
        typeof spawn.kind !== "string" ||
        !ENEMY_KINDS.includes(spawn.kind as EnemyKind) ||
        typeof spawn.count !== "number" ||
        !Number.isInteger(spawn.count) ||
        spawn.count < 1 ||
        spawn.count > 100
      ) {
        return null;
      }
      spawns.push({ kind: spawn.kind as EnemyKind, count: spawn.count });
    }
    waves.push({ delay: Math.min(60, Math.max(0, wave.delay)), spawns });
  }
  return {
    isBoss: plan.isBoss,
    isElite: plan.isElite,
    obstacleCount: plan.obstacleCount,
    waves,
  };
}

export function readGameContent(): GameContentCatalogs {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(CONTENT_CATALOGS_STORAGE_KEY) ?? "null");
    const parsed = parseImportedCatalogs(saved);
    if (!parsed) return defaultGameContent();
    return parsed.content;
  } catch {
    return defaultGameContent();
  }
}

export function saveGameContent(content: GameContentCatalogs): void {
  try {
    localStorage.setItem(CONTENT_CATALOGS_STORAGE_KEY, JSON.stringify(content));
  } catch {
    // Catalog edits remain available for the current page if storage is unavailable.
  }
}

export const CATALOG_EXPORT_FORMAT = "vaultbreak-catalogs";
export const CATALOG_EXPORT_VERSION = 1;

export type ImportDropped = { abilities: number; passives: number; weapons: number; affixes: number; uniques: number; roomPlans: number };

export type ParsedCatalogs = {
  content: GameContentCatalogs;
  weights: RarityWeights | null;
  dropped: ImportDropped;
};

/** Normalizuje surový import (soubor i localStorage). Neplatné položky zahodí a spočítá. */
export function parseImportedCatalogs(raw: unknown): ParsedCatalogs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.abilities) || !Array.isArray(record.passives)) return null;
  const abilitiesAll = record.abilities.map(normalizeAbility);
  const passivesAll = record.passives.map(normalizePassive);
  const weaponsAll = Array.isArray(record.weapons) ? record.weapons.map(normalizeWeapon) : [];
  // Starší uložená data affixy/unikáty nemají — doplní se výchozí (zpětná kompatibilita).
  const affixesAll: (Affix | null)[] = Array.isArray(record.affixes)
    ? record.affixes.map(normalizeAffix)
    : DEFAULT_AFFIXES.map((a) => ({ ...a }));
  const uniquesAll: (UniqueDef | null)[] = Array.isArray(record.uniques)
    ? record.uniques.map(normalizeUnique)
    : DEFAULT_UNIQUES.map((u) => ({ ...u }));
  const rawRoomPlans = record.roomPlans;
  const roomPlans = Array.isArray(rawRoomPlans)
    ? Array.from({ length: SECTOR_SIZE }, (_, index) => normalizeRoomPlan(rawRoomPlans[index]))
    : defaultGameContent().roomPlans;
  const dropped: ImportDropped = {
    abilities: abilitiesAll.filter((item) => item === null).length,
    passives: passivesAll.filter((item) => item === null).length,
    weapons: weaponsAll.filter((item) => item === null).length,
    affixes: affixesAll.filter((item) => item === null).length,
    uniques: uniquesAll.filter((item) => item === null).length,
    roomPlans: roomPlans.filter((item) => item === null).length,
  };
  const abilities = abilitiesAll.filter((item): item is ActiveDef => item !== null);
  const passives = passivesAll.filter((item): item is PassiveDef => item !== null);
  const weapons = weaponsAll.filter((item): item is WeaponDef => item !== null);
  const affixes = affixesAll.filter((item): item is Affix => item !== null);
  const uniques = uniquesAll.filter((item): item is UniqueDef => item !== null);
  if (abilities.length === 0 || passives.length === 0 || weapons.length === 0) return null;
  // Prázdné affixy/unikáty: hra spadne na vestavěné výchozí (generátor má fallback).
  return {
    content: {
      abilities,
      passives,
      weapons,
      affixes: affixes.length > 0 ? affixes : defaultGameContent().affixes,
      uniques: uniques.length > 0 ? uniques : defaultGameContent().uniques,
      roomPlans,
    },
    weights: parseImportedWeights(record.weights),
    dropped,
  };
}

function parseImportedWeights(raw: unknown): RarityWeights | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const weights = {} as RarityWeights;
  for (const rarity of RARITY_ORDER) {
    const weight = record[rarity];
    if (typeof weight !== "number" || !Number.isFinite(weight)) return null;
    weights[rarity] = Math.round(Math.min(100, Math.max(0, weight)));
  }
  if (Object.values(weights).every((weight) => weight === 0)) return null;
  return weights;
}

/** Serializace pro export do souboru (včetně vah rarit). */
export function serializeCatalogs(content: GameContentCatalogs, weights: RarityWeights): string {
  return JSON.stringify(
    {
      format: CATALOG_EXPORT_FORMAT,
      version: CATALOG_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      weights,
      ...content,
    },
    null,
    2,
  );
}

export type CatalogReport = { errors: string[]; warnings: string[] };

function dupIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups];
}

/** Sémantická kontrola katalogů: chyby blokují import, varování jen upozorňují. */
export function validateCatalogs(content: GameContentCatalogs, weights?: RarityWeights): CatalogReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (content.abilities.length === 0) errors.push("Schopnosti: katalog je prázdný.");
  if (content.passives.length === 0) errors.push("Pasivky: katalog je prázdný.");
  if (content.weapons.length === 0) errors.push("Zbraně: katalog je prázdný.");

  const sumW = (items: { weight: number }[]) => items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (content.abilities.length > 0 && sumW(content.abilities) <= 0)
    errors.push("Schopnosti: součet vah je nula — nic by nepadalo.");
  if (content.passives.length > 0 && sumW(content.passives) <= 0)
    errors.push("Pasivky: součet vah je nula — nic by nepadalo.");
  if (content.weapons.length > 0 && sumW(content.weapons) <= 0)
    errors.push("Zbraně: součet vah je nula — nic by nepadalo.");

  for (const [label, ids] of [
    ["Schopnosti", content.abilities.map((i) => i.id)],
    ["Pasivky", content.passives.map((i) => i.id)],
    ["Zbraně", content.weapons.map((i) => i.id)],
    ["Affixy", content.affixes.map((i) => i.id)],
    ["Unikáty", content.uniques.map((i) => i.id)],
  ] as const) {
    const dups = dupIds(ids);
    if (dups.length > 0) errors.push(`${label}: duplicitní id (${dups.slice(0, 3).join(", ")}).`);
  }

  for (const a of content.abilities) {
    if (!a.names.some((n) => n.trim())) warnings.push(`Schopnost "${a.id}": všechny názvy prázdné.`);
    if (!a.desc.trim()) warnings.push(`Schopnost "${a.names[0] || a.id}": prázdný popis.`);
    if (a.damage[1] > 5000) warnings.push(`Schopnost "${a.names[0] || a.id}": extrémní poškození (${a.damage[1]}).`);
    if (a.cooldown[0] > 60) warnings.push(`Schopnost "${a.names[0] || a.id}": obnova přes 60 s.`);
  }
  for (const p of content.passives) {
    if (!p.name.trim()) warnings.push(`Pasivka "${p.id}": prázdný název.`);
    if (p.valueFormat !== "none" && !p.descTemplate.includes("{value}"))
      warnings.push(`Pasivka "${p.name || p.id}": popis neobsahuje {value}.`);
    if (p.range[1] > 1000) warnings.push(`Pasivka "${p.name || p.id}": extrémní hodnota (${p.range[1]}).`);
  }
  for (const w of content.weapons) {
    if (!w.name.trim()) warnings.push(`Zbraň "${w.id}": prázdný název.`);
    if (w.stats.damage[1] > 500)
      warnings.push(`Zbraň "${w.name || w.id}": extrémní poškození (${w.stats.damage[1]}).`);
    if (w.stats.rpm[1] > 2000) warnings.push(`Zbraň "${w.name || w.id}": extrémní kadence (${w.stats.rpm[1]}).`);
    if (w.stats.mag[1] > 300) warnings.push(`Zbraň "${w.name || w.id}": extrémní zásobník (${w.stats.mag[1]}).`);
    if (w.critChance >= 1) warnings.push(`Zbraň "${w.name || w.id}": 100% kritická šance.`);
  }

  if (weights && RARITY_ORDER.every((r) => (weights[r] ?? 0) <= 0))
    errors.push("Rarity: součet vah je nula — loot by negeneroval.");

  const prefixW = sumW(content.affixes.filter((a) => a.slot === "prefix"));
  const suffixW = sumW(content.affixes.filter((a) => a.slot === "suffix"));
  if (prefixW <= 0) warnings.push("Affixy: žádný prefix s vahou — zbraně budou bez prefixů.");
  if (suffixW <= 0) warnings.push("Affixy: žádný suffix s vahou — zbraně budou bez suffixů.");
  if (sumW(content.uniques) <= 0) warnings.push("Unikáty: nulové váhy — legendární/mythic dropy budou běžné zbraně.");
  for (const a of content.affixes) {
    if (!a.nameM.trim() || !a.nameF.trim()) warnings.push(`Affix "${a.id}": prázdný název.`);
    if (!a.stats && !a.behaviors) warnings.push(`Affix "${a.nameM || a.id}": nemá žádný efekt.`);
  }
  for (const u of content.uniques) {
    if (!u.name.trim()) warnings.push(`Unikát "${u.id}": prázdný název.`);
    if (u.stats.damage !== undefined && u.stats.damage > 500)
      warnings.push(`Unikát "${u.name || u.id}": extrémní poškození (${u.stats.damage}).`);
  }

  return { errors, warnings };
}
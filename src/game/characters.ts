import { ARCHETYPE_LABEL, type ArchetypeId, type Element } from "./types";
import {
  normalizeWeaponComponents,
  type CharacterWeaponComponents,
} from "./weapon-components";

const KEY = "vaultbreak.characters.v1";
const LEGACY_PROFILE_KEY = "vaultbreak-v1";
export const CHARACTER_LEVEL_CAP = 30;

export type CharacterTalentId = "vitality" | "ballistics" | "scavenging";
export type CharacterTalents = Record<CharacterTalentId, number>;
export type CharacterMaterials = {
  scrap: number;
  alloys: number;
  cores: number;
  catalysts: Partial<Record<Element, number>>;
  fragments: Partial<Record<ArchetypeId, number>>;
};

export type CharacterProgress = {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpTotal: number;
  talentPoints: number;
  talents: CharacterTalents;
  materials: CharacterMaterials;
  craftedWeapons: ArchetypeId[];
  weaponComponents: CharacterWeaponComponents;
  starterArchetype: ArchetypeId | null;
  respecCount: number;
};

export type CharacterSave = {
  version: 1;
  activeCharacterId: string;
  characters: CharacterProgress[];
};

export const DEFAULT_CHARACTER: CharacterProgress = {
  id: "operative-1",
  name: "Operative",
  level: 1,
  xp: 0,
  xpTotal: 0,
  talentPoints: 0,
  talents: { vitality: 0, ballistics: 0, scavenging: 0 },
  materials: { scrap: 0, alloys: 0, cores: 0, catalysts: {}, fragments: {} },
  craftedWeapons: [],
  weaponComponents: {},
  starterArchetype: null,
  respecCount: 0,
};

const ELEMENTS: Element[] = ["kinetic", "fire", "ice", "shock", "void", "toxic"];

function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(999_999, Math.max(0, Math.floor(parsed))) : 0;
}

function normalizeCounts<T extends string>(value: unknown, allowed: readonly T[]): Partial<Record<T, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized: Partial<Record<T, number>> = {};
  for (const key of allowed) {
    const amount = count((value as Record<string, unknown>)[key]);
    if (amount > 0) normalized[key] = amount;
  }
  return normalized;
}

function normalizeMaterials(value: unknown): CharacterMaterials {
  const raw = value && typeof value === "object" ? value as Partial<CharacterMaterials> : {};
  return {
    scrap: count(raw.scrap),
    alloys: count(raw.alloys),
    cores: count(raw.cores),
    catalysts: normalizeCounts(raw.catalysts, ELEMENTS),
    fragments: normalizeCounts(raw.fragments, Object.keys(ARCHETYPE_LABEL) as ArchetypeId[]),
  };
}

export function normalizeTalents(value: unknown): CharacterTalents {
  const raw = value && typeof value === "object" ? value as Partial<CharacterTalents> : {};
  return {
    vitality: Math.min(5, count(raw.vitality)),
    ballistics: Math.min(5, count(raw.ballistics)),
    scavenging: Math.min(5, count(raw.scavenging)),
  };
}

function normalizeCharacter(value: unknown): CharacterProgress | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<CharacterProgress>;
  if (typeof raw.id !== "string" || raw.id.length === 0) return null;
  const level = Math.max(1, Math.min(CHARACTER_LEVEL_CAP, nonnegativeInteger(raw.level) || 1));
  const xpToNext = xpForNextLevel(level);
  const craftedWeapons = Array.isArray(raw.craftedWeapons)
    ? [...new Set(raw.craftedWeapons.filter((weapon): weapon is ArchetypeId => typeof weapon === "string" && Object.prototype.hasOwnProperty.call(ARCHETYPE_LABEL, weapon)))]
    : [];
  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 24) : "Operative",
    level,
    xp: level >= CHARACTER_LEVEL_CAP ? 0 : Math.min(xpToNext - 1, nonnegativeInteger(raw.xp)),
    xpTotal: nonnegativeInteger(raw.xpTotal),
    talentPoints: nonnegativeInteger(raw.talentPoints),
    talents: normalizeTalents(raw.talents),
    materials: normalizeMaterials(raw.materials),
    craftedWeapons,
    weaponComponents: normalizeWeaponComponents(raw.weaponComponents, craftedWeapons),
    starterArchetype: typeof raw.starterArchetype === "string" && Object.prototype.hasOwnProperty.call(ARCHETYPE_LABEL, raw.starterArchetype)
      ? raw.starterArchetype as ArchetypeId
      : null,
    respecCount: count(raw.respecCount),
  };
}

function defaultSave(): CharacterSave {
  return { version: 1, activeCharacterId: DEFAULT_CHARACTER.id, characters: [{ ...DEFAULT_CHARACTER }] };
}

function nonnegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function migrateLegacyCharacter(): CharacterProgress | null {
  try {
    const raw = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw) as { level?: number; xp?: number; xpTotal?: number };
    return normalizeCharacter({
      ...DEFAULT_CHARACTER,
      level: legacy.level,
      xp: legacy.xp,
      xpTotal: legacy.xpTotal,
    });
  } catch {
    return null;
  }
}

export function loadCharacters(): CharacterSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const legacy = migrateLegacyCharacter();
      const migrated = defaultSave();
      if (legacy) migrated.characters = [legacy];
      writeCharacters(migrated);
      return migrated;
    }
    const parsed = JSON.parse(raw) as Partial<CharacterSave>;
    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.map(normalizeCharacter).filter((character): character is CharacterProgress => character !== null)
      : [];
    const usableCharacters = characters.length > 0 ? characters : [{ ...DEFAULT_CHARACTER }];
    const activeCharacterId = usableCharacters.some((character) => character.id === parsed.activeCharacterId)
      ? parsed.activeCharacterId!
      : usableCharacters[0]!.id;
    return { version: 1, activeCharacterId, characters: usableCharacters };
  } catch {
    return defaultSave();
  }
}

export function writeCharacters(next: CharacterSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Keep the game playable if browser storage is unavailable. */
  }
}

export function persistActiveCharacter(next: CharacterProgress): void {
  const save = loadCharacters();
  if (!save.characters.some((character) => character.id === next.id)) return;
  writeCharacters({
    ...save,
    characters: save.characters.map((character) => character.id === next.id ? next : character),
  });
}

export function loadActiveCharacter(): CharacterProgress {
  const save = loadCharacters();
  return save.characters.find((character) => character.id === save.activeCharacterId) ?? { ...DEFAULT_CHARACTER };
}

export function xpForNextLevel(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return Math.round(100 * Math.pow(1.12, safeLevel - 1));
}

export function applyCharacterXp(level: number, xp: number): { level: number; xp: number; levelsGained: number } {
  let currentLevel = Math.max(1, Math.min(CHARACTER_LEVEL_CAP, nonnegativeInteger(level) || 1));
  let currentXp = nonnegativeInteger(xp);
  const startingLevel = currentLevel;
  while (currentLevel < CHARACTER_LEVEL_CAP && currentXp >= xpForNextLevel(currentLevel)) {
    currentXp -= xpForNextLevel(currentLevel);
    currentLevel += 1;
  }
  if (currentLevel >= CHARACTER_LEVEL_CAP) currentXp = 0;
  return { level: currentLevel, xp: currentXp, levelsGained: currentLevel - startingLevel };
}

export function awardCharacterXp(amount: number): CharacterProgress {
  const save = loadCharacters();
  const active = save.characters.find((character) => character.id === save.activeCharacterId) ?? { ...DEFAULT_CHARACTER };
  const earned = nonnegativeInteger(amount);
  const progression = applyCharacterXp(active.level, active.xp + earned);
  const next: CharacterProgress = {
    ...active,
    level: progression.level,
    xp: progression.xp,
    xpTotal: active.xpTotal + earned,
    talentPoints: active.talentPoints + progression.levelsGained,
  };
  writeCharacters({
    ...save,
    characters: save.characters.map((character) => character.id === next.id ? next : character),
  });
  return next;
}

export type CharacterActionResult =
  | { ok: true; character: CharacterProgress; message: string }
  | { ok: false; character: CharacterProgress; message: string };

export const TALENT_LEVEL_REQUIREMENTS = [1, 5, 10, 20, 25] as const;
export const TALENT_REWARDS: Record<CharacterTalentId, { name: string; description: string }> = {
  vitality: { name: "Výdrž", description: "+8 maximálního zdraví za stupeň" },
  ballistics: { name: "Balistika", description: "+3 % poškození zbraní za stupeň" },
  scavenging: { name: "Polní sběr", description: "+5 % šance na dodatečný běžný materiál za stupeň" },
};

export function talentUnlockLevel(rank: number): number {
  return TALENT_LEVEL_REQUIREMENTS[Math.max(0, Math.min(TALENT_LEVEL_REQUIREMENTS.length - 1, rank - 1))]!;
}

export function purchaseCharacterTalent(id: CharacterTalentId): CharacterActionResult {
  const character = loadActiveCharacter();
  const rank = character.talents[id];
  if (rank >= TALENT_LEVEL_REQUIREMENTS.length) {
    return { ok: false, character, message: "Tato větev už má nejvyšší stupeň." };
  }
  const requiredLevel = talentUnlockLevel(rank + 1);
  if (character.level < requiredLevel) {
    return { ok: false, character, message: `Další stupeň se odemkne na levelu ${requiredLevel}.` };
  }
  if (character.talentPoints < 1) {
    return { ok: false, character, message: "Nemáš volný talentový bod." };
  }
  const next = {
    ...character,
    talentPoints: character.talentPoints - 1,
    talents: { ...character.talents, [id]: rank + 1 },
  };
  persistActiveCharacter(next);
  return { ok: true, character: next, message: `${TALENT_REWARDS[id].name}: stupeň ${rank + 1} odemčen.` };
}

export function talentRespecCost(respecCount: number): Pick<CharacterMaterials, "scrap" | "alloys"> {
  return { scrap: 30 + Math.max(0, Math.floor(respecCount)) * 20, alloys: 2 + Math.max(0, Math.floor(respecCount)) };
}

export function respecCharacterTalents(): CharacterActionResult {
  const character = loadActiveCharacter();
  const ranksSpent = Object.values(character.talents).reduce((total, rank) => total + rank, 0);
  if (ranksSpent === 0) {
    return { ok: false, character, message: "Nemáš žádné utracené body k vrácení." };
  }
  const cost = talentRespecCost(character.respecCount);
  if (character.materials.scrap < cost.scrap || character.materials.alloys < cost.alloys) {
    return { ok: false, character, message: `Reset stojí ${cost.scrap} šrotu a ${cost.alloys} slitin.` };
  }
  const next = {
    ...character,
    talentPoints: character.talentPoints + ranksSpent,
    talents: { vitality: 0, ballistics: 0, scavenging: 0 },
    materials: {
      ...character.materials,
      scrap: character.materials.scrap - cost.scrap,
      alloys: character.materials.alloys - cost.alloys,
    },
    respecCount: character.respecCount + 1,
  };
  persistActiveCharacter(next);
  return { ok: true, character: next, message: `Talenty resetovány za ${cost.scrap} šrotu a ${cost.alloys} slitin.` };
}

export function grantCharacterRunMaterials(
  earned: CharacterMaterials,
  scrapEarned: number,
): CharacterProgress {
  const character = loadActiveCharacter();
  const next: CharacterProgress = {
    ...character,
    materials: {
      scrap: Math.min(999_999, character.materials.scrap + count(scrapEarned) + count(earned.scrap)),
      alloys: Math.min(999_999, character.materials.alloys + count(earned.alloys)),
      cores: Math.min(999_999, character.materials.cores + count(earned.cores)),
      catalysts: { ...character.materials.catalysts },
      fragments: { ...character.materials.fragments },
    },
  };
  for (const element of ELEMENTS) {
    const total = Math.min(999_999, (next.materials.catalysts[element] ?? 0) + count(earned.catalysts[element]));
    if (total > 0) next.materials.catalysts[element] = total;
  }
  for (const archetype of Object.keys(ARCHETYPE_LABEL) as ArchetypeId[]) {
    const total = Math.min(999_999, (next.materials.fragments[archetype] ?? 0) + count(earned.fragments[archetype]));
    if (total > 0) next.materials.fragments[archetype] = total;
  }
  persistActiveCharacter(next);
  return next;
}

export const CHARACTER_STORAGE_KEY = KEY;

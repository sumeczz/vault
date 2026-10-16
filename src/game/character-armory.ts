import { ARCHETYPE_LABEL, type ArchetypeId, type Element, type EnemyKind } from "./types";
import { ENEMY_NAME } from "./bestiary";
import {
  loadActiveCharacter,
  persistActiveCharacter,
  type CharacterActionResult,
  type CharacterMaterials,
} from "./characters";
import {
  canAffordWeaponComponent,
  componentDefinition,
  isWeaponComponentId,
  weaponComponentCost,
  type WeaponComponentId,
} from "./weapon-components";

export type WeaponRecipe = {
  fragments: number;
  alloys: number;
  cores: number;
  scrap: number;
};

const ADVANCED_ARCHETYPES: ArchetypeId[] = [
  "sniper", "launcher", "beam", "flamer", "bouncer", "minigun",
  "rail", "helix", "mortar", "arc", "swarm", "harpoon",
];

export function weaponRecipe(archetype: ArchetypeId): WeaponRecipe {
  return ADVANCED_ARCHETYPES.includes(archetype)
    ? { fragments: 12, alloys: 4, cores: 2, scrap: 80 }
    : { fragments: 8, alloys: 3, cores: 0, scrap: 40 };
}

export function weaponFragmentSourceHint(archetype: ArchetypeId): string {
  return weaponFragmentSources(archetype).map((enemy) => ENEMY_NAME[enemy]).join(", ");
}

const FRAGMENT_SOURCE: Record<EnemyKind, ArchetypeId> = {
  grunt: "pistol",
  rusher: "smg",
  shooter: "rifle",
  tank: "shotgun",
  splitter: "bouncer",
  bomber: "launcher",
  sniper: "sniper",
  lezec: "smg",
  drtic: "minigun",
  stin: "rail",
  stopar: "harpoon",
  des: "beam",
  cepel: "helix",
  nosorozec: "shotgun",
  kopi: "harpoon",
  kanonyr: "mortar",
  ostrostrelec: "sniper",
  jiskra: "arc",
  vrhac: "flamer",
  gardista: "rifle",
  srsen: "swarm",
  spravce: "minigun",
  tekavka: "smg",
  bourak: "launcher",
  roztoc: "swarm",
  medik: "beam",
  matka: "helix",
  boss: "pistol",
};

const ELEMENTAL_SOURCES: Partial<Record<EnemyKind, Element>> = {
  des: "void",
  jiskra: "shock",
  matka: "toxic",
};

const ARMORED_SOURCES = new Set<EnemyKind>(["tank", "drtic", "nosorozec", "gardista", "spravce"]);
const CORE_SOURCES = new Set<EnemyKind>(["medik", "jiskra", "spravce"]);
const ARCHETYPES = Object.keys(ARCHETYPE_LABEL) as ArchetypeId[];
const COMPONENT_SLOT_LABEL: Record<"barrel" | "magazine" | "core", string> = {
  barrel: "hlavně",
  magazine: "zásobníku",
  core: "jádra",
};
const CATALYST_ELEMENT_LABEL: Record<Element, string> = {
  kinetic: "kinetiky",
  fire: "ohně",
  ice: "ledu",
  shock: "elektřiny",
  void: "prázdnoty",
  toxic: "toxinu",
};

export function weaponFragmentSources(archetype: ArchetypeId): EnemyKind[] {
  return Object.entries(FRAGMENT_SOURCE)
    .filter(([, source]) => source === archetype)
    .map(([enemy]) => enemy as EnemyKind);
}

export function emptyCharacterMaterials(): CharacterMaterials {
  return { scrap: 0, alloys: 0, cores: 0, catalysts: {}, fragments: {} };
}

export function rollCharacterMaterialDrop(
  rng: () => number,
  enemy: EnemyKind,
  options: { elite: boolean; boss: boolean; sector: number; forge: boolean; lab: boolean; scavenging: number },
): CharacterMaterials {
  const drops = emptyCharacterMaterials();
  const sectorBonus = Math.min(3, Math.max(0, options.sector - 1));

  if (options.boss) {
    drops.alloys = 2;
    drops.cores = 1;
    const optionsForBoss = ARCHETYPES.filter((archetype) => archetype !== "pistol");
    for (let i = 0; i < 3; i++) {
      const archetype = optionsForBoss[Math.floor(rng() * optionsForBoss.length)]!;
      drops.fragments[archetype] = (drops.fragments[archetype] ?? 0) + 1;
    }
    const element = ELEMENTAL_SOURCES[enemy];
    if (element) drops.catalysts[element] = 1;
    return drops;
  }

  const archetype = FRAGMENT_SOURCE[enemy];
  const fragmentChance = options.elite ? 1 : 0.2 + sectorBonus * 0.025;
  if (rng() < fragmentChance) drops.fragments[archetype] = 1;

  const materialChance = options.elite ? 1 : 0.3 + sectorBonus * 0.025;
  if (rng() < materialChance) {
    const element = ELEMENTAL_SOURCES[enemy];
    if (options.forge || ARMORED_SOURCES.has(enemy)) {
      drops.alloys += options.elite ? 2 : 1;
    } else if (options.lab || CORE_SOURCES.has(enemy)) {
      drops.cores += 1;
      if (element && (options.lab || rng() < 0.5)) drops.catalysts[element] = 1;
    } else if (element) {
      drops.catalysts[element] = 1;
    } else {
      drops.scrap += options.elite ? 4 : 2;
    }
  }

  if (!options.boss && options.scavenging > 0 && rng() < Math.min(1, options.scavenging * 0.05)) {
    if (ARMORED_SOURCES.has(enemy) || options.forge) drops.alloys += 1;
    else drops.scrap += 2;
  }
  return drops;
}

export function describeMaterialDrop(drops: CharacterMaterials): string {
  const parts: string[] = [];
  if (drops.scrap) parts.push(`${drops.scrap} šrotu`);
  if (drops.alloys) parts.push(`${drops.alloys} ${drops.alloys === 1 ? "slitina" : "slitiny"}`);
  if (drops.cores) parts.push(`${drops.cores} ${drops.cores === 1 ? "jádro" : "jádra"}`);
  for (const [element, amount] of Object.entries(drops.catalysts)) {
    if (amount) parts.push(`${amount}× ${element} katalyzátor`);
  }
  for (const [archetype, amount] of Object.entries(drops.fragments)) {
    if (amount) parts.push(`${amount}× fragment ${ARCHETYPE_LABEL[archetype as ArchetypeId].name}`);
  }
  return parts.join(" · ");
}

function canAfford(character: ReturnType<typeof loadActiveCharacter>, archetype: ArchetypeId): boolean {
  const recipe = weaponRecipe(archetype);
  return (character.materials.fragments[archetype] ?? 0) >= recipe.fragments
    && character.materials.alloys >= recipe.alloys
    && character.materials.cores >= recipe.cores
    && character.materials.scrap >= recipe.scrap;
}

export function craftCharacterWeapon(archetype: ArchetypeId, forgeUnlocked: boolean): CharacterActionResult {
  const character = loadActiveCharacter();
  if (!forgeUnlocked) return { ok: false, character, message: "Kovárna se odemyká přes Cestu na profilovém LVL 6." };
  if (!Object.prototype.hasOwnProperty.call(ARCHETYPE_LABEL, archetype)) {
    return { ok: false, character, message: "Neplatný typ zbraně." };
  }
  if (character.craftedWeapons.includes(archetype)) {
    return { ok: false, character, message: "Tuto zbraň už máš ve zbrojnici." };
  }
  if (!canAfford(character, archetype)) {
    return { ok: false, character, message: "Na tento recept zatím nemáš dostatek materiálů." };
  }
  const recipe = weaponRecipe(archetype);
  const next = {
    ...character,
    materials: {
      ...character.materials,
      scrap: character.materials.scrap - recipe.scrap,
      alloys: character.materials.alloys - recipe.alloys,
      cores: character.materials.cores - recipe.cores,
      fragments: {
        ...character.materials.fragments,
        [archetype]: (character.materials.fragments[archetype] ?? 0) - recipe.fragments,
      },
    },
    craftedWeapons: [...character.craftedWeapons, archetype],
  };
  persistActiveCharacter(next);
  return { ok: true, character: next, message: `${ARCHETYPE_LABEL[archetype].name} vyrobena a přidána do zbrojnice.` };
}

export function selectCraftedStarter(archetype: ArchetypeId | null): CharacterActionResult {
  const character = loadActiveCharacter();
  if (archetype !== null && !character.craftedWeapons.includes(archetype)) {
    return { ok: false, character, message: "Tuto zbraň zatím nemáš vyrobenou." };
  }
  const next = { ...character, starterArchetype: archetype };
  persistActiveCharacter(next);
  return {
    ok: true,
    character: next,
    message: archetype ? `${ARCHETYPE_LABEL[archetype].name} bude startovní zbraní.` : "Startovní výbava vrácena na služební pistoli.",
  };
}

export function upgradeCharacterWeaponComponent(
  archetype: ArchetypeId,
  componentId: WeaponComponentId,
  forgeUnlocked: boolean,
): CharacterActionResult {
  const character = loadActiveCharacter();
  if (!forgeUnlocked) {
    return { ok: false, character, message: "Úpravy se odemykají s Kovárnou na profilovém LVL 6." };
  }
  if (!Object.prototype.hasOwnProperty.call(ARCHETYPE_LABEL, archetype) || !character.craftedWeapons.includes(archetype)) {
    return { ok: false, character, message: "Upravovat lze jen zbraň vyrobenou touto postavou." };
  }
  if (!isWeaponComponentId(componentId)) {
    return { ok: false, character, message: "Neplatná zbraňová komponenta." };
  }

  const definition = componentDefinition(componentId);
  const loadout = character.weaponComponents[archetype] ?? {};
  const installed = loadout[definition.slot];
  const sameComponent = installed?.id === componentId;
  if (sameComponent && installed.rank >= 3) {
    return { ok: false, character, message: `${definition.name} už má nejvyšší stupeň.` };
  }
  const rank = sameComponent ? installed.rank + 1 : 1;
  const cost = weaponComponentCost(componentId, rank);
  if (character.level < cost.requiredLevel) {
    return { ok: false, character, message: `Stupeň ${rank} úpravy vyžaduje level postavy ${cost.requiredLevel}.` };
  }
  if (!canAffordWeaponComponent(character.materials, cost)) {
    return {
      ok: false,
      character,
      message: `Chybí materiály: ${cost.scrap} šrotu${cost.alloys ? `, ${cost.alloys} slitin` : ""}${cost.cores ? `, ${cost.cores} jader` : ""}${cost.catalyst ? `, ${cost.catalysts}× katalyzátor ${CATALYST_ELEMENT_LABEL[cost.catalyst]}` : ""}.`,
    };
  }

  const catalysts = { ...character.materials.catalysts };
  if (cost.catalyst) {
    const remaining = (catalysts[cost.catalyst] ?? 0) - cost.catalysts;
    if (remaining > 0) catalysts[cost.catalyst] = remaining;
    else delete catalysts[cost.catalyst];
  }
  const next = {
    ...character,
    weaponComponents: {
      ...character.weaponComponents,
      [archetype]: {
        ...loadout,
        [definition.slot]: { id: componentId, rank: rank as 1 | 2 | 3 },
      },
    },
    materials: {
      ...character.materials,
      scrap: character.materials.scrap - cost.scrap,
      alloys: character.materials.alloys - cost.alloys,
      cores: character.materials.cores - cost.cores,
      catalysts,
    },
  };
  persistActiveCharacter(next);
  return {
    ok: true,
    character: next,
    message: sameComponent
      ? `${definition.name} vylepšena na stupeň ${rank}.`
      : `${definition.name} osazena do slotu ${COMPONENT_SLOT_LABEL[definition.slot]}; vložené součásti se nevracejí.`,
  };
}

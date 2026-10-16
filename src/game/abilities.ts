import { randRange, type Rng } from "./rng";
import { rollRarity } from "./weapons";
import type { RarityWeights } from "./rarity-settings";
import type { Ability, AbilityKind, Passive, PassiveId, Rarity } from "./types";

export type ActiveDef = {
  id: string;
  kind: AbilityKind;
  weight: number;
  names: [string, string, string];
  desc: string;
  cooldown: [number, number];
  damage: [number, number];
  radius: [number, number];
  duration: [number, number];
};

const ACTIVE_BASES: Omit<ActiveDef, "id" | "weight">[] = [
  {
    kind: "shockwave",
    names: ["Rázová vlna", "Tlakový práh", "Dno trezoru"],
    desc: "Kruhový ráz, který odhodí a zraní okolí.",
    cooldown: [5.5, 8],
    damage: [36, 70],
    radius: [88, 140],
    duration: [0.2, 0.2],
  },
  {
    kind: "grenade",
    names: ["Shluk granátů", "Trhlina", "Hnízdo střepin"],
    desc: "Hodí nálož, která se rozpadne na střepiny.",
    cooldown: [6, 9],
    damage: [40, 80],
    radius: [70, 110],
    duration: [0.55, 0.8],
  },
  {
    kind: "timestop",
    names: ["Dilace", "Zámraz času", "Pauza trezoru"],
    desc: "Zpomalí nepřátele a jejich střely.",
    cooldown: [10, 14],
    damage: [0, 0],
    radius: [0, 0],
    duration: [2.2, 3.4],
  },
  {
    kind: "orbitals",
    names: ["Orbitální ostří", "Koruna", "Obruč"],
    desc: "Ostří krouží kolem tebe a sekají všechno v dosahu.",
    cooldown: [8, 12],
    damage: [12, 22],
    radius: [48, 70],
    duration: [4.5, 7],
  },
  {
    kind: "shield",
    names: ["Štít trezoru", "Krunýř", "Zámek"],
    desc: "Krátká úplná imunita a odražení střel.",
    cooldown: [8, 12],
    damage: [0, 0],
    radius: [40, 56],
    duration: [1.3, 2.1],
  },
  {
    kind: "blink",
    names: ["Blink", "Řez prostorem", "Skok osy"],
    desc: "Teleport po zaměření. Zanechá ráz v místě odchodu.",
    cooldown: [4.5, 7],
    damage: [22, 40],
    radius: [60, 90],
    duration: [0.1, 0.1],
  },
  {
    kind: "drone",
    names: ["Drone", "Hlídač", "Pes trezoru"],
    desc: "Spojenec, který střílí na nejbližší cíl.",
    cooldown: [12, 16],
    damage: [8, 14],
    radius: [0, 0],
    duration: [7, 11],
  },
  {
    kind: "lightning",
    names: ["Řetězový blesk", "Oblouk", "Svod"],
    desc: "Blesk skáče mezi nepřáteli.",
    cooldown: [6.5, 9.5],
    damage: [28, 52],
    radius: [160, 220],
    duration: [0.15, 0.15],
  },
  {
    kind: "well",
    names: ["Gravitační studna", "Vtok", "Jímka"],
    desc: "Stáhne nepřátele do bodu a drží je.",
    cooldown: [9, 13],
    damage: [10, 20],
    radius: [130, 180],
    duration: [2.2, 3.2],
  },
  {
    kind: "overclock",
    names: ["Přetaktování", "Červená zóna", "Přehřev"],
    desc: "Dočasně zvedne kadenci a rychlost střel.",
    cooldown: [11, 15],
    damage: [0, 0],
    radius: [0, 0],
    duration: [3.5, 5.2],
  },
  {
    kind: "mirror",
    names: ["Zrcadlo", "Dvojník", "Odpověď"],
    desc: "Každá střela se zdvojí jako přízrak.",
    cooldown: [10, 14],
    damage: [0, 0],
    radius: [0, 0],
    duration: [3, 4.6],
  },
  {
    kind: "fireball",
    names: ["Ohnivá koule", "Žhář", "Kometa"],
    desc: "Vrhne výbušnou kouli, která zapálí okolí.",
    cooldown: [5, 7.5],
    damage: [44, 84],
    radius: [80, 120],
    duration: [0.7, 1],
  },
  {
    kind: "frostnova",
    names: ["Mrazivá nova", "Polárka", "Ledové srdce"],
    desc: "Mráz zmrazí a zraní všechno kolem.",
    cooldown: [7, 10],
    damage: [24, 48],
    radius: [110, 160],
    duration: [1.2, 2],
  },
  {
    kind: "poisonburst",
    names: ["Jedová vlna", "Mokřad", "Hnis"],
    desc: "Otráví a zraní všechno kolem.",
    cooldown: [6.5, 9.5],
    damage: [20, 40],
    radius: [110, 160],
    duration: [4, 6],
  },
  {
    kind: "execute",
    names: ["Poprava", "Rozsudek", "Kat"],
    desc: "Drtivý zásah nejslabšímu nepříteli v dosahu.",
    cooldown: [8, 12],
    damage: [120, 220],
    radius: [220, 300],
    duration: [0.1, 0.1],
  },
  {
    kind: "meteor",
    names: ["Meteor", "Padající trezor", "Kladivo"],
    desc: "Z nebe spadne výbuch před tebe.",
    cooldown: [9, 13],
    damage: [90, 160],
    radius: [110, 160],
    duration: [0.2, 0.2],
  },
  {
    kind: "volley",
    names: ["Salva", "Vějíř", "Rozsévač"],
    desc: "Vystřelí odrážející se dávku všemi směry.",
    cooldown: [7, 10],
    damage: [16, 30],
    radius: [0, 0],
    duration: [0.3, 0.3],
  },
  {
    kind: "snipe",
    names: ["Odstřel", "Jehla", "Rozhodčí"],
    desc: "Jediná ničivá průrazná střela po zaměření.",
    cooldown: [6, 9],
    damage: [150, 260],
    radius: [0, 0],
    duration: [0.2, 0.2],
  },
  {
    kind: "shrapnel",
    names: ["Šrapnel", "Plevy", "Krupky"],
    desc: "Kužel střepin po zaměření.",
    cooldown: [5.5, 8],
    damage: [12, 22],
    radius: [0, 0],
    duration: [0.2, 0.2],
  },
  {
    kind: "hail",
    names: ["Krupobití", "Chumelenice", "Ledovec"],
    desc: "Déšť mrazivých střel kolem tebe.",
    cooldown: [7.5, 11],
    damage: [14, 26],
    radius: [0, 0],
    duration: [1, 1.6],
  },
  {
    kind: "smokescreen",
    names: ["Kouřová clona", "Mlha", "Závoj"],
    desc: "Omráčí okolí a dá ti chvilku klidu.",
    cooldown: [9, 13],
    damage: [10, 20],
    radius: [120, 170],
    duration: [1.5, 2.4],
  },
  {
    kind: "staticfield",
    names: ["Statické pole", "Výbojka", "Náboj"],
    desc: "Elektrický šok omráčí a škrábne okolí.",
    cooldown: [6, 9],
    damage: [18, 34],
    radius: [130, 180],
    duration: [1, 1.8],
  },
  {
    kind: "emp",
    names: ["EMP výboj", "Zkrat", "Ticho"],
    desc: "Šokuje okolí a smaže nepřátelské střely.",
    cooldown: [10, 14],
    damage: [24, 44],
    radius: [170, 230],
    duration: [1, 1.6],
  },
  {
    kind: "thundercall",
    names: ["Volání bouře", "Hrom", "Mrak"],
    desc: "Blesky udeří do několika náhodných cílů.",
    cooldown: [8, 12],
    damage: [40, 76],
    radius: [320, 420],
    duration: [0.2, 0.2],
  },
  {
    kind: "lifedrain",
    names: ["Vysátí života", "Pijavice", "Daň krve"],
    desc: "Vysaje zdraví z okolí do sebe.",
    cooldown: [9, 13],
    damage: [30, 56],
    radius: [130, 180],
    duration: [0.3, 0.3],
  },
  {
    kind: "bloodpact",
    names: ["Krvavá daň", "Oběť", "Výkupné"],
    desc: "Zaplatíš zdravím za ničivou novu.",
    cooldown: [11, 15],
    damage: [110, 200],
    radius: [150, 210],
    duration: [0.2, 0.2],
  },
  {
    kind: "firestorm",
    names: ["Ohnivá bouře", "Požár", "Výheň"],
    desc: "Velká oblast hoří a trpí.",
    cooldown: [10, 14],
    damage: [36, 66],
    radius: [170, 230],
    duration: [8, 12],
  },
  {
    kind: "frostarmor",
    names: ["Ledová zbroj", "Krusta", "Permafrost"],
    desc: "Krátká imunita a mrazivá nova kolem.",
    cooldown: [11, 15],
    damage: [26, 50],
    radius: [120, 170],
    duration: [2, 3],
  },
  {
    kind: "bulwark",
    names: ["Bašta", "Hradba", "Val"],
    desc: "Imunita a odhození všeho kolem.",
    cooldown: [12, 16],
    damage: [20, 38],
    radius: [130, 180],
    duration: [1.8, 2.8],
  },
  {
    kind: "shadowstep",
    names: ["Krok stínů", "Stín", "Přesun"],
    desc: "Teleport po zaměření omráčí cíl dopadu.",
    cooldown: [6, 9],
    damage: [30, 56],
    radius: [70, 100],
    duration: [1.2, 2],
  },
  {
    kind: "frenzy",
    names: ["Zuřivost", "Amok", "Běs"],
    desc: "Přetaktování i zrcadlo najednou.",
    cooldown: [14, 18],
    damage: [0, 0],
    radius: [0, 0],
    duration: [3, 4.4],
  },
  {
    kind: "guardian",
    names: ["Věrný stín", "Dvojče", "Ozvěna těla"],
    desc: "Krátký teleport a zdvojené střely.",
    cooldown: [9, 13],
    damage: [0, 0],
    radius: [0, 0],
    duration: [2.4, 3.6],
  },
  {
    kind: "magnetize",
    names: ["Magnetizace", "Svoz", "Sběrna"],
    desc: "Přítáhne všechny dropy k tobě.",
    cooldown: [12, 16],
    damage: [0, 0],
    radius: [0, 0],
    duration: [0.2, 0.2],
  },
  {
    kind: "repair",
    names: ["Polní oprava", "Údržba", "Servis"],
    desc: "Zacelí rány a dobije obě zbraně.",
    cooldown: [13, 17],
    damage: [0, 0],
    radius: [0, 0],
    duration: [0.25, 0.25],
  },
  {
    kind: "fielddress",
    names: ["Polní obvaz", "Šití", "Záplata"],
    desc: "Velké hojení a plný dash.",
    cooldown: [14, 18],
    damage: [0, 0],
    radius: [0, 0],
    duration: [0.4, 0.4],
  },
  {
    kind: "detonator",
    names: ["Roznětka", "Zápalka", "Spoušť"],
    desc: "Hořící a otrávení nepřátelé vybuchnou.",
    cooldown: [7, 10],
    damage: [50, 95],
    radius: [0, 0],
    duration: [0.2, 0.2],
  },
];

export type PassiveDef = {
  id: string;
  kind: PassiveId;
  weight: number;
  name: string;
  descTemplate: string;
  valueFormat: "integer" | "percent" | "none";
  range: [number, number];
};

export const DEFAULT_ABILITY_DEFS: ActiveDef[] = ACTIVE_BASES.map((def) => ({
  ...def,
  id: def.kind,
  weight: 1,
}));

const PASSIVE_BASES: Omit<PassiveDef, "id" | "weight">[] = [
  { kind: "vitality", name: "Vitalita", descTemplate: "+{value} max HP", valueFormat: "integer", range: [18, 40] },
  { kind: "haste", name: "Spěch", descTemplate: "+{value}% pohyb", valueFormat: "percent", range: [0.08, 0.18] },
  { kind: "magnet", name: "Magnet", descTemplate: "Dosah sběru +{value}", valueFormat: "integer", range: [30, 70] },
  { kind: "ricochet", name: "Ricochet", descTemplate: "+{value} odraz střel", valueFormat: "integer", range: [1, 2] },
  { kind: "extraPellet", name: "Dělená hlaveň", descTemplate: "+{value} projektil", valueFormat: "integer", range: [1, 2] },
  { kind: "vampirism", name: "Vampirismus", descTemplate: "{value}% vysátí", valueFormat: "percent", range: [0.04, 0.1] },
  { kind: "dashBattery", name: "Baterie dash", descTemplate: "+{value} dash nabití", valueFormat: "integer", range: [1, 1] },
  { kind: "reloadKill", name: "Kořistní nabíjení", descTemplate: "Zabití dobije zásobník", valueFormat: "none", range: [1, 1] },
  { kind: "frostbite", name: "Omrzlina", descTemplate: "{value}% šance mráz", valueFormat: "percent", range: [0.12, 0.28] },
  { kind: "overloaded", name: "Přepětí", descTemplate: "+{value}% kadence", valueFormat: "percent", range: [0.1, 0.2] },
  { kind: "splinter", name: "Tříska", descTemplate: "{value}% šance split", valueFormat: "percent", range: [0.12, 0.25] },
  { kind: "thickSkin", name: "Tlustá kůže", descTemplate: "−{value}% zranění", valueFormat: "percent", range: [0.08, 0.16] },
  { kind: "regen", name: "Regenerace", descTemplate: "+{value} HP/s", valueFormat: "integer", range: [2, 5] },
  { kind: "scavenger", name: "Mrchožrout", descTemplate: "+{value}% šrotu", valueFormat: "percent", range: [0.1, 0.22] },
  { kind: "greed", name: "Nenasytnost", descTemplate: "+{value}% dmg při nízkém HP", valueFormat: "percent", range: [0.15, 0.3] },
  { kind: "focus", name: "Soustředění", descTemplate: "−{value}% rozptyl", valueFormat: "percent", range: [0.15, 0.3] },
];

export const DEFAULT_PASSIVE_DEFS: PassiveDef[] = PASSIVE_BASES.map((def) => ({
  ...def,
  id: def.kind,
  weight: 1,
}));

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

function nameFor(def: ActiveDef, rarity: Rarity): string {
  if (rarity === "mythic" || rarity === "legendary") return def.names[2]!;
  if (rarity === "epic" || rarity === "rare") return def.names[1]!;
  return def.names[0]!;
}

export function starterAbility(): Ability {
  return {
    id: "starter-wave",
    kind: "shockwave",
    name: "Rázová vlna",
    desc: "Kruhový ráz, který odhodí a zraní okolí.",
    rarity: "common",
    cooldown: 7,
    damage: 42,
    radius: 100,
    duration: 0.2,
  };
}

export function generateAbility(
  rng: Rng,
  roomIndex: number,
  isBoss = false,
  weights?: RarityWeights,
  defs: readonly ActiveDef[] = DEFAULT_ABILITY_DEFS,
): Ability {
  const rarity = rollRarity(rng, roomIndex, isBoss, weights);
  const def = pickWeighted(rng, defs);
  const q = rarityMult(rarity);
  return {
    id: `a-${def.id}-${Math.floor(rng() * 99999)}`,
    kind: def.kind,
    name: nameFor(def, rarity),
    desc: def.desc,
    rarity,
    cooldown: randRange(rng, def.cooldown[0], def.cooldown[1]) * (1 - q * 0.06),
    damage: randRange(rng, def.damage[0], def.damage[1]) * (1 + q * 0.18),
    radius: randRange(rng, def.radius[0], def.radius[1]) * (1 + q * 0.08),
    duration: randRange(rng, def.duration[0], def.duration[1]) * (1 + q * 0.1),
  };
}

export function generatePassive(
  rng: Rng,
  roomIndex: number,
  isBoss = false,
  weights?: RarityWeights,
  defs: readonly PassiveDef[] = DEFAULT_PASSIVE_DEFS,
): Passive {
  const rarity = rollRarity(rng, roomIndex, isBoss, weights);
  const def = pickWeighted(rng, defs);
  const q = rarityMult(rarity);
  const value = randRange(rng, def.range[0], def.range[1]) * (1 + q * 0.15);
  const formattedValue = def.valueFormat === "percent" ? Math.round(value * 100) : Math.round(value);
  return {
    id: `p-${def.id}-${Math.floor(rng() * 99999)}`,
    kind: def.kind,
    name: def.name,
    desc: def.descTemplate.replaceAll("{value}", String(formattedValue)),
    rarity,
    value,
  };
}

export function rarityMult(r: Rarity): number {
  switch (r) {
    case "common":
      return 0;
    case "uncommon":
      return 1;
    case "rare":
      return 2;
    case "epic":
      return 3;
    case "legendary":
      return 4;
    case "mythic":
      return 5;
  }
}



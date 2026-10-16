export const TICK = 1 / 60;
export const PLAYER_R = 15;
export const PLAYER_SPEED = 235;
export const DASH_TIME = 0.16;
export const DASH_MULT = 3.4;
export const DASH_MAX = 2;
export const DASH_RECHARGE = 1.35;
export const HIT_INVULN = 0.5;
export const ROOM_W = 1120;
export const ROOM_H = 760;
export const WALL = 36;
export const ROOMS_TOTAL = 9;
export const SECTOR_SIZE = 10;
export const MAGNET_R = 70;

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type ArchetypeId =
  | "pistol"
  | "smg"
  | "shotgun"
  | "rifle"
  | "sniper"
  | "launcher"
  | "beam"
  | "flamer"
  | "bouncer"
  | "minigun"
  | "rail"
  | "helix"
  | "mortar"
  | "arc"
  | "swarm"
  | "harpoon";

export type Element = "kinetic" | "fire" | "ice" | "shock" | "void" | "toxic";

export type BehaviorId =
  | "pierce"
  | "bounce"
  | "homing"
  | "explode"
  | "burn"
  | "freeze"
  | "chain"
  | "lifesteal"
  | "split"
  | "knockback"
  | "burst"
  | "echo"
  | "beam"
  | "poison"
  | "shockstun"
  | "orbit"
  | "pierceArmor";

export type WeaponStats = {
  damage: number;
  rpm: number;
  spread: number;
  pellets: number;
  magSize: number;
  reload: number;
  projSpeed: number;
  projSize: number;
  range: number;
  knockback: number;
  critChance: number;
  critMult: number;
};

export type Affix = {
  id: string;
  slot: "prefix" | "suffix";
  nameM: string;
  nameF: string;
  weight: number;
  element?: Element;
  stats?: Partial<WeaponStats>;
  behaviors?: Partial<Record<BehaviorId, number>>;
};

export type Weapon = {
  id: string;
  name: string;
  unique: boolean;
  archetype: ArchetypeId;
  rarity: Rarity;
  element: Element;
  gender: "m" | "f";
  stats: WeaponStats;
  behaviors: Partial<Record<BehaviorId, number>>;
  colors: { body: string; accent: string; glow: string };
  /** Rám: počet mod-slotů (unikáty 0 — relikvie se neupravují). */
  slots: number;
  /** Zasazené mody (Dílna). Efektivní statistiky počítá applyMods(). */
  mods: WeaponMod[];
};

export type AbilityKind =
  | "shockwave"
  | "grenade"
  | "timestop"
  | "orbitals"
  | "shield"
  | "blink"
  | "drone"
  | "lightning"
  | "well"
  | "overclock"
  | "mirror"
  | "fireball"
  | "frostnova"
  | "poisonburst"
  | "execute"
  | "meteor"
  | "volley"
  | "snipe"
  | "shrapnel"
  | "hail"
  | "smokescreen"
  | "staticfield"
  | "emp"
  | "thundercall"
  | "lifedrain"
  | "bloodpact"
  | "firestorm"
  | "frostarmor"
  | "bulwark"
  | "shadowstep"
  | "frenzy"
  | "guardian"
  | "magnetize"
  | "repair"
  | "fielddress"
  | "detonator";

export type Ability = {
  id: string;
  kind: AbilityKind;
  name: string;
  desc: string;
  rarity: Rarity;
  cooldown: number;
  damage: number;
  radius: number;
  duration: number;
};

export type PassiveId =
  | "vitality"
  | "haste"
  | "magnet"
  | "ricochet"
  | "extraPellet"
  | "vampirism"
  | "dashBattery"
  | "reloadKill"
  | "frostbite"
  | "overloaded"
  | "splinter"
  | "thickSkin"
  | "regen"
  | "scavenger"
  | "greed"
  | "focus";

export type Passive = {
  id: string;
  kind: PassiveId;
  name: string;
  desc: string;
  rarity: Rarity;
  value: number;
};

/** Rodina modů — příchuť pro setové bonusy (pravidla §23). */
export type ModFamily = "straz" | "hlubina" | "prototyp";

/** Mod do zbraně: element, chování a číselné bonusy. Hodnoty už škálované raritou. */
export type WeaponMod = {
  id: string;
  defId: string;
  name: string;
  desc: string;
  family: ModFamily;
  rarity: Rarity;
  element?: Element;
  behaviors: Partial<Record<BehaviorId, number>>;
  damageMult: number;
  magMult: number;
  reloadMult: number;
  critAdd: number;
  rangeMult: number;
};

export type EnemyKind =
  | "grunt"
  | "rusher"
  | "shooter"
  | "tank"
  | "splitter"
  | "bomber"
  | "sniper"
  | "lezec"
  | "drtic"
  | "stin"
  | "stopar"
  | "des"
  | "cepel"
  | "nosorozec"
  | "kopi"
  | "kanonyr"
  | "ostrostrelec"
  | "jiskra"
  | "vrhac"
  | "gardista"
  | "srsen"
  | "spravce"
  | "tekavka"
  | "bourak"
  | "roztoc"
  | "medik"
  | "matka"
  | "boss";

export type LootOffer =
  | { kind: "weapon"; weapon: Weapon }
  | { kind: "ability"; ability: Ability }
  | { kind: "passive"; passive: Passive }
  | { kind: "mod"; mod: WeaponMod }
  | { kind: "heal"; amount: number; name: string; desc: string };

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Běžná",
  uncommon: "Neobvyklá",
  rare: "Vzácná",
  epic: "Epická",
  legendary: "Legendární",
  mythic: "Mýtická",
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#8a9099",
  uncommon: "#5ea38a",
  rare: "#6b93c2",
  epic: "#c45c3e",
  legendary: "#d6dde4",
  mythic: "#9eb4c4",
};

export const ELEMENT_COLOR: Record<Element, string> = {
  kinetic: "#c8ccd4",
  fire: "#c45c3e",
  ice: "#8fb4c8",
  shock: "#c9c07a",
  void: "#7a7e9a",
  toxic: "#7a9a72",
};

export const ARCHETYPE_LABEL: Record<ArchetypeId, { name: string; gender: "m" | "f" }> = {
  pistol: { name: "pistole", gender: "f" },
  smg: { name: "samopal", gender: "m" },
  shotgun: { name: "brokovnice", gender: "f" },
  rifle: { name: "puška", gender: "f" },
  sniper: { name: "odstřelovačka", gender: "f" },
  launcher: { name: "raketomet", gender: "m" },
  beam: { name: "paprsek", gender: "m" },
  flamer: { name: "plamenomet", gender: "m" },
  bouncer: { name: "odražeč", gender: "m" },
  minigun: { name: "kulomet", gender: "m" },
  rail: { name: "railka", gender: "f" },
  helix: { name: "šroubovice", gender: "f" },
  mortar: { name: "minomet", gender: "m" },
  arc: { name: "oblouk", gender: "m" },
  swarm: { name: "roj", gender: "m" },
  harpoon: { name: "harpuna", gender: "f" },
};

import {
  DEFAULT_ABILITY_DEFS,
  DEFAULT_PASSIVE_DEFS,
  generateAbility,
  generatePassive,
  starterAbility,
  type ActiveDef,
  type PassiveDef,
} from "./abilities";
import { sfxPlay, musicStop, setMusicMode } from "./audio";
import { generateRoom, spawnEdge, type Obstacle, type RoomPlan, type RoomSpec, type Wave } from "./dungeon";
import type { Actions } from "./input";
import type { RarityWeights } from "./rarity-settings";
import {
  burst,
  makePool,
  spawnBolt,
  spawnFloater,
  spawnParticle,
  updateJuice,
  type Floater,
  type Particle,
} from "./juice";
import { bossTierForLevel, catchUpForSector, difficultyForLevel, ELITE_POS, getDifficulty, globalLevel, SECTOR_SIZE } from "./difficulty";
import { bomberBlastAt, enemyStatsAt, rollAffixes, BOSS_PHASE_ADDS, BOSS_PHASE_NAMES, BOSS_PHASE_STATS, bossPhaseFor, ENEMY_NAME, ENEMY_ORDER, ENEMY_RANGED, ENEMY_CHARGE, ENEMY_BLAST, ENEMY_SPLIT_MAX, type BossPhase, type EliteAffixId, type EnemyStats } from "./bestiary";
import { loadActiveCharacter, normalizeTalents, xpForNextLevel, type CharacterTalents } from "./characters";
import { describeMaterialDrop, emptyCharacterMaterials, rollCharacterMaterialDrop } from "./character-armory";
import { applyWeaponComponents, type WeaponComponentLoadout } from "./weapon-components";
import {
  anomalyForSector,
  gamePhaseFor,
  scrapForHeal,
  scrapForRarity,
  shopCost,
  type AnomalyId,
  type GamePhase,
  type SectorModId,
  type ShopItemId,
} from "./expedition";
import { hashSeed, mulberry32, randRange, stream, type Rng } from "./rng";
import { mutAdd, mutMult, rollMutators, type RolledMutator } from "./mutators";
import { applyMods, generateMod, loadBlueprints } from "./mods";
import { armorFactor, CRIT_CHANCE_CAP, CRIT_MULT_CAP, damageBuckets, PLAYER_ARMOR_CAP } from "./scaling";
import { codexBonus, codexEntries, formatCodexBonus, loadCodex, unlockCodex, type CodexBonus, type CodexCategory } from "./codex";
import { CHALLENGES, challengeDef, freshChallengeState, unlockBadge, type ChallengeId, type ChallengeState } from "./challenges";
import {
  DASH_MAX,
  DASH_MULT,
  DASH_RECHARGE,
  DASH_TIME,
  HIT_INVULN,
  MAGNET_R,
  PLAYER_R,
  PLAYER_SPEED,
  RARITY_COLOR,
  ROOM_H,
  ROOM_W,
  TICK,
  WALL,
  type Ability,
  type Affix,
  type ArchetypeId,
  type Element,
  type EnemyKind,
  type LootOffer,
  type Passive,
  type Rarity,
  type Weapon,
  type WeaponMod,
} from "./types";
import { DEFAULT_AFFIXES, DEFAULT_UNIQUES, DEFAULT_WEAPON_DEFS, dpsEstimate, generateWeapon, starterWeapon, type UniqueDef, type WeaponDef } from "./weapons";
import { RARITY_ORDER } from "./rarity-settings";

export type Bullet = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  ttl: number;
  team: 0 | 1;
  pierce: number;
  bounce: number;
  homing: number;
  explode: number;
  split: number;
  color: string;
  knock: number;
  freeze: number;
  burn: number;
  poison: number;
  chain: number;
  lifesteal: number;
  shock: number;
  crit: boolean;
  fromBeam: boolean;
  /** Element zbraně — řídí vizuální tvar střely v renderu. */
  element: Element;
  /** Průraznost zbroje (zlomek 0–1) — z behavioru zbraně. */
  pen: number;
};

export type Enemy = {
  active: boolean;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  flash: number;
  fireCd: number;
  stun: number;
  slow: number;
  burn: number;
  poison: number;
  color: string;
  contact: number;
  charge: number;
  splitGen: number;
  affixes: EliteAffixId[];
  fragile: number;
  dmgMult: number;
  phase: number;
  /** Zbroj (zlomek) — snižuje poškození, ignoruje ji průraznost a statusy (§21). */
  armor: number;
};

export type Pickup = {
  active: boolean;
  x: number;
  y: number;
  kind: "hp" | "ammo";
  vy: number;
};

export type HudSnap = {
  hp: number;
  maxHp: number;
  room: number;
  rooms: number;
  sector: number;
  sectorSize: number;
  level: number;
  kills: number;
  combo: number;
  time: number;
  mag: number;
  magSize: number;
  reloading: boolean;
  weapons: [Weapon, Weapon | null];
  slot: number;
  ability: Ability;  abilityCd: number;
  dash: number;
  dashMax: number;
  passives: Passive[];
  /** Inventář modů pro Dílnu (§23). */
  modInv: WeaponMod[];
  seed: string;
  elite: boolean;
  boss: boolean;
  /** Torment režim běhu (§22) — ukazuje se v HUD. */
  torment: boolean;
  /** Živý boss pro boss-bar v HUD (jinak null). */
  bossInfo: { hp: number; maxHp: number; phase: number } | null;
  wave: number;
  waves: number;
  remaining: number;
  waveIn: number;
  waveAwaiting: boolean;
  /** Aktuální běhové XP (resetuje se každým během). */
  runXp: number;
  /** Level a dosavadní XP postavy při zahájení běhu. */
  characterLevel: number;
  characterXp: number;
  characterXpToNext: number;
  scrap: number;
  sectorMod: SectorModId | null;
  anomaly: AnomalyId | null;
  gamePhase: GamePhase;
  rerolls: number;
  /** Statistiky běhu pro koncový přehled. */
  dmgDealt: number;
  dmgTaken: number;
  shotsFired: number;
  shotsHit: number;
  /** Zbývající časy buffů (s) + studna; pro buff-řádek v HUD. */
  buffs: {
    shield: number;
    overclock: number;
    mirror: number;
    drone: number;
    timestop: number;
    orbitals: number;
    well: boolean;
  };
};

export type RunPhase = "combat" | "cleared" | "loot" | "dead" | "win" | "base";

/** Maximální počet modů v inventáři Dílny (§23). */
export const MOD_INV_MAX = 8;
/** Událost běhu pro event feed v HUD (toasty): odznaky, kodex. UI si je vyzvedne přes drainEvents(). */
export type GameEvent = {
  kind: "challenge" | "codex" | "material";
  text: string;
  sub?: string;
};

/** Pauza před další vlnou po vyčištění (s odpočtem v HUD). První vlna místnosti má vlastní spawn delay. */
export const WAVE_BREAK = 2.5;

export type WeaponStatLine = {
  slot: number;
  name: string;
  dps: number;
  damage: number;
  rpm: number;
  pellets: number;
  magSize: number;
  reload: number;
  critChance: number;
  critMult: number;
};

/** Snímek všech viditelných hodnot pro stats panel (obtížnost, hráč, nepřátelé). */
export type StatsSnap = {
  level: number;
  sector: number;
  room: number;
  rooms: number;
  elite: boolean;
  boss: boolean;
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  bossTier: number;
  wave: number;
  waves: number;
  remaining: number;
  waveIn: number;
  waveAwaiting: boolean;
  xp: number;
  xpToNext: number;
  player: {
    hp: number;
    maxHp: number;
    moveSpeed: number;
    armor: number;
    weapons: (WeaponStatLine | null)[];
  };
  scrap: number;
  sectorMod: SectorModId | null;
  anomaly: AnomalyId | null;
  gamePhase: GamePhase;
  mutators: RolledMutator[];
  bestiary: EnemyStats[];
  alive: { kind: EnemyKind; name: string; hp: number; maxHp: number; affixes: EliteAffixId[]; phase: number }[];
  challenges: { id: ChallengeId; name: string; desc: string; reward: number; goal: number; done: boolean; progress: number }[];
};

export type RunSettings = {
  rarityWeights?: RarityWeights;
  abilities?: ActiveDef[];
  passives?: PassiveDef[];
  weapons?: WeaponDef[];
  affixes?: Affix[];
  uniques?: UniqueDef[];
  roomPlans?: (RoomPlan | null)[];
  startSector?: number;
  affixesUnlocked?: boolean;
  synergyUnlocked?: boolean;
  veteran?: boolean;
  torment?: boolean;
  /** Startovní archetyp ze zbrojnice (blueprint rank 2+, pravidla §23). */
  starterArchetype?: ArchetypeId;
  /** Trvalé talenty aktivní postavy, zachycené při startu běhu. */
  characterTalents?: CharacterTalents;
  /** Komponenty zvolené vyrobené startovní zbraně; loot z běhu se tím nemění. */
  starterComponents?: WeaponComponentLoadout;
};

type Buffs = {
  timestop: number;
  orbitals: number;
  orbitalAngle: number;
  shield: number;
  drone: number;
  droneCd: number;
  well: { t: number; x: number; y: number; r: number; dmg: number } | null;
  overclock: number;
  mirror: number;
};

const ENEMY_R: Record<EnemyKind, number> = {
  grunt: 13,
  rusher: 12,
  shooter: 13,
  tank: 22,
  splitter: 14,
  bomber: 14,
  sniper: 12,
  lezec: 10,
  drtic: 24,
  stin: 11,
  stopar: 13,
  des: 25,
  cepel: 12,
  nosorozec: 20,
  kopi: 12,
  kanonyr: 14,
  ostrostrelec: 12,
  jiskra: 11,
  vrhac: 13,
  gardista: 19,
  srsen: 10,
  spravce: 26,
  tekavka: 9,
  bourak: 19,
  roztoc: 11,
  medik: 13,
  matka: 24,
  boss: 36,
};

const ENEMY_COL: Record<EnemyKind, string> = {
  grunt: "#8a9099",
  rusher: "#c45c3e",
  shooter: "#6b8aa0",
  tank: "#5c6570",
  splitter: "#7a8f6b",
  bomber: "#b07050",
  sniper: "#8b9aa8",
  lezec: "#9aa87e",
  drtic: "#6e6258",
  stin: "#4a4e5e",
  stopar: "#8f8570",
  des: "#5e3a44",
  cepel: "#b0b6bd",
  nosorozec: "#7d7468",
  kopi: "#a0a8b5",
  kanonyr: "#7a6a4a",
  ostrostrelec: "#7d90a8",
  jiskra: "#c9a44a",
  vrhac: "#6a8a7a",
  gardista: "#5a6a78",
  srsen: "#b8a04a",
  spravce: "#8a5f7d",
  tekavka: "#c47a3e",
  bourak: "#8a4a3a",
  roztoc: "#6b8a5a",
  medik: "#7aba8a",
  matka: "#7a5a6e",
  boss: "#c45c3e",
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function circleObstacles(x: number, y: number, r: number, obs: Obstacle[]): { x: number; y: number } {
  let px = x;
  let py = y;
  for (const o of obs) {
    const dx = px - o.x;
    const dy = py - o.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const min = o.r + r;
    if (d < min) {
      const k = (min - d) / d;
      px += dx * k;
      py += dy * k;
    }
  }
  px = clamp(px, WALL + r, ROOM_W - WALL - r);
  py = clamp(py, WALL + r, ROOM_H - WALL - r);
  return { x: px, y: py };
}

function reflect(x: number, y: number, vx: number, vy: number, r: number, obs: Obstacle[]) {
  if (x < WALL + r && vx < 0) vx *= -1;
  if (x > ROOM_W - WALL - r && vx > 0) vx *= -1;
  if (y < WALL + r && vy < 0) vy *= -1;
  if (y > ROOM_H - WALL - r && vy > 0) vy *= -1;
  for (const o of obs) {
    const dx = x - o.x;
    const dy = y - o.y;
    const d = Math.hypot(dx, dy) || 0.001;
    if (d < o.r + r) {
      const nx = dx / d;
      const ny = dy / d;
      const dot = vx * nx + vy * ny;
      if (dot < 0) {
        vx -= 2 * dot * nx;
        vy -= 2 * dot * ny;
      }
    }
  }
  return { vx, vy };
}

export class Run {
  seed: string;
  lootRng: Rng;
  roomRng: Rng;
  combatRng: Rng;
  roomIndex = 0;
  sector = 0;
  sectorMod: SectorModId | null = null;
  anomaly: AnomalyId | null = null;
  scrap = 0;
  roomsSinceRare = 0;
  affixesUnlocked = false;
  synergyUnlocked = false;
  veteran = false;
  /** Torment (pravidla §22): +25 % HP i dmg nepřátel, loot +1 úroveň a +25 % šrotu. */
  torment = false;
  /** Mutátory z kola štěstí — aura hráče platná pro aktuální sektor (pravidla §15). */
  mutators: RolledMutator[] = [];
  /** Aplikovaný HP bonus z mutátorů (pro přepočet při novém losu). */
  mutHpBonus = 0;
  /** Kumulativní čítače běhu pro achievementy. */
  bossesKilled = 0;
  scrapEarned = 0;
  /** XP aktuálního běhu; při ukončení se připíší postavě. */
  runXp = 0;
  /** Materiály i fragmenty zůstávají během běhu v dočasné zásilce až do banku. */
  runMaterials = emptyCharacterMaterials();
  rewardsBanked = false;
  characterTalents: CharacterTalents = { vitality: 0, ballistics: 0, scavenging: 0 };
  private characterProgress = loadActiveCharacter();
  /** Statistiky běhu pro koncový přehled: způsobené/utržené poškození, výstřely/zásahy. */
  dmgDealt = 0;
  dmgTaken = 0;
  shotsFired = 0;
  shotsHit = 0;
  /** Trvalý bonus z kodexu (pravidla §18) — načten při startu běhu. */
  codex: CodexBonus = { hp: 0, dmgPct: 0, speedPct: 0, crit: 0 };
  /** Inventář modů do Dílny (max 8) + blueprint ranky + čítač zabití za běh (§23). */
  mods: WeaponMod[] = [];
  blueprints: Partial<Record<ArchetypeId, number>> = {};
  blueprintKills: Partial<Record<string, number>> = {};
  /** Fronta událostí pro HUD feed — UI vyzvedává přes drainEvents(). */
  events: GameEvent[] = [];
  private codexList = codexEntries();
  /** Výzvy profilu — stav běhu (pravidla §19). */
  challenges: ChallengeState = freshChallengeState();
  sectorKills = 0;
  shotgunKills = 0;
  damageTakenThisRoom = 0;
  sectorTime = 0;
  eliteKills = 0;
  abilityUses = 0;
  bossAbilityMark = 0;
  room: RoomSpec;
  phase: RunPhase = "combat";
  player = {
    x: ROOM_W / 2,
    y: ROOM_H / 2,
    vx: 0,
    vy: 0,
    aim: 0,
    hp: 100,
    maxHp: 100,
    invuln: 1.1,
    dashT: 0,
    dashCharges: DASH_MAX,
    dashRe: 0,
    slot: 0,
    mag: [12, 0],
    reload: [0, 0],
    fireCd: 0,
    spin: 0,
    burstLeft: 0,
    burstCd: 0,
  };
  weapons: [Weapon, Weapon | null] = [starterWeapon(), null];
  ability: Ability = starterAbility();
  abilityCd = 0;
  passives: Passive[] = [];
  bullets: Bullet[] = makePool(280, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 3,
    damage: 0,
    ttl: 0,
    team: 0 as const,
    pierce: 0,
    bounce: 0,
    homing: 0,
    explode: 0,
    split: 0,
    color: "#fff",
    knock: 0,
    freeze: 0,
    burn: 0,
    poison: 0,
    chain: 0,
    lifesteal: 0,
    shock: 0,
    crit: false,
    fromBeam: false,
    element: "kinetic" as Element,
    pen: 0,
  }));
  enemies: Enemy[] = makePool(72, () => ({
    active: false,
    kind: "grunt" as EnemyKind,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 12,
    hp: 1,
    maxHp: 1,
    speed: 80,
    flash: 0,
    fireCd: 0,
    stun: 0,
    slow: 0,
    burn: 0,
    poison: 0,
    color: "#888",
    contact: 0,
    charge: 0,
    splitGen: 0,
    affixes: [],
    fragile: 0,
    dmgMult: 1,
    phase: 1,
    armor: 0,
  }));
  particles: Particle[] = makePool(420, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    max: 1,
    size: 2,
    color: "#fff",
    kind: "spark" as const,
    x2: 0,
    y2: 0,
  }));
  floats: Floater[] = makePool(40, () => ({
    active: false,
    x: 0,
    y: 0,
    vy: 0,
    life: 0,
    text: "",
    color: "#fff",
    crit: false,
  }));
  pickups: Pickup[] = makePool(12, () => ({ active: false, x: 0, y: 0, kind: "hp" as const, vy: 0 }));
  cam = { x: ROOM_W / 2, y: ROOM_H / 2, trauma: 0 };
  viewW = 800;
  viewH = 600;
  shakeX = 0;
  shakeY = 0;
  zoom = 1;
  hitstop = 0;
  timeScale = 1;
  kills = 0;
  combo = 0;
  comboT = 0;
  time = 0;
  loot: LootOffer[] = [];
  rerolls = 1;
  rarityWeights?: RarityWeights;
  abilityDefs: ActiveDef[];
  passiveDefs: PassiveDef[];
  weaponDefs: WeaponDef[];
  affixDefs: Affix[];
  uniqueDefs: UniqueDef[];
  roomPlans: (RoomPlan | null)[];
  waveI = 0;
  waveT = 0;
  spawnedWave = -1;
  breakT = 0;
  /** První vlna místnosti čeká na potvrzení hráče (tlačítko Start vlna). */
  waveAwaitingStart = false;
  buffs: Buffs = {
    timestop: 0,
    orbitals: 0,
    orbitalAngle: 0,
    shield: 0,
    drone: 0,
    droneCd: 0,
    well: null,
    overclock: 0,
    mirror: 0,
  };
  muzzle = 0;
  paused = false;
  clearDelay = 0;
  echoQueue: number[] = [];

  constructor(seed: string, settings: RunSettings = {}) {
    this.seed = seed.toUpperCase();
    this.rarityWeights = settings.rarityWeights;
    this.abilityDefs = settings.abilities ?? DEFAULT_ABILITY_DEFS;
    this.passiveDefs = settings.passives ?? DEFAULT_PASSIVE_DEFS;
    this.weaponDefs = settings.weapons ?? DEFAULT_WEAPON_DEFS;
    this.affixDefs = settings.affixes ?? DEFAULT_AFFIXES;
    this.uniqueDefs = settings.uniques ?? DEFAULT_UNIQUES;
    this.roomPlans = settings.roomPlans ?? [];
    this.sector = Math.max(0, Math.floor(settings.startSector ?? 0));
    this.anomaly = anomalyForSector(this.seed, this.sector);
    if (this.anomaly) this.noteCodex("anomaly", this.anomaly);
    this.affixesUnlocked = settings.affixesUnlocked ?? false;
    this.synergyUnlocked = settings.synergyUnlocked ?? false;
    this.veteran = settings.veteran ?? false;
    this.torment = settings.torment ?? false;
    this.characterTalents = normalizeTalents(settings.characterTalents ?? this.characterProgress.talents);
    this.player.maxHp += this.characterTalents.vitality * 8;
    this.player.hp = this.player.maxHp;
    const s = hashSeed(this.seed);
    this.lootRng = stream(s, 0x9e3779b9);
    this.roomRng = stream(s, 0x85ebca6b);
    this.combatRng = mulberry32(s ^ 0xc2b2ae35);
    // Checkpoint catch-up: posunout loot RNG o sektor, aby vyšší start
    // negeneroval identický loot jako sektor 1, + bonus do HP.
    for (let i = 0; i < this.sector; i++) {
      this.roomRng();
      this.lootRng();
    }
    const catchUp = catchUpForSector(this.sector);
    if (catchUp.bonusMaxHp > 0) {
      this.player.maxHp += catchUp.bonusMaxHp;
      this.player.hp = this.player.maxHp;
    }
    // Kodex (§18): trvalé bonusy za odemčené položky.
    this.codex = codexBonus(loadCodex());
    if (this.codex.hp !== 0) {
      this.player.maxHp += this.codex.hp;
      this.player.hp += this.codex.hp;
    }
    // Blueprinty (§23): ranky archetypů + případný startovní rám ze zbrojnice.
    this.blueprints = loadBlueprints();
    if (settings.starterArchetype) {
      const def = this.weaponDefs.find((d) => d.archetype === settings.starterArchetype);
      if (def) {
        const starter = generateWeapon(
          this.lootRng,
          0,
          false,
          { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 },
          [def],
          [],
          [],
          this.blueprints,
        );
        this.weapons[0] = applyWeaponComponents(starter, settings.starterComponents);
      }
    }
    // Start z checkpointu: rerolly místnosti + bonusový reroll navíc (pravidla §8).
    this.rerolls = this.roomRerolls() + catchUp.freeRerolls;
    // Kolo štěstí: mutátory ze seedu + sektoru (§15). Druhý dech / Slabé srdce hned do HP.
    this.mutators = rollMutators(this.seed, this.sector);
    for (const m of this.mutators) this.noteCodex("mutator", m.id);
    const mutHp = mutAdd(this.mutators, "maxHp");
    this.mutHpBonus = mutHp;
    if (mutHp !== 0) {
      this.player.maxHp = Math.max(20, this.player.maxHp + mutHp);
      this.player.hp = this.player.maxHp;
    }
    this.player.mag[0] = this.magSizeOf(this.weapons[0]);
    this.room = generateRoom(this.roomRng, 0, this.roomPlans[0] ?? undefined, this.level);
    this.markBossRoom();
    this.waveAwaitingStart = true;
  }

  get level(): number {
    return globalLevel(this.sector, this.roomIndex);
  }

  /** Fáze hry pro aktuální sektor (pravidla §11). */
  get gamePhase(): GamePhase {
    return gamePhaseFor(this.sector);
  }

  /** Hlubina = end-game od 4. sektoru (pravidla §13). */
  get isHlubina(): boolean {
    return bossTierForLevel(this.level) >= 3;
  }

  trauma(v: number) {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      v *= 0.25;
    }
    this.cam.trauma = clamp(this.cam.trauma + v, 0, 1);
  }

  passiveSum(kind: Passive["kind"]): number {
    let s = 0;
    for (const p of this.passives) if (p.kind === kind) s += p.value;
    return s;
  }

  /** Postup výzvy (bez dokončení). */
  private bumpChallenge(id: ChallengeId, value: number) {
    const st = this.challenges[id];
    if (st.done) return;
    const def = challengeDef(id);
    st.progress = Math.min(def.goal, value);
    if (st.progress >= def.goal) this.completeChallenge(id);
  }

  /** Splnění výzvy: šrot ihned + trvalý odznak (§19). */
  private completeChallenge(id: ChallengeId) {
    const st = this.challenges[id];
    if (st.done) return;
    const def = challengeDef(id);
    st.done = true;
    st.progress = def.goal;
    this.scrap += def.reward;
    unlockBadge(id);
    spawnFloater(this.floats, this.player.x, this.player.y - 30, `VÝZVA: ${def.name} +${def.reward}⚙`, "#d6dde4", true);
    sfxPlay.pickup();
    this.events.push({ kind: "challenge", text: `Výzva: ${def.name}`, sub: `+${def.reward} šrotu · odznak do profilu` });
  }

  /** Zapíše položku kodexu; při novém odemčení přidá událost pro HUD feed. */
  private noteCodex(cat: CodexCategory, id: string): void {
    if (!unlockCodex(cat, id)) return;
    const entry = this.codexList.find((e) => e.cat === cat && e.id === id);
    this.events.push({ kind: "codex", text: `Kodex: ${entry?.name ?? id}`, sub: entry ? formatCodexBonus(entry.bonus) : undefined });
  }

  /** Vyzvedne a vymaže nahromaděné události (volá UI pravidelně). */
  drainEvents(): GameEvent[] {
    if (this.events.length === 0) return [];
    const out = [...this.events];
    this.events.length = 0;
    return out;
  }

  /** Zapamatuje použití schopnosti při vstupu do boss místnosti (Bossobijec). */
  private markBossRoom() {
    if (this.room.isBoss) this.bossAbilityMark = this.abilityUses;
  }

  /** Efektivní velikost zásobníku se započteným mutátorem (§15) a mody (§23). */
  magSizeOf(w: Weapon): number {
    const ew = applyMods(w);
    return Math.max(1, Math.round(ew.stats.magSize * mutMult(this.mutators, "mag")));
  }

  /** Armor z mutátorů (Kevlar +, Křehké kosti −), clamp proti nesmrtelnosti. */
  mutArmor(): number {
    return Math.min(0.5, Math.max(-0.5, mutMult(this.mutators, "armor") - 1));
  }

  /** Bonus dash nabití z mutátorů (Kluzák / Těžké vybavení). */
  mutDashBonus(): number {
    return Math.round(mutAdd(this.mutators, "dash"));
  }

  snapshot(): HudSnap {
    const w = this.weapons[this.player.slot] ?? this.weapons[0];
    const bossFoe = this.enemies.find((e) => e.active && e.kind === "boss") ?? null;
    return {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      room: this.roomIndex + 1,
      rooms: SECTOR_SIZE,
      sector: this.sector + 1,
      sectorSize: SECTOR_SIZE,
      level: this.level,
      kills: this.kills,
      combo: this.combo,
      time: this.time,
      mag: Math.max(0, Math.floor(this.player.mag[this.player.slot] ?? 0)),
      magSize: w.stats.magSize,
      reloading: (this.player.reload[this.player.slot] ?? 0) > 0,
      weapons: this.weapons,
      slot: this.player.slot,
      ability: this.ability,
      abilityCd: this.abilityCd,
      dash: this.player.dashCharges,
      dashMax: Math.max(1, DASH_MAX + Math.round(this.passiveSum("dashBattery")) + this.mutDashBonus()),
      passives: this.passives,
      modInv: [...this.mods],
      seed: this.seed,
      elite: this.room.isElite,
      boss: this.room.isBoss,
      torment: this.torment,
      bossInfo: bossFoe ? { hp: bossFoe.hp, maxHp: bossFoe.maxHp, phase: bossFoe.phase } : null,
      wave: Math.min(this.waveI + 1, this.room.waves.length),
      waves: this.room.waves.length,
      remaining: this.enemies.filter((e) => e.active).length,
      waveIn: this.waveCountdown(),
      waveAwaiting: this.waveAwaitingStart,
      runXp: this.runXp,
      characterLevel: this.characterProgress.level,
      characterXp: this.characterProgress.xp,
      characterXpToNext: xpForNextLevel(this.characterProgress.level),
      scrap: this.scrap,
      sectorMod: this.sectorMod,
      anomaly: this.anomaly,
      gamePhase: this.gamePhase,
      rerolls: this.rerolls,
      dmgDealt: this.dmgDealt,
      dmgTaken: this.dmgTaken,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      buffs: {
        shield: this.buffs.shield,
        overclock: this.buffs.overclock,
        mirror: this.buffs.mirror,
        drone: this.buffs.drone,
        timestop: this.buffs.timestop,
        orbitals: this.buffs.orbitals,
        well: this.buffs.well !== null,
      },
    };
  }

  /** Vše pro stats panel: obtížnost, hráč (DPS), bestiář i žijící nepřátelé. */
  statsSnap(): StatsSnap {
    const diff = difficultyForLevel(this.level);
    const mutDmg = mutMult(this.mutators, "damage");
    const mutRpm = mutMult(this.mutators, "rpm");
    const mutCrit = mutMult(this.mutators, "crit") - 1;
    const weapons: (WeaponStatLine | null)[] = [0, 1].map((slot) => {
      const raw = this.weapons[slot as 0 | 1];
      if (!raw) return null;
      // Efektivní hodnoty s mody z Dílny (§23).
      const w = applyMods(raw);
      return {
        slot,
        name: w.name,
        dps: dpsEstimate(w) * (1 + this.passiveSum("overloaded")) * mutDmg * mutRpm * (1 + this.characterTalents.ballistics * 0.03),
        damage: w.stats.damage * mutDmg * (1 + this.characterTalents.ballistics * 0.03),
        rpm: w.stats.rpm * (1 + this.passiveSum("overloaded")) * mutRpm,
        pellets: w.stats.pellets,
        magSize: this.magSizeOf(w),
        reload: w.stats.reload * mutMult(this.mutators, "reload"),
        critChance: Math.max(0, w.stats.critChance + mutCrit),
        critMult: w.stats.critMult,
      };
    });
    return {
      level: this.level,
      sector: this.sector + 1,
      room: this.roomIndex + 1,
      rooms: SECTOR_SIZE,
      elite: this.room.isElite,
      boss: this.room.isBoss,
      hpMult: diff.hpMult + (this.room.isElite ? getDifficulty().eliteBonus : 0),
      dmgMult: diff.dmgMult,
      speedMult: diff.speedMult,
      bossTier: diff.bossTier,
      wave: Math.min(this.waveI + 1, this.room.waves.length),
      waves: this.room.waves.length,
      remaining: this.enemies.filter((e) => e.active).length,
      waveIn: this.waveCountdown(),
      waveAwaiting: this.waveAwaitingStart,
      xp: Math.min(
        xpForNextLevel(this.characterProgress.level),
        this.characterProgress.xp + this.runXp,
      ),
      xpToNext: xpForNextLevel(this.characterProgress.level),
      player: {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        moveSpeed: PLAYER_SPEED * (1 + this.passiveSum("haste")) * mutMult(this.mutators, "moveSpeed"),
        armor: Math.min(PLAYER_ARMOR_CAP, this.passiveSum("thickSkin")),
        weapons,
      },
      scrap: this.scrap,
      sectorMod: this.sectorMod,
      anomaly: this.anomaly,
      gamePhase: this.gamePhase,
      mutators: [...this.mutators],
      bestiary: ENEMY_ORDER.map((kind) => enemyStatsAt(kind, this.level, this.room.isElite)),
      challenges: CHALLENGES.map((def) => ({
        id: def.id,
        name: def.name,
        desc: def.desc,
        reward: def.reward,
        goal: def.goal,
        done: this.challenges[def.id].done,
        progress: Math.min(def.goal, Math.floor(this.challenges[def.id].progress)),
      })),
      alive: this.enemies
        .filter((e) => e.active)
        .slice(0, 12)
        .map((e) => ({ kind: e.kind, name: ENEMY_NAME[e.kind], hp: e.hp, maxHp: e.maxHp, affixes: [...e.affixes], phase: e.phase })),
    };
  }

  nextRoom() {
    this.roomIndex += 1;
    if (this.roomIndex >= SECTOR_SIZE) {
      // Nemělo by nastat — boss posílá do báze v applyLoot.
      this.phase = "base";
      sfxPlay.win();
      return;
    }
    this.room = generateRoom(this.roomRng, this.roomIndex, this.roomPlans[this.roomIndex] ?? undefined, this.level);
    this.player.x = ROOM_W / 2;
    this.player.y = ROOM_H / 2;
    this.player.invuln = 1.0;
    this.waveI = 0;
    this.waveT = 0;
    this.spawnedWave = -1;
    this.breakT = 0;
    this.damageTakenThisRoom = 0;
    this.markBossRoom();
    this.phase = "combat";
    this.loot = [];
    this.rerolls = this.roomRerolls();
    this.enterRoomCue();
    // Start vlna čeká na potvrzení hráče pouze po elitní místnosti (6. v sektoru).
    this.waveAwaitingStart = ELITE_POS.includes(((this.roomIndex - 1) % SECTOR_SIZE + SECTOR_SIZE) % SECTOR_SIZE);
    for (const e of this.enemies) e.active = false;
    for (const b of this.bullets) if (b.team === 1) b.active = false;
  }

  enterRoomCue() {
    if (this.room.isElite) sfxPlay.eliteSpawn();
    setMusicMode(this.room.isBoss ? "boss" : "explore");
  }

  generateLoot() {
    // Místnost je vyčištěná: Bez šrámu (§19), pak reset čítače zranění.
    if (this.damageTakenThisRoom <= 0) this.completeChallenge("bez-sramu");
    this.damageTakenThisRoom = 0;
    const offers: LootOffer[] = [];
    const boss = this.room.isBoss;
    const mod = this.sectorMod;
    // Aréna: loot jako o 3 úrovně výš. Zlatá žíla: +2; Hladomor a Přepětí: +1; Torment: +1 (pravidla §12, §22).
    const g =
      this.level -
      1 +
      (mod === "arena" ? 3 : 0) +
      (this.anomaly === "gold" ? 2 : 0) +
      (this.anomaly === "famine" || this.anomaly === "surge" ? 1 : 0) +
      (this.torment ? 1 : 0);
    offers.push({
      kind: "weapon",
      weapon: generateWeapon(this.lootRng, g, boss, this.rarityWeights, this.weaponDefs, this.affixDefs, this.uniqueDefs, this.blueprints),
    });
    const roll = this.lootRng();
    if (mod === "forge") {
      offers.push({
        kind: "weapon",
        weapon: generateWeapon(this.lootRng, g, boss, this.rarityWeights, this.weaponDefs, this.affixDefs, this.uniqueDefs, this.blueprints),
      });
    } else if (mod === "lab") {
      if (roll < 0.5) {
        offers.push({
          kind: "ability",
          ability: generateAbility(this.lootRng, g, boss, this.rarityWeights, this.abilityDefs),
        });
      } else {
        offers.push({
          kind: "passive",
          passive: generatePassive(this.lootRng, g, boss, this.rarityWeights, this.passiveDefs),
        });
      }
    } else if (mod === "library") {
      offers.push({
        kind: "ability",
        ability: generateAbility(this.lootRng, g, boss, this.rarityWeights, this.abilityDefs),
      });
    } else if (roll < 0.3) {
      offers.push({
        kind: "ability",
        ability: generateAbility(this.lootRng, g, boss, this.rarityWeights, this.abilityDefs),
      });
    } else if (roll < 0.62) {
      offers.push({
        kind: "passive",
        passive: generatePassive(this.lootRng, g, boss, this.rarityWeights, this.passiveDefs),
      });
    } else if (roll < 0.8) {
      offers.push({
        kind: "weapon",
        weapon: generateWeapon(this.lootRng, g, boss, this.rarityWeights, this.weaponDefs, this.affixDefs, this.uniqueDefs, this.blueprints),
      });
    } else {
      offers.push({
        kind: "mod",
        mod: generateMod(this.lootRng, g, this.rarityWeights),
      });
    }
    if (mod === "library") {
      offers.push({
        kind: "passive",
        passive: generatePassive(this.lootRng, g, boss, this.rarityWeights, this.passiveDefs),
      });
    } else if ((mod === "lab" || this.anomaly === "generous" || this.player.hp < this.player.maxHp * 0.6) && this.anomaly !== "famine") {
      offers.push({
        kind: "heal",
        amount: 0.4,
        name: "Medkit",
        desc: "Obnoví 40% zdraví.",
      });
    } else {
      offers.push({
        kind: "passive",
        passive: generatePassive(this.lootRng, g, boss, this.rarityWeights, this.passiveDefs),
      });
    }
    // Aréna + Ozvěny: boss dává 4. nabídku (pravidla §3.1, §12). Tržiště: vždy 4. nabídka (pasivka).
    const fourth = boss && (mod === "arena" || this.anomaly === "echoes");
    const marketExtra = mod === "market";
    if (fourth) {
      offers.push({
        kind: "weapon",
        weapon: generateWeapon(this.lootRng, g, boss, this.rarityWeights, this.weaponDefs, this.affixDefs, this.uniqueDefs, this.blueprints),
      });
    } else if (marketExtra) {
      offers.push({
        kind: "passive",
        passive: generatePassive(this.lootRng, g, boss, this.rarityWeights, this.passiveDefs),
      });
    }
    this.loot = offers.slice(0, fourth || marketExtra ? 4 : 3);
    this.applyLootPity(boss);
  }

  private lootRank(offer: LootOffer): number {
    if (offer.kind === "heal") return -1;
    const rarity =
      offer.kind === "weapon"
        ? offer.weapon.rarity
        : offer.kind === "ability"
          ? offer.ability.rarity
          : offer.kind === "mod"
            ? offer.mod.rarity
            : offer.passive.rarity;
    return RARITY_ORDER.indexOf(rarity);
  }

  /** Zvedne nabídku o tier (max mythic), hodnota +12 %. */
  private bumpOffer(offer: LootOffer) {
    const up = (r: Rarity): Rarity => RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(r) + 1)];
    if (offer.kind === "weapon") {
      const rarity = up(offer.weapon.rarity);
      offer.weapon = {
        ...offer.weapon,
        rarity,
        stats: { ...offer.weapon.stats, damage: offer.weapon.stats.damage * 1.12 },
        colors: { ...offer.weapon.colors, glow: RARITY_COLOR[rarity] },
      };
    } else if (offer.kind === "ability") {
      offer.ability = { ...offer.ability, rarity: up(offer.ability.rarity), damage: offer.ability.damage * 1.12 };
    } else if (offer.kind === "passive") {
      const value = offer.passive.value * 1.12;
      // Popis nese zformátované číslo — přepočítej první číslo v textu.
      const desc = offer.passive.desc.replace(/\d+/, (m) => String(Math.round(Number(m) * 1.12)));
      offer.passive = { ...offer.passive, rarity: up(offer.passive.rarity), value, desc };
    } else if (offer.kind === "mod") {
      offer.mod = { ...offer.mod, rarity: up(offer.mod.rarity) };
    }
  }

  /** Pity timer + boss minimum — pravidla §3.2. */
  private applyLootPity(boss: boolean) {
    const lowestNonHeal = () =>
      this.loot
        .filter((o) => o.kind !== "heal")
        .sort((a, b) => this.lootRank(a) - this.lootRank(b))[0];
    let best = Math.max(0, ...this.loot.map((o) => this.lootRank(o)));
    if (boss) {
      // Boss minimum: rare, Veterán epic, Hlubina legendary (pravidla §3.2, §13).
      const minRank = this.veteran ? 4 : this.isHlubina ? 5 : 2;
      let guard = 0;
      while (best < minRank && guard++ < 6) {
        const lowest = lowestNonHeal();
        if (!lowest) break;
        this.bumpOffer(lowest);
        best = Math.max(0, ...this.loot.map((o) => this.lootRank(o)));
      }
    }
    if (best >= 2) {
      this.roomsSinceRare = 0;
    } else {
      this.roomsSinceRare += 1;
      // Pity po 4 místnostech bez rare+ (Veterán po 3) — pevný progress.
      if (this.roomsSinceRare >= (this.veteran ? 3 : 4)) {
        const lowest = lowestNonHeal();
        if (lowest) this.bumpOffer(lowest);
        this.roomsSinceRare = 0;
      }
    }
  }

  rerollLoot() {
    if (this.rerolls <= 0) {
      sfxPlay.deny();
      return;
    }
    this.rerolls -= 1;
    this.generateLoot();
    sfxPlay.reroll();
  }

  applyLoot(index: number, weaponSlot?: 0 | 1) {
    const offer = this.loot[index];
    if (!offer) return;
    if (offer.kind === "weapon") {
      const slot = weaponSlot ?? (this.weapons[1] == null ? 1 : this.player.slot);
      this.weapons[slot] = offer.weapon;
      this.player.mag[slot] = this.magSizeOf(offer.weapon);
      this.player.reload[slot] = 0;
      // Kodex (§18): případný unikát (párovaný jménem); archetyp se píše až za zabití drženou zbraní.
      if (offer.weapon.unique) this.noteCodex("unique", offer.weapon.name);
    } else if (offer.kind === "ability") {
      this.ability = offer.ability;
      this.abilityCd = 0.4;
      this.noteCodex("ability", offer.ability.kind);
    } else if (offer.kind === "passive") {
      this.passives.push(offer.passive);
      this.noteCodex("passive", offer.passive.kind);
      if (offer.passive.kind === "vitality") {
        this.player.maxHp += offer.passive.value;
        this.player.hp += offer.passive.value;
      }
      if (offer.passive.kind === "dashBattery") {
        this.player.dashCharges += 1;
      }
    } else if (offer.kind === "mod") {
      // Mod do inventáře Dílny (§23); plný inventář se rovnou rozebere na šrot.
      if (this.mods.length >= MOD_INV_MAX) {
        const value = scrapForRarity(offer.mod.rarity);
        this.scrap += value;
        this.scrapEarned += value;
        spawnFloater(this.floats, this.player.x, this.player.y - 30, `Plný inventář: +${value}⚙`, "#9eb4c4", false);
      } else {
        this.mods.push(offer.mod);
      }
    } else {
      this.player.hp = clamp(this.player.hp + this.player.maxHp * offer.amount, 0, this.player.maxHp);
      sfxPlay.heal();
    }
    sfxPlay.pickup();
    this.loot = [];
    this.advanceAfterLoot();
  }

  /** Společný postup po vyřešení lootu (volba i šrot): boss → báze, jinak další místnost. */
  advanceAfterLoot() {
    if (this.room.isBoss) {
      // Konec sektoru → mezisektorová báze (prvky systému 2).
      this.enterBase();
    } else {
      this.nextRoom();
    }
  }

  /** Hodnota aktuálních nabídek ve šrotu (bez konzumace). Zlatá žíla +25 % (§12). */
  scrapLootValue(): number {
    let total = 0;
    for (const offer of this.loot) {
      if (offer.kind === "weapon") total += scrapForRarity(offer.weapon.rarity);
      else if (offer.kind === "ability") total += scrapForRarity(offer.ability.rarity);
      else if (offer.kind === "passive") total += scrapForRarity(offer.passive.rarity);
      else if (offer.kind === "mod") total += scrapForRarity(offer.mod.rarity);
      else total += scrapForHeal();
    }
    total = this.anomaly === "gold" ? Math.round(total * 1.25) : total;
    if (this.torment) total = Math.round(total * 1.25);
    // Mutátor Zlatokopectví / Prázdná peněženka (§15) + Mrchožrout (pasivka scavenger).
    return Math.max(0, Math.round(total * mutMult(this.mutators, "scrap") * (1 + this.passiveSum("scavenger"))));
  }

  /** Rozebere nabídky na šrot místo volby odměny. Vrací získaný šrot. */
  scrapLoot(): number {
    if (this.loot.length === 0) return 0;
    const gained = this.scrapLootValue();
    this.scrap += gained;
    this.scrapEarned += gained;
    this.loot = [];
    sfxPlay.reroll();
    this.advanceAfterLoot();
    return gained;
  }

  /** Zasadí mod z inventáře do rámu ve slotu. Unikáty (0 slotů) a plné rámy odmítne. */
  socketMod(modId: string, slot: 0 | 1): boolean {
    const idx = this.mods.findIndex((m) => m.id === modId);
    const w = this.weapons[slot];
    if (idx < 0 || !w || w.unique || w.mods.length >= w.slots) return false;
    const [mod] = this.mods.splice(idx, 1);
    if (!mod) return false;
    w.mods.push(mod);
    sfxPlay.pickup();
    return true;
  }

  /** Vyndá mod z rámu zpět do inventáře. Vrací úspěch. */
  unsocketMod(slot: 0 | 1, modIndex: number): boolean {
    const w = this.weapons[slot];
    const mod = w?.mods[modIndex];
    if (!w || !mod) return false;
    w.mods.splice(modIndex, 1);
    this.mods.push(mod);
    sfxPlay.ui();
    return true;
  }

  /** Nákup v bázi. Vrací true při úspěchu, jinak deny zvuk. */
  buyShop(item: ShopItemId): boolean {
    const cost = shopCost(item, this.sector + 1);
    if (this.scrap < cost) {
      sfxPlay.deny();
      return false;
    }
    if (item === "reroll" && this.rerolls >= 4) {
      sfxPlay.deny();
      return false;
    }
    this.scrap -= cost;
    if (item === "heal") {
      this.player.hp = this.player.maxHp;
      sfxPlay.heal();
    } else if (item === "maxhp") {
      this.player.maxHp += 15;
      this.player.hp = clamp(this.player.hp + 15, 0, this.player.maxHp);
      sfxPlay.pickup();
    } else {
      this.rerolls += 1;
      sfxPlay.reroll();
    }
    return true;
  }

  /** Rerolly na místnost: základ 1, Kovárna/Laboratoř/Štědrý trezor +1 (§7, §12). */
  roomRerolls(): number {
    return (
      1 +
      (this.sectorMod === "forge" || this.sectorMod === "lab" || this.sectorMod === "library" ? 1 : 0) +
      (this.anomaly === "generous" || this.anomaly === "surge" ? 1 : 0)
    );
  }

  /** Přechod do báze po bossovi: heal + reroll bonus do dalšího sektoru (§6). */
  enterBase() {
    this.phase = "base";
    // Rychlík: sektor do 5:00 (§19).
    if (this.sectorTime <= 300) this.completeChallenge("rychlik");
    // Báze doplní 35 % max. HP (Klid před bouří 50 %), rerolly v bázi = 2.
    const healFrac = this.anomaly === "calm" ? 0.5 : 0.35;
    this.player.hp = clamp(this.player.hp + this.player.maxHp * healFrac, 0, this.player.maxHp);
    this.rerolls = 2;
    for (const e of this.enemies) e.active = false;
    for (const b of this.bullets) if (b.team === 1) b.active = false;
    sfxPlay.sectorClear();
    sfxPlay.heal();
    setMusicMode("base");
  }

  /** Pokračování z báze do dalšího sektoru — build se zachovává, aktivuje se zvolený portál. */
  continueToNextSector(mod: SectorModId | null = null) {
    this.sector += 1;
    this.sectorMod = mod;
    if (mod) this.noteCodex("portal", mod);
    this.anomaly = anomalyForSector(this.seed, this.sector);
    if (this.anomaly) this.noteCodex("anomaly", this.anomaly);
    // Nové kolo štěstí pro nový sektor (§15): starý HP bonus se odečte, nový přičte.
    this.mutators = rollMutators(this.seed, this.sector);
    for (const m of this.mutators) this.noteCodex("mutator", m.id);
    const newHpBonus = mutAdd(this.mutators, "maxHp");
    const hpDelta = newHpBonus - this.mutHpBonus;
    if (hpDelta !== 0) {
      this.player.maxHp = Math.max(20, this.player.maxHp + hpDelta);
      this.player.hp = clamp(this.player.hp + Math.max(0, hpDelta), 0, this.player.maxHp);
    }
    this.mutHpBonus = newHpBonus;
    this.roomIndex = 0;
    this.room = generateRoom(this.roomRng, 0, this.roomPlans[0] ?? undefined, this.level);
    this.player.x = ROOM_W / 2;
    this.player.y = ROOM_H / 2;
    this.player.invuln = 1.5;
    this.waveI = 0;
    this.waveT = 0;
    this.spawnedWave = -1;
    this.breakT = 0;
    this.sectorKills = 0;
    this.sectorTime = 0;
    this.damageTakenThisRoom = 0;
    this.markBossRoom();
    this.phase = "combat";
    this.loot = [];
    this.rerolls = this.roomRerolls();
    this.enterRoomCue();
    this.waveAwaitingStart = true;
    for (const e of this.enemies) e.active = false;
    for (const b of this.bullets) if (b.team === 1) b.active = false;
  }

  spawnEnemy(kind: EnemyKind, x: number, y: number, splitGen = 0) {
    const e = this.enemies.find((en) => !en.active);
    if (!e) return;
    const st = enemyStatsAt(kind, this.level, this.room.isElite);
    const affixes =
      splitGen > 0
        ? []
        : rollAffixes(
            this.combatRng,
            kind,
            this.room.isElite,
            difficultyForLevel(this.level).bossTier,
            this.affixesUnlocked,
          );
    let hp = st.hp * (splitGen > 0 ? 0.45 : 1);
    let speed = st.speed;
    let dmgMult = 1;
    if (affixes.includes("armored")) hp *= 1.6;
    if (affixes.includes("swift")) speed *= 1.35;
    if (affixes.includes("malevolent")) dmgMult = 1.5;
    if (affixes.includes("gigantic")) hp *= 2.2;
    if (affixes.includes("frenzied")) {
      speed *= 1.2;
      dmgMult *= 1.25;
    }
    e.active = true;
    e.kind = kind;
    e.x = x;
    e.y = y;
    e.vx = 0;
    e.vy = 0;
    e.r = ENEMY_R[kind] * (splitGen > 0 ? 0.7 : 1) * (affixes.includes("gigantic") ? 1.25 : 1);
    e.hp = hp;
    e.maxHp = hp;
    e.speed = speed;
    e.flash = 0;
    e.fireCd = randRange(this.combatRng, 0.2, 1.1);
    e.stun = 0;
    e.slow = 0;
    e.burn = 0;
    e.poison = 0;
    e.color = ENEMY_COL[kind];
    e.contact = 0;
    e.charge = 0;
    e.splitGen = splitGen;
    e.affixes = affixes;
    e.fragile = 0;
    e.dmgMult = dmgMult * (this.torment ? 1.25 : 1);
    e.phase = 1;
    // Zbroj z úrovně + Pancéřovaný affix (§21). Torment: +25 % HP.
    e.armor = Math.min(0.45, st.armor + (affixes.includes("armored") ? 0.15 : 0));
    if (this.torment) {
      e.hp *= 1.25;
      e.maxHp = e.hp;
    }
  }

  spawnWave(wave: Wave) {
    let hasBoss = false;
    for (const s of wave.spawns) {
      if (s.kind === "boss") hasBoss = true;
      for (let i = 0; i < s.count; i++) {
        const p = spawnEdge(this.combatRng, this.room.obstacles);
        this.spawnEnemy(s.kind, p.x, p.y);
      }
    }
    if (hasBoss) sfxPlay.bossRoar();
  }

  fireWeapon(echo = false) {
    const slot = this.player.slot;
    const held = this.weapons[slot];
    if (!held) return;
    // Efektivní zbraň s mody z Dílny (§23) — dál se pracuje s w.
    const w = applyMods(held);
    if (this.player.reload[slot] > 0) return;
    if (this.player.mag[slot]! <= 0) {
      this.player.reload[slot] = w.stats.reload * mutMult(this.mutators, "reload");
      sfxPlay.reload();
      return;
    }
    const oc = this.buffs.overclock > 0 ? 1.55 : 1;
    const spin = w.archetype === "minigun" ? 0.28 + 0.72 * this.player.spin : 1;
    const rpm = w.stats.rpm * oc * (1 + this.passiveSum("overloaded")) * mutMult(this.mutators, "rpm") * spin;
    const interval = 60 / Math.max(40, rpm);
    if (!echo && this.player.fireCd > 0) return;

    const burstN = w.behaviors.burst ?? 0;
    if (!echo && burstN >= 2 && this.player.burstLeft <= 0) {
      this.player.burstLeft = Math.round(burstN) - 1;
      this.player.burstCd = 0.045;
    }

    this.player.fireCd = echo ? this.player.fireCd : interval;
    if (!echo) this.player.mag[slot]! -= 1;
    if (!echo && this.player.mag[slot]! <= 0) this.player.reload[slot] = w.stats.reload * mutMult(this.mutators, "reload");

    const pellets = w.stats.pellets + Math.round(this.passiveSum("extraPellet"));
    const aim = this.player.aim;
    const isShot = w.archetype === "shotgun";
    if (isShot) sfxPlay.shotgun();
    else if (w.behaviors.beam) sfxPlay.beam();
    else sfxPlay.shoot(w.archetype === "sniper" || w.archetype === "rail" ? 0.6 : 1);

    this.muzzle = 0.05;
    this.trauma(isShot ? 0.16 : 0.07);

    for (let i = 0; i < pellets; i++) {
      const spread = w.stats.spread * mutMult(this.mutators, "spread") * (1 - Math.min(0.5, this.passiveSum("focus"))) * (0.4 + 0.6 * (pellets > 1 ? 1 : 0.5));
      const a = aim + (this.combatRng() - 0.5) * 2 * spread + (pellets > 1 ? ((i - (pellets - 1) / 2) * spread) / pellets : 0);
      const crit = this.combatRng() < Math.max(0, Math.min(CRIT_CHANCE_CAP, w.stats.critChance + (mutMult(this.mutators, "crit") - 1) + this.codex.crit));
      const dmg = w.stats.damage * (1 + this.characterTalents.ballistics * 0.03) * (crit ? Math.min(CRIT_MULT_CAP, w.stats.critMult) : 1);
      this.spawnBullet({
        x: this.player.x + Math.cos(aim) * 18,
        y: this.player.y + Math.sin(aim) * 18,
        vx: Math.cos(a) * w.stats.projSpeed,
        vy: Math.sin(a) * w.stats.projSpeed,
        r: w.stats.projSize,
        damage: dmg,
        ttl: (w.stats.range * mutMult(this.mutators, "range")) / Math.max(120, w.stats.projSpeed),
        team: 0,
        pierce: (w.behaviors.pierce ?? 0) | 0,
        bounce: (w.behaviors.bounce ?? 0) + Math.round(this.passiveSum("ricochet")),
        homing: w.behaviors.homing ?? 0,
        explode: w.behaviors.explode ?? 0,
        split: (w.behaviors.split ?? 0) + (this.combatRng() < this.passiveSum("splinter") ? 2 : 0),
        color: echo ? "#9eb4c4" : w.colors.accent,
        knock: w.stats.knockback,
        // Omrzlina je ŠANCE na mráz (1,2 s) — popis je smlouva (progression-rules §3.3).
        freeze:
          (w.behaviors.freeze ?? 0) +
          (this.passiveSum("frostbite") > 0 && this.combatRng() < Math.min(1, this.passiveSum("frostbite")) ? 1.2 : 0),
        burn: w.behaviors.burn ?? 0,
        poison: w.behaviors.poison ?? 0,
        chain: w.behaviors.chain ?? 0,
        lifesteal: (w.behaviors.lifesteal ?? 0) + this.passiveSum("vampirism"),
        shock: w.behaviors.shockstun ?? 0,
        crit,
        fromBeam: !!w.behaviors.beam,
        element: w.element,
        pen: w.behaviors.pierceArmor ?? 0,
      });
    }
    if (!echo && this.buffs.mirror > 0) {
      this.fireWeapon(true);
    }
    if (!echo && w.behaviors.echo) {
      this.echoQueue.push(w.behaviors.echo);
    }
    spawnParticle(this.particles, this.player.x + Math.cos(aim) * 20, this.player.y + Math.sin(aim) * 20, w.colors.accent, "muzzle");
  }

  spawnBullet(b: Omit<Bullet, "active">) {
    const slot = this.bullets.find((x) => !x.active);
    if (!slot) return;
    Object.assign(slot, b);
    slot.active = true;
    if (b.team === 0) this.shotsFired += 1;
  }

  explodeAt(x: number, y: number, r: number, dmg: number, color: string) {
    burst(this.particles, x, y, color, 14);
    spawnParticle(this.particles, x, y, color, "ring");
    this.trauma(0.22);
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (Math.hypot(e.x - x, e.y - y) < r + e.r) {
        this.hurtEnemy(e, dmg, x, y, 80, 0, 0, 0, 0, 0, false);
      }
    }
  }

  chainFrom(from: Enemy, remaining: number, dmg: number, color: string) {
    if (remaining <= 0) return;
    let best: Enemy | null = null;
    let bestD = 160;
    for (const e of this.enemies) {
      if (!e.active || e === from) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) return;
    spawnBolt(this.particles, from.x, from.y, best.x, best.y, color);
    burst(this.particles, best.x, best.y, color, 6);
    this.hurtEnemy(best, dmg * 0.7, from.x, from.y, 40, 0, 0, 0, remaining - 1, 0, false);
  }

  hurtEnemy(
    e: Enemy,
    dmg: number,
    hx: number,
    hy: number,
    knock: number,
    freeze: number,
    burn: number,
    poison: number,
    chain: number,
    lifesteal: number,
    crit: boolean,
    shock = 0,
    pen = 0,
  ) {
    if (e.fragile > 0) dmg *= 1.35;
    // Buckety poškození (§21): gear je v základu, vlastnosti a aury s klesajícími
    // výnosy, kodex naplno. Zbroj nepřítele snižuje zásah; ignoruje ji průraznost.
    // Statusové DoT (burn/poison ticky) jdou mimo hurtEnemy, a zbroj tak obcházejí.
    const trait = this.passiveSum("greed") * (1 - this.player.hp / this.player.maxHp);
    dmg *= damageBuckets({ mut: mutMult(this.mutators, "damage"), codexPct: this.codex.dmgPct, trait });
    dmg *= armorFactor(e.armor, pen);
    this.dmgDealt += Math.max(0, dmg);
    e.hp -= dmg;
    e.flash = 0.08;
    e.slow = Math.max(e.slow, freeze);
    e.burn = Math.max(e.burn, burn > 0 ? 1.6 : 0);
    e.poison = Math.max(e.poison, poison > 0 ? 2.2 : 0);
    if (shock > 0 && this.combatRng() < shock) e.stun = Math.max(e.stun, 0.35);
    const dx = e.x - hx;
    const dy = e.y - hy;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * (knock * 0.012);
    e.y += (dy / d) * (knock * 0.012);
    spawnFloater(this.floats, e.x, e.y - e.r, `${Math.round(dmg)}`, crit ? "#d6dde4" : "#c45c3e", crit);
    // Vysátí: bossové vracejí jen polovinu (pevný progress).
    const leechMult = e.kind === "boss" ? 0.5 : 1;
    if (lifesteal > 0) this.player.hp = clamp(this.player.hp + dmg * lifesteal * leechMult, 0, this.player.maxHp);
    const mutVamp = mutMult(this.mutators, "lifesteal") - 1;
    if (mutVamp > 0) this.player.hp = clamp(this.player.hp + dmg * mutVamp * leechMult, 0, this.player.maxHp);
    if (chain > 0) this.chainFrom(e, chain, dmg, "#c9c07a");
    this.trauma(0.05);
    if (crit) {
      this.hitstop = Math.max(this.hitstop, 0.045);
      sfxPlay.crit();
    } else sfxPlay.hit();
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e: Enemy) {
    e.active = false;
    this.kills += 1;
    this.combo += 1;
    this.comboT = 1.4;
    // XP za zabití (bossové víc).
    const xpValue = e.kind === "boss" ? 50 : e.kind === "matka" || e.kind === "spravce" ? 25 : 10;
    this.runXp += xpValue;
    const resourceDrop = rollCharacterMaterialDrop(this.combatRng, e.kind, {
      elite: this.room.isElite,
      boss: e.kind === "boss",
      sector: this.sector + 1,
      forge: this.sectorMod === "forge",
      lab: this.sectorMod === "lab",
      scavenging: this.characterTalents.scavenging,
    });
    for (const key of ["scrap", "alloys", "cores"] as const) {
      this.runMaterials[key] += resourceDrop[key];
    }
    for (const [element, amount] of Object.entries(resourceDrop.catalysts)) {
      const key = element as keyof typeof this.runMaterials.catalysts;
      this.runMaterials.catalysts[key] = (this.runMaterials.catalysts[key] ?? 0) + amount;
    }
    for (const [archetype, amount] of Object.entries(resourceDrop.fragments)) {
      const key = archetype as keyof typeof this.runMaterials.fragments;
      this.runMaterials.fragments[key] = (this.runMaterials.fragments[key] ?? 0) + amount;
    }
    const dropSummary = describeMaterialDrop(resourceDrop);
    if (dropSummary) {
      this.events.push({
        kind: "material",
        text: e.kind === "boss" ? "Garantovaná zásilka" : "Získané zdroje",
        sub: dropSummary,
      });
      spawnFloater(this.floats, e.x, e.y - e.r, dropSummary, "#9eb4c4", e.kind === "boss");
    }
    // Kodex (§18): druh nepřítele + affixy, které nesl + archetyp zbraně v ruce.
    this.noteCodex("enemy", e.kind);
    for (const a of e.affixes) this.noteCodex("affix", a);
    const held = this.weapons[this.player.slot];
    if (held) this.noteCodex("archetype", held.archetype);
    // Blueprinty (§23): zabití drženým archetypem se sčítá do ranku.
    if (held) this.blueprintKills[held.archetype] = (this.blueprintKills[held.archetype] ?? 0) + 1;
    if (e.kind === "boss") this.bossesKilled += 1;
    // Výzvy (§19): kills v sektoru / brokovnicí / v elitní místnosti.
    this.sectorKills += 1;
    this.bumpChallenge("prvni-krev", this.sectorKills);
    if (this.weapons[this.player.slot]?.archetype === "shotgun") {
      this.shotgunKills += 1;
      this.bumpChallenge("brokovnicar", this.shotgunKills);
    }
    if (this.room.isElite) {
      this.eliteKills += 1;
      this.bumpChallenge("lovec-elit", this.eliteKills);
    }
    burst(this.particles, e.x, e.y, e.color, e.kind === "boss" ? 40 : 16, "debris");
    spawnParticle(this.particles, e.x, e.y, e.color, "ring");
    this.trauma(e.kind === "boss" ? 0.55 : 0.18);
    this.hitstop = Math.max(this.hitstop, e.kind === "boss" ? 0.12 : 0.04);
    sfxPlay.death();
    if (this.passiveSum("reloadKill") > 0) {
      const sl = this.player.slot;
      this.player.mag[sl] = this.magSizeOf(this.weapons[sl]!);
      this.player.reload[sl] = 0;
    }
    // Dělení: stejný druh, hloubka dle ENEMY_SPLIT_MAX (splitter 2×, roztoč 1×).
    const splitMax = ENEMY_SPLIT_MAX[e.kind] ?? 0;
    if (splitMax > 0 && e.splitGen < splitMax) {
      for (let i = 0; i < 2; i++) {
        this.spawnEnemy(e.kind, e.x + (i ? 10 : -10), e.y, e.splitGen + 1);
      }
    }
    // Sebevražedný výbuch dle ENEMY_BLAST (bomber, těkavka, bourák).
    const blast = ENEMY_BLAST[e.kind];
    if (blast) this.explodeAt(e.x, e.y, blast.r, bomberBlastAt(this.level) * blast.mult, "#c45c3e");
    if (e.affixes.includes("volatile")) {
      this.explodeAt(e.x, e.y, 60, bomberBlastAt(this.level) * 0.5, "#c45c3e");
      spawnParticle(this.particles, e.x, e.y, "#c45c3e", "ring");
    }
    if (this.combatRng() < 0.12) {
      const p = this.pickups.find((x) => !x.active);
      if (p) {
        p.active = true;
        p.x = e.x;
        p.y = e.y;
        p.kind = this.combatRng() < 0.45 ? "hp" : "ammo";
        p.vy = -40;
      }
    }
    if (e.kind === "boss") {
      this.phase = "cleared";
      this.clearDelay = 0.8;
      if (this.abilityUses <= this.bossAbilityMark) this.completeChallenge("bossobijec");
    }
  }

  hurtPlayer(dmg: number) {
    if (this.player.invuln > 0 || this.player.dashT > 0 || this.buffs.shield > 0) return;
    const reduced = dmg * (1 - Math.min(PLAYER_ARMOR_CAP, this.passiveSum("thickSkin"))) * (1 - this.mutArmor());
    this.dmgTaken += Math.max(0, reduced);
    this.player.hp -= reduced;
    this.damageTakenThisRoom += reduced;
    this.player.invuln = HIT_INVULN;
    this.trauma(0.4);
    this.hitstop = 0.07;
    sfxPlay.hurt();
    burst(this.particles, this.player.x, this.player.y, "#d6dde4", 10);
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.phase = "dead";
      sfxPlay.gameOver();
      musicStop();
    }
  }

  castAbility() {
    if (this.abilityCd > 0) return;
    this.abilityUses += 1;
    const a = this.ability;
    this.abilityCd = a.cooldown;
    sfxPlay.abilityKind(a.kind);
    this.trauma(0.2);
    const px = this.player.x;
    const py = this.player.y;
    const aim = this.player.aim;
    switch (a.kind) {
      case "shockwave":
        spawnParticle(this.particles, px, py, "#d6dde4", "ring");
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 260, 0, 0, 0, 0, 0, false);
          }
        }
        break;
      case "grenade":
        this.spawnBullet({
          x: px,
          y: py,
          vx: Math.cos(aim) * 320,
          vy: Math.sin(aim) * 320,
          r: 8,
          damage: a.damage,
          ttl: a.duration,
          team: 0,
          pierce: 0,
          bounce: 1,
          homing: 0,
          explode: a.radius,
          split: 5,
          color: "#c45c3e",
          knock: 160,
          freeze: 0,
          burn: 8,
          poison: 0,
          chain: 0,
          lifesteal: 0,
          shock: 0,
          crit: false,
          fromBeam: false,
          element: "fire" as Element,
          pen: 0,
        });
        break;
      case "timestop":
        this.buffs.timestop = a.duration;
        break;
      case "orbitals":
        this.buffs.orbitals = a.duration;
        break;
      case "shield":
        this.buffs.shield = a.duration;
        this.player.invuln = Math.max(this.player.invuln, a.duration);
        break;
      case "blink": {
        const dist = 150;
        const nx = px + Math.cos(aim) * dist;
        const ny = py + Math.sin(aim) * dist;
        spawnParticle(this.particles, px, py, "#9eb4c4", "ring");
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius) this.hurtEnemy(e, a.damage, px, py, 80, 0, 0, 0, 0, 0, false);
        }
        const p = circleObstacles(nx, ny, PLAYER_R, this.room.obstacles);
        this.player.x = p.x;
        this.player.y = p.y;
        this.player.invuln = Math.max(this.player.invuln, 0.25);
        break;
      }
      case "drone":
        this.buffs.drone = a.duration;
        break;
      case "lightning": {
        let srcX = px;
        let srcY = py;
        let last: Enemy | null = null;
        for (let hop = 0; hop < 6; hop++) {
          let best: Enemy | null = null;
          let bestD = a.radius;
          for (const e of this.enemies) {
            if (!e.active || e === last) continue;
            const d = Math.hypot(e.x - srcX, e.y - srcY);
            if (d < bestD) {
              bestD = d;
              best = e;
            }
          }
          if (!best) break;
          this.hurtEnemy(best, a.damage * (1 - hop * 0.1), srcX, srcY, 30, 0, 0, 0, 0, 0, false, 0.6);
          spawnBolt(this.particles, srcX, srcY, best.x, best.y, "#c9c07a", 3);
          burst(this.particles, best.x, best.y, "#c9c07a", 8);
          srcX = best.x;
          srcY = best.y;
          last = best;
        }
        break;
      }
      case "well":
        this.buffs.well = {
          t: a.duration,
          x: px + Math.cos(aim) * 120,
          y: py + Math.sin(aim) * 120,
          r: a.radius,
          dmg: a.damage,
        };
        break;
      case "overclock":
        this.buffs.overclock = a.duration;
        break;
      case "mirror":
        this.buffs.mirror = a.duration;
        break;
      case "fireball": {
        this.spawnBullet({
          x: px,
          y: py,
          vx: Math.cos(aim) * 420,
          vy: Math.sin(aim) * 420,
          r: 7,
          damage: a.damage,
          ttl: 1.2,
          team: 0,
          pierce: 0,
          bounce: 0,
          homing: 0,
          explode: a.radius,
          split: 0,
          color: "#c45c3e",
          knock: 120,
          freeze: 0,
          burn: 8,
          poison: 0,
          chain: 0,
          lifesteal: 0,
          shock: 0,
          crit: false,
          fromBeam: false,
          element: "fire" as Element,
          pen: 0,
        });
        break;
      }
      case "frostnova":
        spawnParticle(this.particles, px, py, "#8fb4c8", "ring");
        burst(this.particles, px, py, "#8fb4c8", 16);
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 120, a.duration, 0, 0, 0, 0, false);
          }
        }
        break;
      case "poisonburst":
        spawnParticle(this.particles, px, py, "#7a9a72", "ring");
        burst(this.particles, px, py, "#7a9a72", 16);
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 60, 0, 0, a.duration, 0, 0, false);
          }
        }
        break;
      case "execute": {
        let target: Enemy | null = null;
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) > a.radius + e.r) continue;
          if (!target || e.hp < target.hp) target = e;
        }
        if (target) {
          this.hurtEnemy(target, a.damage, px, py, 200, 0, 0, 0, 0, 0, true);
          spawnParticle(this.particles, target.x, target.y, "#c45c3e", "ring");
        }
        break;
      }
      case "meteor": {
        const mx = px + Math.cos(aim) * 220;
        const my = py + Math.sin(aim) * 220;
        this.explodeAt(mx, my, a.radius, a.damage, "#c45c3e");
        spawnParticle(this.particles, mx, my, "#ffd76a", "ring");
        this.trauma(0.3);
        break;
      }
      case "volley":
        for (let i = 0; i < 8; i++) {
          const va = (i / 8) * Math.PI * 2;
          this.spawnBullet({
            x: px,
            y: py,
            vx: Math.cos(va) * 460,
            vy: Math.sin(va) * 460,
            r: 4,
            damage: a.damage,
            ttl: 0.8,
            team: 0,
            pierce: 0,
            bounce: 3,
            homing: 0,
            explode: 0,
            split: 0,
            color: "#d6dde4",
            knock: 60,
            freeze: 0,
            burn: 0,
            poison: 0,
            chain: 0,
            lifesteal: 0,
          shock: 0,
          crit: false,
          fromBeam: false,
          element: "kinetic" as Element,
          pen: 0,
        });
        }
        break;
      case "snipe":
        this.spawnBullet({
          x: px,
          y: py,
          vx: Math.cos(aim) * 1400,
          vy: Math.sin(aim) * 1400,
          r: 6,
          damage: a.damage,
          ttl: 1.5,
          team: 0,
          pierce: 99,
          bounce: 0,
          homing: 0,
          explode: 0,
          split: 0,
          color: "#d6dde4",
          knock: 200,
          freeze: 0,
          burn: 0,
          poison: 0,
          chain: 0,
          lifesteal: 0,
          shock: 0,
          crit: true,
          fromBeam: false,
          element: "kinetic" as Element,
          pen: 0.5,
        });
        break;
      case "shrapnel":
        for (let i = 0; i < 12; i++) {
          const sa = aim + (this.combatRng() - 0.5) * 0.7;
          const sp = 480 + this.combatRng() * 120;
          this.spawnBullet({
            x: px,
            y: py,
            vx: Math.cos(sa) * sp,
            vy: Math.sin(sa) * sp,
            r: 3.5,
            damage: a.damage,
            ttl: 0.6,
            team: 0,
            pierce: 1,
            bounce: 0,
            homing: 0,
            explode: 0,
            split: 0,
            color: "#c9a44a",
            knock: 80,
            freeze: 0,
            burn: 0,
            poison: 0,
            chain: 0,
            lifesteal: 0,
            shock: 0,
            crit: false,
            fromBeam: false,
            element: "kinetic" as Element,
            pen: 0,
          });
        }
        break;
      case "hail":
        for (let i = 0; i < 10; i++) {
          const ha = this.combatRng() * Math.PI * 2;
          this.spawnBullet({
            x: px,
            y: py,
            vx: Math.cos(ha) * 380,
            vy: Math.sin(ha) * 380,
            r: 4,
            damage: a.damage,
            ttl: 1,
            team: 0,
            pierce: 0,
            bounce: 0,
            homing: 0,
            explode: 0,
            split: 0,
            color: "#8fb4c8",
            knock: 40,
            freeze: 0.8,
            burn: 0,
            poison: 0,
            chain: 0,
            lifesteal: 0,
            shock: 0,
            crit: false,
            fromBeam: false,
            element: "ice" as Element,
            pen: 0,
          });
        }
        break;
      case "smokescreen":
        burst(this.particles, px, py, "#6a6e78", 20, "smoke");
        this.player.invuln = Math.max(this.player.invuln, 0.5);
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 60, 0, 0, 0, 0, 0, false);
            e.stun = Math.max(e.stun, a.duration);
          }
        }
        break;
      case "staticfield":
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 40, 0, 0, 0, 0, 0, false, 1);
            spawnBolt(this.particles, px, py, e.x, e.y, "#c9c07a");
          }
        }
        break;
      case "emp":
        spawnParticle(this.particles, px, py, "#c9c07a", "ring");
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 60, 0, 0, 0, 0, 0, false, 1);
          }
        }
        for (const b of this.bullets) {
          if (!b.active || b.team !== 1) continue;
          if (Math.hypot(b.x - px, b.y - py) < a.radius) {
            b.active = false;
            burst(this.particles, b.x, b.y, "#c9c07a", 3);
          }
        }
        break;
      case "thundercall": {
        const cands = this.enemies.filter((e) => e.active && Math.hypot(e.x - px, e.y - py) < a.radius);
        for (let i = 0; i < Math.min(5, cands.length); i++) {
          const t = cands[Math.floor(this.combatRng() * cands.length)]!;
          this.hurtEnemy(t, a.damage, t.x, t.y - 200, 40, 0, 0, 0, 0, 0, false, 0.5);
          spawnBolt(
            this.particles,
            t.x + (this.combatRng() - 0.5) * 60,
            t.y - 220,
            t.x,
            t.y,
            "#c9c07a",
            3.5,
          );
        }
        break;
      }
      case "lifedrain": {
        let drained = 0;
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            const before = e.hp;
            this.hurtEnemy(e, a.damage, px, py, 0, 0, 0, 0, 0, 0, false);
            drained += Math.max(0, before - e.hp);
          }
        }
        this.player.hp = clamp(this.player.hp + drained * 0.5, 0, this.player.maxHp);
        spawnParticle(this.particles, px, py, "#7a9a72", "ring");
        break;
      }
      case "bloodpact": {
        const cost = this.player.hp * 0.15;
        this.player.hp = Math.max(1, this.player.hp - cost);
        spawnParticle(this.particles, px, py, "#c45c3e", "ring");
        burst(this.particles, px, py, "#c45c3e", 24);
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 300, 0, 0, 0, 0, 0, false);
          }
        }
        this.trauma(0.35);
        break;
      }
      case "firestorm":
        spawnParticle(this.particles, px, py, "#c45c3e", "ring");
        burst(this.particles, px, py, "#c45c3e", 20);
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 80, 0, a.duration, 0, 0, 0, false);
          }
        }
        break;
      case "frostarmor":
        this.player.invuln = Math.max(this.player.invuln, a.duration);
        spawnParticle(this.particles, px, py, "#8fb4c8", "ring");
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 100, a.duration, 0, 0, 0, 0, false);
          }
        }
        break;
      case "bulwark":
        this.player.invuln = Math.max(this.player.invuln, a.duration);
        spawnParticle(this.particles, px, py, "#d6dde4", "ring");
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - px, e.y - py) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, px, py, 420, 0, 0, 0, 0, 0, false);
          }
        }
        break;
      case "shadowstep": {
        const dist = 170;
        const nx = px + Math.cos(aim) * dist;
        const ny = py + Math.sin(aim) * dist;
        spawnParticle(this.particles, px, py, "#7a7e9a", "ring");
        const p = circleObstacles(nx, ny, PLAYER_R, this.room.obstacles);
        this.player.x = p.x;
        this.player.y = p.y;
        this.player.invuln = Math.max(this.player.invuln, 0.4);
        spawnParticle(this.particles, p.x, p.y, "#7a7e9a", "ring");
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) < a.radius + e.r) {
            this.hurtEnemy(e, a.damage, p.x, p.y, 120, 0, 0, 0, 0, 0, false);
            e.stun = Math.max(e.stun, a.duration);
          }
        }
        break;
      }
      case "frenzy":
        this.buffs.overclock = a.duration;
        this.buffs.mirror = a.duration;
        spawnParticle(this.particles, px, py, "#c45c3e", "ring");
        this.trauma(0.25);
        break;
      case "guardian": {
        const dist = 120;
        const nx = px + Math.cos(aim) * dist;
        const ny = py + Math.sin(aim) * dist;
        spawnParticle(this.particles, px, py, "#9eb4c4", "ring");
        const p = circleObstacles(nx, ny, PLAYER_R, this.room.obstacles);
        this.player.x = p.x;
        this.player.y = p.y;
        this.buffs.mirror = a.duration;
        spawnParticle(this.particles, p.x, p.y, "#9eb4c4", "ring");
        break;
      }
      case "magnetize":
        for (const p of this.pickups) {
          if (!p.active) continue;
          p.x = px;
          p.y = py;
        }
        spawnParticle(this.particles, px, py, "#9eb4c4", "ring");
        break;
      case "repair":
        this.player.hp = clamp(this.player.hp + this.player.maxHp * 0.25, 0, this.player.maxHp);
        for (const sl of [0, 1] as const) {
          const w = this.weapons[sl];
          if (!w) continue;
          this.player.mag[sl] = this.magSizeOf(w);
          this.player.reload[sl] = 0;
        }
        sfxPlay.heal();
        spawnParticle(this.particles, px, py, "#5ea38a", "ring");
        break;
      case "fielddress": {
        this.player.hp = clamp(this.player.hp + this.player.maxHp * 0.4, 0, this.player.maxHp);
        const dashMax = Math.max(1, DASH_MAX + Math.round(this.passiveSum("dashBattery")) + this.mutDashBonus());
        this.player.dashCharges = dashMax;
        sfxPlay.heal();
        spawnParticle(this.particles, px, py, "#5ea38a", "ring");
        break;
      }
      case "detonator": {
        let lit = false;
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (e.burn > 0 || e.poison > 0) {
            e.burn = 0;
            e.poison = 0;
            this.hurtEnemy(e, a.damage, px, py, 150, 0, 0, 0, 0, 0, false);
            burst(this.particles, e.x, e.y, "#c45c3e", 8);
            lit = true;
          }
        }
        if (lit) spawnParticle(this.particles, px, py, "#c45c3e", "ring");
        break;
      }
    }
  }

  update(dtRaw: number, input: Actions, viewW: number, viewH: number) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.zoom = viewW < 520 ? 1.22 : viewW < 900 ? 1.08 : 1;
    if (this.paused || this.phase === "loot" || this.phase === "dead" || this.phase === "win") {
      this.cam.trauma *= 0.9;
      this.updateCamera(dtRaw);
      updateJuice(this.particles, this.floats, dtRaw);
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dtRaw;
      this.updateCamera(dtRaw);
      return;
    }
    const steps = Math.min(4, Math.floor(dtRaw / TICK) || 1);
    const dt = Math.min(dtRaw, 0.05) * this.timeScale;
    this.sim(dt, input);
    if (steps > 1) {
      /* already scaled */
    }
  }

  private sim(dt: number, input: Actions) {
    this.time += dt;
    this.sectorTime += dt;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    this.muzzle = Math.max(0, this.muzzle - dt);
    this.player.invuln = Math.max(0, this.player.invuln - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.player.fireCd = Math.max(0, this.player.fireCd - dt);
    this.player.burstCd = Math.max(0, this.player.burstCd - dt);
    if (this.echoQueue.length) {
      for (let i = this.echoQueue.length - 1; i >= 0; i--) {
        this.echoQueue[i]! -= dt;
        if (this.echoQueue[i]! <= 0) {
          this.echoQueue.splice(i, 1);
          this.fireWeapon(true);
        }
      }
    }

    for (const k of Object.keys(this.buffs) as (keyof Buffs)[]) {
      if (k === "well" || k === "orbitalAngle") continue;
      const v = this.buffs[k];
      if (typeof v === "number" && v > 0) (this.buffs[k] as number) = v - dt;
    }
    if (this.buffs.well) {
      this.buffs.well.t -= dt;
      if (this.buffs.well.t <= 0) this.buffs.well = null;
    }
    this.buffs.orbitalAngle += dt * 4.2;

    if (input.justSwap && this.weapons[1]) {
      this.player.slot = this.player.slot === 0 ? 1 : 0;
      sfxPlay.ui();
    }
    if (input.justAbility) this.castAbility();

    const dashMax = Math.max(1, DASH_MAX + Math.round(this.passiveSum("dashBattery")) + this.mutDashBonus());
    if (this.player.dashCharges < dashMax) {
      this.player.dashRe += dt;
      if (this.player.dashRe >= DASH_RECHARGE) {
        this.player.dashRe = 0;
        this.player.dashCharges += 1;
      }
    }
    // Regenerace: HP za sekundu (pasivka regen).
    const regen = this.passiveSum("regen");
    if (regen > 0) this.player.hp = clamp(this.player.hp + regen * dt, 0, this.player.maxHp);
    if (input.justDash && this.player.dashCharges > 0 && this.player.dashT <= 0) {
      this.player.dashCharges -= 1;
      this.player.dashT = DASH_TIME;
      this.player.invuln = Math.max(this.player.invuln, DASH_TIME);
      sfxPlay.dash();
      burst(this.particles, this.player.x, this.player.y, "#9eb4c4", 8, "smoke");
    }
    this.player.dashT = Math.max(0, this.player.dashT - dt);

    let aim = this.player.aim;
    if (input.useStickAim) aim = Math.atan2(input.aimStickY, input.aimStickX);
    else if (input.mouseInside) {
      const world = this.screenToWorld(input.mouseScreenX, input.mouseScreenY);
      aim = Math.atan2(world.y - this.player.y, world.x - this.player.x);
    }
    this.player.aim = aim;

    const speedMul = (1 + this.passiveSum("haste")) * mutMult(this.mutators, "moveSpeed") * (1 + this.codex.speedPct) * (this.player.dashT > 0 ? DASH_MULT : 1);
    const spd = PLAYER_SPEED * speedMul;
    let mx = input.moveX;
    let my = input.moveY;
    if (this.player.dashT > 0 && Math.hypot(mx, my) < 0.1) {
      mx = Math.cos(this.player.aim);
      my = Math.sin(this.player.aim);
    }
    this.player.vx = mx * spd;
    this.player.vy = my * spd;
    let nx = this.player.x + this.player.vx * dt;
    let ny = this.player.y + this.player.vy * dt;
    const p = circleObstacles(nx, ny, PLAYER_R, this.room.obstacles);
    this.player.x = p.x;
    this.player.y = p.y;

    const w = this.weapons[this.player.slot]!;
    const sl = this.player.slot;
    if (this.player.reload[sl]! > 0) {
      this.player.reload[sl]! -= dt;
      if (this.player.reload[sl]! <= 0) {
        this.player.mag[sl] = this.magSizeOf(w);
        this.player.reload[sl] = 0;
      }
    }
    if (w.archetype === "minigun") {
      if (input.fire) this.player.spin = Math.min(1, this.player.spin + dt / 0.7);
      else this.player.spin = Math.max(0, this.player.spin - dt / 0.5);
    }
    if (input.fire) this.fireWeapon();
    if (this.player.burstLeft > 0 && this.player.burstCd <= 0) {
      this.player.burstLeft -= 1;
      this.player.burstCd = 0.045;
      const savedCd = this.player.fireCd;
      this.player.fireCd = 0;
      const mag = this.player.mag[sl]!;
      this.fireWeapon();
      this.player.mag[sl] = mag;
      this.player.fireCd = savedCd;
    }

    if (this.phase === "combat") this.updateWaves(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateOrbitals(dt);
    this.updateDrone(dt);
    this.updateWell(dt);
    updateJuice(this.particles, this.floats, dt);
    this.updateCamera(dt);

    if (this.phase === "combat") {
      const alive = this.enemies.some((e) => e.active);
      const moreWaves = this.waveI < this.room.waves.length;
      if (!alive && !moreWaves && this.spawnedWave >= 0) {
        this.phase = "cleared";
        this.clearDelay = 0.55;
      }
    }
    if (this.phase === "cleared") {
      this.clearDelay -= dt;
      if (this.clearDelay <= 0) {
        this.generateLoot();
        this.phase = "loot";
        if (!this.room.isBoss) sfxPlay.waveClear();
      }
    }
  }

  private updateWaves(dt: number) {
    if (this.waveI >= this.room.waves.length) return;
    const any = this.enemies.some((e) => e.active);
    if (this.spawnedWave < this.waveI) {
      if (this.waveAwaitingStart) return; // čeká na potvrzení hráče
      this.waveT += dt;
      const wave = this.room.waves[this.waveI]!;
      if (this.waveT >= wave.delay) {
        this.spawnWave(wave);
        this.spawnedWave = this.waveI;
        this.waveT = 0;
        this.breakT = 0;
      }
    } else if (!any) {
      if (this.waveI + 1 >= this.room.waves.length) {
        // Poslední vlna — bez pauzy rovnou k vyhodnocení.
        this.waveI += 1;
        this.waveT = 0;
        this.breakT = 0;
      } else {
        // Pauza před další vlnou s odpočtem.
        if (this.breakT === 0) sfxPlay.waveIncoming();
        this.breakT += dt;
        if (this.breakT >= WAVE_BREAK) {
          this.waveI += 1;
          this.waveT = 0;
          this.breakT = 0;
        }
      }
    } else {
      this.breakT = 0;
    }
  }

  /** Odpočet do spawnu další vlny (spawn delay i pauza po vyčištění). 0 = boj. */
  waveCountdown(): number {
    if (this.waveI >= this.room.waves.length) return 0;
    if (this.spawnedWave < this.waveI) {
      if (this.waveAwaitingStart) return 0;
      return Math.max(0, this.room.waves[this.waveI]!.delay - this.waveT);
    }
    if (!this.enemies.some((e) => e.active) && this.waveI + 1 < this.room.waves.length) {
      return Math.max(0, WAVE_BREAK - this.breakT);
    }
    return 0;
  }

  /** Spustí čekající první vlnu místnosti na požádání hráče. Vrací false, pokud vlna už běží nebo neexistuje. */
  startWave(): boolean {
    if (this.waveI >= this.room.waves.length) return false;
    if (this.spawnedWave >= this.waveI) return false; // already spawned this wave
    const wave = this.room.waves[this.waveI]!;
    this.spawnWave(wave);
    this.spawnedWave = this.waveI;
    this.waveT = 0;
    this.breakT = 0;
    this.waveAwaitingStart = false;
    sfxPlay.waveIncoming();
    return true;
  }

  private updateEnemies(dt: number) {
    const slowMo = this.buffs.timestop > 0 ? 0.28 : 1;
    const px = this.player.x;
    const py = this.player.y;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!;
      if (!e.active) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.stun = Math.max(0, e.stun - dt);
      e.slow = Math.max(0, e.slow - dt);
      e.contact = Math.max(0, e.contact - dt);
      e.fragile = Math.max(0, e.fragile - dt);
      // Elementární synergie (docs/progression-rules.md §4) — před DoT poškozením.
      if (this.synergyUnlocked && e.hp > 0) {
        if (e.burn > 0 && e.poison > 0) {
          // Toxický výbuch: oba statusy se vymažou.
          this.noteCodex("synergy", "toxic");
          e.burn = 0;
          e.poison = 0;
          spawnParticle(this.particles, e.x, e.y, "#7a9a72", "ring");
          this.hurtEnemy(e, 25, e.x, e.y, 60, 0, 0, 0, 0, 0, false);
          if (!e.active) continue;
        }
        if (e.slow > 0 && e.stun > 0) {
          // Křehkost: +35 % dmg po 4 s.
          this.noteCodex("synergy", "fragile");
          e.fragile = Math.max(e.fragile, 4);
        }
        if (e.burn > 0 && e.slow > 0) {
          // Pára: slow se vymaže, 12 dmg okolí (bez sebe).
          this.noteCodex("synergy", "steam");
          e.slow = 0;
          spawnParticle(this.particles, e.x, e.y, "#8fb4c8", "ring");
          for (const o of this.enemies) {
            if (!o.active || o === e) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) < 90 + o.r) {
              this.hurtEnemy(o, 12, e.x, e.y, 30, 0, 0, 0, 0, 0, false);
            }
          }
        }
      }
      if (e.burn > 0) {
        e.burn -= dt;
        e.hp -= 9 * dt;
        if (e.hp <= 0) this.killEnemy(e);
      }
      if (e.poison > 0) {
        e.poison -= dt;
        e.hp -= 7 * dt;
        if (e.hp <= 0) this.killEnemy(e);
      }
      if (e.stun > 0) continue;
      // Fáze bosse (progression-rules §5.1).
      if (e.kind === "boss" && e.active) {
        const next: BossPhase = bossPhaseFor(e.hp / e.maxHp);
        if (next > e.phase) {
          const prev = BOSS_PHASE_STATS[(e.phase || 1) as BossPhase];
          e.phase = next;
          e.speed *= BOSS_PHASE_STATS[next].speedMult / prev.speedMult;
          e.fireCd = Math.min(e.fireCd, 0.4);
          burst(this.particles, e.x, e.y, "#c45c3e", 24, "debris");
          const p = spawnEdge(this.combatRng, this.room.obstacles);
          e.x = p.x;
          e.y = p.y;
          spawnParticle(this.particles, e.x, e.y, "#c45c3e", "ring");
          for (const add of BOSS_PHASE_ADDS[next]) {
            for (let i = 0; i < add.count; i++) {
              this.spawnEnemy(add.kind, e.x + (i - add.count / 2) * 36, e.y + 30);
            }
          }
          spawnFloater(this.floats, e.x, e.y - e.r - 10, BOSS_PHASE_NAMES[next].toUpperCase(), "#c45c3e", true);
          sfxPlay.bossRoar();
          this.trauma(0.35);
        }
      }
      const ts = slowMo * (e.slow > 0 ? 0.45 : 1);
      let ax = px - e.x;
      let ay = py - e.y;
      const dist = Math.hypot(ax, ay) || 1;
      ax /= dist;
      ay /= dist;
      let sepX = 0;
      let sepY = 0;
      for (let j = 0; j < this.enemies.length; j++) {
        const o = this.enemies[j]!;
        if (!o.active || o === e) continue;
        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < e.r + o.r + 16) {
          sepX += dx / d;
          sepY += dy / d;
        }
      }
      let wantRange = ENEMY_RANGED[e.kind]?.want ?? 0;
      if (e.kind === "boss") wantRange = 160;
      let mx = ax;
      let my = ay;
      if (wantRange && dist < wantRange) {
        mx = -ax;
        my = -ay;
      }
      // Výpad (rusher, čepel, nosorožec, kopí) — profil z ENEMY_CHARGE.
      const charge = ENEMY_CHARGE[e.kind];
      if (charge) {
        e.charge += dt;
        if (e.charge > charge.time && dist < charge.range) {
          e.charge = 0;
          e.vx = ax * charge.speed;
          e.vy = ay * charge.speed;
        }
      }
      // Medik: léčí zraněné spojence v okolí (časovač v e.charge).
      if (e.kind === "medik") {
        e.charge += dt;
        if (e.charge > 2.2) {
          e.charge = 0;
          let healed = false;
          for (const o of this.enemies) {
            if (!o.active || o === e || o.hp >= o.maxHp) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) < 200) {
              o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.08);
              healed = true;
            }
          }
          if (healed) {
            burst(this.particles, e.x, e.y, "#7aba8a", 8);
            spawnParticle(this.particles, e.x, e.y, "#7aba8a", "ring");
          }
        }
      }
      // Matka: líhne lezce, dokud není přetlak (časovač v e.charge).
      if (e.kind === "matka") {
        e.charge += dt;
        if (e.charge > 3.5) {
          e.charge = 0;
          const alive = this.enemies.filter((o) => o.active).length;
          if (alive < 45) {
            for (let i = 0; i < 2; i++) this.spawnEnemy("lezec", e.x + (i ? 24 : -24), e.y);
            burst(this.particles, e.x, e.y, "#7a5a6e", 10);
          }
        }
      }
      const spd = e.speed * ts;
      e.vx += (mx * spd + sepX * 40 - e.vx) * Math.min(1, 6 * dt);
      e.vy += (my * spd + sepY * 40 - e.vy) * Math.min(1, 6 * dt);
      let nx = e.x + e.vx * dt;
      let ny = e.y + e.vy * dt;
      const resolved = circleObstacles(nx, ny, e.r, this.room.obstacles);
      e.x = resolved.x;
      e.y = resolved.y;

      e.fireCd -= dt * ts;
      // Střelba dle ENEMY_RANGED (kanónýr, ostrostřelec, jiskra…); boss má fáze.
      const ranged = ENEMY_RANGED[e.kind];
      const shoot = e.kind === "boss" ? dist < 480 : ranged ? dist < ranged.max : false;
      if (shoot && e.fireCd <= 0) {
        const bossStats = e.kind === "boss" ? BOSS_PHASE_STATS[(e.phase || 1) as BossPhase] : null;
        e.fireCd = bossStats ? bossStats.fireCd : (ranged?.cd ?? 1.05);
        if (this.combatRng() < 0.35) sfxPlay.enemyShoot();
        const shots = bossStats ? bossStats.shots : (ranged?.shots ?? 1);
        // Ostrostřelci míří s předstihem pohybu hráče (pevný progress).
        const leads = e.kind === "sniper" || e.kind === "ostrostrelec";
        const spdB = ranged?.speed ?? 210;
        const flight = dist / Math.max(120, spdB);
        const tx = leads ? px + this.player.vx * flight : px;
        const ty = leads ? py + this.player.vy * flight : py;
        for (let s = 0; s < shots; s++) {
          const a = Math.atan2(ty - e.y, tx - e.x) + (shots > 1 ? (s / shots) * Math.PI * 2 : (this.combatRng() - 0.5) * 0.08);
          this.spawnBullet({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * spdB,
            vy: Math.sin(a) * spdB,
            r: e.kind === "boss" ? 5 : (ranged?.size ?? 4),
            damage: (enemyStatsAt(e.kind, this.level, this.room.isElite).bullet ?? 8 * difficultyForLevel(this.level).dmgMult) * e.dmgMult,
            ttl: 2.2,
            team: 1,
            pierce: 0,
            bounce: 0,
            homing: 0,
            explode: 0,
            split: 0,
            color: "#c45c3e",
            knock: 40,
            freeze: 0,
            burn: 0,
            poison: 0,
            chain: 0,
            lifesteal: 0,
            shock: 0,
            crit: false,
            fromBeam: false,
            element: "kinetic" as Element,
            pen: 0,
          });
        }
      }
      // Sebevrah vybuchne u hráče (poloměr dle ENEMY_BLAST); smrt řeší killEnemy.
      const suicide = ENEMY_BLAST[e.kind];
      if (suicide && dist < suicide.r * 0.5) {
        this.killEnemy(e);
        this.hurtPlayer(enemyStatsAt(e.kind, this.level, this.room.isElite).contact * e.dmgMult);
      } else if (dist < e.r + PLAYER_R && e.contact <= 0) {
        e.contact = 0.45;
        this.hurtPlayer(enemyStatsAt(e.kind, this.level, this.room.isElite).contact * e.dmgMult);
      }
    }
  }

  private updateBullets(dt: number) {
    const slowMo = this.buffs.timestop > 0 ? 0.28 : 1;
    for (const b of this.bullets) {
      if (!b.active) continue;
      const tdt = b.team === 1 ? dt * slowMo : dt;
      b.ttl -= tdt;
      if (b.ttl <= 0) {
        if (b.explode > 0 && b.team === 0) this.explodeAt(b.x, b.y, b.explode, b.damage * 0.8, b.color);
        b.active = false;
        continue;
      }
      if (b.homing > 0 && b.team === 0) {
        let best: Enemy | null = null;
        let bestD = 220;
        for (const e of this.enemies) {
          if (!e.active) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < bestD) {
            bestD = d;
            best = e;
          }
        }
        if (best) {
          const a = Math.atan2(best.y - b.y, best.x - b.x);
          const spd = Math.hypot(b.vx, b.vy);
          const ca = Math.atan2(b.vy, b.vx);
          let da = a - ca;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          const na = ca + clamp(da, -b.homing * tdt, b.homing * tdt);
          b.vx = Math.cos(na) * spd;
          b.vy = Math.sin(na) * spd;
        }
      }
      b.x += b.vx * tdt;
      b.y += b.vy * tdt;
      const bounced = reflect(b.x, b.y, b.vx, b.vy, b.r, this.room.obstacles);
      if (bounced.vx !== b.vx || bounced.vy !== b.vy) {
        if (b.bounce > 0) {
          b.bounce -= 1;
          b.vx = bounced.vx;
          b.vy = bounced.vy;
        } else {
          if (b.explode > 0 && b.team === 0) this.explodeAt(b.x, b.y, b.explode, b.damage * 0.8, b.color);
          b.active = false;
          continue;
        }
      }
      if (b.x < WALL - 20 || b.y < WALL - 20 || b.x > ROOM_W - WALL + 20 || b.y > ROOM_H - WALL + 20) {
        b.active = false;
        continue;
      }
      if (b.team === 0) {
        for (const e of this.enemies) {
          if (!e.active) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
            this.shotsHit += 1;
            this.hurtEnemy(e, b.damage, b.x, b.y, b.knock, b.freeze, b.burn, b.poison, b.chain, b.lifesteal, b.crit, b.shock, b.pen);
            if (b.split > 0) {
              for (let i = 0; i < Math.min(4, b.split); i++) {
                const a = Math.random() * Math.PI * 2;
                this.spawnBullet({
                  ...b,
                  vx: Math.cos(a) * 280,
                  vy: Math.sin(a) * 280,
                  r: b.r * 0.7,
                  damage: b.damage * 0.45,
                  ttl: 0.35,
                  pierce: 0,
                  split: 0,
                  explode: 0,
                  chain: 0,
                });
              }
            }
            if (b.explode > 0) this.explodeAt(b.x, b.y, b.explode, b.damage * 0.65, b.color);
            if (b.pierce > 0) b.pierce -= 1;
            else {
              b.active = false;
              break;
            }
          }
        }
      } else if (Math.hypot(this.player.x - b.x, this.player.y - b.y) < PLAYER_R + b.r) {
        if (this.buffs.shield > 0) {
          b.team = 0;
          b.vx *= -1.2;
          b.vy *= -1.2;
          b.color = "#d6dde4";
        } else {
          this.hurtPlayer(b.damage);
          b.active = false;
        }
      }
    }
  }

  private updatePickups(dt: number) {
    const mag = MAGNET_R + this.passiveSum("magnet");
    for (const p of this.pickups) {
      if (!p.active) continue;
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < mag) {
        p.x += (dx / (d || 1)) * 260 * dt;
        p.y += (dy / (d || 1)) * 260 * dt;
      }
      if (d < PLAYER_R + 10) {
        p.active = false;
        sfxPlay.pickup();
        if (p.kind === "hp") this.player.hp = clamp(this.player.hp + 18, 0, this.player.maxHp);
        else {
          const sl = this.player.slot;
          this.player.mag[sl] = this.magSizeOf(this.weapons[sl]!);
          this.player.reload[sl] = 0;
        }
      }
    }
  }

  private updateOrbitals(dt: number) {
    if (this.buffs.orbitals <= 0) return;
    const n = 3;
    const r = this.ability.kind === "orbitals" ? this.ability.radius : 56;
    for (let i = 0; i < n; i++) {
      const a = this.buffs.orbitalAngle + (i / n) * Math.PI * 2;
      const x = this.player.x + Math.cos(a) * r;
      const y = this.player.y + Math.sin(a) * r;
      for (const e of this.enemies) {
        if (!e.active) continue;
        if (Math.hypot(e.x - x, e.y - y) < e.r + 10) {
          this.hurtEnemy(e, (this.ability.damage || 14) * dt * 8, x, y, 20, 0, 0, 0, 0, 0, false);
        }
      }
    }
  }

  private updateDrone(dt: number) {
    if (this.buffs.drone <= 0) return;
    this.buffs.droneCd -= dt;
    if (this.buffs.droneCd > 0) return;
    this.buffs.droneCd = 0.22;
    let best: Enemy | null = null;
    let bestD = 400;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) return;
    const a = Math.atan2(best.y - this.player.y, best.x - this.player.x);
    this.spawnBullet({
      x: this.player.x + Math.cos(this.buffs.orbitalAngle) * 22,
      y: this.player.y + Math.sin(this.buffs.orbitalAngle) * 22,
      vx: Math.cos(a) * 520,
      vy: Math.sin(a) * 520,
      r: 3,
      damage: this.ability.damage || 10,
      ttl: 0.9,
      team: 0,
      pierce: 0,
      bounce: 0,
      homing: 3,
      explode: 0,
      split: 0,
      color: "#9eb4c4",
      knock: 20,
      freeze: 0,
      burn: 0,
      poison: 0,
      chain: 0,
      lifesteal: 0,
      shock: 0,
      crit: false,
      fromBeam: false,
      element: "shock" as Element,
      pen: 0,
    });
  }

  private updateWell(dt: number) {
    const w = this.buffs.well;
    if (!w) return;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = w.x - e.x;
      const dy = w.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < w.r) {
        e.x += (dx / (d || 1)) * 140 * dt;
        e.y += (dy / (d || 1)) * 140 * dt;
        e.hp -= w.dmg * dt;
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
  }

  private updateCamera(dt: number) {
    const look = 70;
    const tx = this.player.x + Math.cos(this.player.aim) * look * 0.35;
    const ty = this.player.y + Math.sin(this.player.aim) * look * 0.35;
    const k = 1 - Math.exp(-7 * dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.trauma = Math.max(0, this.cam.trauma - dt * 1.8);
    const shake = this.cam.trauma * this.cam.trauma;
    this.shakeX = (this.combatRng() * 2 - 1) * 14 * shake;
    this.shakeY = (this.combatRng() * 2 - 1) * 14 * shake;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.viewW / 2 - this.shakeX) / this.zoom + this.cam.x,
      y: (sy - this.viewH / 2 - this.shakeY) / this.zoom + this.cam.y,
    };
  }

  getSpeed(): number {
    return Math.hypot(this.player.vx, this.player.vy);
  }
}

export type { Rarity };

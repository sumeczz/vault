/**
 * Kodex — sbírka všeho, co lze ve hře potkat a sebrat.
 * Pravidla docs/progression-rules.md §18.
 *
 * Každá odemčená položka přidává minimální trvalou hodnotu ke statistikám
 * postavy (součet se aplikuje při startu běhu). Zamčené položky se v UI
 * ukazují jako ??? — hráč vždy vidí, co ještě chybí.
 */
import { DEFAULT_ABILITY_DEFS, DEFAULT_PASSIVE_DEFS } from "./abilities";
import { ELITE_AFFIXES, ENEMY_ATTACK, ENEMY_ATTACK_LABEL, ENEMY_NAME, ENEMY_ORDER } from "./bestiary";
import { MUTATORS } from "./mutators";
import { DEFAULT_UNIQUES, DEFAULT_WEAPON_DEFS } from "./weapons";
import { ARCHETYPE_LABEL, type EnemyKind } from "./types";
import { ANOMALIES, SECTOR_MODS } from "./expedition";

export type CodexCategory =
  | "enemy"
  | "affix"
  | "synergy"
  | "unique"
  | "archetype"
  | "ability"
  | "passive"
  | "mutator"
  | "anomaly"
  | "portal";

export type CodexBonus = {
  /** Ploché max HP. */
  hp: number;
  /** Procentní bonus poškození (0.01 = +1 %). */
  dmgPct: number;
  /** Procentní bonus rychlosti pohybu. */
  speedPct: number;
  /** Plošný bonus kritické šance (0.001 = +0,1 %). */
  crit: number;
};

export type CodexEntry = {
  cat: CodexCategory;
  id: string;
  name: string;
  desc: string;
  bonus: CodexBonus;
};

export const CODEX_CATEGORIES: { id: CodexCategory; name: string }[] = [
  { id: "enemy", name: "Nepřátelé" },
  { id: "affix", name: "Elitní affixy" },
  { id: "synergy", name: "Synergie" },
  { id: "unique", name: "Unikátní zbraně" },
  { id: "archetype", name: "Archetypy" },
  { id: "ability", name: "Schopnosti" },
  { id: "passive", name: "Pasivky" },
  { id: "mutator", name: "Mutátory" },
  { id: "anomaly", name: "Anomálie" },
  { id: "portal", name: "Portály" },
];

const NO_BONUS: CodexBonus = { hp: 0, dmgPct: 0, speedPct: 0, crit: 0 };

function bonus(partial: Partial<CodexBonus>): CodexBonus {
  return { ...NO_BONUS, ...partial };
}

export type SynergyId = "toxic" | "fragile" | "steam";

export const SYNERGIES: { id: SynergyId; name: string; desc: string }[] = [
  { id: "toxic", name: "Toxický výbuch", desc: "burn + poison" },
  { id: "fragile", name: "Křehkost", desc: "mráz + šok" },
  { id: "steam", name: "Pára", desc: "burn + mráz" },
];

/** Všechny položky kodexu — jediný zdroj pravdy pro sbírku i bonusy. */
export function codexEntries(): CodexEntry[] {
  const out: CodexEntry[] = [];
  for (const id of ENEMY_ORDER) {
    const name = ENEMY_NAME[id];
    out.push({
      cat: "enemy",
      id,
      name,
      desc: id === "boss" ? "Poraž bosse sektoru" : `Zabij tohoto nepřítele (útok: ${ENEMY_ATTACK_LABEL[ENEMY_ATTACK[id]]})`,
      bonus: bonus({ hp: 2 }),
    });
  }
  for (const a of ELITE_AFFIXES) {
    out.push({ cat: "affix", id: a.id, name: a.name, desc: a.desc, bonus: bonus({ dmgPct: 0.005 }) });
  }
  for (const s of SYNERGIES) {
    out.push({ cat: "synergy", id: s.id, name: s.name, desc: s.desc, bonus: bonus({ dmgPct: 0.01 }) });
  }
  for (const u of DEFAULT_UNIQUES) {
    // Generované zbraně mají náhodné id — párujeme jménem, které je unikátní.
    out.push({ cat: "unique", id: u.name, name: u.name, desc: "Seber tuto zbraň", bonus: bonus({ hp: 1 }) });
  }
  const seenArchetypes = new Set<string>();
  for (const w of DEFAULT_WEAPON_DEFS) {
    if (seenArchetypes.has(w.archetype)) continue;
    seenArchetypes.add(w.archetype);
    const label = ARCHETYPE_LABEL[w.archetype];
    out.push({
      cat: "archetype",
      id: w.archetype,
      name: label.name,
      desc: "Zabíjej touto zbraní v ruce",
      bonus: bonus({ dmgPct: 0.005 }),
    });
  }
  for (const a of DEFAULT_ABILITY_DEFS) {
    out.push({ cat: "ability", id: a.kind, name: a.names[0]!, desc: a.desc, bonus: bonus({ hp: 1 }) });
  }
  for (const p of DEFAULT_PASSIVE_DEFS) {
    out.push({ cat: "passive", id: p.kind, name: p.name, desc: p.descTemplate, bonus: bonus({ speedPct: 0.0025 }) });
  }
  for (const m of MUTATORS) {
    out.push({ cat: "mutator", id: m.id, name: m.name, desc: m.desc, bonus: bonus({ hp: 0.5 }) });
  }
  for (const a of ANOMALIES) {
    out.push({ cat: "anomaly", id: a.id, name: a.name, desc: a.desc, bonus: bonus({ hp: 1 }) });
  }
  for (const p of SECTOR_MODS) {
    out.push({ cat: "portal", id: p.id, name: p.name, desc: p.desc, bonus: bonus({ dmgPct: 0.01 }) });
  }
  return out;
}

const CODEX_STORAGE_KEY = "vaultbreak.codex.v1";
const ENEMY_KNOWLEDGE_STORAGE_KEY = "vaultbreak.codex.enemy-knowledge.v1";

export const ENEMY_KNOWLEDGE_THRESHOLDS = [1, 10, 50, 200, 750, 2000] as const;
export const ENEMY_KNOWLEDGE_LABELS = [
  "První kontakt",
  "Pozorovaný",
  "Studovaný",
  "Analyzovaný",
  "Zmapovaný",
  "Dokonale známý",
] as const;

export type EnemyKnowledgeProgress = {
  kills: number;
  level: number;
  label: string;
  currentThreshold: number;
  nextThreshold: number | null;
  percent: number;
  maxed: boolean;
};

export type EnemyKnowledgeState = {
  kills: Record<EnemyKind, number>;
  prestigeAwarded: EnemyKind[];
  prestigePoints: number;
};

function entryKey(cat: CodexCategory, id: string): string {
  return `${cat}:${id}`;
}

/** Množina odemčených položek jako `kategorie:id`. */
export function loadCodex(): Set<string> {
  try {
    const raw = localStorage.getItem(CODEX_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeCodex(set: Set<string>): void {
  try {
    localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota */
  }
}

function isEnemyKind(value: string): value is EnemyKind {
  return ENEMY_ORDER.some((kind) => kind === value);
}

export function loadEnemyKnowledge(): EnemyKnowledgeState {
  const kills = Object.fromEntries(ENEMY_ORDER.map((kind) => [kind, 0])) as Record<EnemyKind, number>;
  let prestigeAwarded: EnemyKind[] = [];
  try {
    const raw = localStorage.getItem(ENEMY_KNOWLEDGE_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const data = parsed as { kills?: unknown; prestigeAwarded?: unknown };
        if (data.kills && typeof data.kills === "object" && !Array.isArray(data.kills)) {
          for (const kind of ENEMY_ORDER) {
            const value = (data.kills as Record<string, unknown>)[kind];
            if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) kills[kind] = value;
          }
        }
        if (Array.isArray(data.prestigeAwarded)) {
          prestigeAwarded = [...new Set(data.prestigeAwarded.filter(
            (kind): kind is EnemyKind => typeof kind === "string" && isEnemyKind(kind),
          ))];
        }
      }
    }
  } catch {
    /* Corrupt or unavailable local storage starts with an empty journal. */
  }
  return { kills, prestigeAwarded, prestigePoints: prestigeAwarded.length };
}

function writeEnemyKnowledge(state: EnemyKnowledgeState): void {
  try {
    localStorage.setItem(ENEMY_KNOWLEDGE_STORAGE_KEY, JSON.stringify({
      kills: state.kills,
      prestigeAwarded: state.prestigeAwarded,
    }));
  } catch {
    /* Keep codex storage behavior consistent when local storage is unavailable. */
  }
}

export function enemyKnowledgeProgress(kills: number): EnemyKnowledgeProgress {
  const safeKills = Number.isSafeInteger(kills) && kills > 0 ? kills : 0;
  let level = 0;
  for (const threshold of ENEMY_KNOWLEDGE_THRESHOLDS) {
    if (safeKills < threshold) break;
    level += 1;
  }
  const currentThreshold = level === 0 ? 0 : ENEMY_KNOWLEDGE_THRESHOLDS[level - 1]!;
  const nextThreshold = ENEMY_KNOWLEDGE_THRESHOLDS[level] ?? null;
  const percent = nextThreshold === null
    ? 100
    : Math.max(0, Math.min(100, ((safeKills - currentThreshold) / Math.max(1, nextThreshold - currentThreshold)) * 100));
  return {
    kills: safeKills,
    level,
    label: level === 0 ? "Nezaznamenán" : ENEMY_KNOWLEDGE_LABELS[level - 1]!,
    currentThreshold,
    nextThreshold,
    percent,
    maxed: nextThreshold === null,
  };
}

export function recordEnemyKill(kind: EnemyKind): { progress: EnemyKnowledgeProgress; prestigeAwarded: boolean } {
  const state = loadEnemyKnowledge();
  state.kills[kind] += 1;
  const progress = enemyKnowledgeProgress(state.kills[kind]);
  const prestigeAwarded = progress.maxed && !state.prestigeAwarded.includes(kind);
  if (prestigeAwarded) state.prestigeAwarded.push(kind);
  writeEnemyKnowledge(state);
  return { progress, prestigeAwarded };
}

/**
 * Odemkne položku. Vrací true, pokud je nová (tehdy UI může ukázat hlášku).
 */
export function unlockCodex(cat: CodexCategory, id: string): boolean {
  const set = loadCodex();
  const key = entryKey(cat, id);
  if (set.has(key)) return false;
  set.add(key);
  writeCodex(set);
  return true;
}

/** Součet permanentních bonusů ze zadané (typicky odemčené) množiny. */
export function codexBonus(unlocked: Set<string>, entries?: CodexEntry[]): CodexBonus {
  const list = entries ?? codexEntries();
  const total = bonus({});
  for (const e of list) {
    if (!unlocked.has(entryKey(e.cat, e.id))) continue;
    total.hp += e.bonus.hp;
    total.dmgPct += e.bonus.dmgPct;
    total.speedPct += e.bonus.speedPct;
    total.crit += e.bonus.crit;
  }
  // Zaokrouhli plovoucí součty, ať se nešíří 0.30000000000000004.
  total.dmgPct = Math.round(total.dmgPct * 10000) / 10000;
  total.speedPct = Math.round(total.speedPct * 10000) / 10000;
  total.crit = Math.round(total.crit * 10000) / 10000;
  total.hp = Math.round(total.hp * 10) / 10;
  return total;
}
/** Počet odemčených z celkového počtu — pro postup a achievementy. */
export function codexProgress(unlocked?: Set<string>, entries?: CodexEntry[]): { done: number; total: number } {
  const list = entries ?? codexEntries();
  const set = unlocked ?? loadCodex();
  let done = 0;
  for (const e of list) if (set.has(entryKey(e.cat, e.id))) done += 1;
  return { done, total: list.length };
}

/** Lidský popis bonusu položky — pro toasty, kodex i panel postavy. */
export function formatCodexBonus(b: CodexBonus): string {
  const pct = (v: number) => `${(Math.round(v * 10000) / 100).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} %`;
  const parts: string[] = [];
  if (b.hp !== 0) parts.push(`+${b.hp} max HP`);
  if (b.dmgPct !== 0) parts.push(`+${pct(b.dmgPct)} poškození`);
  if (b.speedPct !== 0) parts.push(`+${pct(b.speedPct)} rychlost`);
  if (b.crit !== 0) parts.push(`+${pct(b.crit)} kritik`);
  return parts.length > 0 ? parts.join(" · ") : "bez bonusu";
}

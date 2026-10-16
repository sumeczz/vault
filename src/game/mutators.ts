/**
 * Kolo štěstí — pravidla docs/progression-rules.md §15.
 * Před každým sektorem se ze seedu + čísla sektoru deterministicky vylosují
 * 3 různé mutátory (pool 16 kladných + 16 záporných), každý s losovanou
 * hodnotou z rozsahu. Mutátory jsou aura hráče platná jen pro daný sektor.
 * Stejný seed + stejný sektor = stejné mutátory (ochrana proti farmení).
 */

export type MutEffect =
  | "moveSpeed"
  | "maxHp"
  | "armor"
  | "rpm"
  | "crit"
  | "lifesteal"
  | "damage"
  | "reload"
  | "mag"
  | "range"
  | "spread"
  | "scrap"
  | "dash";

export type MutPolarity = "plus" | "minus";

export type MutatorDef = {
  id: string;
  name: string;
  /** Popis s placeholderem {value}. */
  desc: string;
  polarity: MutPolarity;
  effect: MutEffect;
  /** "mult" = násobič základu (1±v), "add" = přičtení (HP, dash). */
  kind: "mult" | "add";
  /** Rozsah losované hodnoty (kladná velikost; znaménko dává polarita). */
  range: [number, number];
  /** Jak se hodnota formátuje do popisu. */
  format: "percent" | "integer";
};

/** Délka animace točení v popupu, ms (pravidla §15). */
export const WHEEL_SPIN_MS = 7500;

export type RolledMutator = {
  id: string;
  name: string;
  desc: string;
  polarity: MutPolarity;
  effect: MutEffect;
  kind: "mult" | "add";
  /** Podepsaná hodnota: mult jako zlomek (např. +0.12 / −0.15), add absolutně. */
  value: number;
};

export const MUTATORS: MutatorDef[] = [
  // Kladné (12)
  { id: "adrenalin", name: "Adrenalin", desc: "+{value} rychlost pohybu", polarity: "plus", effect: "moveSpeed", kind: "mult", range: [0.08, 0.15], format: "percent" },
  { id: "krvezniznivost", name: "Krvežíznivost", desc: "+{value} vysátí ke všem zbraním", polarity: "plus", effect: "lifesteal", kind: "mult", range: [0.03, 0.06], format: "percent" },
  { id: "kevlar", name: "Kevlar", desc: "+{value} armor", polarity: "plus", effect: "armor", kind: "mult", range: [0.08, 0.15], format: "percent" },
  { id: "pretaktovani", name: "Přetaktování", desc: "+{value} kadence", polarity: "plus", effect: "rpm", kind: "mult", range: [0.1, 0.2], format: "percent" },
  { id: "ostre-oci", name: "Ostré oči", desc: "+{value} kritická šance", polarity: "plus", effect: "crit", kind: "mult", range: [0.08, 0.15], format: "percent" },
  { id: "velke-kapsy", name: "Velké kapsy", desc: "+{value} velikost zásobníku", polarity: "plus", effect: "mag", kind: "mult", range: [0.2, 0.4], format: "percent" },
  { id: "druhy-dech", name: "Druhý dech", desc: "+{value} max HP", polarity: "plus", effect: "maxHp", kind: "add", range: [20, 40], format: "integer" },
  { id: "rychle-ruce", name: "Rychlé ruce", desc: "−{value} čas přebíjení", polarity: "plus", effect: "reload", kind: "mult", range: [0.15, 0.25], format: "percent" },
  { id: "demolice", name: "Demolice", desc: "+{value} poškození", polarity: "plus", effect: "damage", kind: "mult", range: [0.1, 0.2], format: "percent" },
  { id: "ostrostrelec", name: "Ostrostřelec", desc: "+{value} dostřel", polarity: "plus", effect: "range", kind: "mult", range: [0.2, 0.5], format: "percent" },
  { id: "zlatokopectvi", name: "Zlatokopectví", desc: "+{value} šrot z lootu", polarity: "plus", effect: "scrap", kind: "mult", range: [0.2, 0.4], format: "percent" },
  { id: "kluzak", name: "Kluzák", desc: "+{value} dash nabití", polarity: "plus", effect: "dash", kind: "add", range: [1, 1], format: "integer" },
  { id: "kofein", name: "Kofein", desc: "+{value} kadence", polarity: "plus", effect: "rpm", kind: "mult", range: [0.06, 0.12], format: "percent" },
  { id: "dravost", name: "Dravost", desc: "+{value} poškození", polarity: "plus", effect: "damage", kind: "mult", range: [0.06, 0.12], format: "percent" },
  { id: "lehky-krok", name: "Lehký krok", desc: "+{value} rychlost pohybu", polarity: "plus", effect: "moveSpeed", kind: "mult", range: [0.05, 0.1], format: "percent" },
  { id: "stastna-ruka", name: "Šťastná ruka", desc: "+{value} kritická šance", polarity: "plus", effect: "crit", kind: "mult", range: [0.05, 0.1], format: "percent" },
  // Záporné (12)
  { id: "olovo", name: "Olověné boty", desc: "−{value} rychlost pohybu", polarity: "minus", effect: "moveSpeed", kind: "mult", range: [0.08, 0.15], format: "percent" },
  { id: "krehke-kosti", name: "Křehké kosti", desc: "+{value} utržené poškození", polarity: "minus", effect: "armor", kind: "mult", range: [0.08, 0.15], format: "percent" },
  { id: "kratkozrakost", name: "Krátkozrakost", desc: "−{value} dostřel", polarity: "minus", effect: "range", kind: "mult", range: [0.3, 0.5], format: "percent" },
  { id: "tezke-ruce", name: "Těžké ruce", desc: "+{value} čas přebíjení", polarity: "minus", effect: "reload", kind: "mult", range: [0.15, 0.3], format: "percent" },
  { id: "rozptyl", name: "Roztřesené ruce", desc: "+{value} rozptyl", polarity: "minus", effect: "spread", kind: "mult", range: [0.2, 0.4], format: "percent" },
  { id: "uzke-kapsy", name: "Úzké kapsy", desc: "−{value} velikost zásobníku", polarity: "minus", effect: "mag", kind: "mult", range: [0.2, 0.3], format: "percent" },
  { id: "tupa-cepel", name: "Tupá čepel", desc: "−{value} poškození", polarity: "minus", effect: "damage", kind: "mult", range: [0.08, 0.15], format: "percent" },
  { id: "netrpelivost", name: "Netrpělivost", desc: "−{value} kadence", polarity: "minus", effect: "rpm", kind: "mult", range: [0.1, 0.2], format: "percent" },
  { id: "smula", name: "Smůla", desc: "−{value} kritická šance", polarity: "minus", effect: "crit", kind: "mult", range: [0.08, 0.15], format: "percent" },
  { id: "prazdna-penezenka", name: "Prázdná peněženka", desc: "−{value} šrot z lootu", polarity: "minus", effect: "scrap", kind: "mult", range: [0.2, 0.4], format: "percent" },
  { id: "slabe-srdce", name: "Slabé srdce", desc: "−{value} max HP", polarity: "minus", effect: "maxHp", kind: "add", range: [15, 30], format: "integer" },
  { id: "tezke-vybaveni", name: "Těžké vybavení", desc: "−{value} dash nabití", polarity: "minus", effect: "dash", kind: "add", range: [1, 1], format: "integer" },
  { id: "ztuhle-klouby", name: "Ztuhlé klouby", desc: "−{value} kadence", polarity: "minus", effect: "rpm", kind: "mult", range: [0.06, 0.12], format: "percent" },
  { id: "tezka-hlava", name: "Těžká hlava", desc: "−{value} poškození", polarity: "minus", effect: "damage", kind: "mult", range: [0.05, 0.1], format: "percent" },
  { id: "derave-kapsy", name: "Děravé kapsy", desc: "−{value} velikost zásobníku", polarity: "minus", effect: "mag", kind: "mult", range: [0.12, 0.2], format: "percent" },
  { id: "unava", name: "Únava", desc: "−{value} rychlost pohybu", polarity: "minus", effect: "moveSpeed", kind: "mult", range: [0.05, 0.1], format: "percent" },
];

function hashSeedStr(src: string): number {
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Vylosuje 3 různé mutátory pro daný seed a sektor (0-based).
 * Deterministické: stejný seed + sektor = stejné mutátory se stejnými hodnotami.
 */
export function rollMutators(seed: string, sectorIdx = 0): RolledMutator[] {
  const rng = mulberry32(hashSeedStr(`${seed.toUpperCase()}::mut::${Math.max(0, Math.floor(sectorIdx))}`));
  const order = MUTATORS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.slice(0, 3).map((idx) => {
    const def = MUTATORS[idx]!;
    const mag = def.range[0] + rng() * (def.range[1] - def.range[0]);
    const signed = def.polarity === "plus" ? mag : -mag;
    const shown = def.format === "percent" ? Math.round(mag * 100) : Math.round(mag);
    return {
      id: def.id,
      name: def.name,
      desc: def.desc.replace("{value}", def.format === "integer" ? String(shown) : `${shown}%`),
      polarity: def.polarity,
      effect: def.effect,
      kind: def.kind,
      value: def.format === "integer" ? Math.round(signed) : Math.round(signed * 1000) / 1000,
    };
  });
}

/** Součet add-efektu daného typu. */
export function mutAdd(list: readonly RolledMutator[], effect: MutEffect): number {
  let s = 0;
  for (const m of list) if (m.effect === effect && m.kind === "add") s += m.value;
  return s;
}

/** Součin mult-efektů daného typu (hodnota je podepsaná: +0.12 / −0.15). */
export function mutMult(list: readonly RolledMutator[], effect: MutEffect): number {
  let m = 1;
  for (const x of list) {
    if (x.effect !== effect || x.kind !== "mult") continue;
    m *= 1 + x.value;
  }
  return m;
}

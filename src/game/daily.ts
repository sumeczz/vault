/**
 * Denní výzva — pravidla docs/progression-rules.md §14.
 * Jeden seed pro všechny na daný den, výsledek = dosažená úroveň.
 * Lokální žebříček (dnes + historické maximum), žádné účty.
 */

const DAILY_STORAGE_KEY = "vaultbreak.daily.v1";

export type DailyRecord = {
  /** Den ve formátu YYYY-MM-DD (místní čas). */
  key: string;
  /** Nejlepší dnešní úroveň. */
  best: number;
  /** Počet dnešních pokusů. */
  plays: number;
  /** Historické maximum denních výzev. */
  allBest: number;
  /** Den historického maxima. */
  allBestKey: string;
};

const EMPTY: DailyRecord = { key: "", best: 0, plays: 0, allBest: 0, allBestKey: "" };

/** Klíč dne v místním čase. */
export function dailyKey(date: Date = new Date()): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Deterministický seed dne (max 10 znaků, velká písmena). */
export function dailySeed(key: string = dailyKey()): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `DEN-${(h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-6)}`;
}

export function loadDaily(): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return { ...EMPTY, key: dailyKey() };
    const parsed = JSON.parse(raw) as Partial<DailyRecord>;
    const today = dailyKey();
    if (parsed.key !== today) {
      return {
        key: today,
        best: 0,
        plays: 0,
        allBest: Math.max(0, parsed.allBest ?? 0),
        allBestKey: parsed.allBestKey ?? "",
      };
    }
    return {
      key: today,
      best: Math.max(0, Math.floor(parsed.best ?? 0)),
      plays: Math.max(0, Math.floor(parsed.plays ?? 0)),
      allBest: Math.max(0, parsed.allBest ?? 0),
      allBestKey: parsed.allBestKey ?? "",
    };
  } catch {
    return { ...EMPTY, key: dailyKey() };
  }
}

function writeDaily(next: DailyRecord): void {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/** Zapíše výsledek denního běhu. Vrací aktuální záznam. */
export function recordDaily(level: number): DailyRecord {
  const prev = loadDaily();
  const best = Math.max(prev.best, level);
  const allBest = Math.max(prev.allBest, level);
  const next: DailyRecord = {
    key: prev.key,
    best,
    plays: prev.plays + 1,
    allBest,
    allBestKey: level >= prev.allBest && level > 0 ? prev.key : prev.allBestKey,
  };
  writeDaily(next);
  return next;
}

/**
 * Týdenní výzva — pravidla docs/progression-rules.md §14.
 * Stejný vzor jako denní (jeden seed pro všechny, výsledek = úroveň),
 * jen s týdenním oknem (ISO týden, pondělí–neděle).
 */

const WEEKLY_STORAGE_KEY = "vaultbreak.weekly.v1";

export type WeeklyRecord = {
  /** Týden ve formátu YYYY-Www (ISO, místní čas). */
  key: string;
  best: number;
  plays: number;
  allBest: number;
  allBestKey: string;
};

const WEEKLY_EMPTY: WeeklyRecord = { key: "", best: 0, plays: 0, allBest: 0, allBestKey: "" };

/** Klíč ISO týdne v místním čase. */
export function weeklyKey(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const fday = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fday + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Deterministický seed týdne (max 10 znaků, velká písmena). */
export function weeklySeed(key: string = weeklyKey()): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `TYD-${(h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-6)}`;
}

export function loadWeekly(): WeeklyRecord {
  try {
    const raw = localStorage.getItem(WEEKLY_STORAGE_KEY);
    if (!raw) return { ...WEEKLY_EMPTY, key: weeklyKey() };
    const parsed = JSON.parse(raw) as Partial<WeeklyRecord>;
    const current = weeklyKey();
    if (parsed.key !== current) {
      return {
        key: current,
        best: 0,
        plays: 0,
        allBest: Math.max(0, parsed.allBest ?? 0),
        allBestKey: parsed.allBestKey ?? "",
      };
    }
    return {
      key: current,
      best: Math.max(0, Math.floor(parsed.best ?? 0)),
      plays: Math.max(0, Math.floor(parsed.plays ?? 0)),
      allBest: Math.max(0, parsed.allBest ?? 0),
      allBestKey: parsed.allBestKey ?? "",
    };
  } catch {
    return { ...WEEKLY_EMPTY, key: weeklyKey() };
  }
}

function writeWeekly(next: WeeklyRecord): void {
  try {
    localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/** Zapíše výsledek týdenního běhu. Vrací aktuální záznam. */
export function recordWeekly(level: number): WeeklyRecord {
  const prev = loadWeekly();
  const best = Math.max(prev.best, level);
  const allBest = Math.max(prev.allBest, level);
  const next: WeeklyRecord = {
    key: prev.key,
    best,
    plays: prev.plays + 1,
    allBest,
    allBestKey: level >= prev.allBest && level > 0 ? prev.key : prev.allBestKey,
  };
  writeWeekly(next);
  return next;
}

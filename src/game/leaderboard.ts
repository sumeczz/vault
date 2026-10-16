/**
 * Lokální žebříček denních a týdenních výzev (top 10 se seedem a LVL).
 * Ukládá se do localStorage, maže se s resetem progressu.
 */

export type BoardMode = "daily" | "weekly";

export type BoardEntry = {
  /** Klíč období (den `YYYY-MM-DD` / týden `YYYY-Www`). */
  key: string;
  seed: string;
  level: number;
  /** Čas zápisu (ms od epochy) pro rozlišení shod. */
  at: number;
};

export type Board = {
  daily: BoardEntry[];
  weekly: BoardEntry[];
};

const BOARD_STORAGE_KEY = "vaultbreak.board.v1";

export const BOARD_KEY = BOARD_STORAGE_KEY;

const EMPTY: Board = { daily: [], weekly: [] };

const MAX_ENTRIES = 10;

function cleanEntry(value: unknown): BoardEntry | null {
  if (!value || typeof value !== "object") return null;
  const e = value as Record<string, unknown>;
  if (typeof e.key !== "string" || typeof e.seed !== "string") return null;
  if (typeof e.level !== "number" || !Number.isFinite(e.level)) return null;
  if (typeof e.at !== "number" || !Number.isFinite(e.at)) return null;
  return { key: e.key, seed: e.seed, level: Math.max(0, Math.floor(e.level)), at: e.at };
}

function cleanList(value: unknown): BoardEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanEntry)
    .filter((e): e is BoardEntry => e !== null)
    .sort((a, b) => b.level - a.level || b.at - a.at)
    .slice(0, MAX_ENTRIES);
}

export function loadBoard(): Board {
  try {
    const raw = localStorage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return { ...EMPTY, daily: [], weekly: [] };
    const parsed = JSON.parse(raw) as Partial<Board>;
    return { daily: cleanList(parsed.daily), weekly: cleanList(parsed.weekly) };
  } catch {
    return { ...EMPTY, daily: [], weekly: [] };
  }
}

function writeBoard(board: Board): void {
  try {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board));
  } catch {
    /* ignore quota */
  }
}

/**
 * Zapíše výsledek do žebříčku. Stejné období + seed drží jen nejlepší LVL.
 * Vrací aktualizovaný žebříček.
 */
export function recordBoard(mode: BoardMode, key: string, seed: string, level: number, at = Date.now()): Board {
  const board = loadBoard();
  const normSeed = seed.toUpperCase();
  const prev = board[mode].find((e) => e.key === key && e.seed === normSeed);
  const list = board[mode].filter((e) => e !== prev);
  list.push({
    key,
    seed: normSeed,
    level: Math.max(prev?.level ?? 0, Math.max(0, Math.floor(level))),
    at,
  });
  list.sort((a, b) => b.level - a.level || b.at - a.at);
  board[mode] = list.slice(0, MAX_ENTRIES);
  writeBoard(board);
  return board;
}

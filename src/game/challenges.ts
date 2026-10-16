/**
 * Výzvy profilu — pravidla docs/progression-rules.md §19.
 * Každá výzva max 1× za běh; splnění dá šrot ihned a odznak do profilu (trvale).
 */

export type ChallengeId =
  | "prvni-krev"
  | "brokovnicar"
  | "bez-sramu"
  | "rychlik"
  | "lovec-elit"
  | "bossobijec";

export type ChallengeDef = {
  id: ChallengeId;
  name: string;
  desc: string;
  goal: number;
  reward: number;
};

export const CHALLENGES: ChallengeDef[] = [
  { id: "prvni-krev", name: "První krev", desc: "25 zabití v jednom sektoru", goal: 25, reward: 30 },
  { id: "brokovnicar", name: "Brokovničář", desc: "20 zabití brokovnicí za běh", goal: 20, reward: 40 },
  { id: "bez-sramu", name: "Bez šrámu", desc: "Vyčisti místnost bez zranění", goal: 1, reward: 25 },
  { id: "rychlik", name: "Rychlík", desc: "Vyčisti sektor do 5:00", goal: 300, reward: 50 },
  { id: "lovec-elit", name: "Lovec elit", desc: "10 zabití v elitních místnostech za běh", goal: 10, reward: 30 },
  { id: "bossobijec", name: "Bossobijec", desc: "Poraz bosse bez použití schopnosti", goal: 1, reward: 50 },
];

export function challengeDef(id: ChallengeId): ChallengeDef {
  return CHALLENGES.find((c) => c.id === id)!;
}

export type ChallengeProgress = { done: boolean; progress: number };

export type ChallengeState = Record<ChallengeId, ChallengeProgress>;

export function freshChallengeState(): ChallengeState {
  return {
    "prvni-krev": { done: false, progress: 0 },
    brokovnicar: { done: false, progress: 0 },
    "bez-sramu": { done: false, progress: 0 },
    rychlik: { done: false, progress: 0 },
    "lovec-elit": { done: false, progress: 0 },
    bossobijec: { done: false, progress: 0 },
  };
}

const BADGES_STORAGE_KEY = "vaultbreak.badges.v1";

/** Trvale odemčené odznaky (ida výzev). */
export function loadBadges(): ChallengeId[] {
  try {
    const raw = localStorage.getItem(BADGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ChallengeId => typeof x === "string" && CHALLENGES.some((c) => c.id === x),
    );
  } catch {
    return [];
  }
}

export function unlockBadge(id: ChallengeId): void {
  try {
    const badges = loadBadges();
    if (!badges.includes(id)) {
      badges.push(id);
      localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(badges));
    }
  } catch {
    /* ignore quota */
  }
}

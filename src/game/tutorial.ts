/**
 * Tutorial prvního běhu — kontextové tipy odvozené ze stavu hry.
 * Čistá logika (bez Reactu), aby šla testovat: tutorialStepFor vrací
 * aktuální krok, nebo -1 když je hotovo.
 */

export type TutorialStep = 0 | 1 | 2 | 3;

const TUTORIAL_DONE_KEY = "vaultbreak.tutorial.done";

export const TUTORIAL_TEXTS: Record<TutorialStep, { title: string; body: string }> = {
  0: {
    title: "Vítej v trezoru!",
    body: "Hýbej se WASD, miř myší a drž tlačítko pro střelbu. Zabij prvního nepřítele.",
  },
  1: {
    title: "Odměna za místnost",
    body: "Místnost je čistá — vyber si odměnu, nebo vše rozeber na šrot (⚙).",
  },
  2: {
    title: "Přehled a postava",
    body: "Nahoře najdeš Přehled (T) a Postavu (C). Najeď na ikony pro vysvětlení pojmů.",
  },
  3: {
    title: "Báze před tebou",
    body: "Po bossovi tě čeká báze: obchod, volba portálu a bank. Hodně štěstí!",
  },
};

export function isTutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function completeTutorial(): void {
  try {
    localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Aktuální krok: 0 dokud nepadne první zabití, 1 dokud hráč neuvidí loot,
 * 2 dokud neotevře panel, 3 dokud neuvidí bázi, pak -1 (hotovo).
 */
export function tutorialStepFor(
  kills: number,
  lootSeen: boolean,
  panelSeen: boolean,
  baseSeen: boolean,
): TutorialStep | -1 {
  if (kills < 1) return 0;
  if (!lootSeen) return 1;
  if (!panelSeen) return 2;
  if (!baseSeen) return 3;
  return -1;
}

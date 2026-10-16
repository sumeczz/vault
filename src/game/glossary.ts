/**
 * Slovníček herních pojmů — jeden zdroj pravdy pro tooltipy v UI.
 * Každý pojem má krátkou definici; texty se testují v game.test.ts.
 */
export type GlossaryKey =
  | "dps"
  | "damage"
  | "rpm"
  | "crit"
  | "magnet"
  | "armor"
  | "speed"
  | "dash"
  | "scrap"
  | "combo"
  | "rarity"
  | "affix"
  | "synergy"
  | "anomaly"
  | "mutator"
  | "phase"
  | "elite"
  | "boss"
  | "wave"
  | "codex"
  | "challenge"
  | "ability"
  | "passive"
  | "element"
  | "reload"
  | "range"
  | "spread"
  | "pellets"
  | "lifesteal"
  | "reroll"
  | "portal"
  | "penetration"
  | "torment"
  | "frame"
  | "mod"
  | "blueprint"
  | "armory"
  | "family";

export const GLOSSARY: Record<GlossaryKey, { term: string; def: string }> = {
  dps: { term: "DPS", def: "Poškození za sekundu: DMG × kadence × projektily (bez kritů)." },
  damage: { term: "Poškození", def: "Základní DMG jedné střely před kritem a mutátory." },
  rpm: { term: "Kadence (RPM)", def: "Počet ran za minutu. Vyšší = rychlejší palba." },
  crit: { term: "Kritika", def: "Šance na kritický zásah a jeho násobič poškození." },
  magnet: { term: "Magnet", def: "Dosah, ze kterého k tobě dolétnou dropy (životy, náboje)." },
  armor: { term: "Zbroj", def: "Procentní redukce utrženého poškození (hráč strop 30 %). Nepřátelé od LVL 10 mají vlastní zbroj až 30 %." },
  penetration: { term: "Průraznost", def: "Ignoruje zbroj cíle (railka, harpuna, Odstřel). Statusy zbroj obcházejí vždy." },
  torment: { term: "Torment", def: "Dobrovolný režim od LVL 30: nepřátelé +25 % HP i dmg, loot +1 úroveň a +25 % šrotu." },
  speed: { term: "Rychlost", def: "Rychlost pohybu za sekundu (základ 235)." },
  dash: { term: "Dash", def: "Krátký výpad s nezranitelností (mezerník). Dobíjí se." },
  scrap: { term: "Šrot", def: "Měna do báze: obchod, plátování, vliv. Padá rozebráním lootu (LVL 3+)." },
  combo: { term: "Série", def: "Počet zabití v řadě bez delší pauzy. Jen pro pocit slávy." },
  rarity: { term: "Rarita", def: "Běžná → neobvyklá → vzácná → epická → legendární → mýtická. Vyšší = lepší čísla." },
  affix: { term: "Elitní affix", def: "Bonus elity/bosse (barevný kroužek): hbitý, pancéřovaný, třaskavý, zhoubný, obří, zběsilý." },
  synergy: { term: "Synergie", def: "Kombinace elementů na nepříteli: oheň+jed výbuch, mráz+šok křehkost, oheň+mráz pára (LVL 15+)." },
  anomaly: { term: "Anomálie", def: "Pravidlo sektoru 2+ dané seedem (Zlatá žíla, Hladomor…). Stejná pro všechny se stejným seedem." },
  mutator: { term: "Mutátor", def: "Aura z kola štěstí platná jen pro aktuální sektor (3 různé ze seedu)." },
  phase: { term: "Fáze hry", def: "Early (sektor 1) → mid-game (2–3) → Hlubina (4+). Těžší pravidla s postupem." },
  elite: { term: "Elita", def: "Těžší místnost (3. a 6. v sektoru): silnější nepřátelé s afficem, lepší loot." },
  boss: { term: "Boss", def: "Závěr sektoru (10. místnost). Má 3 fáze a volá posily. Po něm je báze." },
  wave: { term: "Vlna", def: "Skupina nepřátel v místnosti. Mezi vlnami je 2,5s pauza s odpočtem." },
  codex: { term: "Kodex", def: "Sbírka všeho potkaného. Každá položka trvale posiluje postavu od dalšího běhu." },
  challenge: { term: "Výzva", def: "Úkol profilu (např. 25 zabití v sektoru). Splnění dá šrot ihned a trvalý odznak." },
  ability: { term: "Schopnost", def: "Aktivní síla na F / Shift s přebíjením. V ruce vždy jedna." },
  passive: { term: "Pasivka", def: "Trvalý bonus, který se sčítá. Padá z lootu, platí celý běh." },
  element: { term: "Element", def: "Kinetika, oheň, led, šok, void, toxic. Oheň/led/jed/šok tvoří synergie." },
  reload: { term: "Přebíjení", def: "Čas dobití zásobníku po vystřílení. Střelba mezitím stojí." },
  range: { term: "Dostřel", def: "Jak daleko střela doletí, než zmizí." },
  spread: { term: "Rozptyl", def: "Nepřesnost zbraně. Menší = soustředěnější palba." },
  pellets: { term: "Projektily", def: "Počet střel v jednom výstřelu (brokovnice jich má víc)." },
  lifesteal: { term: "Vysátí", def: "Procento uděleného poškození se vrací jako zdraví." },
  reroll: { term: "Přerolování", def: "Znovu vygeneruje nabídky lootu v místnosti (základ 1 za místnost)." },
  portal: { term: "Portál", def: "Volba expedice v bázi: Kovárna, Aréna, Laboratoř, Knihovna, Tržiště. Každý mění loot." },
  frame: { term: "Rám", def: "Základ zbraně (archetyp + rarita) s mod-sloty. Unikátní relikvie sloty nemají." },
  mod: { term: "Mod", def: "Vylepšení do rámu: element, chování nebo čísla. Sazí se v Dílně, padá z lootu." },
  blueprint: { term: "Blueprint", def: "Trvalý rank archetypu za zabíjení: +5 % DMG (25) → zbrojnice (60) → +1 slot (120) → +10 % DMG (200)." },
  armory: { term: "Zbrojnice", def: "Volba startovního rámu v menu z archetypů s blueprint rankem 2+." },
  family: { term: "Rodina modů", def: "Stráž, Hlubina, Prototyp. 2 kusy stejné rodiny +10 % DMG, 3 kusy +25 %." },
};

export function glossaryDef(key: GlossaryKey): { term: string; def: string } {
  return GLOSSARY[key];
}

/**
 * Bucketový výpočet poškození — pravidla docs/progression-rules.md §21.
 *
 * Bonusy se dělí do kyblíků (gear / vlastnosti / aury / kodex), které se mezi
 * sebou násobí. Uvnitř kyblíku vlastností a aur platí klesající výnosy, takže
 * skládání pěti bonusů nedá ×3, ale ~×1,8 — hra jde balancovat, aniž by jeden
 * outlier všechno rozbil. Gear je už započtený v základu zbraně.
 */

/** Strop kritické šance a kritického násobitele. */
export const CRIT_CHANCE_CAP = 0.6;
export const CRIT_MULT_CAP = 3;

/** Strop hráčské zbroje (redukce poškození). */
export const PLAYER_ARMOR_CAP = 0.3;

/**
 * Klesající výnosy bonusu: +100 % → +67 %, +50 % → +40 %, +20 % → +18 %.
 * Symetrické pro postihy (−20 % → −18 %).
 */
export function drBonus(bonus: number): number {
  return bonus / (1 + 0.5 * Math.abs(bonus));
}

/**
 * Složený násobič poškození z kyblíků.
 * @param mut podepsaný násobič mutátorů (např. 1.2 / 0.85)
 * @param codexPct procentní bonus kodexu (např. 0.03)
 * @param trait bonus vlastností/pasivek (např. nenasytnost)
 */
export function damageBuckets(o: { mut: number; codexPct: number; trait: number }): number {
  return (1 + drBonus(o.mut - 1)) * (1 + o.codexPct) * (1 + drBonus(o.trait));
}

/** Redukce poškození zbrojí po odečtení průraznosti (strop 45 % celkem). */
export function armorFactor(armor: number, pen: number): number {
  return 1 - Math.min(0.45, Math.max(0, armor - pen));
}

/** Zbroj nepřátel podle globální úrovně: od LVL 10 roste k 30 % (Hlubina). */
export function enemyArmorForLevel(level: number): number {
  return Math.min(0.3, Math.max(0, level - 10) * 0.015);
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultGameContent,
  parseImportedCatalogs,
  serializeCatalogs,
  validateCatalogs,
} from "./content-settings.ts";
import { DEFAULT_RARITY_WEIGHTS } from "./rarity-settings.ts";
import { simulateLoot } from "./loot-sim.ts";
import {
  BOSS_POS,
  ELITE_POS,
  SECTOR_SIZE,
  catchUpForSector,
  DEFAULT_DIFFICULTY,
  difficultyForLevel,
  getDifficulty,
  resetDifficulty,
  setDifficulty,
} from "./difficulty.ts";
import { SECTOR_MODS, ANOMALIES, anomalyForSector, gamePhaseFor, scrapForRarity, shopCost, shopOffers } from "./expedition.ts";
import { UNLOCKS, nextUnlock, unlocksForLevel } from "./progression.ts";
import { dailyKey, dailySeed, loadDaily, recordDaily, weeklyKey, weeklySeed, loadWeekly, recordWeekly } from "./daily.ts";
import { MUTATORS, WHEEL_SPIN_MS, mutAdd, rollMutators } from "./mutators.ts";
import { CHALLENGES, challengeDef, loadBadges } from "./challenges.ts";
import { buildCardData } from "./buildCard.ts";
import { starterWeapon } from "./weapons.ts";
import { DEFAULT_WEAPON_DEFS } from "./weapons.ts";
import { DEFAULT_ABILITY_DEFS, DEFAULT_PASSIVE_DEFS, generateAbility } from "./abilities.ts";
import { DEFAULT_AFFIXES, DEFAULT_UNIQUES, RARITY_MULT, generateWeapon } from "./weapons.ts";
import {
  BOSS_PHASE_ADDS,
  BOSS_PHASE_STATS,
  ELITE_AFFIXES,
  ENEMY_ORDER,
  ENEMY_SPAWN,
  bossPhaseFor,
  rollAffixes,
} from "./bestiary.ts";
import { mulberry32 } from "./rng.ts";
import { generateRoom } from "./dungeon.ts";
import { Run, WAVE_BREAK } from "./sim.ts";
import { ACHIEVEMENTS, earnedAchievements, loadAchievements, profileStats, unlockAchievements } from "./achievements.ts";
import { GLOSSARY, glossaryDef } from "./glossary.ts";
import { CODEX_CATEGORIES, SYNERGIES, codexBonus, codexEntries, codexProgress, loadCodex } from "./codex.ts";
import { loadSave, recordRun, resetProgress } from "./save.ts";
import { loadBoard, recordBoard } from "./leaderboard.ts";
import { ABILITY_VOICE } from "./audio.ts";
import { ABILITY_KINDS } from "./content-settings.ts";
import { CRIT_CHANCE_CAP, CRIT_MULT_CAP, armorFactor, damageBuckets, drBonus, enemyArmorForLevel } from "./scaling.ts";
import {
  DEFAULT_MOD_DEFS,
  applyMods,
  blueprintDamageMult,
  blueprintSlots,
  familyBonusOf,
  generateMod,
  killsToRank,
  loadArmory,
  loadBlueprints,
  maxSlotsFor,
  recordBlueprintKills,
  saveArmory,
} from "./mods.ts";
import { TUTORIAL_TEXTS, completeTutorial, isTutorialDone, tutorialStepFor } from "./tutorial.ts";
import type { Actions } from "./input.ts";

const NEUTRAL_ACTIONS: Actions = {
  moveX: 0,
  moveY: 0,
  aimStickX: 0,
  aimStickY: 0,
  useStickAim: false,
  mouseScreenX: 400,
  mouseScreenY: 300,
  mouseInside: true,
  fire: false,
  justDash: false,
  justAbility: false,
  justSwap: false,
  justPause: false,
  justStats: false,
  justCharacter: false,
};

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

function bestRank(run: Run): number {
  return Math.max(
    ...run.loot.map((o) =>
      o.kind === "heal"
        ? -1
        : RARITY_ORDER.indexOf(
            o.kind === "weapon"
              ? o.weapon.rarity
              : o.kind === "ability"
                ? o.ability.rarity
                : o.kind === "mod"
                  ? o.mod.rarity
                  : o.passive.rarity,
          ),
    ),
  );
}

describe("katalogy", () => {
  it("vychozi katalog projde validaci bez chyb", () => {
    const report = validateCatalogs(defaultGameContent(), DEFAULT_RARITY_WEIGHTS);
    assert.equal(report.errors.length, 0);
  });

  it("export/import roundtrip zachova data i vahy", () => {
    const json = serializeCatalogs(defaultGameContent(), DEFAULT_RARITY_WEIGHTS);
    const parsed = parseImportedCatalogs(JSON.parse(json));
    assert.ok(parsed);
    assert.equal(parsed.dropped.weapons, 0);
    assert.ok(parsed.weights);
  });

  it("import odmitne nesmysl a pocita zahozeni", () => {
    assert.equal(parseImportedCatalogs({}), null);
    assert.equal(parseImportedCatalogs({ abilities: [{ id: 1 }], passives: [] }), null);
    const content = defaultGameContent();
    const parsed = parseImportedCatalogs({ ...content, weapons: [...content.weapons, { id: "rozbite" }] });
    assert.ok(parsed && parsed.dropped.weapons === 1);
    const report = validateCatalogs({ ...content, abilities: [] });
    assert.ok(report.errors.some((e) => e.includes("Schopnosti")));
  });

  it("starsi ulozena data bez affixu se doplni vychozimi", () => {
    const content = defaultGameContent();
    const { affixes, uniques, ...legacy } = content;
    void affixes;
    void uniques;
    const parsed = parseImportedCatalogs(legacy);
    assert.ok(parsed);
    assert.ok(parsed.content.affixes.length > 0);
    assert.ok(parsed.content.uniques.length > 0);
  });

  it("validace hlasi affixy a unikaty", () => {
    const content = defaultGameContent();
    const dup = {
      ...content,
      affixes: [content.affixes[0]!, content.affixes[0]!],
      uniques: [{ ...content.uniques[0]!, name: "" }],
    };
    const report = validateCatalogs(dup);
    assert.ok(report.errors.some((e) => e.includes("Affixy")));
    assert.ok(report.warnings.some((w) => w.includes("prázdný název")));
    const zeroW = { ...content, uniques: content.uniques.map((u) => ({ ...u, weight: 0 })) };
    assert.ok(validateCatalogs(zeroW).warnings.some((w) => w.includes("Unikáty")));
  });
});

describe("affixy a unikaty v generovani", () => {
  it("vlastni affix se objevi ve jmene zbrane", () => {
    const rng = mulberry32(7);
    const custom = [
      {
        id: "test-pre",
        slot: "prefix" as const,
        nameM: "Testovaci",
        nameF: "Testovaci",
        weight: 100,
        stats: {},
        behaviors: {},
      },
    ];
    let seen = false;
    for (let i = 0; i < 40; i++) {
      const w = generateWeapon(rng, 8, false, undefined, defaultGameContent().weapons, custom, []);
      if (w.name.includes("Testovaci")) {
        seen = true;
        break;
      }
    }
    assert.ok(seen, "vlastni prefix se neobjevil");
  });

  it("vlastni unikat padne pri myticke rarite", () => {
    const rng = mulberry32(11);
    const content = defaultGameContent();
    const custom = [
      {
        id: "test-unikat",
        name: "Testovnik",
        arch: "pistol" as const,
        element: "fire" as const,
        rarity: "mythic" as const,
        weight: 100,
        stats: { damage: 99 },
        behaviors: {},
      },
    ];
    let seen = false;
    for (let i = 0; i < 60; i++) {
      const w = generateWeapon(rng, 8, true, undefined, content.weapons, content.affixes, custom);
      if (w.unique && w.name === "Testovnik") {
        seen = true;
        assert.equal(w.stats.damage > 90, true);
        break;
      }
    }
    assert.ok(seen, "vlastni unikat nepadl");
  });

  it("prazdne katalogy nepadaji (fallback)", () => {
    const rng = mulberry32(13);
    const content = defaultGameContent();
    const w = generateWeapon(rng, 0, false, undefined, content.weapons, [], []);
    assert.ok(w.name.length > 0);
  });

  it("vychozi katalogy maji vahy a id", () => {
    assert.ok(DEFAULT_AFFIXES.length > 10);
    assert.ok(DEFAULT_AFFIXES.every((a) => a.weight > 0 && (a.slot === "prefix" || a.slot === "suffix")));
    assert.ok(DEFAULT_UNIQUES.length > 5);
    assert.ok(DEFAULT_UNIQUES.every((u) => u.id && u.weight > 0));
  });
});

describe("denni vyzva", () => {
  it("klic dne a deterministicky seed", () => {
    assert.equal(dailyKey(new Date(2026, 9, 1, 12)), "2026-10-01");
    const a = dailySeed("2026-10-01");
    assert.equal(a, dailySeed("2026-10-01"));
    assert.ok(a.length <= 10 && a === a.toUpperCase());
    assert.notEqual(a, dailySeed("2026-10-02"));
  });

  it("zaznam drzi dnesek a historicke maximum", () => {
    const before = loadDaily();
    assert.equal(before.key, dailyKey());
    const after = recordDaily(7);
    assert.ok(after.best >= 7 && after.plays >= before.plays + 1);
    assert.ok(after.allBest >= 7);
  });
});

describe("tydenni vyzva", () => {
  it("ISO tyden: pondeli–nedele stejny klic, dalsi pondeli jiny", () => {
    const mon = weeklyKey(new Date(2026, 8, 28));
    const sun = weeklyKey(new Date(2026, 9, 4));
    assert.match(mon, /^\d{4}-W\d{2}$/);
    assert.equal(mon, sun);
    assert.notEqual(mon, weeklyKey(new Date(2026, 9, 5)));
  });

  it("seed tydne je deterministicky a zaznam funguje", () => {
    const a = weeklySeed("2026-W40");
    assert.equal(a, weeklySeed("2026-W40"));
    assert.ok(a.length <= 10 && a === a.toUpperCase());
    assert.notEqual(a, weeklySeed("2026-W41"));
    const before = loadWeekly();
    assert.equal(before.key, weeklyKey());
    const after = recordWeekly(9);
    assert.ok(after.best >= 9 && after.plays >= before.plays + 1);
    assert.ok(after.allBest >= 9);
  });
});

describe("kolo stesti", () => {
  it("pool 16 kladnych + 16 zapornych", () => {
    assert.equal(MUTATORS.length, 32);
    assert.equal(MUTATORS.filter((m) => m.polarity === "plus").length, 16);
    assert.equal(MUTATORS.filter((m) => m.polarity === "minus").length, 16);
  });

  it("stejny seed = stejne 3 ruzne mutatory v rozsahu", () => {
    const a = rollMutators("AbC");
    assert.deepEqual(a, rollMutators("abc"));
    assert.deepEqual(a, rollMutators("ABC", 0));
    assert.equal(a.length, 3);
    assert.equal(new Set(a.map((m) => m.id)).size, 3);
    for (const m of a) {
      const def = MUTATORS.find((d) => d.id === m.id)!;
      const mag = Math.abs(m.value);
      assert.ok(mag >= def.range[0] - 1e-9 && mag <= def.range[1] + 1e-9, `${m.id} mimo rozsah`);
      assert.equal(m.polarity, def.polarity);
    }
  });

  it("pres seedy padaji obe polarity", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) for (const m of rollMutators(`S${i}`)) seen.add(m.polarity);
    assert.ok(seen.has("plus") && seen.has("minus"));
  });

  it("demolice zvysuje udelene poskozeni (s klesajicimi vynosy)", () => {
    const run = new Run("MUTDMG");
    run.mutators = [{ id: "x", name: "X", desc: "X", polarity: "plus", effect: "damage", kind: "mult", value: 0.2 }];
    run.spawnEnemy("tank", 100, 100);
    const e = run.enemies.find((x) => x.active)!;
    const before = e.hp;
    run.hurtEnemy(e, 100, 0, 0, 0, 0, 0, 0, 0, 0, false);
    // +20 % pres bucket: 100 × (1 + 0.2/1.1) ≈ 118.18, tank na LVL 1 bez zbroje.
    assert.equal(Math.round(before - e.hp), 118);
  });

  it("kevlar snizuje utrzene poskozeni", () => {
    const run = new Run("MUTARM");
    run.mutators = [{ id: "x", name: "X", desc: "X", polarity: "plus", effect: "armor", kind: "mult", value: 0.15 }];
    run.player.invuln = 0;
    run.hurtPlayer(100);
    assert.equal(Math.round(run.player.hp), 15);
  });

  it("druhy dech zvedne max HP pri startu", () => {
    let seed = "";
    for (let i = 0; i < 500 && !seed; i++) {
      const m = rollMutators(`HP${i}`);
      if (m.some((x) => x.effect === "maxHp" && x.polarity === "plus")) seed = `HP${i}`;
    }
    assert.ok(seed, "zadny seed s maxHp mutatorem");
    const run = new Run(seed);
    const expected = 100 + mutAdd(run.mutators, "maxHp");
    assert.equal(run.player.maxHp, expected);
    assert.ok(expected > 100);
  });

  it("tezke vybaveni nesnizi dash pod 1", () => {
    const run = new Run("MUTDASH");
    run.mutators = [{ id: "x", name: "X", desc: "X", polarity: "minus", effect: "dash", kind: "add", value: -1 }];
    assert.equal(run.snapshot().dashMax, 1);
  });

  it("animace kola trva 7.5 s", () => {
    assert.equal(WHEEL_SPIN_MS, 7500);
  });

  it("kazdy sektor ma vlastni los", () => {
    let differs = false;
    for (let i = 0; i < 30; i++) {
      const a = JSON.stringify(rollMutators(`W${i}`, 0));
      const b = JSON.stringify(rollMutators(`W${i}`, 1));
      if (a !== b) differs = true;
      assert.deepEqual(rollMutators(`W${i}`, 1), rollMutators(`W${i}`, 1));
    }
    assert.ok(differs, "sektory by mely losovat jinak");
  });

  it("prechod do sektoru prelosuje a prepocita HP bonus", () => {
    const run = new Run("HPX");
    run.continueToNextSector(null);
    assert.equal(run.sector, 1);
    assert.deepEqual(run.mutators, rollMutators("HPX", 1));
    const expected = Math.max(20, 100 + mutAdd(rollMutators("HPX", 1), "maxHp"));
    assert.equal(run.player.maxHp, expected);
  });
});

describe("vyzvy profilu", () => {
  it("katalog 6 vyzev dle dokumentu", () => {
    assert.equal(CHALLENGES.length, 6);
    const rewards = Object.fromEntries(CHALLENGES.map((c) => [c.id, c.reward]));
    assert.deepEqual(rewards, {
      "prvni-krev": 30,
      brokovnicar: 40,
      "bez-sramu": 25,
      rychlik: 50,
      "lovec-elit": 30,
      bossobijec: 50,
    });
    assert.equal(challengeDef("rychlik").goal, 300);
  });

  it("prvni krev: 25 zbiti v sektoru", () => {
    const run = new Run("CH1");
    for (let i = 0; i < 25; i++) {
      run.spawnEnemy("grunt", 100, 100);
      const e = run.enemies.find((x) => x.active)!;
      run.killEnemy(e);
    }
    assert.equal(run.challenges["prvni-krev"].done, true);
    assert.equal(run.scrap, 30);
  });

  it("brokovnicar: 20 zabiti brokovnici", () => {
    const run = new Run("CH2");
    run.weapons[0].archetype = "shotgun";
    for (let i = 0; i < 20; i++) {
      run.spawnEnemy("grunt", 100, 100);
      const e = run.enemies.find((x) => x.active)!;
      run.killEnemy(e);
    }
    assert.equal(run.challenges.brokovnicar.done, true);
    assert.ok(run.scrap >= 40);
  });

  it("bez sramu: cista mistnost bez zraneni", () => {
    const run = new Run("CH3");
    run.generateLoot();
    assert.equal(run.challenges["bez-sramu"].done, true);
  });

  it("rychlik: sektor do 5:00", () => {
    const run = new Run("CH4");
    run.sectorTime = 200;
    run.enterBase();
    assert.equal(run.challenges.rychlik.done, true);
  });

  it("lovec elit: 10 zabiti v elitni mistnosti", () => {
    const run = new Run("CH5");
    run.room.isElite = true;
    for (let i = 0; i < 10; i++) {
      run.spawnEnemy("grunt", 100, 100);
      const e = run.enemies.find((x) => x.active)!;
      run.killEnemy(e);
    }
    assert.equal(run.challenges["lovec-elit"].done, true);
  });

  it("bossobijec: boss bez schopnosti", () => {
    const run = new Run("CH6");
    run.room.isBoss = true;
    run.bossAbilityMark = run.abilityUses;
    run.spawnEnemy("boss", 200, 200);
    const e = run.enemies.find((x) => x.active)!;
    run.killEnemy(e);
    assert.equal(run.challenges.bossobijec.done, true);
  });

  it("odznaky se ctou jako pole", () => {
    assert.ok(Array.isArray(loadBadges()));
  });
});

describe("karta buildu", () => {
  it("data karty: zbrane, seed, datum", () => {
    const data = buildCardData({
      sector: 2,
      level: 14,
      time: "4:20",
      kills: 88,
      weapons: [starterWeapon(), null],
      abilityName: "Rázová vlna",
      passiveNames: ["Vitalita"],
      mutatorNames: ["+ Adrenalin"],
      sectorModName: "Kovárna",
      anomalyName: "Ozvěny",
      seed: "abc",
    });
    assert.equal(data.sector, 2);
    assert.equal(data.weapons.length, 1);
    assert.ok(data.weapons[0]!.dps > 0);
    assert.equal(data.seed, "ABC");
    assert.match(data.date, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("simulator lootu", () => {
  it("pocty sedi a rarity se scitaji", () => {
    const r = simulateLoot(defaultGameContent(), DEFAULT_RARITY_WEIGHTS, 5, 100, "TEST");
    assert.equal(r.byType.weapon + r.byType.ability + r.byType.passive + r.byType.mod, 300);
    assert.equal(Object.values(r.byRarity).reduce((a, b) => a + b, 0), 300);
    assert.ok(r.avgDpsByRarity.common > 0);
  });
});

describe("obtiznost", () => {
  it("vychozi krivka a clamp s resetem", () => {
    assert.equal(difficultyForLevel(1).hpMult, 1);
    assert.equal(difficultyForLevel(1).dmgMult, 1);
    const d10 = difficultyForLevel(10);
    assert.ok(d10.hpMult > 2 && d10.hpMult < 3);
    setDifficulty({ dmgCap: 99, hpPerLevel: -5 });
    assert.equal(getDifficulty().dmgCap, 10);
    assert.equal(getDifficulty().hpPerLevel, 0);
    resetDifficulty();
    assert.deepEqual(getDifficulty(), DEFAULT_DIFFICULTY);
  });
});

describe("expedice", () => {
  it("mody, rostouci ceny a hodnoty srotu", () => {
    assert.equal(SECTOR_MODS.length, 5);
    assert.ok(shopCost("heal", 2) > shopCost("heal", 1));
    assert.ok(scrapForRarity("mythic") > scrapForRarity("common"));
    assert.equal(shopOffers(1, 0).length, 3);
  });
});

describe("progrese", () => {
  it("odemykaci tabulka dle dokumentu (pevny progress LVL 3-30)", () => {
    assert.deepEqual(unlocksForLevel(1), {
      scrap: false,
      forge: false,
      shop: false,
      arena: false,
      synergy: false,
      affix: false,
      veteran: false,
      torment: false,
    });
    const l3 = unlocksForLevel(3);
    assert.ok(l3.scrap && !l3.forge && !l3.shop);
    const l12 = unlocksForLevel(12);
    assert.ok(l12.forge && l12.shop && l12.arena && !l12.synergy);
    assert.ok(Object.values(unlocksForLevel(30)).every(Boolean));
    assert.equal(UNLOCKS.length, 8);
    assert.equal(nextUnlock(1)?.id, "scrap");
    assert.equal(nextUnlock(9)?.id, "arena");
    assert.equal(nextUnlock(29)?.id, "torment");
    assert.equal(nextUnlock(99), null);
  });
});

describe("affixy", () => {
  it("gating a pocty (elita 1, boss 1, od 3. sektoru 2)", () => {
    const rng = mulberry32(42);
    assert.deepEqual(rollAffixes(rng, "grunt", true, 0, false), []);
    assert.deepEqual(rollAffixes(rng, "grunt", false, 0, true), []);
    const elite = rollAffixes(rng, "grunt", true, 0, true);
    assert.equal(elite.length, 1);
    assert.ok(ELITE_AFFIXES.some((a) => a.id === elite[0]));
    assert.equal(rollAffixes(rng, "boss", false, 0, true).length, 1);
    const late = rollAffixes(rng, "boss", false, 2, true);
    assert.equal(late.length, 2);
    assert.notEqual(late[0], late[1]);
    assert.equal(ELITE_AFFIXES.length, 6);
  });
});

describe("reward pravidla", () => {
  it("boss minimum rare, veteran epic", () => {
    const boss = new Run("BOSS");
    boss.roomIndex = 9;
    boss.room = generateRoom(boss.roomRng, 9, undefined, 10);
    assert.ok(boss.room.isBoss);
    boss.generateLoot();
    assert.ok(bestRank(boss) >= 2);
    const vet = new Run("VET", { veteran: true });
    vet.roomIndex = 9;
    vet.room = generateRoom(vet.roomRng, 9, undefined, 10);
    vet.generateLoot();
    assert.ok(bestRank(vet) >= 4);
  });

  it("pity citac nikdy nepretece", () => {
    const p = new Run("PITY");
    for (let i = 0; i < 15; i++) {
      p.generateLoot();
      assert.ok(p.roomsSinceRare <= 3);
    }
    const pv = new Run("PITYV", { veteran: true });
    for (let i = 0; i < 15; i++) {
      pv.generateLoot();
      assert.ok(pv.roomsSinceRare <= 2);
    }
  });

  it("srot, obchod a portaly v behu", () => {
    const run = new Run("LOGIC");
    run.generateLoot();
    assert.equal(run.loot.length, 3);
    const val = run.scrapLootValue();
    assert.ok(val > 0);
    run.scrapLoot();
    // Bez šrámu (§19) se plní automaticky při čisté místnosti: +25 šrotu.
    assert.equal(run.challenges["bez-sramu"].done, true);
    assert.equal(run.scrap, val + 25);
    assert.equal(run.roomIndex, 1);
    run.scrap = 0;
    assert.equal(run.buyShop("heal"), false);
    run.scrap += 1000;
    run.player.hp = 10;
    assert.equal(run.buyShop("heal"), true);
    assert.equal(run.player.hp, run.player.maxHp);
    run.continueToNextSector("arena");
    assert.equal(run.sector, 1);
    assert.equal(run.anomaly, anomalyForSector("LOGIC", 1));
    assert.equal(run.rerolls, 1 + (run.anomaly === "generous" || run.anomaly === "surge" ? 1 : 0));
    run.continueToNextSector("forge");
    assert.equal(run.rerolls, 2 + (run.anomaly === "generous" || run.anomaly === "surge" ? 1 : 0));
  });
});

describe("pevná pravidla §§6–10", () => {
  it("báze: heal 35 %, rerolly 2, klid 50 %", () => {
    const run = new Run("BASE");
    run.player.hp = 40;
    run.enterBase();
    assert.equal(run.player.hp, 40 + run.player.maxHp * 0.35);
    assert.equal(run.rerolls, 2);
    assert.equal(run.phase, "base");
    let calmSeed = "";
    for (let i = 0; i < 200 && !calmSeed; i++) {
      if (anomalyForSector(`CALM${i}`, 1) === "calm") calmSeed = `CALM${i}`;
    }
    assert.ok(calmSeed, "nenašel se klidný seed");
    const calm = new Run(calmSeed, { startSector: 1 });
    assert.equal(calm.anomaly, "calm");
    calm.player.hp = 20;
    calm.enterBase();
    assert.equal(calm.player.hp, Math.min(calm.player.maxHp, 20 + calm.player.maxHp * 0.5));
  });

  it("ceník obchodu a strop rerollů", () => {
    assert.equal(shopCost("heal", 1), 40);
    assert.equal(shopCost("maxhp", 2), 70);
    assert.equal(shopCost("reroll", 3), 55);
    const run = new Run("SHOP");
    run.scrap = 10000;
    run.rerolls = 4;
    assert.equal(run.buyShop("reroll"), false);
    run.rerolls = 1;
    const before = run.player.maxHp;
    assert.equal(run.buyShop("maxhp"), true);
    assert.equal(run.player.maxHp, before + 15);
  });

  it("catch-up a startovní rerolly z checkpointu", () => {
    assert.deepEqual(catchUpForSector(0), { bonusMaxHp: 0, freeRerolls: 0 });
    assert.deepEqual(catchUpForSector(1), { bonusMaxHp: 25, freeRerolls: 1 });
    assert.deepEqual(catchUpForSector(4), { bonusMaxHp: 80, freeRerolls: 1 });
    const fresh = new Run("CATCH0");
    assert.equal(fresh.player.maxHp, Math.max(20, 100 + mutAdd(fresh.mutators, "maxHp")));
    assert.equal(fresh.rerolls, 1);
    const cp = new Run("CATCH1", { startSector: 1 });
    assert.equal(cp.player.maxHp, Math.max(20, 125 + mutAdd(cp.mutators, "maxHp")));
    assert.equal(cp.rerolls, cp.roomRerolls() + 1);
  });

  it("tabulka RARITY_MULT a pauza před vlnou", () => {
    assert.deepEqual(
      (["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const).map((r) => RARITY_MULT[r].affixes),
      [0, 1, 2, 2, 3, 3],
    );
    assert.equal(RARITY_MULT.mythic.dmg, 1.72);
    assert.equal(WAVE_BREAK, 2.5);
  });

  it("struktura sektoru: 10 místností, elity 3+6, boss 10.", () => {
    assert.equal(SECTOR_SIZE, 10);
    assert.deepEqual(ELITE_POS, [2, 5]);
    assert.equal(BOSS_POS, 9);
  });
});

describe("faze hry a anomalie", () => {
  it("faze podle sektoru: 1. early, 2.–3. mid, 4.+ endgame", () => {
    assert.equal(gamePhaseFor(0), "early");
    assert.equal(gamePhaseFor(-1), "early");
    assert.equal(gamePhaseFor(1), "mid");
    assert.equal(gamePhaseFor(2), "mid");
    assert.equal(gamePhaseFor(3), "endgame");
    assert.equal(gamePhaseFor(9), "endgame");
  });

  it("sektor 1 bez anomalie, vyssi deterministicky 1 ze 6", () => {
    assert.equal(ANOMALIES.length, 6);
    assert.equal(anomalyForSector("TEST", 0), null);
    const a = anomalyForSector("TEST", 1);
    assert.equal(a, anomalyForSector("TEST", 1));
    assert.ok(ANOMALIES.some((x) => x.id === a));
    assert.ok(ANOMALIES.some((x) => x.id === anomalyForSector("TEST", 3)));
  });

  it("beh nese fazi i anomalii do snapshotu", () => {
    const early = new Run("PHASE");
    assert.equal(early.gamePhase, "early");
    assert.equal(early.anomaly, null);
    assert.equal(early.snapshot().gamePhase, "early");
    const mid = new Run("PHASE", { startSector: 1 });
    assert.equal(mid.gamePhase, "mid");
    assert.equal(mid.anomaly, anomalyForSector("PHASE", 1));
    assert.equal(mid.statsSnap().anomaly, mid.anomaly);
    const end = new Run("PHASE", { startSector: 3 });
    assert.equal(end.gamePhase, "endgame");
    assert.ok(end.isHlubina);
  });

  it("hlubina: elita 2 affixy, boss minimum legendary", () => {
    const rng = mulberry32(99);
    const elite = rollAffixes(rng, "grunt", true, 3, true);
    assert.equal(elite.length, 2);
    assert.notEqual(elite[0], elite[1]);
    const run = new Run("HLUBINA", { startSector: 3, affixesUnlocked: true });
    run.roomIndex = 9;
    run.room = generateRoom(run.roomRng, 9, undefined, 40);
    assert.ok(run.room.isBoss);
    run.generateLoot();
    const ranks = run.loot.map((o) =>
      o.kind === "heal"
        ? -1
        : RARITY_ORDER.indexOf(
            o.kind === "weapon" ? o.weapon.rarity : o.kind === "ability" ? o.ability.rarity : o.kind === "mod" ? o.mod.rarity : o.passive.rarity,
          ),
    );
    assert.ok(Math.max(...ranks) >= 5, "hlubina boss bez legendary");
  });
});

describe("faze bosse", () => {
  it("prahy 0.7 a 0.3", () => {
    assert.equal(bossPhaseFor(1), 1);
    assert.equal(bossPhaseFor(0.71), 1);
    assert.equal(bossPhaseFor(0.7), 2);
    assert.equal(bossPhaseFor(0.31), 2);
    assert.equal(bossPhaseFor(0.3), 3);
    assert.equal(bossPhaseFor(0), 3);
  });

  it("vyssi faze = vic strel a rychlejsi prebiti", () => {
    assert.ok(BOSS_PHASE_STATS[2].shots > BOSS_PHASE_STATS[1].shots);
    assert.ok(BOSS_PHASE_STATS[3].shots > BOSS_PHASE_STATS[2].shots);
    assert.ok(BOSS_PHASE_STATS[2].fireCd < BOSS_PHASE_STATS[1].fireCd);
    assert.ok(BOSS_PHASE_STATS[3].fireCd < BOSS_PHASE_STATS[2].fireCd);
    assert.equal(BOSS_PHASE_ADDS[1].length, 0);
    assert.ok(BOSS_PHASE_ADDS[2].length > 0 && BOSS_PHASE_ADDS[3].length > 0);
  });

  it("prechod faze v simulaci prida adds a zrychli", () => {
    const run = new Run("PHASE");
    run.spawnEnemy("boss", 200, 200);
    const boss = run.enemies.find((e) => e.active && e.kind === "boss");
    assert.ok(boss);
    assert.equal(boss.phase, 1);
    const speed1 = boss.speed;
    const before = run.enemies.filter((e) => e.active).length;
    boss.hp = boss.maxHp * 0.6;
    for (let i = 0; i < 3; i++) run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.equal(boss.phase, 2);
    assert.ok(run.enemies.filter((e) => e.active).length > before, "faze 2 nepridala adds");
    assert.ok(boss.speed > speed1);
    boss.hp = boss.maxHp * 0.2;
    for (let i = 0; i < 3; i++) run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.equal(boss.phase, 3);
  });
});

describe("synergie", () => {
  it("burn+poison exploduje jen pri odemceni", () => {
    const locked = new Run("SYNOFF");
    locked.spawnEnemy("grunt", 100, 100);
    const a = locked.enemies.find((e) => e.active);
    assert.ok(a);
    a.burn = 1;
    a.poison = 1;
    const hpBefore = a.hp;
    for (let i = 0; i < 3; i++) locked.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.ok(a.burn > 0 && a.poison > 0, "zamcena synergie se spustila");

    const open = new Run("SYNON", { synergyUnlocked: true });
    open.spawnEnemy("grunt", 100, 100);
    const b = open.enemies.find((e) => e.active);
    assert.ok(b);
    b.burn = 1;
    b.poison = 1;
    for (let i = 0; i < 3; i++) open.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.equal(b.burn, 0);
    assert.equal(b.poison, 0);
    assert.ok(b.hp < hpBefore || !b.active, "vybuch neudelil dmg");
  });

  it("mraz+sok dava krehkost", () => {
    const run = new Run("FRAG", { synergyUnlocked: true });
    run.spawnEnemy("grunt", 100, 100);
    const e = run.enemies.find((x) => x.active);
    assert.ok(e);
    e.slow = 1;
    e.stun = 1;
    run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.ok(e.fragile > 0);
  });
});

describe("pauza pred vlnou", () => {
  it("druha vlna ceka na odpocet, nestartuje hned", () => {
    const run = new Run("WAVE");
    // Najdi mistnost se 2+ vlnami (vlny rostou s urovni i pozici v sektoru)
    for (let i = 0; i < 12 && run.room.waves.length < 2; i++) run.nextRoom();
    assert.ok(run.room.waves.length >= 2, "zadna mistnost nema 2 vlny");
    // Nech spawnout prvni vlnu (delay 0.7)
    for (let i = 0; i < 20 && !run.enemies.some((e) => e.active); i++) {
      run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    }
    assert.ok(run.enemies.some((e) => e.active), "prvni vlna se nespawnula");
    // Vycisti a over pauzu
    for (const e of run.enemies) if (e.active) run.killEnemy(e);
    run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.equal(run.waveI, 0, "druha vlna zacala okamzite");
    assert.ok(run.waveCountdown() > 0, "chybi odpocet");
    assert.ok(run.snapshot().waveIn > 0, "HUD neukazuje odpocet");
    // Po pauze vlna nabehne
    for (let i = 0; i < 70 && run.waveI === 0; i++) {
      run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    }
    assert.equal(run.waveI, 1, "druha vlna po pauze nenabehla");
  });

  it("posledni vlna pauzu nema", () => {
    const run = new Run("WAVELAST");
    for (let i = 0; i < 12 && run.room.waves.length < 2; i++) run.nextRoom();
    assert.ok(run.room.waves.length >= 2);
    const last = run.room.waves.length - 1;
    run.waveI = last;
    run.spawnedWave = last;
    run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.equal(run.waveI, last + 1, "posledni vlna mela pauzu");
    assert.equal(run.waveCountdown(), 0);
  });
});

describe("traskavy affix", () => {
  it("vybuch pri smrti zrani okoli", () => {
    const run = new Run("VOL");
    run.spawnEnemy("grunt", 100, 100);
    run.spawnEnemy("grunt", 120, 100);
    const [a, b] = run.enemies.filter((e) => e.active);
    assert.ok(a && b);
    a.affixes = ["volatile"];
    const hpBefore = b.hp;
    run.killEnemy(a);
    assert.ok(b.hp < hpBefore);
  });
});

function memoryStorage(): void {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  (globalThis as unknown as { localStorage?: unknown }).localStorage = mock;
}

describe("kodex", () => {
  it("obsahuje vsechny sberatelne zdroje bez duplicit", () => {
    const entries = codexEntries();
    const expected =
      ENEMY_ORDER.length +
      ELITE_AFFIXES.length +
      SYNERGIES.length +
      DEFAULT_UNIQUES.length +
      new Set(DEFAULT_WEAPON_DEFS.map((w) => w.archetype)).size +
      DEFAULT_ABILITY_DEFS.length +
      DEFAULT_PASSIVE_DEFS.length +
      MUTATORS.length +
      ANOMALIES.length +
      SECTOR_MODS.length;
    assert.equal(entries.length, expected);
    for (const c of CODEX_CATEGORIES) {
      assert.ok(
        entries.some((e) => e.cat === c.id),
        `prazdna kategorie ${c.id}`,
      );
    }
    assert.equal(new Set(entries.map((e) => `${e.cat}:${e.id}`)).size, entries.length);
  });

  it("bonus je presny soucet odemcenych polozek", () => {
    const list = [
      { cat: "enemy" as const, id: "grunt", name: "G", desc: "", bonus: { hp: 2, dmgPct: 0, speedPct: 0, crit: 0 } },
      { cat: "affix" as const, id: "volatile", name: "V", desc: "", bonus: { hp: 0, dmgPct: 0.005, speedPct: 0, crit: 0 } },
    ];
    assert.deepEqual(codexBonus(new Set(["enemy:grunt", "affix:volatile"]), list), {
      hp: 2,
      dmgPct: 0.005,
      speedPct: 0,
      crit: 0,
    });
    assert.deepEqual(codexProgress(new Set(["enemy:grunt"]), list), { done: 1, total: 2 });
  });

  it("beh aplikuje bonus pri startu", () => {
    memoryStorage();
    localStorage.setItem("vaultbreak.codex.v1", JSON.stringify(["enemy:grunt", "synergy:toxic"]));
    const run = new Run("CODEXHP");
    assert.equal(run.codex.hp, 2);
    assert.equal(run.codex.dmgPct, 0.01);
    assert.equal(run.player.maxHp, Math.max(20, 100 + mutAdd(run.mutators, "maxHp") + 2));
  });

  it("zabiti, synergie, srot a boss se zapisuji", () => {
    memoryStorage();
    const run = new Run("CODEXPLAY", { synergyUnlocked: true });
    run.spawnEnemy("grunt", 100, 100);
    const e = run.enemies.find((x) => x.active);
    assert.ok(e);
    e.affixes = ["volatile"];
    run.killEnemy(e);
    assert.ok(loadCodex().has("enemy:grunt"));
    assert.ok(loadCodex().has("affix:volatile"));
    assert.ok(loadCodex().has(`archetype:${run.weapons[run.player.slot]?.archetype}`));
    run.generateLoot();
    const gained = run.scrapLootValue();
    run.scrapLoot();
    assert.equal(run.scrapEarned, gained);
    run.spawnEnemy("grunt", 200, 200);
    const f = run.enemies.find((x) => x.active);
    assert.ok(f);
    f.burn = 1;
    f.poison = 1;
    for (let i = 0; i < 3; i++) run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.ok(loadCodex().has("synergy:toxic"));
    run.spawnEnemy("boss", 300, 300);
    const boss = run.enemies.find((x) => x.active && x.kind === "boss");
    assert.ok(boss);
    run.killEnemy(boss);
    assert.equal(run.bossesKilled, 1);
    assert.ok(loadCodex().has("enemy:boss"));
  });
});

describe("achievementy", () => {
  it("katalog 12 a prahove hranice", () => {
    assert.equal(ACHIEVEMENTS.length, 12);
    const none = earnedAchievements({ totalKills: 99, totalScrap: 499, bossesKilled: 4, maxSector: 2, runs: 49, codexCount: 14 });
    assert.deepEqual(none, []);
    const all = earnedAchievements({ totalKills: 5000, totalScrap: 2500, bossesKilled: 5, maxSector: 5, runs: 50, codexCount: 70 });
    assert.equal(all.length, 12);
  });

  it("odemceni je trvale a vraci jen nove", () => {
    memoryStorage();
    const stats = { totalKills: 100, totalScrap: 0, bossesKilled: 0, maxSector: 1, runs: 1, codexCount: 0 };
    assert.deepEqual(unlockAchievements(stats), ["killer-100"]);
    assert.deepEqual(unlockAchievements(stats), []);
    assert.deepEqual(loadAchievements(), ["killer-100"]);
  });
});

describe("save v3", () => {
  it("migruje starsi savy a scita kumulativni statistiky", () => {
    memoryStorage();
    localStorage.setItem(
      "vaultbreak-v1",
      JSON.stringify({ version: 2, bestRooms: 5, bestKills: 10, bestTime: 60, runs: 2, lastSeed: "X", bestLevel: 5, maxSector: 2 }),
    );
    const migrated = loadSave();
    assert.equal(migrated.version, 3);
    assert.equal(migrated.totalKills, 0);
    assert.equal(migrated.totalScrap, 0);
    assert.equal(migrated.bossesKilled, 0);
    const next = recordRun(10, 25, 60, "SEED", 40, 2);
    assert.equal(next.version, 3);
    assert.equal(next.runs, 3);
    assert.equal(next.bestLevel, 10);
    assert.equal(next.totalKills, 25);
    assert.equal(next.totalScrap, 40);
    assert.equal(next.bossesKilled, 2);
    assert.deepEqual(loadSave(), next);
    assert.equal(profileStats(next, 7).codexCount, 7);
  });
});

describe("reset progressu", () => {
  it("smaze herni progress a necha nastaveni", () => {
    memoryStorage();
    localStorage.setItem("vaultbreak-v1", JSON.stringify({ version: 3, bestKills: 50 }));
    localStorage.setItem("vaultbreak.codex.v1", JSON.stringify(["enemy:grunt"]));
    localStorage.setItem("vaultbreak.achievements.v1", JSON.stringify(["killer-100"]));
    localStorage.setItem("vaultbreak.badges.v1", JSON.stringify(["prvni-krev"]));
    localStorage.setItem("vaultbreak.daily.v1", JSON.stringify({}));
    localStorage.setItem("vaultbreak.weekly.v1", JSON.stringify({}));
    localStorage.setItem("vaultbreak.board.v1", JSON.stringify({ daily: [], weekly: [] }));
    localStorage.setItem("vaultbreak.blueprints.v1", JSON.stringify({ pistol: 30 }));
    localStorage.setItem("vaultbreak.armory.v1", "pistol");
    localStorage.setItem("vaultbreak.vol.sfx", "0.5");
    resetProgress();
    for (const key of [
      "vaultbreak-v1",
      "vaultbreak.codex.v1",
      "vaultbreak.achievements.v1",
      "vaultbreak.badges.v1",
      "vaultbreak.daily.v1",
      "vaultbreak.weekly.v1",
      "vaultbreak.board.v1",
      "vaultbreak.blueprints.v1",
      "vaultbreak.armory.v1",
    ]) {
      assert.equal(localStorage.getItem(key), null, `zbyl klic ${key}`);
    }
    assert.equal(localStorage.getItem("vaultbreak.vol.sfx"), "0.5");
    assert.equal(loadSave().bestKills, 0);
    assert.equal(loadCodex().size, 0);
    assert.deepEqual(loadAchievements(), []);
  });
});

describe("zebricek", () => {
  it("radi sestupne, drzi nejlepsi za obdobi a strop 10", () => {
    memoryStorage();
    assert.deepEqual(loadBoard(), { daily: [], weekly: [] });
    recordBoard("daily", "2026-10-13", "DEN-AAAAAA", 8, 1000);
    recordBoard("daily", "2026-10-13", "DEN-AAAAAA", 5, 2000);
    recordBoard("daily", "2026-10-12", "DEN-BBBBBB", 12, 3000);
    const board = loadBoard();
    assert.equal(board.daily.length, 2);
    assert.equal(board.daily[0]?.level, 12);
    assert.equal(board.daily[1]?.seed, "DEN-AAAAAA");
    assert.equal(board.daily[1]?.level, 8);
    for (let i = 0; i < 12; i++) {
      recordBoard("weekly", `2026-W${i}`, `TYD-XXXXX${i}`, i, 4000 + i);
    }
    assert.equal(loadBoard().weekly.length, 10);
    assert.equal(loadBoard().weekly[0]?.level, 11);
    assert.deepEqual(loadBoard().daily.length, 2);
  });
});

describe("zvuky schopnosti", () => {
  it("kazdy druh ma platny hlas", () => {
    assert.equal(Object.keys(ABILITY_VOICE).length, ABILITY_KINDS.length);
    for (const kind of ABILITY_KINDS) {
      const v = ABILITY_VOICE[kind];
      assert.ok(v, `chybi hlas: ${kind}`);
      assert.ok(Number.isFinite(v.freq) && v.freq >= 40, `spatna frekvence: ${kind}`);
      assert.ok(Number.isFinite(v.dur) && v.dur > 0 && v.dur <= 1, `spatna delka: ${kind}`);
      assert.ok(["sine", "square", "sawtooth", "triangle"].includes(v.type), `spatny prubeh: ${kind}`);
    }
  });
});

describe("statistiky behu", () => {
  it("cita dmg, zasahy a vystrely", () => {
    memoryStorage();
    const run = new Run("STATSRUN");
    run.spawnEnemy("grunt", 200, 200);
    const e = run.enemies.find((x) => x.active);
    assert.ok(e);
    run.hurtEnemy(e, 10, 0, 0, 0, 0, 0, 0, 0, 0, false);
    assert.ok(run.dmgDealt > 0);
    run.player.invuln = 0;
    run.player.dashT = 0;
    run.hurtPlayer(20);
    assert.ok(run.dmgTaken > 0);
    run.fireWeapon();
    assert.ok(run.shotsFired > 0);
    const snap = run.snapshot();
    assert.equal(snap.dmgDealt, run.dmgDealt);
    assert.equal(snap.shotsFired, run.shotsFired);
  });
});

describe("tutorial", () => {
  it("kroky postupuji 0-3 a pak hotovo", () => {
    assert.equal(tutorialStepFor(0, false, false, false), 0);
    assert.equal(tutorialStepFor(3, false, false, false), 1);
    assert.equal(tutorialStepFor(3, true, false, false), 2);
    assert.equal(tutorialStepFor(3, true, true, false), 3);
    assert.equal(tutorialStepFor(3, true, true, true), -1);
    assert.equal(Object.keys(TUTORIAL_TEXTS).length, 4);
  });

  it("dokonceni se persistuje", () => {
    memoryStorage();
    assert.equal(isTutorialDone(), false);
    completeTutorial();
    assert.equal(isTutorialDone(), true);
  });
});

describe("skalovani (§21)", () => {
  it("klesajici vynosy: +100 % → +67 %, postih symetricky", () => {
    assert.ok(Math.abs(drBonus(1) - 2 / 3) < 1e-9);
    assert.ok(Math.abs(drBonus(0.5) - 0.4) < 1e-9);
    assert.ok(Math.abs(drBonus(0.2) - 0.2 / 1.1) < 1e-9);
    assert.ok(Math.abs(drBonus(-0.2) + 0.2 / 1.1) < 1e-9);
    assert.equal(drBonus(0), 0);
  });

  it("buckety se nasobi, kodex naplno", () => {
    assert.equal(damageBuckets({ mut: 1, codexPct: 0, trait: 0 }), 1);
    const got = damageBuckets({ mut: 1.2, codexPct: 0.03, trait: 0 });
    assert.ok(Math.abs(got - (1 + 0.2 / 1.1) * 1.03) < 1e-9);
  });

  it("zbroj: krivka urovne, strop faktoru, stropy kritu", () => {
    assert.equal(enemyArmorForLevel(1), 0);
    assert.equal(enemyArmorForLevel(10), 0);
    assert.ok(Math.abs(enemyArmorForLevel(20) - 0.15) < 1e-9);
    assert.equal(enemyArmorForLevel(40), 0.3);
    assert.ok(Math.abs(armorFactor(0.2, 0) - 0.8) < 1e-9);
    assert.ok(Math.abs(armorFactor(0.2, 0.2) - 1) < 1e-9);
    assert.ok(Math.abs(armorFactor(0.9, 0) - 0.55) < 1e-9);
    assert.equal(CRIT_CHANCE_CAP, 0.6);
    assert.equal(CRIT_MULT_CAP, 3);
  });

  it("nepritel nese zbroj z urovne", () => {
    memoryStorage();
    const low = new Run("ARMORLO");
    low.spawnEnemy("grunt", 200, 200);
    const g = low.enemies.find((x) => x.active)!;
    assert.equal(g.armor, 0);
    const high = new Run("ARMORHI", { startSector: 2 });
    high.spawnEnemy("grunt", 200, 200);
    const h = high.enemies.find((x) => x.active)!;
    assert.ok(h.armor > 0, "grunt na LVL 11 bez zbroje");
  });

  it("pruraznost ignoruje zbroj", () => {
    memoryStorage();
    const run = new Run("PEN10");
    run.mutators = [];
    run.spawnEnemy("tank", 200, 200);
    const e = run.enemies.find((x) => x.active)!;
    e.hp = 10000;
    e.maxHp = 10000;
    e.armor = 0.2;
    run.hurtEnemy(e, 100, 0, 0, 0, 0, 0, 0, 0, 0, false, 0, 0);
    assert.ok(Math.abs(10000 - e.hp - 80) < 0.5, `bez pruraznosti: ${10000 - e.hp}`);
    const beforePen = e.hp;
    run.hurtEnemy(e, 100, 0, 0, 0, 0, 0, 0, 0, 0, false, 0, 0.2);
    assert.ok(Math.abs(beforePen - e.hp - 100) < 0.5, `s pruraznosti: ${beforePen - e.hp}`);
  });

  it("kriticke stropy 60 % a ×3 ve strelbe", () => {
    memoryStorage();
    const run = new Run("CRITCAP");
    const base = run.weapons[0].stats.damage;
    run.weapons[0] = {
      ...run.weapons[0],
      stats: { ...run.weapons[0].stats, critChance: 1, critMult: 10 },
    };
    for (let i = 0; i < 300; i++) {
      run.player.mag[0] = 999;
      run.player.reload[0] = 0;
      run.player.fireCd = 0;
      run.fireWeapon();
    }
    const fired = run.bullets.filter((b) => b.active);
    assert.ok(fired.length > 100, "malo vystrelu");
    assert.ok(fired.some((b) => !b.crit), "strop sance nefunguje");
    assert.ok(fired.some((b) => b.crit), "kritiky zmizely uplne");
    for (const b of fired) {
      assert.ok(b.damage <= base * 3 + 0.01, `strop nasobitele nefunguje: ${b.damage}`);
    }
  });

  it("torment: +25 % sily nepritele, lepsi srot", () => {
    memoryStorage();
    const normal = new Run("TORM0");
    normal.spawnEnemy("grunt", 200, 200);
    const n = normal.enemies.find((x) => x.active)!;
    const tor = new Run("TORM1", { torment: true });
    tor.spawnEnemy("grunt", 200, 200);
    const t = tor.enemies.find((x) => x.active)!;
    assert.ok(Math.abs(t.maxHp / n.maxHp - 1.25) < 0.01);
    assert.ok(Math.abs(t.dmgMult / n.dmgMult - 1.25) < 0.01);
    assert.equal(tor.torment, true);
    normal.mutators = [];
    tor.mutators = [];
    normal.loot = [{ kind: "heal", amount: 0.4, name: "Medkit", desc: "" }];
    tor.loot = [{ kind: "heal", amount: 0.4, name: "Medkit", desc: "" }];
    assert.equal(normal.scrapLootValue(), 5);
    assert.equal(tor.scrapLootValue(), 6);
  });
});

describe("cesta (spawn tabulka)", () => {
  it("pokryva vsechny druhy mimo bosse a sedi s gatingem", () => {
    const kinds = ENEMY_SPAWN.map((e) => e.kind);
    assert.equal(new Set(kinds).size, kinds.length);
    assert.equal(kinds.length, ENEMY_ORDER.length - 1);
    for (const k of ENEMY_ORDER) {
      if (k === "boss") continue;
      assert.ok(kinds.includes(k), `chybi ${k}`);
    }
    for (const e of ENEMY_SPAWN) {
      assert.ok(e.minLevel >= 1 && e.cost >= 1 && e.weight > 0, `nesmysl: ${e.kind}`);
    }
    const min = Object.fromEntries(ENEMY_SPAWN.map((e) => [e.kind, e.minLevel])) as Record<string, number>;
    assert.equal(min.grunt, 1);
    assert.equal(min.bomber, 2);
    assert.equal(min.splitter, 3);
    assert.equal(min.tank, 4);
    assert.equal(min.sniper, 5);
    assert.equal(min.spravce, 20);
  });

  it("odemykaci tabulka je serazena a kompletni", () => {
    const levels = UNLOCKS.map((u) => u.level);
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
    assert.equal(UNLOCKS.length, 8);
  });
});

describe("dilna (§23)", () => {
  it("katalog 12 modu ve 3 rodinach", () => {
    assert.equal(DEFAULT_MOD_DEFS.length, 12);
    const fams = new Set(DEFAULT_MOD_DEFS.map((d) => d.family));
    assert.deepEqual([...fams].sort(), ["hlubina", "prototyp", "straz"]);
    assert.equal(new Set(DEFAULT_MOD_DEFS.map((d) => d.id)).size, 12);
  });

  it("generovani modu: rarita, rodina, popis sedi", () => {
    const m = generateMod(mulberry32(11), 5);
    assert.ok(m.id.startsWith("m-"));
    assert.ok(m.name.length > 0 && m.desc.length > 0);
    assert.ok(!m.desc.includes("{value}"));
    assert.ok(["straz", "hlubina", "prototyp"].includes(m.family));
  });

  it("applyMods: cisla, chovani, element i setovy bonus", () => {
    memoryStorage();
    const run = new Run("MODAPPLY");
    const base = { ...run.weapons[0], mods: [], slots: 3 };
    assert.equal(applyMods(base), base);
    const dmg = generateMod(mulberry32(21), 1, undefined, DEFAULT_MOD_DEFS.filter((d) => d.id === "pretlakova-komora"));
    const w1 = applyMods({ ...base, mods: [dmg] });
    assert.ok(w1.stats.damage > base.stats.damage);
    const fire = generateMod(mulberry32(22), 1, undefined, DEFAULT_MOD_DEFS.filter((d) => d.id === "ohnivy-cip"));
    const w2 = applyMods({ ...base, mods: [fire] });
    assert.equal(w2.element, "fire");
    assert.ok((w2.behaviors.burn ?? 0) > 0);
    const chain = generateMod(mulberry32(23), 1, undefined, DEFAULT_MOD_DEFS.filter((d) => d.id === "retezovy-clanek"));
    const w3 = applyMods({ ...base, mods: [fire, chain] });
    assert.ok(w3.stats.damage >= w2.stats.damage);
    assert.equal(familyBonusOf([fire]).mult, 1);
    // Dva prototypy = setovy bonus
    const boom = generateMod(mulberry32(24), 1, undefined, DEFAULT_MOD_DEFS.filter((d) => d.id === "tezka-hlavice"));
    assert.equal(familyBonusOf([chain, boom]).mult, 1.1);
  });

  it("sloty podle rarity + ranku, unikaty 0", () => {
    assert.equal(maxSlotsFor("common"), 1);
    assert.equal(maxSlotsFor("rare"), 2);
    assert.equal(maxSlotsFor("mythic"), 3);
    assert.equal(killsToRank(0), 0);
    assert.equal(killsToRank(25), 1);
    assert.equal(killsToRank(60), 2);
    assert.equal(killsToRank(120), 3);
    assert.equal(killsToRank(200), 4);
    assert.equal(blueprintDamageMult(0), 1);
    assert.equal(blueprintDamageMult(1), 1.05);
    assert.equal(blueprintDamageMult(4), 1.15);
    assert.equal(blueprintSlots(2), 0);
    assert.equal(blueprintSlots(3), 1);
  });

  it("socket/unsocket v behu s limitem slotu", () => {
    memoryStorage();
    const run = new Run("SOCKET");
    const mod = generateMod(mulberry32(31), 1);
    run.mods.push(mod);
    assert.equal(run.socketMod("neexistuje", 0), false);
    assert.equal(run.socketMod(mod.id, 0), true);
    assert.equal(run.weapons[0].mods.length, 1);
    assert.equal(run.mods.length, 0);
    // Druhy mod do common ramu (1 slot) uz nejde
    const mod2 = generateMod(mulberry32(32), 1);
    run.mods.push(mod2);
    assert.equal(run.socketMod(mod2.id, 0), false);
    assert.equal(run.unsocketMod(0, 5), false);
    assert.equal(run.unsocketMod(0, 0), true);
    assert.equal(run.weapons[0].mods.length, 0);
    assert.equal(run.mods.length, 2);
  });

  it("zabijeni sčítá blueprinty a zbrojnice se persistuje", () => {
    memoryStorage();
    assert.deepEqual(loadBlueprints(), {});
    recordBlueprintKills({ pistol: 30, shotgun: 10 });
    assert.equal(loadBlueprints().pistol, 30);
    assert.equal(killsToRank(loadBlueprints().pistol ?? 0), 1);
    recordBlueprintKills({ pistol: 40 });
    assert.equal(killsToRank(loadBlueprints().pistol ?? 0), 2);
    assert.equal(loadArmory(), null);
    saveArmory("shotgun");
    assert.equal(loadArmory(), "shotgun");
    saveArmory(null);
    assert.equal(loadArmory(), null);
  });

  it("loot umi nabidnout mod a plny inventar ho rozebere", () => {
    memoryStorage();
    let found = false;
    for (let i = 0; i < 60 && !found; i++) {
      const run = new Run(`MODLOOT${i}`);
      run.generateLoot();
      found = run.loot.some((o) => o.kind === "mod");
    }
    assert.ok(found, "mod nikdy nepadl");
    const run = new Run("MODFULL");
    for (let i = 0; i < 8; i++) run.mods.push(generateMod(mulberry32(40 + i), 1));
    const scrapBefore = run.scrap;
    run.loot = [{ kind: "mod", mod: generateMod(mulberry32(99), 1) }];
    run.applyLoot(0);
    assert.equal(run.mods.length, 8);
    assert.ok(run.scrap > scrapBefore);
  });
});

describe("slovnicek", () => {  it("kazdy pojem ma nazev i definici", () => {
    const keys = Object.keys(GLOSSARY);
    assert.ok(keys.length >= 25, `malo pojmu: ${keys.length}`);
    for (const key of keys) {
      const entry = glossaryDef(key as keyof typeof GLOSSARY);
      assert.ok(entry.term.trim().length > 0, `prazdny nazev: ${key}`);
      assert.ok(entry.def.trim().length > 10, `kratka definice: ${key}`);
    }
  });
});

describe("obsah 1.0", () => {  it("vsech 36 schopnosti se sesle bez padu", () => {
    memoryStorage();
    assert.equal(DEFAULT_ABILITY_DEFS.length, 36);
    for (const def of DEFAULT_ABILITY_DEFS) {
      const run = new Run(`AB-${def.id}`);
      run.spawnEnemy("grunt", 200, 200);
      run.ability = generateAbility(mulberry32(7), 1, false, undefined, [def]);
      assert.equal(run.ability.kind, def.kind);
      run.abilityCd = 0;
      run.castAbility();
      assert.equal(run.abilityCd, run.ability.cooldown);
    }
  });

  it("vsichni nepratele jdou spawnout, zranit a zapsat do kodexu", () => {
    memoryStorage();
    assert.equal(ENEMY_ORDER.length, 28);
    for (const kind of ENEMY_ORDER) {
      if (kind === "boss") continue;
      const run = new Run("ENEMY10");
      run.spawnEnemy(kind, 200, 200);
      const e = run.enemies.find((x) => x.active && x.kind === kind);
      assert.ok(e, `nespawnul se ${kind}`);
      for (let i = 0; i < 5; i++) run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
      assert.ok(e.active, `${kind} zmizel sam`);
      run.killEnemy(e);
      assert.ok(loadCodex().has(`enemy:${kind}`), `kodex nema ${kind}`);
    }
  });

  it("medik leci a matka lihne", () => {
    memoryStorage();
    const run = new Run("SUPPORT");
    run.spawnEnemy("grunt", 200, 200);
    run.spawnEnemy("medik", 205, 200);
    const grunt = run.enemies.find((x) => x.active && x.kind === "grunt");
    assert.ok(grunt);
    grunt.hp = grunt.maxHp * 0.5;
    for (let i = 0; i < 50; i++) run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.ok(grunt.hp > grunt.maxHp * 0.5, "medik nelecil");

    memoryStorage();
    const run2 = new Run("SPAWN10");
    run2.spawnEnemy("matka", 200, 200);
    let nearMatka = false;
    for (let i = 0; i < 90; i++) {
      run2.update(0.05, NEUTRAL_ACTIONS, 800, 600);
      const matka = run2.enemies.find((x) => x.active && x.kind === "matka");
      if (
        matka &&
        run2.enemies.some((x) => x.active && x.kind === "lezec" && Math.hypot(x.x - matka.x, x.y - matka.y) < 40)
      ) {
        nearMatka = true;
      }
      for (const x of run2.enemies) {
        if (x.active && x !== matka) run2.killEnemy(x);
      }
    }
    assert.ok(nearMatka, "matka nevylhla lezce");
  });

  it("nove pasivky funguji (regen, scavenger, greed)", () => {
    memoryStorage();
    const run = new Run("PASNEW10");
    run.player.invuln = 9999;
    run.player.hp = 50;
    run.passives.push({ id: "t-regen", kind: "regen", name: "R", desc: "", rarity: "common", value: 5 });
    for (let i = 0; i < 20; i++) run.update(0.05, NEUTRAL_ACTIONS, 800, 600);
    assert.ok(run.player.hp >= 54.5, `regen neleci (${run.player.hp})`);

    run.mutators = [];
    run.loot = [{ kind: "heal", amount: 0.4, name: "Medkit", desc: "" }];
    assert.equal(run.scrapLootValue(), 5);
    run.passives.push({ id: "t-scav", kind: "scavenger", name: "S", desc: "", rarity: "common", value: 0.2 });
    assert.equal(run.scrapLootValue(), 6);

    run.player.hp = run.player.maxHp * 0.1;
    run.spawnEnemy("grunt", 200, 200);
    const g = run.enemies.find((x) => x.active && x.kind === "grunt");
    assert.ok(g);
    const before = g.hp;
    run.passives.push({ id: "t-greed", kind: "greed", name: "G", desc: "", rarity: "common", value: 0.2 });
    run.hurtEnemy(g, 100, 0, 0, 0, 0, 0, 0, 0, 0, false);
    const expectedGreed = 100 * damageBuckets({ mut: 1, codexPct: 0, trait: 0.2 * 0.9 });
    assert.ok(Math.abs(before - g.hp - expectedGreed) < 0.01, `greed neskálí (${before - g.hp})`);
  });

  it("nove portaly a anomalie meni loot a rerolly", () => {
    memoryStorage();
    const lib = new Run("LIBPORT10");
    lib.sectorMod = "library";
    lib.generateLoot();
    assert.equal(lib.loot.length, 3);
    assert.equal(lib.loot[1]?.kind, "ability");
    assert.equal(lib.loot[2]?.kind, "passive");
    assert.ok(lib.roomRerolls() >= 2);

    const market = new Run("MARKET10");
    market.sectorMod = "market";
    market.generateLoot();
    assert.equal(market.loot.length, 4);

    const famine = new Run("FAMINE10");
    famine.anomaly = "famine";
    famine.player.hp = 10;
    famine.generateLoot();
    assert.ok(!famine.loot.some((o) => o.kind === "heal"), "hladomor dal medkit");
  });
});

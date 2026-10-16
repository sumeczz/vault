import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Bot,
  BookMarked,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Copy,
  Crosshair,
  Crown,
  Dices,
  DoorOpen,
  Flame,
  FlaskConical,
  Heart,
  HelpCircle,
  Home,
  Hourglass,
  Lock,
  Map,
  Orbit,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  ShoppingBag,
  Shield,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  Trash2,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Wind,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { resumeAudio, setMuted, sfxPlay, unlockAudio } from "./audio";
import { getMusicVolume, getSfxVolume, musicStart, musicStop, setMusicVolume, setSfxVolume } from "./audio";
import {
  bindInput,
  clearInjectedKeys,
  sampleInput,
  setInjectedKeys,
  setTouchAim,
  setTouchMove,
  tapAbility,
  tapDash,
  tapSwap,
} from "./input";
import { renderRun } from "./render";
import { randomSeedString } from "./rng";
import { AdminPanel } from "./AdminPanel";
import {
  defaultGameContent,
  readGameContent,
  saveGameContent,
  type GameContentCatalogs,
} from "./content-settings";
import {
  DEFAULT_RARITY_WEIGHTS,
  RARITY_WEIGHTS_STORAGE_KEY,
  readRarityWeights,
  type RarityWeights,
} from "./rarity-settings";
import {
  applyCharacterXp,
  CHARACTER_LEVEL_CAP,
  purchaseCharacterTalent,
  respecCharacterTalents,
  talentRespecCost,
  talentUnlockLevel,
  TALENT_REWARDS,
  grantCharacterRunMaterials,
  loadActiveCharacter,
  xpForNextLevel,
  type CharacterProgress,
  type CharacterTalentId,
  type CharacterActionResult,
} from "./characters";
import {
  craftCharacterWeapon,
  selectCraftedStarter,
  upgradeCharacterWeaponComponent,
  weaponFragmentSourceHint,
  weaponFragmentSources,
  weaponRecipe,
} from "./character-armory";
import {
  componentDefinition,
  componentsForSlot,
  previewComponentWeapon,
  weaponComponentCost,
  type WeaponComponentId,
  type WeaponComponentSlot,
} from "./weapon-components";
import type { WeaponDef } from "./weapons";
import { loadSave, recordRun, resetProgress, unlockSector, type SaveData } from "./save";
import { GLOSSARY } from "./glossary";
import { ACHIEVEMENTS, achievementDef, loadAchievements, profileStats, unlockAchievements, type AchievementId } from "./achievements";
import { CODEX_CATEGORIES, codexBonus, codexEntries, codexProgress, formatCodexBonus, loadCodex } from "./codex";
import { MOD_INV_MAX, Run, type GameEvent, type HudSnap, type StatsSnap } from "./sim";
import { getDifficulty, resetDifficulty, setDifficulty, type DifficultySettings } from "./difficulty";
import { dailySeed, loadDaily, recordDaily, weeklySeed, loadWeekly, recordWeekly, type DailyRecord, type WeeklyRecord } from "./daily";
import { WheelPopup } from "./WheelPopup";
import { recordBoard } from "./leaderboard";
import { TUTORIAL_TEXTS, completeTutorial, isTutorialDone, tutorialStepFor } from "./tutorial";
import { SECTOR_MODS, ANOMALIES, anomalyDef, anomalyForSector, sectorModById, shopOffers, type SectorModId, type ShopItemId } from "./expedition";
import { CHALLENGES, challengeDef, loadBadges } from "./challenges";
import { anomalyNameOf, buildCardData, downloadBuildCard, drawBuildCard, sectorModNameOf } from "./buildCard";
import { unlocksForLevel, UNLOCKS } from "./progression";
import { CRIT_CHANCE_CAP, CRIT_MULT_CAP, drBonus } from "./scaling";
import {
  applyMods,
  BLUEPRINT_RANK_KILLS,
  familyBonusOf,
  killsToRank,
  loadArmory,
  loadBlueprints,
  MOD_FAMILIES,
  recordBlueprintKills,
  saveArmory,
} from "./mods";
import { affixDef } from "./bestiary";
import { BOSS_PHASE_NAMES, ENEMY_ATTACK_LABEL, ENEMY_ATTACK, ENEMY_NAME, ENEMY_SPAWN, type BossPhase } from "./bestiary";
import { mutMult } from "./mutators";
import { RARITY_COLOR, RARITY_LABEL, ARCHETYPE_LABEL, ELEMENT_COLOR, MAGNET_R, type ArchetypeId, type Element, type LootOffer, type Rarity, type Weapon } from "./types";
import { dpsEstimate, starterWeapon, weaponBehaviorsList } from "./weapons";
import { AuthScreen } from "./auth-screen";
import { loadProfile, getProfileNickname } from "./auth";
import { EnemyIcon, MaterialIcon, TalentIcon, WeaponIcon } from "./ui-icons";

type Screen = "menu" | "postava" | "kovarna" | "help" | "admin" | "codex" | "achievements" | "cesta" | "slovnicek" | "stats" | "playing" | "paused" | "loot" | "dead" | "win" | "base" | "wheel";

/** Herní přehledy: boj a statistiky pauzují simulaci; dílna se otevře mezi vlnami. */
type PanelTab = "battle" | "stats" | "char" | "workshop";

function canOpenRunWorkshop(snapshot: HudSnap | null): boolean {
  return Boolean(snapshot && (
    snapshot.waveAwaiting
    || (snapshot.remaining === 0 && snapshot.wave < snapshot.waves && snapshot.waveIn > 0)
  ));
}

type WheelPending =
  | { mode: "new"; seed: string; startSector: number }
  | { mode: "portal"; mod: SectorModId };

function rarityClass(r: Rarity): string {
  return {
    common: "text-rarity-common",
    uncommon: "text-rarity-uncommon",
    rare: "text-rarity-rare",
    epic: "text-rarity-epic",
    legendary: "text-rarity-legendary",
    mythic: "text-rarity-mythic",
  }[r];
}

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run | null>(null);
  const screenRef = useRef<Screen>("menu");
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const [screen, setScreen] = useState<Screen>("menu");
  const [hud, setHud] = useState<HudSnap | null>(null);
  const [stats, setStats] = useState<StatsSnap | null>(null);
  const [loot, setLoot] = useState<LootOffer[]>([]);
  const [rerolls, setRerolls] = useState(1);
  const [panel, setPanel] = useState<null | PanelTab>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("vaultbreak.panel");
      if (raw === "battle" || raw === "char" || raw === "workshop") return raw;
      if (localStorage.getItem("vaultbreak.stats-open") === "1") return "battle";
    } catch {
      /* ignore */
    }
    return window.innerWidth >= 720 ? "battle" : null;
  });
  const panelRef = useRef<null | PanelTab>(panel);
  const [toasts, setToasts] = useState<{ id: number; kind: GameEvent["kind"]; text: string; sub?: string }[]>([]);
  const toastId = useRef(0);
  const [tutorialDone, setTutorialDone] = useState(() => isTutorialDone());
  const tutSeen = useRef({ loot: false, panel: false, base: false });

  /** Přidá události běhu do feedu; každá po ~4 s sama zmizí. */
  function pushToasts(evs: GameEvent[]) {
    if (evs.length === 0) return;
    const fresh = evs.map((e) => ({ ...e, id: ++toastId.current }));
    setToasts((t) => [...t, ...fresh].slice(-4));
    for (const f of fresh) {
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== f.id)), 4200);
    }
  }
  const [save, setSave] = useState<SaveData>({
    version: 6,
    bestRooms: 0,
    bestKills: 0,
    bestTime: 0,
    runs: 0,
    lastSeed: "",
    bestLevel: 0,
    maxSector: 1,
    totalKills: 0,
    totalScrap: 0,
    bossesKilled: 0,
    totalPlayTime: 0,
    totalShotsFired: 0,
    totalShotsHit: 0,
    totalDmgDealt: 0,
    totalDmgTaken: 0,
    bestRoom: 0,
  });
  const [character, setCharacter] = useState<CharacterProgress>({
    id: "operative-1",
    name: "Operative",
    level: 1,
    xp: 0,
    xpTotal: 0,
    talentPoints: 0,
    talents: { vitality: 0, ballistics: 0, scavenging: 0 },
    materials: { scrap: 0, alloys: 0, cores: 0, catalysts: {}, fragments: {} },
    craftedWeapons: [],
    weaponComponents: {},
    starterArchetype: null,
    respecCount: 0,
  });
  const [characterNotice, setCharacterNotice] = useState("");
  const [seed, setSeed] = useState("");
  const [startSector, setStartSector] = useState(1);
  const [torment, setTorment] = useState(false);
  const [armory, setArmory] = useState<ArchetypeId | null>(() => loadArmory());
  const [daily, setDaily] = useState<DailyRecord>(() => loadDaily());
  const [weekly, setWeekly] = useState<WeeklyRecord>(() => loadWeekly());
  const dailyActiveRef = useRef(false);
  const weeklyActiveRef = useRef(false);
  const wheelRef = useRef<WheelPending | null>(null);
  const [rarityWeights, setRarityWeights] = useState<RarityWeights | null>(null);
  const [difficulty, setDifficultyState] = useState<DifficultySettings>(() => getDifficulty());
  const [content, setContent] = useState<GameContentCatalogs>(() => defaultGameContent());
  const [mutedState, setMutedState] = useState(false);
  const [touch, setTouch] = useState(false);
  const [weaponPick, setWeaponPick] = useState<number | null>(null);
  const [boot, setBoot] = useState(false);
  const [freshAchievements, setFreshAchievements] = useState<AchievementId[]>([]);
  const [authed, setAuthed] = useState(false);

  /** Uloží profil a připíše nově splněné achievementy (pro hlášku na konci běhu). */
  function commitSave(next: SaveData) {
    setSave(next);
    setFreshAchievements(unlockAchievements(profileStats(next, codexProgress().done)));
  }

  screenRef.current = screen;

  useEffect(() => {
    setBoot(true);
    setSeed(randomSeedString());
    commitSave(loadSave());
    setCharacter(loadActiveCharacter());
    setRarityWeights(readRarityWeights());
    setContent(readGameContent());
    const p = loadProfile();
    setAuthed(!!p);
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
    setTouch(coarse);
    const onVis = () => resumeAudio();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Tutorial: sleduj viděné obrazovky; příchod do báze návod uzavře.
  useEffect(() => {
    if (screen === "loot") tutSeen.current.loot = true;
    if (screen === "base") {
      tutSeen.current.base = true;
      if (!isTutorialDone()) {
        completeTutorial();
        setTutorialDone(true);
      }
    }
  }, [screen]);

  useEffect(() => {
    if (panel !== null) tutSeen.current.panel = true;
  }, [panel]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // iOS Safari: React touch listenery jsou passive — gesta (scroll/zoom/callout)
    // se musi rusit nativne s { passive: false }, jinak berou dotyk packam.
    const stop = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (screenRef.current === "playing") e.preventDefault();
    };
    wrap.addEventListener("touchmove", onTouchMove, { passive: false });
    wrap.addEventListener("contextmenu", stop);
    wrap.addEventListener("gesturestart", stop as EventListener);
    return () => {
      wrap.removeEventListener("touchmove", onTouchMove);
      wrap.removeEventListener("contextmenu", stop);
      wrap.removeEventListener("gesturestart", stop as EventListener);
    };
  }, [boot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const unbind = bindInput(canvas);

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const hudAcc = { t: 0 };
    const loop = (now: number) => {
      const last = lastRef.current || now;
      const dt = Math.min(0.05, (now - last) / 1000);
      lastRef.current = now;
      const run = runRef.current;
      const sc = screenRef.current;
      if (run && (sc === "playing" || sc === "paused" || sc === "loot" || sc === "base")) {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        const actions = sampleInput();
        if (sc === "playing" && actions.justPause) {
          setPanelAndSave(null);
          setScreen("paused");
          screenRef.current = "paused";
        } else if (sc === "paused" && actions.justPause) {
          setScreen("playing");
          screenRef.current = "playing";
        } else if (sc === "playing") {
          if (actions.justStats) setPanelAndSave(panelRef.current === "stats" ? null : "stats");
          if (actions.justCharacter) setPanelAndSave(panelRef.current === "char" ? null : "char");
          if (actions.justPause) setPanelAndSave(null);
          run.paused = panelRef.current !== null;
          if (!actions.justStats && !actions.justCharacter && !actions.justPause) {
            run.update(dt, actions, w, h);
          }
          if (run.phase === "loot") {
            setLoot(run.loot);
            setRerolls(run.rerolls);
            setWeaponPick(null);
            setScreen("loot");
            screenRef.current = "loot";
            setHud(run.snapshot());
            setStats(run.statsSnap());
          } else if (run.phase === "base") {
            commitSave(unlockSector(run.sector + 1));
            setHud(run.snapshot());
            setStats(run.statsSnap());
            setScreen("base");
            screenRef.current = "base";
          } else if (run.phase === "dead") {
            finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled, run.shotsFired, run.shotsHit, run.dmgDealt, run.dmgTaken, run.level, run.runXp);
            setScreen("dead");
            screenRef.current = "dead";
            setHud(run.snapshot());
            setStats(run.statsSnap());
          } else if (run.phase === "win") {
            finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled, run.shotsFired, run.shotsHit, run.dmgDealt, run.dmgTaken, run.level, run.runXp);
            setScreen("win");
            screenRef.current = "win";
            setHud(run.snapshot());
            setStats(run.statsSnap());
          }
        } else {
          run.update(0, sampleInput(), w, h);
        }
        renderRun(ctx, run, w, h);
        hudAcc.t += dt;
        if (hudAcc.t > 0.1 && sc === "playing") {
          hudAcc.t = 0;
          setHud(run.snapshot());
          setStats(run.statsSnap());
          pushToasts(run.drainEvents());
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const qa = new URLSearchParams(window.location.search).has("qa") || import.meta.env.DEV;
    if (qa) {
      window.__controlsTest = {
        getYaw: () => runRef.current?.player.aim ?? 0,
        getSpeed: () => runRef.current?.getSpeed() ?? 0,
        getX: () => runRef.current?.player.x ?? 0,
        getY: () => runRef.current?.player.y ?? 0,
        setKeys: (codes: string[]) => {
          if (codes.length === 0) clearInjectedKeys();
          else setInjectedKeys(codes);
        },
        setSteer: () => undefined,
        clearRoom: () => {
          const run = runRef.current;
          if (!run) return;
          for (const e of run.enemies) if (e.active) run.killEnemy(e);
        },
        toBoss: () => {
          const run = runRef.current;
          if (!run) return;
          let guard = 0;
          while (!run.room.isBoss && guard++ < 12) run.nextRoom();
        },
        toBase: () => {
          runRef.current?.enterBase();
        },
      };
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      unbind();
      delete window.__controlsTest;
    };
  }, [boot]);

  function openWheel(pending: WheelPending) {
    unlockAudio();
    sfxPlay.ui();
    wheelRef.current = pending;
    setScreen("wheel");
    screenRef.current = "wheel";
  }

  function openNewRunWheel(useSeed?: string, sector1Based?: number, tormentRun?: boolean, armoryRun?: ArchetypeId | null) {
    const s = (useSeed || seed || randomSeedString()).toUpperCase();
    setSeed(s);
    if (tormentRun !== undefined) setTorment(tormentRun);
    if (armoryRun !== undefined) {
      setArmory(armoryRun);
      saveArmory(armoryRun);
    }
    openWheel({ mode: "new", seed: s, startSector: sector1Based ?? startSector });
  }

  function startRun(useSeed?: string, sector1Based?: number, tormentRun = torment, armoryRun = armory) {
    unlockAudio();
    sfxPlay.ui();
    setFreshAchievements([]);
    setPanelAndSave(null);
    tutSeen.current = { loot: false, panel: false, base: false };
    const s = (useSeed || seed || randomSeedString()).toUpperCase();
    setSeed(s);
    dailyActiveRef.current = s === dailySeed();
    weeklyActiveRef.current = s === weeklySeed();
    const activeCharacter = loadActiveCharacter();
    const sector0 = Math.max(0, (sector1Based ?? startSector) - 1);
    const unlocks = unlocksForLevel(loadSave().bestLevel);
    const run = new Run(s, {
      rarityWeights: rarityWeights ?? undefined,
      abilities: content.abilities,
      passives: content.passives,
      weapons: content.weapons,
      affixes: content.affixes,
      uniques: content.uniques,
      roomPlans: content.roomPlans,
      startSector: sector0,
      affixesUnlocked: unlocks.affix,
      synergyUnlocked: unlocks.synergy,
      veteran: unlocks.veteran,
      torment: tormentRun && unlocks.torment,
      starterArchetype: dailyActiveRef.current || weeklyActiveRef.current
        ? undefined
        : activeCharacter.starterArchetype ?? armoryRun ?? undefined,
      starterComponents: dailyActiveRef.current || weeklyActiveRef.current || !activeCharacter.starterArchetype
        ? undefined
        : activeCharacter.weaponComponents[activeCharacter.starterArchetype],
      characterTalents: activeCharacter.talents,
    });
    runRef.current = run;
    run.enterRoomCue();
    musicStart(run.room.isBoss ? "boss" : "explore");
    setHud(run.snapshot());
    setStats(run.statsSnap());
    setLoot([]);
    setScreen("playing");
    screenRef.current = "playing";
    lastRef.current = 0;
  }

  function finishRun(level: number, kills: number, time: number, runSeed: string, scrapEarned = 0, bossesKilled = 0, shotsFired = 0, shotsHit = 0, dmgDealt = 0, dmgTaken = 0, roomReached = 0, xpEarned = 0) {
    const run = runRef.current;
    if (run) recordBlueprintKills(run.blueprintKills);
    if (run && !run.rewardsBanked) {
      run.rewardsBanked = true;
      grantCharacterRunMaterials(run.runMaterials, run.scrapEarned);
    }
    commitSave(recordRun(level, kills, time, runSeed, scrapEarned, bossesKilled, shotsFired, shotsHit, dmgDealt, dmgTaken, roomReached, xpEarned));
    setCharacter(loadActiveCharacter());
    if (dailyActiveRef.current) {
      setDaily(recordDaily(level));
      recordBoard("daily", daily.key, runSeed, level);
    }
    if (weeklyActiveRef.current) {
      setWeekly(recordWeekly(level));
      recordBoard("weekly", weekly.key, runSeed, level);
    }
  }

  function reportCharacterAction(result: CharacterActionResult) {
    setCharacterNotice(result.message);
    if (result.ok) setCharacter(result.character);
  }

  function updateRarityWeights(next: RarityWeights | null) {
    setRarityWeights(next);
    try {
      if (next) localStorage.setItem(RARITY_WEIGHTS_STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(RARITY_WEIGHTS_STORAGE_KEY);
    } catch {
      return;
    }
  }

  function updateContent(next: GameContentCatalogs) {
    setContent(next);
    saveGameContent(next);
  }

  function afterLootAdvance() {
    const run = runRef.current;
    if (!run) return;
    setWeaponPick(null);
    setHud(run.snapshot());
    setStats(run.statsSnap());
    if (run.phase === "base") {
      commitSave(unlockSector(run.sector + 1));
      setScreen("base");
      screenRef.current = "base";
    } else if (run.phase === "win") {
      finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled, run.shotsFired, run.shotsHit, run.dmgDealt, run.dmgTaken, run.level, run.runXp);
      setScreen("win");
    } else {
      setScreen("playing");
      screenRef.current = "playing";
    }
  }

  function applyLoot(i: number, slot?: 0 | 1) {
    const run = runRef.current;
    if (!run) return;
    const offer = loot[i];
    if (offer?.kind === "weapon" && slot === undefined && run.weapons[1]) {
      setWeaponPick(i);
      return;
    }
    run.applyLoot(i, slot);
    afterLootAdvance();
  }

  function scrapLoot() {
    const run = runRef.current;
    if (!run || run.loot.length === 0) return;
    run.scrapLoot();
    afterLootAdvance();
  }

  function formatTime(t: number) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  /** Přepne panel přehledu a zapamatuje volbu. */
  function setPanelAndSave(next: null | PanelTab) {
    if (next === "workshop" && !canOpenRunWorkshop(hud)) return;
    panelRef.current = next;
    setPanel(next);
    if (runRef.current) runRef.current.paused = next !== null;
    try {
      localStorage.setItem("vaultbreak.panel", next ?? "");
    } catch {
      /* ignore */
    }
  }

  /** Dílna: zasadí / vyndá mod a překreslí HUD. */
  function refreshRunSnap() {
    const run = runRef.current;
    if (!run) return;
    setHud(run.snapshot());
    setStats(run.statsSnap());
  }

  function socketMod(modId: string, slot: 0 | 1) {
    const run = runRef.current;
    if (run?.socketMod(modId, slot)) refreshRunSnap();
  }

  function unsocketMod(slot: 0 | 1, idx: number) {
    const run = runRef.current;
    if (run?.unsocketMod(slot, idx)) refreshRunSnap();
  }

  if (!boot) {
    return (
      <div className="vb-game vb-grid relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-bg px-4 text-fg" aria-busy="true">
        <div className="vb-vignette absolute inset-0" aria-hidden="true" />
        <div className="relative flex w-full max-w-md flex-col items-center text-center">
          <p className="mb-3 font-mono text-xs tracking-[0.3em] text-ice">TREZOR 09</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            <span className="vb-title-gradient">VAULT</span>
            <span className="text-ice">BREAK</span>
          </h1>
          <div className="mt-5 h-1.5 w-24 overflow-hidden rounded-full bg-elevated" aria-hidden="true">
            <div className="vb-xp-fill h-full w-1/2 rounded-full" />
          </div>
          <p className="mt-3 font-mono text-[11px] tracking-[0.2em] text-subtle" role="status">
            Načítám trezor…
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="vb-game vb-grid relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
        <AuthScreen onAuthenticated={() => {
          setAuthed(true);
        }} />
      </div>
    );
  }

  const tutStep = tutorialDone ? -1 : tutorialStepFor(hud?.kills ?? 0, tutSeen.current.loot, tutSeen.current.panel, tutSeen.current.base);

  return (
    <div className="vb-game vb-grid relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
      <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none select-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ touchAction: "none" }}
        />
        {screen === "playing" && hud && (
          <Hud
            hud={hud}
            activePanel={panel}
            onPause={() => {
              setPanelAndSave(null);
              setScreen("paused");
              screenRef.current = "paused";
            }}
            onBattle={() => setPanelAndSave(panel === "battle" ? null : "battle")}
            onStats={() => setPanelAndSave(panel === "stats" ? null : "stats")}
            onCharacter={() => setPanelAndSave(panel === "char" ? null : "char")}
            onStartWave={() => {
              const run = runRef.current;
              if (!run) {
                console.error("[VaultBreak] runRef.current is null on Start vlna");
                return;
              }
              run.startWave();
            }}
          />
        )}
        {touch && screen === "playing" && <TouchLayer onCharacter={() => setPanelAndSave(panel === "char" ? null : "char")} />}
        {(screen === "playing" || screen === "paused") && panel && hud && stats && (
          <OverviewPanel
            tab={panel}
            onTab={(t) => setPanelAndSave(t)}
            onClose={() => setPanelAndSave(null)}
            hud={hud}
            stats={stats}
            canWorkshop={canOpenRunWorkshop(hud)}
            onSocket={socketMod}
            onUnsocket={unsocketMod}
          />
        )}
        {(screen === "playing" || screen === "paused") && <ToastFeed toasts={toasts} />}
        {screen === "playing" && !tutorialDone && tutStep >= 0 ? (
          <div className="pointer-events-none absolute inset-x-0 top-44 flex justify-center px-4">
            <div className="vb-enter pointer-events-auto w-full max-w-sm rounded-2xl border border-accent/60 bg-surface/95 p-3.5 shadow-xl">
              <div className="text-sm font-medium">{TUTORIAL_TEXTS[tutStep as 0 | 1 | 2 | 3].title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{TUTORIAL_TEXTS[tutStep as 0 | 1 | 2 | 3].body}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[11px] tracking-widest text-subtle">NÁVOD {tutStep + 1}/4</span>
                <button
                  type="button"
                  onClick={() => {
                    completeTutorial();
                    setTutorialDone(true);
                  }}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted"
                >
                  Přeskočit
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {screen === "menu" && (
          <Menu
            seed={seed}
            onSeed={setSeed}
            save={save}
            startSector={startSector}
            onSector={setStartSector}
            daily={daily}
            onDaily={() => openNewRunWheel(dailySeed(), 1, false, null)}
            weekly={weekly}
            onWeekly={() => openNewRunWheel(weeklySeed(), 1, false, null)}
            onPlay={() => openNewRunWheel(undefined, startSector)}
            onHelp={() => setScreen("help")}
            onAdmin={() => setScreen("admin")}
            onSlovnicek={() => setScreen("slovnicek")}
            onStats={() => setScreen("stats")}
            torment={torment}
            onTorment={setTorment}
            armory={armory}
            onArmory={(a) => {
              setArmory(a);
              saveArmory(a);
            }}
            muted={mutedState}
            onMute={() => {
              const next = !mutedState;
              setMuted(next);
              setMutedState(next);
            }}
          />
        )}
        {screen === "help" && <Help onBack={() => setScreen("menu")} />}
        {screen === "cesta" && <CestaScreen save={save} onCodex={() => setScreen("codex")} />}
        {screen === "slovnicek" && <SlovnicekScreen onBack={() => setScreen("menu")} />}
        {screen === "codex" && <CodexScreen />}
        {screen === "achievements" && <AchievementsScreen />}
        {screen === "stats" && (
          <StatsScreen save={save} onBack={() => setScreen("menu")} />
        )}
        {(screen === "postava" || screen === "kovarna") && (
          <PostavaScreen
            mode={screen}
            save={save}
            character={character}
            weaponDefs={content.weapons}
            forgeUnlocked={unlocksForLevel(save.bestLevel).forge}
            notice={characterNotice}
            onTalent={(id) => reportCharacterAction(purchaseCharacterTalent(id))}
            onRespec={() => reportCharacterAction(respecCharacterTalents())}
            onCraft={(archetype) => reportCharacterAction(craftCharacterWeapon(archetype, unlocksForLevel(loadSave().bestLevel).forge))}
            onComponent={(archetype, componentId) => reportCharacterAction(
              upgradeCharacterWeaponComponent(archetype, componentId, unlocksForLevel(loadSave().bestLevel).forge),
            )}
            onStarter={(archetype) => {
              reportCharacterAction(selectCraftedStarter(archetype));
              if (archetype === null) {
                setArmory(null);
                saveArmory(null);
              }
            }}
          />
        )}
        {(screen === "menu" || screen === "postava" || screen === "kovarna" || screen === "codex" || screen === "achievements" || screen === "cesta") && (
          <BottomNav
            active={screen as "menu" | "postava" | "kovarna" | "codex" | "achievements" | "cesta"}
            onNav={(s) => setScreen(s)}
          />
        )}
        {screen === "admin" && (
          <AdminPanel
            weights={rarityWeights ?? DEFAULT_RARITY_WEIGHTS}
            content={content}
            difficulty={difficulty}
            onChangeWeights={(rarity, weight) =>
              updateRarityWeights({ ...(rarityWeights ?? DEFAULT_RARITY_WEIGHTS), [rarity]: weight })
            }
            onChangeContent={updateContent}
            onChangeDifficulty={(patch) => setDifficultyState(setDifficulty(patch))}
            onResetDifficulty={() => setDifficultyState(resetDifficulty())}
            onReplaceAll={(nextContent, nextWeights) => {
              updateContent(nextContent);
              updateRarityWeights(nextWeights);
            }}
            onReset={() => {
              updateRarityWeights(null);
              updateContent(defaultGameContent());
              setDifficultyState(resetDifficulty());
            }}
            onBack={() => setScreen("menu")}
          />
        )}
        {screen === "paused" && (
          <PauseOverlay
            hud={hud}
            onResume={() => {
              setScreen("playing");
              screenRef.current = "playing";
            }}
            onQuit={() => {
              const run = runRef.current;
              if (run) recordBlueprintKills(run.blueprintKills);
              runRef.current = null;
              musicStop();
              setScreen("menu");
            }}
            muted={mutedState}
            onMute={() => {
              const next = !mutedState;
              setMuted(next);
              setMutedState(next);
            }}
          />
        )}
        {screen === "loot" && (
          <LootOverlay
            loot={loot}
            rerolls={rerolls}
            weapons={hud?.weapons ?? [starterWeapon(), null]}
            current={hud?.weapons[hud?.slot ?? 0] ?? null}
            weaponPick={weaponPick}
            scrapValue={runRef.current?.scrapLootValue() ?? 0}
            scrapTotal={hud?.scrap ?? 0}
            scrapUnlocked={unlocksForLevel(loadSave().bestLevel).scrap}
            onPick={applyLoot}
            onScrap={scrapLoot}
            onReroll={() => {
              runRef.current?.rerollLoot();
              setLoot(runRef.current?.loot ?? []);
              setRerolls(runRef.current?.rerolls ?? 0);
              setWeaponPick(null);
            }}
          />
        )}
        {screen === "base" && hud && stats && (
          <BaseOverlay
            hud={hud}
            stats={stats}
            forgeUnlocked={unlocksForLevel(loadSave().bestLevel).forge}
            arenaUnlocked={unlocksForLevel(loadSave().bestLevel).arena}
            shopUnlocked={unlocksForLevel(loadSave().bestLevel).shop}
            onShop={(item) => {
              if (runRef.current?.buyShop(item)) {
                setHud(runRef.current.snapshot());
                setStats(runRef.current.statsSnap());
              } else {
                // Deny už zahrál zvuk; jen překresli pro jistotu.
                setHud(runRef.current?.snapshot() ?? hud);
              }
            }}
            onContinue={(mod) => {
              openWheel({ mode: "portal", mod });
            }}
            onBank={() => {
              const run = runRef.current;
              if (run) {
                run.phase = "win";
                finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled, run.shotsFired, run.shotsHit, run.dmgDealt, run.dmgTaken, run.level, run.runXp);
                setHud(run.snapshot());
                setStats(run.statsSnap());
              }
              musicStop();
              setScreen("win");
              screenRef.current = "win";
            }}
          />
        )}
        {(screen === "dead" || screen === "win") && hud && (
          <EndOverlay
            win={screen === "win"}
            hud={hud}
            stats={stats}
            time={formatTime(hud.time)}
            freshIds={freshAchievements}
            onAgain={() => openNewRunWheel(seed, startSector)}
            onMenu={() => {
              runRef.current = null;
              musicStop();
              setScreen("menu");
            }}
          />
        )}
        {screen === "wheel" && wheelRef.current && (
          <WheelPopup
            key={`${wheelRef.current.mode === "new" ? wheelRef.current.seed : (runRef.current?.seed ?? "")}-${runRef.current?.sector ?? 0}`}
            seed={wheelRef.current.mode === "new" ? wheelRef.current.seed : (runRef.current?.seed ?? "")}
            sectorIdx={wheelRef.current.mode === "new" ? Math.max(0, wheelRef.current.startSector - 1) : (runRef.current?.sector ?? 0) + 1}
            sectorLabel={`Sektor ${wheelRef.current.mode === "new" ? wheelRef.current.startSector : (runRef.current?.sector ?? 0) + 2}`}
            actionLabel={wheelRef.current.mode === "new" ? "Do boje!" : `Do sektoru ${(runRef.current?.sector ?? 0) + 2}`}
            onDone={() => {
              const pending = wheelRef.current;
              wheelRef.current = null;
              if (!pending) {
                setScreen("menu");
                screenRef.current = "menu";
                return;
              }
              if (pending.mode === "new") {
                startRun(pending.seed, pending.startSector);
              } else {
                runRef.current?.continueToNextSector(pending.mod);
                const run = runRef.current;
                if (run) {
                  setHud(run.snapshot());
                  setStats(run.statsSnap());
                }
                setScreen("playing");
                screenRef.current = "playing";
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Spodní navigace pro hlavní obrazovky hry. */
function BottomNav({ active, onNav }: { active: "menu" | "postava" | "kovarna" | "codex" | "achievements" | "cesta"; onNav: (s: Screen) => void }) {
  const items: { id: "menu" | "postava" | "kovarna" | "codex" | "achievements" | "cesta"; label: string; icon: typeof Home }[] = [
    { id: "menu", label: "Domů", icon: Home },
    { id: "postava", label: "Postava", icon: User },
    { id: "kovarna", label: "Kovárna", icon: Wrench },
    { id: "codex", label: "Kodex", icon: BookOpen },
    { id: "achievements", label: "Úspěchy", icon: Trophy },
    { id: "cesta", label: "Cesta", icon: Map },
  ];
  return (
    <nav
      aria-label="Hlavní navigace"
      className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-6">
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onNav(it.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors active:scale-95 ${
                isActive ? "text-accent-blue" : "text-muted"
              }`}
            >
              <span className={`h-0.5 w-8 rounded-full ${isActive ? "bg-accent-blue" : "bg-transparent"}`} />
              <it.icon className="size-5" />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Samostatné přehledy postavy a kovárny se sdílenými uloženými daty. */
function PostavaScreen({
  mode,
  save,
  character,
  weaponDefs,
  forgeUnlocked,
  notice,
  onTalent,
  onRespec,
  onCraft,
  onComponent,
  onStarter,
}: {
  mode: "postava" | "kovarna";
  save: SaveData;
  character: CharacterProgress;
  weaponDefs: WeaponDef[];
  forgeUnlocked: boolean;
  notice: string;
  onTalent: (id: CharacterTalentId) => void;
  onRespec: () => void;
  onCraft: (archetype: ArchetypeId) => void;
  onComponent: (archetype: ArchetypeId, componentId: WeaponComponentId) => void;
  onStarter: (archetype: ArchetypeId | null) => void;
}) {
  const badges = loadBadges();
  const respecCost = talentRespecCost(character.respecCount);
  const hasTalents = Object.values(character.talents).some((rank) => rank > 0);
  const [selectedForgeWeapon, setSelectedForgeWeapon] = useState<ArchetypeId>(
    character.starterArchetype ?? "pistol",
  );
  const [forgeTab, setForgeTab] = useState<"craft" | "upgrade">("craft");
  const [activeSlot, setActiveSlot] = useState<WeaponComponentSlot>("barrel");
  const [selectedComponentId, setSelectedComponentId] = useState<WeaponComponentId>("barrel-precision");
  const [confirmComponentId, setConfirmComponentId] = useState<WeaponComponentId | null>(null);
  const fragmentEntries = Object.entries(character.materials.fragments)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .sort(([a], [b]) => ARCHETYPE_LABEL[a as ArchetypeId].name.localeCompare(ARCHETYPE_LABEL[b as ArchetypeId].name));
  const selectedRecipe = weaponRecipe(selectedForgeWeapon);
  const selectedOwned = character.craftedWeapons.includes(selectedForgeWeapon);
  const selectedActive = character.starterArchetype === selectedForgeWeapon;
  const selectedCanAfford =
    (character.materials.fragments[selectedForgeWeapon] ?? 0) >= selectedRecipe.fragments
    && character.materials.alloys >= selectedRecipe.alloys
    && character.materials.cores >= selectedRecipe.cores
    && character.materials.scrap >= selectedRecipe.scrap;
  const selectedSources = weaponFragmentSources(selectedForgeWeapon);
  const selectedLoadout = character.weaponComponents[selectedForgeWeapon] ?? {};
  const selectedComponent = componentDefinition(selectedComponentId);
  const installedComponent = selectedLoadout[selectedComponent.slot];
  const sameComponent = installedComponent?.id === selectedComponentId;
  const componentMaxed = sameComponent && installedComponent.rank === 3;
  const componentRank = sameComponent ? Math.min(3, installedComponent.rank + 1) : 1;
  const componentCost = weaponComponentCost(selectedComponentId, componentRank);
  const componentCanAfford =
    character.materials.scrap >= componentCost.scrap
    && character.materials.alloys >= componentCost.alloys
    && character.materials.cores >= componentCost.cores
    && (!componentCost.catalyst || (character.materials.catalysts[componentCost.catalyst] ?? 0) >= componentCost.catalysts);
  const componentLevelUnlocked = character.level >= componentCost.requiredLevel;
  const selectedWeaponDef = weaponDefs.find((definition) => definition.archetype === selectedForgeWeapon);
  const currentComponentPreview = selectedWeaponDef
    ? previewComponentWeapon(selectedWeaponDef, selectedLoadout)
    : null;
  const candidateComponentPreview = selectedWeaponDef
    ? previewComponentWeapon(selectedWeaponDef, {
        ...selectedLoadout,
        [selectedComponent.slot]: {
          id: selectedComponentId,
          rank: componentMaxed ? 3 : componentRank,
        },
      })
    : null;
  const slotLabels: Record<WeaponComponentSlot, string> = {
    barrel: "HLAVEŇ",
    magazine: "ZÁSOBNÍK",
    core: "JÁDRO",
  };
  const slotIcons = { barrel: Crosshair, magazine: CircleDot, core: Zap };
  const forgeWeapons = forgeTab === "upgrade"
    ? character.craftedWeapons
    : Object.keys(ARCHETYPE_LABEL) as ArchetypeId[];
  const compareStats = currentComponentPreview && candidateComponentPreview
    ? [
        ["DMG", currentComponentPreview.stats.damage, candidateComponentPreview.stats.damage],
        ["RPM", currentComponentPreview.stats.rpm, candidateComponentPreview.stats.rpm],
        ["ZÁS.", currentComponentPreview.stats.magSize, candidateComponentPreview.stats.magSize],
        ["PŘEB.", currentComponentPreview.stats.reload, candidateComponentPreview.stats.reload],
        ["DOSAH", currentComponentPreview.stats.range, candidateComponentPreview.stats.range],
        ["KRIT.", currentComponentPreview.stats.critChance * 100, candidateComponentPreview.stats.critChance * 100],
      ] as const
    : [];
  return (
    <div className="vb-vignette absolute inset-0 flex flex-col items-center overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))] pb-28">
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="vb-enter-soft flex flex-col items-center text-center" style={{ "--vb-i": 0 } as CSSProperties}>
          <p className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ice">
            {mode === "postava" ? <User className="size-4" /> : <Wrench className="size-4" />}
            {mode === "postava" ? "PROFIL HRÁČE" : "DÍLNA / ZBROJENÍ"}
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {mode === "postava" ? (
              <>
                <span className="vb-title-gradient">PO</span>
                <span className="text-ice">STAVA</span>
              </>
            ) : <span className="text-ice">KOVÁRNA</span>}
          </h1>
        </div>
        {notice ? <p className="rounded-xl border border-accent/50 bg-surface px-3 py-2 text-sm text-fg" role="status">{notice}</p> : null}
        {mode === "postava" ? <CharacterPanel save={save} character={character} /> : null}
        {mode === "kovarna" ? (
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1" role="group" aria-label="Režim kovárny">
            {([
              ["craft", "Výroba", Wrench],
              ["upgrade", "Úpravy", Crosshair],
            ] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                type="button"
                aria-pressed={forgeTab === tab}
                onClick={() => {
                  setForgeTab(tab);
                  if (tab === "upgrade" && character.craftedWeapons.length > 0) {
                    setSelectedForgeWeapon(character.craftedWeapons[0]);
                  }
                  setConfirmComponentId(null);
                }}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-colors ${
                  forgeTab === tab ? "border-accent-blue bg-surface-raised text-accent-blue" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
        ) : null}
        {mode === "postava" ? (
        <>
        <section className="rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
                <Zap className="size-4" /> TALENTY POSTAVY
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Sparkles className="size-3.5 text-accent-blue" />
                <span><span className="font-mono text-fg">{character.talentPoints}</span> volných bodů · bonusy platí od začátku běhu</span>
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-border bg-elevated px-2 py-1 font-mono text-xs text-ice">
              LVL {character.level}/{CHARACTER_LEVEL_CAP}
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {(["vitality", "ballistics", "scavenging"] as const).map((id) => {
              const rank = character.talents[id];
              const requiredLevel = rank < 5 ? talentUnlockLevel(rank + 1) : null;
              const canBuy = rank < 5 && character.level >= (requiredLevel ?? 1) && character.talentPoints > 0;
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-border/70 bg-elevated p-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ice">
                    <TalentIcon talent={id} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-xs font-semibold">{TALENT_REWARDS[id].name}</h3>
                      <span className="font-mono text-[11px] tabular-nums text-ice">{rank}/5</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted" title={TALENT_REWARDS[id].description}>{TALENT_REWARDS[id].description}</p>
                    <div className="mt-1 flex gap-1" role="img" aria-label={`Stupeň ${rank} z 5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`h-1 flex-1 rounded-full ${i < rank ? "bg-accent-blue" : "bg-border"}`} />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => onTalent(id)}
                    title={`${TALENT_REWARDS[id].name}: ${TALENT_REWARDS[id].description}`}
                    aria-label={`${rank >= 5 ? "Maximum" : "Vylepšit"} talent ${TALENT_REWARDS[id].name}${canBuy ? "" : `; ${character.level < (requiredLevel ?? 1) ? `vyžaduje level ${requiredLevel}` : "není volný bod"}`}`}
                    className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-md border border-border px-2 text-[11px] font-medium text-fg transition-colors hover:border-accent-blue hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {rank >= 5 ? <Check className="size-4" /> : character.level < (requiredLevel ?? 1) ? `L${requiredLevel}` : character.talentPoints < 1 ? <Lock className="size-3.5" /> : <Sparkles className="size-4" />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-subtle" title="Reset vrátí všechny utracené talentové body.">
              <RotateCcw className="size-3.5" />
              <MaterialIcon material="scrap" className="size-3.5" /><span>{respecCost.scrap}</span>
              <MaterialIcon material="alloy" className="size-3.5" /><span>{respecCost.alloys}</span>
            </div>
            <button
              type="button"
              disabled={!hasTalents || character.materials.scrap < respecCost.scrap || character.materials.alloys < respecCost.alloys}
              onClick={onRespec}
              title="Vrátit všechny utracené talentové body za uvedené materiály"
              className="min-h-12 shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-muted transition-colors hover:border-accent-blue hover:text-fg disabled:cursor-not-allowed disabled:opacity-45"
            >
              <RotateCcw className="mr-1 inline size-3.5" />Reset
            </button>
          </div>
        </section>
        </>) : null}
        {mode === "kovarna" ? (
        <>
        <section className="rounded-2xl border border-border bg-surface p-3">
          <h2 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
            <Wrench className="size-4" /> SKLAD MATERIÁLŮ
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[
              { id: "scrap", label: "Šrot", amount: character.materials.scrap, icon: "scrap" as const },
              { id: "alloy", label: "Slitiny", amount: character.materials.alloys, icon: "alloy" as const },
              { id: "core", label: "Jádra", amount: character.materials.cores, icon: "core" as const },
            ].map(({ id, label, amount, icon }) => (
              <div key={id} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-elevated px-2 py-1.5" title={`${label}: ${amount}`}>
                <MaterialIcon material={icon} className="size-4 shrink-0 text-ice" />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-subtle">{label}</span>
                  <span className="block font-mono text-sm tabular-nums text-fg">{amount}</span>
                </span>
              </div>
            ))}
          </div>
          {Object.entries(character.materials.catalysts).some(([, amount]) => (amount ?? 0) > 0) ? (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2" aria-label="Elementární katalyzátory">
              {Object.entries(character.materials.catalysts).filter(([, amount]) => (amount ?? 0) > 0).map(([element, amount]) => (
                <span key={element} className="flex items-center gap-1 rounded-md border border-border bg-elevated px-2 py-1 font-mono text-[11px] text-fg" title={`${ELEMENT_NAME[element] ?? element} katalyzátor`}>
                  <MaterialIcon material={element as Element} className="size-3.5 text-ice" />
                  {amount}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-2 border-t border-border pt-2">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <MaterialIcon material="fragment" className="size-3.5" /> Fragmenty zbraní <span className="font-mono text-subtle">· najeď pro detail</span>
            </p>
            {fragmentEntries.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {fragmentEntries.map(([archetype, amount]) => (
                  <div
                    key={archetype}
                    className="flex min-w-0 flex-col items-center gap-0.5 rounded-lg border border-border/70 bg-elevated p-1.5 text-center transition-colors hover:border-accent-blue/60"
                    title={`${ARCHETYPE_LABEL[archetype as ArchetypeId].name}: ${amount} fragmentů`}
                    aria-label={`${ARCHETYPE_LABEL[archetype as ArchetypeId].name}: ${amount} fragmentů`}
                  >
                    <WeaponIcon archetype={archetype as ArchetypeId} className="size-5 text-ice" />
                    <span className="max-w-full truncate text-[11px] capitalize text-subtle">{ARCHETYPE_LABEL[archetype as ArchetypeId].name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-fg">×{amount}</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-1 text-[11px] text-subtle">Zatím žádné. Fragmenty padají z nepřátel, elit a bossů.</p>}
          </div>
        </section>
        {forgeTab === "craft" ? <section className="rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Swords className="size-4" /> VÝROBA ZBRANÍ
            </h2>
            {character.starterArchetype ? (
              <span className="shrink-0 font-mono text-[11px] text-ice">VÝROBNÍ ZBRAŇ AKTIVNÍ</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Sestav zbraň z nalezených fragmentů a nasaď ji na začátek běžného běhu.
          </p>
          {!forgeUnlocked ? (
            <p className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-elevated p-2.5 text-xs text-subtle">
              <Lock className="size-4 shrink-0" />
              Kovárna se odemkne přes Cestu na profilovém LVL 6. Materiály můžeš sbírat už nyní.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onStarter(null)}
                aria-pressed={character.starterArchetype === null}
                title="Použít služební pistoli na začátku běžného běhu"
                className={`flex min-h-12 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${character.starterArchetype === null ? "border-accent-blue bg-surface-raised text-accent-blue" : "border-border text-muted hover:text-fg"}`}
              >
                <WeaponIcon archetype="pistol" className="size-4" />Služební
              </button>
              <span className="text-[11px] text-subtle">Výzvy: vždy služební pistole</span>
            </div>
          )}
          <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Zbrojnice: vyber zbraň">
            {forgeWeapons.map((archetype) => {
              const owned = character.craftedWeapons.includes(archetype);
              const active = character.starterArchetype === archetype;
              const fragments = character.materials.fragments[archetype] ?? 0;
              const recipe = weaponRecipe(archetype);
              const sourceNames = weaponFragmentSourceHint(archetype);
              return (
                <button
                  key={archetype}
                  type="button"
                  onClick={() => {
                    setSelectedForgeWeapon(archetype);
                    setConfirmComponentId(null);
                  }}
                  aria-pressed={selectedForgeWeapon === archetype}
                  aria-label={`${ARCHETYPE_LABEL[archetype].name}; fragmenty ${fragments} z ${recipe.fragments}; ${owned ? "vyrobená" : "nevlastníš"}`}
                  title={`${ARCHETYPE_LABEL[archetype].name} · ${fragments}/${recipe.fragments} fragmentů · zdroje: ${sourceNames || "bossové"}${owned ? " · vyrobená" : ""}${active ? " · nasazená" : ""}`}
                  className={`relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border p-1.5 transition-colors ${
                    selectedForgeWeapon === archetype
                      ? "border-accent-blue bg-surface-raised text-accent-blue ring-1 ring-accent-blue"
                      : owned
                        ? "border-rarity-uncommon/60 bg-elevated text-fg hover:border-accent-blue/60"
                        : "border-border bg-elevated text-muted hover:border-border-default hover:text-fg"
                  }`}
                >
                  <WeaponIcon archetype={archetype} className="size-5" />
                  <span className="max-w-full truncate text-[11px] capitalize leading-tight">{ARCHETYPE_LABEL[archetype].name}</span>
                  <span className="absolute right-1 top-0.5 font-mono text-[11px] tabular-nums text-subtle">
                    {owned ? <Check className="size-3 text-state-success" /> : <span className="text-[11px]">{fragments}/{recipe.fragments}</span>}
                  </span>
                  {active ? <span className="absolute bottom-0.5 left-1 size-1.5 rounded-full bg-accent-blue" aria-label="Startovní zbraň" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 rounded-lg border border-border bg-elevated p-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ice">
                <WeaponIcon archetype={selectedForgeWeapon} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold capitalize">{ARCHETYPE_LABEL[selectedForgeWeapon].name}</span>
                <span className="block text-[11px] text-subtle">
                  <MaterialIcon material="fragment" className="mr-1 inline size-3.5" />
                  {character.materials.fragments[selectedForgeWeapon] ?? 0}/{selectedRecipe.fragments} fragmentů
                </span>
              </span>
              {selectedOwned ? (
                <button
                  type="button"
                  onClick={() => onStarter(selectedActive ? null : selectedForgeWeapon)}
                  aria-pressed={selectedActive}
                  title={selectedActive ? "Vrátit se ke služební pistoli" : "Nasadit do začátku běžného běhu"}
                  className={`flex min-h-12 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors ${selectedActive ? "border-accent-blue text-accent-blue" : "border-border text-fg hover:border-accent-blue"}`}
                >
                  {selectedActive ? <Check className="size-4" /> : <Swords className="size-4" />}
                  {selectedActive ? "Nasazeno" : "Nasadit"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!forgeUnlocked || !selectedCanAfford}
                  onClick={() => onCraft(selectedForgeWeapon)}
                  title={
                    !forgeUnlocked
                      ? "Odemkne se na profilovém levelu 6"
                      : selectedCanAfford
                        ? "Vyrobit tuto zbraň z uvedených materiálů"
                        : "Chybí materiály; červeně označené hodnoty nedosahují ceny receptu"
                  }
                  className="flex min-h-12 shrink-0 items-center gap-1 rounded-md border border-accent-blue/60 px-2 text-[11px] font-semibold text-fg transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wrench className="size-4" />Vyrobit
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] font-mono tabular-nums">
              <span className="text-subtle" title={selectedOwned ? "Recept použitý při výrobě" : "Náklady na výrobu"}>{selectedOwned ? "RECEPT" : "NÁKLADY"}</span>
              <span title={`Šrot: ${character.materials.scrap} / ${selectedRecipe.scrap}`} className={character.materials.scrap >= selectedRecipe.scrap ? "text-fg" : "text-state-danger"}>
                <MaterialIcon material="scrap" className="mr-1 inline size-3.5" />{selectedRecipe.scrap}
              </span>
              <span title={`Slitiny: ${character.materials.alloys} / ${selectedRecipe.alloys}`} className={character.materials.alloys >= selectedRecipe.alloys ? "text-fg" : "text-state-danger"}>
                <MaterialIcon material="alloy" className="mr-1 inline size-3.5" />{selectedRecipe.alloys}
              </span>
              {selectedRecipe.cores > 0 ? (
                <span title={`Jádra: ${character.materials.cores} / ${selectedRecipe.cores}`} className={character.materials.cores >= selectedRecipe.cores ? "text-fg" : "text-state-danger"}>
                  <MaterialIcon material="core" className="mr-1 inline size-3.5" />{selectedRecipe.cores}
                </span>
              ) : null}
              <span title={`Fragmenty ${ARCHETYPE_LABEL[selectedForgeWeapon].name}: ${character.materials.fragments[selectedForgeWeapon] ?? 0} / ${selectedRecipe.fragments}`} className={(character.materials.fragments[selectedForgeWeapon] ?? 0) >= selectedRecipe.fragments ? "text-fg" : "text-state-danger"}>
                <MaterialIcon material="fragment" className="mr-1 inline size-3.5" />{selectedRecipe.fragments}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5 text-[11px] text-subtle">
              <span className="shrink-0">DROPUJE:</span>
              <div className="flex flex-wrap items-center gap-1">
                {selectedSources.slice(0, 5).map((kind) => (
                  <span key={kind} className="inline-flex size-7 items-center justify-center rounded border border-border bg-surface text-muted" title={ENEMY_NAME[kind]}>
                    <EnemyIcon kind={kind} className="size-4" />
                  </span>
                ))}
                {selectedSources.length > 5 ? <span title={selectedSources.slice(5).map((kind) => ENEMY_NAME[kind]).join(", ")}>+{selectedSources.length - 5}</span> : null}
                <span>· bossové</span>
              </div>
            </div>
            {selectedSources.length > 0 ? (
              <details className="mt-1 text-[11px] text-subtle">
                <summary className="cursor-pointer">Názvy nepřátel</summary>
                <p className="mt-1 leading-relaxed">{selectedSources.map((kind) => ENEMY_NAME[kind]).join(", ")} · bossové</p>
              </details>
            ) : null}
          </div>
        </section> : null}
        {forgeTab === "upgrade" ? <section className="rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Wrench className="size-4" /> ÚPRAVY ZBRANÍ
            </h2>
            {selectedOwned ? <span className="font-mono text-[11px] text-ice">{ARCHETYPE_LABEL[selectedForgeWeapon].name}</span> : null}
          </div>
          {!forgeUnlocked ? (
            <p className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-elevated p-2.5 text-xs text-subtle">
              <Lock className="size-4 shrink-0" /> Úpravy se odemknou s Kovárnou na profilovém LVL 6.
            </p>
          ) : !selectedOwned ? (
            <div className="mt-2 rounded-lg border border-border bg-elevated p-3 text-center">
              <p className="text-xs text-muted">Zatím nemáš vyrobenou zbraň.</p>
              <button
                type="button"
                onClick={() => setForgeTab("craft")}
                className="mt-2 min-h-12 rounded-lg border border-accent-blue/60 px-3 text-xs font-semibold text-fg hover:bg-surface-raised"
              >
                <Wrench className="mr-1.5 inline size-4" />Přejít na výrobu
              </button>
            </div>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Vyber vyrobenou zbraň">
                {character.craftedWeapons.map((archetype) => (
                  <button
                    key={archetype}
                    type="button"
                    onClick={() => {
                      setSelectedForgeWeapon(archetype);
                      setConfirmComponentId(null);
                    }}
                    aria-pressed={selectedForgeWeapon === archetype}
                    aria-label={`${ARCHETYPE_LABEL[archetype].name}${character.starterArchetype === archetype ? ", nasazená" : ""}`}
                    title={`${ARCHETYPE_LABEL[archetype].name}${character.starterArchetype === archetype ? " · startovní zbraň" : ""}`}
                    className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border p-1 text-center transition-colors ${
                      selectedForgeWeapon === archetype ? "border-accent-blue bg-surface-raised text-accent-blue" : "border-border bg-elevated text-muted hover:border-accent-blue/60"
                    }`}
                  >
                    <WeaponIcon archetype={archetype} className="size-5" />
                    <span className="max-w-full truncate text-[10px] capitalize">{ARCHETYPE_LABEL[archetype].name}</span>
                    {character.starterArchetype === archetype ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent-blue" /> : null}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-subtle">Výměna účtuje plnou cenu znovu; původní součást se nevrací.</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Slot úprav">
                {(["barrel", "magazine", "core"] as const).map((slot) => {
                  const SlotIcon = slotIcons[slot];
                  const installed = selectedLoadout[slot];
                  const slotComponents = componentsForSlot(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setActiveSlot(slot);
                        setSelectedComponentId(slotComponents[0].id);
                        setConfirmComponentId(null);
                      }}
                      aria-pressed={activeSlot === slot}
                      className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-center transition-colors ${
                        activeSlot === slot ? "border-accent-blue bg-surface-raised text-accent-blue" : "border-border bg-elevated text-muted hover:border-accent-blue/60"
                      }`}
                      title={`${slotLabels[slot]}${installed ? ` · ${componentDefinition(installed.id).name} R${installed.rank}` : " · prázdný"}`}
                    >
                      <span className="flex items-center gap-1"><SlotIcon className="size-3.5" /><span className="text-[10px] font-mono">{slotLabels[slot]}</span></span>
                      <span className="max-w-full truncate text-[10px] text-subtle">{installed ? `${componentDefinition(installed.id).name} R${installed.rank}` : "Volný"}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {componentsForSlot(activeSlot).map((component) => {
                          const SlotIcon = slotIcons[activeSlot];
                          const selected = selectedComponentId === component.id;
                          return (
                            <button
                              key={component.id}
                              type="button"
                              onClick={() => {
                                setActiveSlot(component.slot);
                                setSelectedComponentId(component.id);
                                setConfirmComponentId(null);
                              }}
                              aria-pressed={selected}
                              title={`${component.name}: ${component.description}`}
                              className={`flex min-h-12 min-w-0 items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                                selected ? "border-accent-blue bg-surface-raised text-fg" : "border-border bg-elevated text-muted hover:border-accent-blue/60"
                              }`}
                            >
                              <SlotIcon className="size-4 shrink-0 text-ice" />
                              <span className="min-w-0">
                                <span className="block truncate text-[11px] font-medium">{component.name}</span>
                                <span className="block truncate text-[11px] text-subtle">{component.description}</span>
                              </span>
                            </button>
                          );
                        })}
              </div>
              <div className="mt-2 rounded-lg border border-border bg-elevated p-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                  <Wrench className="size-3.5 text-ice" /> {selectedComponent.name}
                  <span className="font-mono text-[11px] text-subtle">· {componentMaxed ? "MAX R3" : `R${componentRank}/3`}</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{selectedComponent.description}</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Porovnání statistik">
                  {compareStats.map(([label, before, after]) => (
                    <div key={label} className="rounded-md border border-border/70 bg-surface px-1.5 py-1 text-center">
                      <span className="block font-mono text-[11px] text-subtle">{label}</span>
                      <span className="font-mono text-[11px] tabular-nums text-fg">
                        {label === "KRIT." ? `${before.toFixed(0)}%` : before.toFixed(1)}
                        <span className="px-1 text-subtle">→</span>
                        {label === "KRIT." ? `${after.toFixed(0)}%` : after.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 font-mono text-[11px] tabular-nums">
                  <span className="text-subtle">CENA R{componentRank}</span>
                  <span className={character.materials.scrap >= componentCost.scrap ? "text-fg" : "text-state-danger"} title={`Šrot: ${character.materials.scrap} / ${componentCost.scrap}`}>
                    <MaterialIcon material="scrap" className="mr-1 inline size-3.5" />{componentCost.scrap}
                  </span>
                  {componentCost.alloys > 0 ? (
                    <span className={character.materials.alloys >= componentCost.alloys ? "text-fg" : "text-state-danger"} title={`Slitiny: ${character.materials.alloys} / ${componentCost.alloys}`}>
                      <MaterialIcon material="alloy" className="mr-1 inline size-3.5" />{componentCost.alloys}
                    </span>
                  ) : null}
                  {componentCost.cores > 0 ? (
                    <span className={character.materials.cores >= componentCost.cores ? "text-fg" : "text-state-danger"} title={`Jádra: ${character.materials.cores} / ${componentCost.cores}`}>
                      <MaterialIcon material="core" className="mr-1 inline size-3.5" />{componentCost.cores}
                    </span>
                  ) : null}
                  {componentCost.catalyst ? (
                    <span className={(character.materials.catalysts[componentCost.catalyst] ?? 0) >= componentCost.catalysts ? "text-fg" : "text-state-danger"} title={`${ELEMENT_NAME[componentCost.catalyst]} katalyzátor: ${character.materials.catalysts[componentCost.catalyst] ?? 0} / ${componentCost.catalysts}`}>
                      <MaterialIcon material={componentCost.catalyst} className="mr-1 inline size-3.5" />{componentCost.catalysts}
                    </span>
                  ) : null}
                  <span className="text-subtle">LVL {componentCost.requiredLevel}</span>
                </div>
                {confirmComponentId === selectedComponentId ? (
                  <div className="mt-2 rounded-md border border-accent-blue/60 bg-surface p-2">
                    <p className="text-[11px] text-muted">
                      Potvrdit {sameComponent ? "vylepšení" : installedComponent ? "výměnu" : "osazení"}? Materiály se odečtou a součást se nevrací.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onComponent(selectedForgeWeapon, selectedComponentId);
                          setConfirmComponentId(null);
                        }}
                        className="min-h-12 flex-1 rounded-md border border-accent-blue px-2 text-xs font-semibold text-fg hover:bg-surface-raised"
                      >
                        Potvrdit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmComponentId(null)}
                        className="min-h-12 rounded-md border border-border px-3 text-xs text-muted hover:text-fg"
                      >
                        Zrušit
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!forgeUnlocked || componentMaxed || !componentLevelUnlocked || !componentCanAfford}
                    onClick={() => setConfirmComponentId(selectedComponentId)}
                    title={
                      componentMaxed ? "Tato komponenta už má nejvyšší stupeň"
                        : !componentLevelUnlocked ? `Vyžaduje level postavy ${componentCost.requiredLevel}`
                          : componentCanAfford ? "Zobrazit potvrzení ceny a osazení"
                            : "Chybí potřebné materiály"
                    }
                    className="mt-2 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-md border border-accent-blue/60 px-2 text-xs font-semibold text-fg transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {componentMaxed ? <Check className="size-4" /> : <Wrench className="size-4" />}
                    {componentMaxed ? "Maximum" : sameComponent ? "Vylepšit komponentu" : installedComponent ? "Vyměnit komponentu" : "Osadit komponentu"}
                  </button>
                )}
              </div>
            </>
          )}
        </section> : null}
        </>) : null}
        {mode === "postava" ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
            <Trophy className="size-4" />
            ODZNAKY {badges.length}/{CHALLENGES.length}
          </h3>
          {badges.length > 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {badges.map((b) => challengeDef(b).name).join(" · ")}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-subtle">
              Plň výzvy v běhu a sbírej odznaky.
            </p>
          )}
        </div>
        ) : null}
      </div>
    </div>
  );
}

function Menu({
  seed,
  onSeed,
  save,
  startSector,
  onSector,
  daily,
  onDaily,
  weekly,
  onWeekly,
  onPlay,
  onHelp,
  onAdmin,
  onSlovnicek,
  onStats,
  torment,
  onTorment,
  armory,
  onArmory,
  muted,
  onMute,
}: {
  seed: string;
  onSeed: (s: string) => void;
  save: SaveData;
  startSector: number;
  onSector: (s: number) => void;
  daily: DailyRecord;
  onDaily: () => void;
  weekly: WeeklyRecord;
  onWeekly: () => void;
  onPlay: () => void;
  onHelp: () => void;
  onAdmin: () => void;
  onSlovnicek: () => void;
  onStats: () => void;
  torment: boolean;
  onTorment: (v: boolean) => void;
  armory: ArchetypeId | null;
  onArmory: (a: ArchetypeId | null) => void;
  muted: boolean;
  onMute: () => void;
}) {
  const unlocked = Math.max(1, save.maxSector);
  const blueprints = loadBlueprints();
  const armoryUnlocked = (Object.keys(ARCHETYPE_LABEL) as ArchetypeId[]).filter(
    (a) => killsToRank(blueprints[a] ?? 0) >= 2,
  );
  const [resetArmed, setResetArmed] = useState(false);
  return (
    <div className="vb-vignette absolute inset-0 flex flex-col items-center gap-5 overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))] pb-28">
      <div className="vb-enter-soft flex w-full max-w-md shrink-0 items-center justify-between gap-2" style={{ "--vb-i": 0 } as CSSProperties}>
        <span className="rounded-full border border-border bg-surface/80 px-3 py-1.5 font-mono text-[11px] tracking-[0.2em] text-subtle">
          ROGUELITE LOOTER
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link to="/moba" className="flex min-h-12 items-center rounded-xl border border-border bg-surface px-2.5 text-[11px] font-medium text-muted transition-colors hover:border-accent-blue hover:text-fg">
            Nexus Arena →
          </Link>
          <button
            type="button"
            onClick={onMute}
            className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-transform active:scale-95"
            aria-label={muted ? "Zapnout zvuk" : "Ztlumit"}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        </div>
      </div>
      <div className="vb-hero vb-enter-soft w-full max-w-md shrink-0" style={{ "--vb-i": 1 } as CSSProperties}>
        <div
          aria-hidden="true"
          className="flex h-16 w-full items-center justify-center"
          style={{
            background:
              "linear-gradient(180deg, rgba(67,191,255,0.12), transparent 75%), repeating-linear-gradient(90deg, #101923 0 34px, #0a0e14 34px 38px), linear-gradient(180deg, #101923, #080d13)",
          }}
        >
          <div className="flex size-12 items-center justify-center rounded-xl border border-accent-blue/30 bg-surface/90 text-accent-blue shadow">
            <DoorOpen className="size-6" />
          </div>
        </div>
        <div className="vb-hero-body flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] tracking-[0.25em] text-subtle">TREZOR 09 / EXPEDICE</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
              <span className="vb-title-gradient">VAULT</span><span className="text-ice">BREAK</span>
            </h1>
          </div>
          <span className="rounded-lg border border-accent-blue/30 bg-accent-blue/10 px-2.5 py-1.5 font-mono text-xs tabular-nums text-accent-blue">
            SEKTOR {unlocked}
          </span>
        </div>
      </div>
      <div className="flex w-full max-w-md shrink-0 flex-col gap-3">
        <button type="button" onClick={onPlay} className="vb-btn-primary vb-stagger" style={{ "--vb-i": 2 } as CSSProperties}>
          <Play className="size-5" />
          {startSector > 1 ? `Zahájit od sektoru ${startSector}` : "Zahájit expedici"}
        </button>
        <details className="vb-stagger rounded-xl border border-border bg-surface" style={{ "--vb-i": 2 } as CSSProperties}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs marker:hidden">
            <span className="flex items-center gap-2 text-fg"><SlidersHorizontal className="size-4 text-accent-blue" />Nastavení expedice</span>
            <span className="font-mono text-[11px] text-subtle">SEKTOR {startSector}{torment ? " · TORMENT" : ""}</span>
          </summary>
          <div className="space-y-3 border-t border-border p-3">
        <label className="flex flex-col gap-1.5 text-left">
          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-subtle">
            <Dices className="size-4" />
            Seed běhu
          </span>
          <input
            value={seed}
            onChange={(e) => onSeed(e.target.value.toUpperCase().slice(0, 10))}
            className="h-13 rounded-xl border border-border bg-surface px-4 font-mono text-base tracking-[0.2em] text-fg outline-none select-text focus:border-accent"
            spellCheck={false}
            autoComplete="off"
            suppressHydrationWarning
          />
        </label>
        <div className="flex flex-col gap-1.5 text-left">
          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-subtle">
            <Map className="size-4" />
            Startovní sektor {unlocked > 1 ? `(odemčeno do ${unlocked})` : "(poraz bosse pro checkpoint)"}
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: unlocked }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSector(s)}
                title={`Začít v sektoru ${s}`}
                className={`flex min-h-12 min-w-0 items-center justify-center rounded-lg border font-mono text-sm tabular-nums transition-colors hover:border-accent-blue ${
                  startSector === s
                    ? "border-accent-blue bg-surface-raised text-accent-blue"
                    : "border-border bg-surface text-muted"
                }`}
                aria-pressed={startSector === s}
              >
                {s}
              </button>
            ))}
          </div>
          {startSector > 1 ? (
            <span className="text-[11px] text-subtle">Start ze sektoru {startSector} = úroveň {(startSector - 1) * 10 + 1} + bonus k HP.</span>
          ) : null}
        </div>
        {unlocksForLevel(save.bestLevel).torment ? (
          <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <Skull className="size-5 text-danger" />
                <span>
                  <span className="font-semibold text-danger">TORMENT</span>
                  <span className="block text-xs text-muted">+25 % síly nepřátel za loot +1 úroveň a +25 % šrotu.</span>
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={torment}
                aria-label="Torment režim"
                data-on={torment}
                onClick={() => onTorment(!torment)}
                className="vb-switch"
              />
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5 text-left">
          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-subtle">
            <Swords className="size-4" />
            Zbrojnice {armoryUnlocked.length > 0 ? "(rám rank 2+ nahradí pistoli)" : "(zabíjej archetypem pro rank 2)"}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onArmory(null)}
              title="Výchozí startovní zbraň"
              aria-label="Výchozí startovní zbraň: pistole"
                className={`flex h-12 min-w-12 items-center justify-center rounded-xl border px-3 font-mono text-sm tabular-nums transition-transform active:scale-95 ${
                armory === null
                  ? "border-accent-blue bg-surface-raised text-accent-blue"
                  : "border-border bg-surface text-muted"
              }`}
              aria-pressed={armory === null}
            >
              <WeaponIcon archetype="pistol" className="size-5" />
            </button>
            {armoryUnlocked.map((a) => {
              const kills = blueprints[a] ?? 0;
              const rank = killsToRank(kills);
              const next = BLUEPRINT_RANK_KILLS[rank + 1];
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onArmory(a)}
                  title={`${kills} zabití · rank ${rank}${next ? ` · další na ${next}` : " · MAX"}`}
                  aria-label={`${ARCHETYPE_LABEL[a].name}, rank ${rank}, ${kills} zabití`}
                className={`flex h-12 min-w-12 items-center justify-center rounded-xl border px-3 font-mono text-sm tabular-nums transition-transform active:scale-95 ${
                    armory === a
                      ? "border-accent-blue bg-surface-raised text-accent-blue"
                      : "border-border bg-surface text-muted"
                  }`}
                  aria-pressed={armory === a}
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <WeaponIcon archetype={a} className="size-4" />
                    <span className="text-[11px] leading-none">R{rank}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-subtle">
            Rám z blueprintu zůstává volitelný; vyrobená zbraň nasazená na stránce Postava má při běžném běhu přednost.
          </p>
        </div>
          </div>
        </details>
        <section className="rounded-2xl border border-border bg-surface p-3">
          <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-subtle">
            <CalendarDays className="size-4 text-accent-blue" /> VÝZVY
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onDaily}
              title={`Denní seed ${dailySeed()} · nejlepší LVL ${daily.best}`}
              className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-elevated p-2 text-left transition-colors hover:border-accent-blue"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-accent-blue"><CalendarDays className="size-4" /></span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">Denní</span>
                <span className="block truncate font-mono text-[11px] text-subtle">{dailySeed()}</span>
                <span className="block font-mono text-[11px] text-muted">LVL {daily.best} · {daily.plays}×</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onWeekly}
              title={`Týdenní seed ${weeklySeed()} · nejlepší LVL ${weekly.best}`}
              className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-elevated p-2 text-left transition-colors hover:border-accent-blue"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-accent-blue"><CalendarDays className="size-4" /></span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">Týdenní</span>
                <span className="block truncate font-mono text-[11px] text-subtle">{weeklySeed()}</span>
                <span className="block font-mono text-[11px] text-muted">LVL {weekly.best} · {weekly.plays}×</span>
              </span>
            </button>
          </div>
        </section>
        <h2 className="flex items-center gap-2 pt-1 font-mono text-[11px] tracking-[0.25em] text-subtle">
          <SlidersHorizontal className="size-4 text-accent-blue" />
          TERMINÁL
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onHelp} className="vb-btn-ghost min-h-12">
            <HelpCircle className="size-5" />Jak hrát
          </button>
          <button type="button" onClick={onSlovnicek} className="vb-btn-ghost min-h-12">
            <BookMarked className="size-5" />Slovníček
          </button>
          <button type="button" onClick={onStats} className="vb-btn-ghost min-h-12">
            <BarChart3 className="size-5" />Statistiky profilu
          </button>
          <button type="button" onClick={onAdmin} className="vb-btn-ghost min-h-12 text-muted">
            <SlidersHorizontal className="size-5" />Správce
          </button>
        </div>
        <details className="rounded-xl border border-border bg-surface">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 text-xs text-muted marker:hidden">
            <Trash2 className="size-4" />Údržba profilu
          </summary>
          <div className="border-t border-border p-3">
        {!resetArmed ? (
          <button
            type="button"
            onClick={() => {
              setResetArmed(true);
              window.setTimeout(() => setResetArmed(false), 6000);
            }}
            className="vb-btn-ghost vb-stagger text-muted"
            style={{ "--vb-i": 10 } as CSSProperties}
          >
            <Trash2 className="size-5" />
            Resetovat progress
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              resetProgress();
              window.location.reload();
            }}
            className="vb-btn-ghost vb-stagger border-danger/60 text-danger"
            style={{ "--vb-i": 10 } as CSSProperties}
          >
            <Trash2 className="size-5" />
            Opravdu smazat vše? Klikni pro potvrzení
          </button>
        )}
            <p className="mt-2 text-[11px] leading-relaxed text-subtle">
              Reset smaže profilový postup, level a XP postavy, talenty, materiály, vyrobené zbraně, kodex, achievementy, odznaky, výzvy i blueprinty. Nastavení a zvuk zůstanou.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

/** Panel postavy v menu (knihovna §7): portrét, úroveň, XP postup a 5 statistik profilu. */
function CharacterPanel({ save, character }: { save: SaveData; character: CharacterProgress }) {
  const atCap = character.level >= CHARACTER_LEVEL_CAP;
  const need = xpForNextLevel(character.level);
  const acc = save.totalShotsFired > 0 ? Math.round((save.totalShotsHit / save.totalShotsFired) * 100) : 0;
  const items = [
    { icon: Skull, label: "Zabití", value: formatK(save.totalKills) },
    { icon: Crosshair, label: "Přesnost", value: `${acc} %` },
    { icon: Wrench, label: "Šrot (celkem)", value: formatK(save.totalScrap) },
    { icon: Crown, label: "Bossové", value: String(save.bossesKilled) },
    { icon: Repeat, label: "Běhy", value: String(save.runs) },
  ];
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated">
          <User className="size-7 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
            <User className="size-3.5" />
            POSTAVA
          </h3>
          <p className="truncate text-sm font-medium">
            {character.name} · LVL {character.level}
          </p>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated"
            role="progressbar"
            aria-label="Zkušenosti"
            aria-valuemin={0}
            aria-valuemax={atCap ? 1 : need}
            aria-valuenow={atCap ? 1 : character.xp}
          >
            <div
              className="vb-xp-fill h-full rounded-full"
              style={{ width: atCap ? "100%" : `${Math.min(100, (character.xp / Math.max(1, need)) * 100)}%` }}
            />
          </div>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-subtle">
            {atCap ? "MAX LEVEL" : `${character.xp}/${need} XP`} · {character.talentPoints} talentových bodů
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col items-center gap-0.5 text-center">
            <it.icon className="size-4 text-muted" />
            <span className="font-mono text-xs tabular-nums text-fg">{it.value}</span>
            <span className="text-[11px] text-subtle">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CODEX_ICONS = {  enemy: Skull,
  affix: Sparkles,
  synergy: FlaskConical,
  unique: Crown,
  archetype: Crosshair,
  ability: Zap,
  passive: Heart,
  mutator: Dices,
  anomaly: Orbit,
  portal: DoorOpen,
} as const;

/** Odemykací LVL portálů (zrcadlí unlocksForLevel: forge/library LVL 6, arena/market LVL 12). */
const PORTAL_LEVEL: Record<SectorModId, number> = { lab: 1, forge: 6, library: 6, arena: 12, market: 12 };

function portalUnlocked(mod: SectorModId, bestLevel: number): boolean {
  return bestLevel >= PORTAL_LEVEL[mod];
}

/** Cesta: přehled všeho, co se kdy odemkne — pro nováčky i plánovače. */
function CestaScreen({ save, onCodex }: { save: SaveData; onCodex: () => void }) {
  const best = Math.max(save.bestLevel, save.bestRooms);
  const doneCount = UNLOCKS.filter((u) => best >= u.level).length;
  const nextIdx = UNLOCKS.findIndex((u) => best < u.level);
  const codex = codexProgress();
  const foes = [...ENEMY_SPAWN].sort((a, b) => a.minLevel - b.minLevel);
  const blueprints = loadBlueprints();
  const archs = (Object.keys(ARCHETYPE_LABEL) as ArchetypeId[]).sort(
    (a, b) => (blueprints[b] ?? 0) - (blueprints[a] ?? 0),
  );
  return (
    <div className="vb-vignette absolute inset-0 flex flex-col items-center overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))] pb-28">
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="vb-enter-soft flex flex-col items-center text-center">
          <p className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ice">
            <Map className="size-4" />
            PLÁN POSTUPU
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">CESTA</h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            Co se kdy odemkne · jsi na LVL {best}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-elevated" role="progressbar" aria-label="Postup odemykání" aria-valuemin={0} aria-valuemax={UNLOCKS.length} aria-valuenow={doneCount}>
          <div className="h-full rounded-full bg-ice" style={{ width: `${(doneCount / UNLOCKS.length) * 100}%` }} />
        </div>
        <p className="text-right font-mono text-[11px] tabular-nums text-subtle">{doneCount}/{UNLOCKS.length} odemčeno</p>
        <div className="space-y-4">
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Trophy className="size-3.5" />
              PROFIL {doneCount}/{UNLOCKS.length}
            </h3>
            <ul className="grid grid-cols-2 gap-1.5">
              {UNLOCKS.map((u, i) => {
                const has = best >= u.level;
                return (
                  <li key={u.id} className={`min-w-0 rounded-lg border ${has ? "border-border bg-surface" : i === nextIdx ? "border-accent bg-surface" : "border-border/60 bg-surface/50"}`}>
                    <details className="group">
                      <summary className={`flex min-h-14 cursor-pointer list-none items-center gap-1.5 p-2 marker:hidden ${has ? "text-fg" : "text-subtle"}`}>
                        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated ${has ? "text-rarity-uncommon" : "text-subtle"}`}>
                          {has ? <Check className="size-3.5" /> : <Lock className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{u.name}</span>
                          <span className="block font-mono text-[11px] text-subtle">
                            {has ? "Odemčeno" : i === nextIdx ? `Další · LVL ${u.level}` : `LVL ${u.level}`}
                          </span>
                        </span>
                        <ChevronDown className="size-3 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="border-t border-border px-2 py-1.5 text-[11px] leading-relaxed text-muted">{u.desc}</p>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Skull className="size-3.5" />
              NEPŘÁTELÉ {foes.length + 1}
            </h3>
            <ul className="grid grid-cols-4 gap-1.5">
              {foes.map((f) => (
                <li key={f.kind} title={`${ENEMY_NAME[f.kind]} · od LVL ${f.minLevel} · útok: ${ENEMY_ATTACK_LABEL[ENEMY_ATTACK[f.kind]]}`} className="min-w-0 rounded-lg border border-border/60 bg-surface/60 p-1.5 text-center">
                  <span className="mx-auto flex size-9 items-center justify-center rounded-md border border-border bg-elevated text-muted"><EnemyIcon kind={f.kind} /></span>
                  <span className="mt-1 block truncate text-[11px] font-medium">{ENEMY_NAME[f.kind]}</span>
                  <span className="block font-mono text-[11px] tabular-nums text-subtle">LVL {f.minLevel}+</span>
                </li>
              ))}
              <li title="Boss · 10. místnost · 3 fáze, volá posily" className="min-w-0 rounded-lg border border-danger/40 bg-surface/60 p-1.5 text-center">
                <span className="mx-auto flex size-9 items-center justify-center rounded-md border border-danger/40 bg-elevated text-danger"><EnemyIcon kind="boss" /></span>
                <span className="mt-1 block truncate text-[11px] font-medium text-danger">Boss</span>
                <span className="block font-mono text-[11px] text-subtle">Míst. 10</span>
              </li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <DoorOpen className="size-3.5" />
              PORTÁLY A ANOMÁLIE
            </h3>
            <ul className="grid grid-cols-2 gap-1.5">
              {SECTOR_MODS.map((m) => {
                const has = portalUnlocked(m.id, best);
                const Icon = m.id === "lab" ? FlaskConical : m.id === "forge" ? Wrench : m.id === "arena" ? Swords : m.id === "library" ? BookOpen : ShoppingBag;
                return (
                  <li key={m.id} title={`${m.name} — ${m.desc}`} className={`min-w-0 rounded-lg border p-2 ${has ? "border-border bg-surface/60" : "border-border/60 bg-surface/40"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated ${has ? "text-accent-blue" : "text-subtle"}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">{m.name}</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-subtle">
                          {has ? <Check className="size-3 text-rarity-uncommon" /> : <Lock className="size-3" />}
                          {has ? "V bázi" : `LVL ${PORTAL_LEVEL[m.id]}`}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
              {ANOMALIES.map((a) => (
                <li key={a.id} title={`${a.name} — ${a.desc}`} className="min-w-0 rounded-lg border border-border/60 bg-surface/60 p-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-accent-blue"><Sparkles className="size-4" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{a.name}</span>
                      <span className="font-mono text-[11px] text-subtle">Sektor 2+</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <MaterialIcon material="scrap" className="size-3.5" />
              DÍLNA · BLUEPRINTY
            </h3>
            <p className="mb-2 text-xs leading-relaxed text-muted">
              Zabíjení archetypem zvedá jeho rank: +5 % DMG (25) → zbrojnice (60) → +1 slot (120) → +10 % DMG (200).
              Mody padají z lootu a sazí se v Dílně (záložka přehledu).
            </p>
            <ul className="grid grid-cols-2 gap-1.5">
              {archs.map((a) => {
                const kills = blueprints[a] ?? 0;
                const rank = killsToRank(kills);
                const next = BLUEPRINT_RANK_KILLS[rank + 1];
                return (
                  <li key={a} className={`min-w-0 rounded-lg border p-2 ${kills > 0 ? "border-border bg-surface" : "border-border/60 bg-surface/50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-ice"><WeaponIcon archetype={a} className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-xs font-medium ${kills > 0 ? "text-fg" : "text-subtle"}`}>{ARCHETYPE_LABEL[a].name}</span>
                        <span className="block truncate font-mono text-[11px] text-subtle">
                          {rank > 0 ? `R${rank} · ` : ""}{kills} zabití{next ? ` · ${next} další` : " · MAX"}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-ice"
                        style={{ width: `${next ? Math.min(100, (kills / next) * 100) : 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <BookOpen className="size-3.5" />
              SBÍRKA
            </h3>
            <p className="text-xs leading-relaxed text-muted">
              Kodex {codex.done}/{codex.total} — každá položka trvale posiluje postavu. Zamčené se ukazují jako ???.
            </p>
            <button type="button" onClick={onCodex} className="vb-btn-ghost mt-2 w-full">
              <BookOpen className="size-5" />
              Otevřít kodex
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function SlovnicekScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <BookMarked className="size-6 text-accent-blue" />
          Slovníček
        </h2>
        <p className="mt-1 text-sm text-muted">
          Všechny pojmy na jednom místě · {Object.keys(GLOSSARY).length} hesel
        </p>
        <ul className="mt-4 grid max-h-[52dvh] grid-cols-2 gap-1.5 overflow-y-auto">
          {Object.values(GLOSSARY).map((g) => (
            <li key={g.term} className="min-w-0 rounded-lg border border-border/60 bg-surface/60">
              <details className="group">
                <summary title={g.def} className="flex min-h-12 cursor-pointer list-none items-center gap-1.5 p-2 marker:hidden">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-accent-blue"><BookMarked className="size-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{g.term}</span>
                  <ChevronDown className="size-3 shrink-0 text-subtle transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-border px-2 py-1.5 text-[11px] leading-relaxed text-muted">{g.def}</p>
              </details>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onBack} className="vb-btn-ghost mt-4 w-full">
          Zpět do menu
        </button>
      </div>
    </div>
  );
}

function CodexScreen() {
  const unlocked = loadCodex();  const entries = codexEntries();
  const progress = codexProgress(unlocked, entries);
  const total = codexBonus(unlocked, entries);
  return (
    <div className="vb-vignette absolute inset-0 flex flex-col items-center overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))] pb-28">
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="vb-enter-soft flex flex-col items-center text-center">
          <p className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ice">
            <BookOpen className="size-4" />
            SBÍRKA
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">KODEX</h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            Odemčeno {progress.done}/{progress.total}. Každá položka trvale posiluje postavu.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <h2 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-subtle">
            <Sparkles className="size-4 text-accent-blue" />
            BONUSY · {progress.done}/{progress.total}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{formatCodexBonus(total)}</p>
        </div>
        <div className="space-y-2">
          {CODEX_CATEGORIES.map((cat, catIndex) => {
            const items = entries.filter((e) => e.cat === cat.id);
            const done = items.filter((e) => unlocked.has(`${e.cat}:${e.id}`)).length;
            const Icon = CODEX_ICONS[cat.id];
            return (
              <details key={cat.id} open={catIndex === 0} className="group overflow-hidden rounded-xl border border-border bg-surface">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 marker:hidden hover:bg-elevated/60">
                  <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-subtle">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-accent-blue"><Icon className="size-4" /></span>
                    <span className="truncate">{cat.name.toUpperCase()}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums text-muted">
                    {done}/{items.length}
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <ul className="grid grid-cols-2 gap-1.5 border-t border-border p-2">
                  {items.map((e) => {
                    const has = unlocked.has(`${e.cat}:${e.id}`);
                    return (
                      <li key={`${e.cat}:${e.id}`} className={`min-w-0 rounded-lg border ${has ? "border-border bg-elevated" : "border-border/60 bg-elevated/40"}`}>
                        <details className="group/item">
                          <summary title={has ? `${e.name}: ${e.desc}` : "Zamčený záznam"} className="flex min-h-12 cursor-pointer list-none items-center gap-1.5 p-2 text-xs marker:hidden">
                            <span className={`flex size-7 shrink-0 items-center justify-center rounded-md border border-border ${has ? "text-accent-blue" : "text-subtle"}`}>
                              {has ? <Icon className="size-3.5" /> : <Lock className="size-3.5" />}
                            </span>
                            <span className={`min-w-0 flex-1 truncate font-medium ${has ? "text-fg" : "text-subtle"}`}>{has ? e.name : "???"}</span>
                            <ChevronDown className="size-3 shrink-0 text-subtle transition-transform group-open/item:rotate-180" />
                          </summary>
                          <div className="border-t border-border px-2 pb-2 pt-1.5">
                            <p className="text-[11px] leading-relaxed text-muted">{has ? e.desc : "??? — potkej to ve hře."}</p>
                            <p className="mt-1 font-mono text-[11px] text-subtle">{has ? formatCodexBonus(e.bonus) : "odměna: ???"}</p>
                          </div>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AchievementsScreen() {
  const have = new Set(loadAchievements());
  return (
    <div className="vb-vignette absolute inset-0 flex flex-col items-center overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))] pb-28">
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="vb-enter-soft flex flex-col items-center text-center">
          <p className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ice">
            <Trophy className="size-4" />
            METY
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">ÚSPĚCHY</h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            Splněno {have.size}/{ACHIEVEMENTS.length}. Odemknutí je trvalé.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-1.5">
          {ACHIEVEMENTS.map((a) => {
            const has = have.has(a.id);
            return (
              <li key={a.id} className={`min-w-0 rounded-xl border ${has ? "border-rarity-uncommon/40 bg-surface" : "border-border/60 bg-surface/60"}`}>
                <details className="group">
                  <summary title={`${a.name} — ${a.desc}`} className={`flex min-h-16 cursor-pointer list-none items-center gap-2 p-2 marker:hidden ${has ? "text-fg" : "text-subtle"}`}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${has ? "border-rarity-uncommon/40 bg-rarity-uncommon/10 text-rarity-uncommon" : "border-border bg-elevated text-subtle"}`}>
                      {has ? <Trophy className="size-4" /> : <Lock className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{a.name}</span>
                      <span className={`mt-0.5 block font-mono text-[11px] tracking-wide ${has ? "text-rarity-uncommon" : "text-subtle"}`}>{has ? "SPLNĚNO" : "ZAMČENO"}</span>
                    </span>
                    <ChevronDown className="size-3.5 shrink-0 text-subtle transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="border-t border-border px-2.5 py-2 text-[11px] leading-relaxed text-muted">{a.desc}</p>
                </details>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StatsScreen({ save, onBack }: { save: SaveData; onBack: () => void }) {
  const accuracy =
    save.totalShotsFired > 0 ? Math.round((save.totalShotsHit / save.totalShotsFired) * 100) : 0;
  const avgKills = save.runs > 0 ? Math.round(save.totalKills / save.runs) : 0;
  const avgTime = save.runs > 0 ? Math.round(save.totalPlayTime / save.runs) : 0;
  const mins = Math.floor(save.totalPlayTime / 60);
  const secs = Math.floor(save.totalPlayTime % 60).toString().padStart(2, "0");
  const profileNick = getProfileNickname();
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <BarChart3 className="size-6 text-accent-blue" />
            Statistiky
          </h2>
          {profileNick ? (
            <span className="rounded-xl border border-border bg-elevated px-3 py-1 font-mono text-xs text-subtle">
              {profileNick}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted mb-5">
          Celkové statistiky napříč všemi běhy na tomto zařízení.
        </p>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          <Stat label="Běhů" value={String(save.runs)} />
          <Stat label="Nejv. úroveň" value={String(Math.max(save.bestLevel, save.bestRooms))} />
          <Stat label="Nejv. zabití" value={String(save.bestKills)} />
          <Stat label="Nejv. místnost" value={String(save.bestRoom)} />
          <Stat label="Celkem zabití" value={formatK(save.totalKills)} />
          <Stat label="Bossů" value={String(save.bossesKilled)} />
          <Stat label="Šrot celkem" value={formatK(save.totalScrap)} />
          <Stat label="Herní čas" value={mins + ":" + secs} />
        </div>
        <div className="mb-4 rounded-xl border border-border bg-elevated p-3">
          <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
            <Crosshair className="size-3.5" />
            PŘESNOST A POŠKOZENÍ
          </h3>
          <div className="grid grid-cols-2 gap-1.5 text-sm">
            <div className="rounded-lg border border-border/70 bg-surface/60 p-2 text-center">
              <Crosshair className="mx-auto mb-1 size-4 text-muted" aria-hidden="true" />
              <div className="font-display text-lg font-semibold tabular-nums text-fg">{accuracy} %</div>
              <div className="text-[11px] tracking-wide text-subtle">Přesnost střel</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface/60 p-2 text-center">
              <Target className="mx-auto mb-1 size-4 text-muted" aria-hidden="true" />
              <div className="font-display text-lg font-semibold tabular-nums text-fg">
                {formatK(save.totalShotsFired)}
              </div>
              <div className="text-[11px] tracking-wide text-subtle">Vypáleno střel</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface/60 p-2 text-center">
              <Swords className="mx-auto mb-1 size-4 text-muted" aria-hidden="true" />
              <div className="font-display text-lg font-semibold tabular-nums text-fg">
                {formatK(save.totalDmgDealt)}
              </div>
              <div className="text-[11px] tracking-wide text-subtle">Způsobeno poškození</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface/60 p-2 text-center">
              <Shield className="mx-auto mb-1 size-4 text-muted" aria-hidden="true" />
              <div className="font-display text-lg font-semibold tabular-nums text-fg">
                {formatK(save.totalDmgTaken)}
              </div>
              <div className="text-[11px] tracking-wide text-subtle">Utrženo poškození</div>
            </div>
          </div>
          <div className="mt-3 text-center text-xs text-muted">
            Průměrně {avgKills} zabití a {avgTime}s na běh.
          </div>
        </div>
        <button type="button" onClick={onBack} className="vb-btn-primary mt-6 w-full">
          Zpět
        </button>
      </div>
    </div>
  );
}

/** Zkrácené číslo pro statistiky (12 400 → 12.4k). */
function formatK(v: number): string {
  const n = Math.round(v);
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function Stat({ label, value }: { label: string; value: string }) {
  const Icon = label.includes("Zabit")
    ? Skull
    : label.includes("Boss")
      ? Crown
      : label.includes("Šrot")
        ? Wrench
        : label.includes("Přesnost") || label.includes("Střely") || label.includes("DMG")
          ? Crosshair
          : label.includes("Sektor") || label.includes("Místnost")
            ? Map
            : label.includes("HP")
              ? Heart
              : label.includes("Čas")
                ? Hourglass
                : label.includes("Běh")
                  ? Repeat
                  : BarChart3;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-surface/60 p-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
        <Icon className="size-4 text-muted" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block font-display text-base font-semibold tabular-nums text-fg">{value}</span>
        <span className="block truncate text-[11px] tracking-wide text-subtle">{label}</span>
      </span>
    </div>
  );
}

function Help({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <HelpCircle className="size-6 text-accent-blue" />
          Jak hrát
        </h2>
        <div className="mt-4 max-h-[50dvh] space-y-4 overflow-y-auto text-sm leading-relaxed text-muted">
          <section>
            <h3 className="flex items-center gap-1.5 font-medium text-fg"><Crosshair className="size-4" />Základy</h3>
            <ul className="mt-1 space-y-1">
              <li>Pohyb je oddělený od míření — WASD nebo levý stick.</li>
              <li>Míření: myš, pravý stick. Na mobilu se střílí automaticky.</li>
              <li>Na mobilu: levá páčka pohyb, pravá páčka míření, tlačítka schopnost / dash / zbraň.</li>
              <li>Dash: mezerník. Schopnost: F nebo Shift.</li>
              <li>Výměna zbraně: Q / E. Dva sloty, neomezené kombinace.</li>
              <li>Boj a Statistiky otevřou pozastavený přehled; Statistiky ukazují průběh, přesnost a poškození.</li>
              <li>Postava (C): výbava, stav zbraní a modifikátory běhu.</li>
              <li>Dílna je v přehledu dostupná jen během bezpečné pauzy mezi vlnami.</li>
              <li>Tipy k pojmům: najeď myší nebo tapni na ikony a čísla v HUD.</li>
              <li>Nové ve hře? Obrazovka Cesta v menu ukazuje, co se kdy odemkne.</li>
              <li>Před každou další vlnou je krátká pauza s odpočtem v HUD.</li>
              <li>Kolo štěstí před runem i každým sektorem losuje 3 mutátory — platí jen pro daný sektor.</li>
            </ul>
          </section>
          <section>
            <h3 className="flex items-center gap-1.5 font-medium text-fg"><Wrench className="size-4" />Loot a šrot</h3>
            <ul className="mt-1 space-y-1">
              <li>Po místnosti vybereš loot — zbraň, schopnost, pasivku, nebo vše rozebereš na šrot.</li>
              <li>Šrot (od LVL 3) utratíš v bázi. Čím vyšší rarita, tím víc šrotu.</li>
              <li>Padá ti smůla? Po 3 místnostech bez rare+ hra jednu nabídku vylepší.</li>
            </ul>
          </section>
          <section>
            <h3 className="flex items-center gap-1.5 font-medium text-fg"><DoorOpen className="size-4" />Báze a expedice</h3>
            <ul className="mt-1 space-y-1">
              <li>Sektor má 10 úrovní. 3. a 6. jsou elity. 10. je boss.</li>
              <li>Po bossovi je báze: heal, obchod, checkpoint a volba další expedice.</li>
              <li>Kovárna: víc zbraní. Aréna: lepší loot. Laboratoř: schopnosti a jistý medkit.</li>
              <li>Knihovna: schopnost + pasivka. Tržiště: 4 nabídky.</li>
              <li>Torment (od LVL 30): dobrovolně těžší běh za lepší loot.</li>
              <li>Portály a obchod se postupně odemykají hraním — menu ukazuje, co je dál.</li>
            </ul>
          </section>
          <section>
            <h3 className="flex items-center gap-1.5 font-medium text-fg"><Wrench className="size-4" />Dílna a zbrojnice</h3>
            <ul className="mt-1 space-y-1">
              <li>Zbraně jsou rámy s mod-sloty podle rarity. Unikáty (relikvie) se neupravují.</li>
              <li>Mody padají z lootu do inventáře (max 8) a osazují se v Dílně — pouze během bezpečné pauzy mezi vlnami.</li>
              <li>2+ mody stejné rodiny dávají setový bonus (+10 %, 3 kusy +25 %).</li>
              <li>Zabíjení archetypem zvedá jeho blueprint rank (DMG, slot, startovní rám ve Zbrojnici v menu).</li>
            </ul>
          </section>
          <section>
            <h3 className="flex items-center gap-1.5 font-medium text-fg"><Skull className="size-4" />Synergie a bossové</h3>
            <ul className="mt-1 space-y-1">
              <li>Oheň + jed = výbuch. Mráz + šok = křehkost (+35 % dmg). Oheň + mráz = pára.</li>
              <li>Elity a bossové nesou affixy (barevný kroužek): hbitý, pancéřovaný, třaskavý, zhoubný, obří, zběsilý.</li>
              <li>Nepřátelé od LVL 10 mají zbroj (až 30 %) — průrazné zbraně (railka, harpuna) ji ignorují. Statusy (oheň, jed) zbroj obcházejí.</li>
              <li>Bonusy se skládají do kyblíků s klesajícími výnosy — pátý stejný bonus už skoro nic nedá.</li>
              <li>Boss má 3 fáze — pod 70 % a 30 % HP přitvrdí, teleportuje se a volá posily.</li>
            </ul>
          </section>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="vb-btn-primary mt-5 w-full"
        >
          Zpět
        </button>
      </div>
    </div>
  );
}

function Hud({ hud, activePanel, onPause, onBattle, onStats, onCharacter, onStartWave }: { hud: HudSnap; activePanel: PanelTab | null; onPause: () => void; onBattle: () => void; onStats: () => void; onCharacter: () => void; onStartWave: () => void }) {
  const hp = Math.max(0, hud.hp / hud.maxHp);
  const lowHp = hp < 0.3 && hp > 0;
  const characterRunProgress = applyCharacterXp(hud.characterLevel, hud.characterXp + hud.runXp);
  const characterAtCap = characterRunProgress.level >= CHARACTER_LEVEL_CAP;
  const buffChips: { key: string; icon: ReactNode; label: string; tip: string; body: string }[] = [];
  if (hud.buffs.shield > 0) buffChips.push({ key: "shield", icon: <Shield className="size-3.5" />, label: `${hud.buffs.shield.toFixed(1)}s`, tip: "Štít", body: "Úplná imunita, dokud efekt běží." });
  if (hud.buffs.overclock > 0) buffChips.push({ key: "overclock", icon: <Flame className="size-3.5" />, label: `${hud.buffs.overclock.toFixed(1)}s`, tip: "Přetaktování", body: "Vyšší kadence i rychlost střel." });
  if (hud.buffs.mirror > 0) buffChips.push({ key: "mirror", icon: <Copy className="size-3.5" />, label: `${hud.buffs.mirror.toFixed(1)}s`, tip: "Zrcadlo", body: "Každá střela se zdvojí jako přízrak." });
  if (hud.buffs.drone > 0) buffChips.push({ key: "drone", icon: <Bot className="size-3.5" />, label: `${hud.buffs.drone.toFixed(1)}s`, tip: "Dron", body: "Spojenec střílí na nejbližší cíl." });
  if (hud.buffs.timestop > 0) buffChips.push({ key: "timestop", icon: <Hourglass className="size-3.5" />, label: `${hud.buffs.timestop.toFixed(1)}s`, tip: "Zastavení času", body: "Nepřátelé i jejich střely se zpomalí." });
  if (hud.buffs.orbitals > 0) buffChips.push({ key: "orbitals", icon: <Orbit className="size-3.5" />, label: `${hud.buffs.orbitals.toFixed(1)}s`, tip: "Orbitální ostří", body: "Ostří krouží kolem tebe a seká okolí." });
  if (hud.buffs.well) buffChips.push({ key: "well", icon: <CircleDot className="size-3.5" />, label: "aktivní", tip: "Gravitační studna", body: "Stahuje nepřátele do bodu a drží je." });
  return (
    <>
      {lowHp ? (
        <div
          className="vb-hp-low pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 90px 30px rgba(196,92,62,0.45)" }}
        />
      ) : null}
      {hud.waveAwaiting ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <span className="rounded-full border border-ice/50 bg-surface/90 px-4 py-2 font-mono text-sm tabular-nums text-ice shadow-lg">
              Vlna {hud.wave}/{hud.waves} — připraveno
            </span>
            <button
              type="button"
              onClick={onStartWave}
              className="pointer-events-auto vb-btn-primary flex items-center gap-2 px-4 py-2"
            >
              <Play className="size-4" />
              Start vlna
            </button>
          </div>
        </div>
      ) : hud.waveIn > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
          <span className="rounded-full border border-ice/50 bg-surface/90 px-4 py-2 font-mono text-sm tabular-nums text-ice shadow-lg">
            Vlna {hud.wave}/{hud.waves} za {hud.waveIn.toFixed(1)}s
          </span>
        </div>
      ) : null}
      {hud.bossInfo ? (
        <div className="pointer-events-none absolute inset-x-0 top-32 flex justify-center sm:top-28">
          <div className="w-64 max-w-[70vw]">
            <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[11px] tracking-[0.25em] text-danger">
              <span>BOSS · {BOSS_PHASE_NAMES[(hud.bossInfo.phase || 1) as BossPhase].toUpperCase()}</span>
              <span className="tabular-nums">{Math.ceil(hud.bossInfo.hp)}/{Math.ceil(hud.bossInfo.maxHp)} HP</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-danger/50 bg-elevated/90 shadow">
              <div
                className="h-full rounded-full bg-danger transition-[width] duration-150"
                style={{ width: `${Math.max(0, (hud.bossInfo.hp / hud.bossInfo.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 pt-[max(10px,env(safe-area-inset-top))] sm:p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-bg/65 p-2 shadow-lg backdrop-blur-sm">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs tracking-wide text-muted">
            <span className="rounded-md bg-surface/80 px-2 py-0.5 font-mono tabular-nums">
              SEKTOR {hud.sector} · {hud.room}/{hud.rooms} · LVL {hud.level}
            </span>
            {hud.boss ? (
              <Tip title={GLOSSARY.boss.term} body={GLOSSARY.boss.def}>
                <span className="vb-badge-alert rounded-md bg-danger/20 px-2 py-0.5 font-semibold text-danger">BOSS</span>
              </Tip>
            ) : null}
            {hud.elite ? (
              <Tip title={GLOSSARY.elite.term} body={GLOSSARY.elite.def}>
                <span className="rounded-md bg-ice/15 px-2 py-0.5 text-ice">ELITA</span>
              </Tip>
            ) : null}
            {hud.gamePhase === "mid" ? (
              <Tip title={GLOSSARY.phase.term} body={GLOSSARY.phase.def}>
                <span className="rounded-md bg-accent/15 px-2 py-0.5 text-fg">MID-GAME</span>
              </Tip>
            ) : hud.gamePhase === "endgame" ? (
              <Tip title={GLOSSARY.phase.term} body={GLOSSARY.phase.def}>
                <span className="vb-badge-alert rounded-md bg-danger/20 px-2 py-0.5 font-semibold text-danger">HLUBINA</span>
              </Tip>
            ) : null}
            {hud.torment ? (
              <Tip title={GLOSSARY.torment.term} body={GLOSSARY.torment.def}>
                <span className="vb-badge-alert rounded-md bg-danger/30 px-2 py-0.5 font-semibold text-danger">TORMENT</span>
              </Tip>
            ) : null}
            {hud.anomaly && anomalyDef(hud.anomaly) ? (
              <Tip title={`Anomálie: ${anomalyDef(hud.anomaly)!.name}`} body={`${anomalyDef(hud.anomaly)!.desc} ${GLOSSARY.anomaly.def}`}>
                <span className="flex items-center gap-1 rounded-md bg-ice/15 px-2 py-0.5 text-ice">
                  <Sparkles className="size-3.5" />
                  {anomalyDef(hud.anomaly)!.name}
                </span>
              </Tip>
            ) : null}
            {hud.combo > 1 ? (
              <Tip title={GLOSSARY.combo.term} body={GLOSSARY.combo.def}>
                <span className="text-fg">x{hud.combo}</span>
              </Tip>
            ) : null}
            <Tip title={GLOSSARY.scrap.term} body={GLOSSARY.scrap.def}>
              <span className="flex items-center gap-1 rounded-md bg-surface/80 px-2 py-0.5 font-mono tabular-nums">
                <Wrench className="size-3.5" />
                {hud.scrap}
              </span>
            </Tip>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[11px] tabular-nums">
            <span className="text-danger">ZDRAVÍ</span>
            <span className={lowHp ? "font-semibold text-danger" : "text-fg"}>{Math.ceil(hud.hp)}/{Math.ceil(hud.maxHp)} HP</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-elevated/90">
            <div className="h-full rounded-full bg-danger transition-[width] duration-150" style={{ width: `${hp * 100}%` }} />
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full border border-border/60 bg-elevated/90 shadow">
            <div
              className="vb-xp-fill h-full rounded-full"
              style={{
                width: characterAtCap
                  ? "100%"
                  : `${Math.min(100, (characterRunProgress.xp / Math.max(1, xpForNextLevel(characterRunProgress.level))) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-xs tabular-nums text-subtle">
            <span>
              Postava {characterRunProgress.level} · XP{" "}
              {characterAtCap
                ? "MAX"
                : `${characterRunProgress.xp}/${xpForNextLevel(characterRunProgress.level)}`}
            </span>
            <Tip title={GLOSSARY.dash.term} body={GLOSSARY.dash.def}>
              <span aria-label={`Dash ${hud.dash} z ${hud.dashMax}`}>
                {Array.from({ length: hud.dashMax }, (_, i) => (
                  <span
                    key={i}
                    className={`inline-block size-2 rounded-full ${i < hud.dash ? "bg-ice" : "bg-border"}`}
                  />
                ))}
              </span>
            </Tip>
          </div>
          {buffChips.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {buffChips.map((b) => (
                <Tip key={b.key} title={b.tip} body={b.body}>
                  <span className="flex items-center gap-1 rounded-md border border-ice/40 bg-surface/90 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-ice">
                    {b.icon}
                    {b.label}
                  </span>
                </Tip>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onBattle}
            className={`pointer-events-auto flex size-12 items-center justify-center rounded-xl border transition-transform active:scale-95 ${activePanel === "battle" ? "border-accent-blue bg-surface text-accent-blue shadow-[0_0_12px_-2px_rgba(67,191,255,0.35)]" : "border-border bg-surface/90 text-fg"}`}
            aria-label="Otevřít bojový přehled"
            title="Bojový přehled"
          >
            <Swords className="size-5" />
          </button>
          <button
            type="button"
            onClick={onStats}
            className={`pointer-events-auto flex size-12 items-center justify-center rounded-xl border transition-transform active:scale-95 ${activePanel === "stats" ? "border-accent-blue bg-surface text-accent-blue shadow-[0_0_12px_-2px_rgba(67,191,255,0.35)]" : "border-border bg-surface/90 text-muted hover:text-accent-blue"}`}
            aria-label="Statistiky běhu (T)"
            title="Statistiky běhu (T)"
          >
            <BarChart3 className="size-5" />
          </button>
          <button
            type="button"
            onClick={onCharacter}
            className={`pointer-events-auto flex size-12 items-center justify-center rounded-xl border transition-transform active:scale-95 ${activePanel === "char" ? "border-accent bg-surface text-fg shadow-[0_0_12px_-2px_rgba(200,204,212,0.5)]" : "border-border bg-surface/90 text-fg"}`}
            aria-label="Výbava postavy (C)"
            title="Výbava postavy (C)"
          >
            <User className="size-5" />
          </button>
          <button
            type="button"
            onClick={onPause}
            className="pointer-events-auto flex size-12 items-center justify-center rounded-xl border border-border bg-surface/90 text-fg transition-transform active:scale-95"
            aria-label="Pauza"
          >
            <Pause className="size-5" />
          </button>
        </div>
      </div>
      <div className="pointer-events-none mb-28 flex items-end justify-between gap-1.5 sm:mb-4">
        <WeaponChip
          weapon={hud.weapons[0]}
          active={hud.slot === 0}
          mag={hud.slot === 0 ? hud.mag : undefined}
          magSize={hud.weapons[0].stats.magSize}
          reloading={hud.slot === 0 && hud.reloading}
        />
        {hud.weapons[1] ? (
          <WeaponChip
            weapon={hud.weapons[1]}
            active={hud.slot === 1}
            mag={hud.slot === 1 ? hud.mag : undefined}
            magSize={hud.weapons[1].stats.magSize}
            reloading={hud.slot === 1 && hud.reloading}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-subtle">
            Prázdný slot
          </div>
        )}
        <div className="min-w-0 rounded-xl border border-border bg-surface/90 px-2.5 py-2 shadow backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-accent-blue"><Zap className="size-4" /></span>
            <Tip title={GLOSSARY.ability.term} body={GLOSSARY.ability.def}>
              <span className="max-w-24 truncate text-xs font-medium">{hud.ability.name}</span>
            </Tip>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated"
            role="progressbar"
            aria-label="Nabíjení schopnosti"
            aria-valuemin={0}
            aria-valuemax={hud.ability.cooldown}
            aria-valuenow={Math.max(0, hud.ability.cooldown - hud.abilityCd)}
          >
            <div
              className="h-full rounded-full bg-ice transition-[width] duration-150"
              style={{
                width: `${(1 - Math.min(1, hud.abilityCd / Math.max(0.01, hud.ability.cooldown))) * 100}%`,
              }}
            />
          </div>
          <div className="mt-1 font-mono text-[11px] tabular-nums text-subtle" title={`Přebíjení schopnosti (F / Shift): ${hud.ability.desc}`}>
            {hud.abilityCd > 0.05 ? `${hud.abilityCd.toFixed(1)}s` : "Připraveno"}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

/** Tooltip s vysvětlivkou: desktop hover, mobil tap. Texty bere ze slovníčku (glossary.ts). */
function Tip({ title, body, side = "bottom", children }: { title: string; body: string; side?: "top" | "bottom"; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="pointer-events-auto relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      {children}
      {open ? (
        <span
          className={`absolute left-1/2 z-50 w-48 max-w-[62vw] -translate-x-1/2 rounded-xl border border-border bg-elevated p-2.5 text-left shadow-xl ${side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
        >
          <span className="block text-xs font-medium text-fg">{title}</span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{body}</span>
        </span>
      ) : null}
    </span>
  );
}

function ToastFeed({ toasts }: { toasts: { id: number; kind: GameEvent["kind"]; text: string; sub?: string }[] }) {  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none absolute right-3 bottom-52 flex w-64 max-w-[70vw] flex-col gap-2 sm:bottom-40">
      {toasts.map((t) => (
        <div key={t.id} className="vb-enter rounded-xl border border-border bg-surface/95 p-2.5 shadow-lg">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {t.kind === "challenge" ? (
              <Trophy className="size-4 shrink-0 text-rarity-uncommon" />
            ) : t.kind === "material" ? (
              <Wrench className="size-4 shrink-0 text-ice" />
            ) : (
              <BookOpen className="size-4 shrink-0 text-ice" />
            )}
            {t.text}
          </div>
          {t.sub ? <div className="mt-0.5 text-xs text-muted">{t.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

function WeaponChip({
  weapon,
  active,
  mag,
  magSize,
  reloading,
}: {
  weapon: Weapon;
  active: boolean;
  mag?: number;
  magSize: number;
  reloading: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 max-w-[42%] items-center gap-2 rounded-xl border px-2 py-2 shadow backdrop-blur-sm transition-all sm:px-3 ${active ? "border-accent bg-surface/95 shadow-[0_0_16px_-4px_rgba(200,204,212,0.5)]" : "border-border bg-surface/80"}`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated ${rarityClass(weapon.rarity)}`}>
        <WeaponIcon archetype={weapon.archetype} className="size-5" />
      </span>
      <div className="min-w-0">
        <div className={`text-[11px] font-medium tracking-widest ${rarityClass(weapon.rarity)}`}>{RARITY_LABEL[weapon.rarity]}</div>
        <div className="truncate text-xs font-medium">{weapon.name}</div>
        <div className="font-mono text-[11px] tabular-nums text-muted">
          {reloading ? "Nabíjení" : mag !== undefined ? `${mag}/${magSize}` : `${magSize}`}
        </div>
      </div>
    </div>
  );
}

function PanelShell({
  title,
  tab,
  onTab,
  onClose,
  canWorkshop,
  children,
}: {
  title: string;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  canWorkshop: boolean;
  children: ReactNode;
}) {
  const tabs: { id: PanelTab; label: string; icon: typeof Crosshair }[] = [
    { id: "battle", label: "Boj", icon: Swords },
    { id: "stats", label: "Statistiky", icon: BarChart3 },
    { id: "char", label: "Výbava", icon: User },
    { id: "workshop", label: "Dílna", icon: Wrench },
  ];
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/65 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="vb-enter flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface/98 text-fg shadow-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.2em] text-accent-blue">EXPEDICE · SEKTOR {title.split("·").at(-1)?.trim() ?? ""}</p>
            <h2 className="truncate text-sm font-semibold">{title.split("·")[0]?.trim()}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:text-fg"
            aria-label="Zavřít přehled a pokračovat"
            title="Zavřít a pokračovat"
          >
            <X className="size-5" />
          </button>
        </header>
        <nav className="grid grid-cols-4 gap-1 border-b border-border p-2" aria-label="Herní přehledy">
          {tabs.map(({ id, label, icon: Icon }) => {
            const locked = id === "workshop" && !canWorkshop;
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                onClick={() => onTab(id)}
                aria-pressed={tab === id}
                title={locked ? "Dílna je přístupná pouze v bezpečné pauze mezi vlnami" : label}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  tab === id ? "border-accent-blue bg-accent-blue/10 text-accent-blue" : "border-transparent text-muted hover:border-border hover:text-fg"
                }`}
              >
                <Icon className="size-4" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>
        {!canWorkshop ? (
          <p className="flex items-center gap-2 border-b border-border bg-bg/50 px-3 py-2 text-xs text-muted">
            <Lock className="size-4 shrink-0 text-subtle" />
            Dílna se odemkne v bezpečné pauze mezi vlnami.
          </p>
        ) : null}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
      </section>
    </div>
  );
}

function OverviewPanel({
  tab,
  onTab,
  onClose,
  hud,
  stats,
  canWorkshop,
  onSocket,
  onUnsocket,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  hud: HudSnap;
  stats: StatsSnap;
  canWorkshop: boolean;
  onSocket: (modId: string, slot: 0 | 1) => void;
  onUnsocket: (slot: 0 | 1, idx: number) => void;
}) {
  const title = tab === "battle" ? "Boj · taktický přehled"
    : tab === "stats" ? "Statistiky · běh"
      : tab === "char" ? "Výbava · postava" : "Dílna · modifikace";
  return (
    <PanelShell title={`${title} · ${stats.sector}`} tab={tab} onTab={onTab} onClose={onClose} canWorkshop={canWorkshop}>
      {tab === "battle" ? (
        <BattleBody hud={hud} stats={stats} activeSlot={hud.slot} />
      ) : tab === "stats" ? (
        <StatsBody stats={stats} activeSlot={hud.slot} hud={hud} />
      ) : tab === "char" ? (
        <CharBody hud={hud} stats={stats} />
      ) : (
        <DilnaBody hud={hud} onSocket={onSocket} onUnsocket={onUnsocket} betweenWaves={canWorkshop} onClose={onClose} />
      )}
    </PanelShell>
  );
}

function BattleBody({ hud, stats, activeSlot }: { hud: HudSnap; stats: StatsSnap; activeSlot: number }) {
  const activeWeapon = stats.player.weapons[activeSlot];
  const roomProgress = Math.min(100, (stats.room / Math.max(1, stats.rooms)) * 100);
  const waveProgress = Math.min(100, (stats.wave / Math.max(1, stats.waves)) * 100);
  const hpProgress = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const breakReady = hud.waveAwaiting || (stats.remaining === 0 && stats.wave < stats.waves && stats.waveIn > 0);
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border bg-elevated p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-subtle"><Map className="size-4 text-accent-blue" />PRŮBĚH MÍSTNOSTI</h3>
          <span className="font-mono text-xs tabular-nums text-fg">{stats.room}/{stats.rooms}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-accent-blue transition-[width] duration-200" style={{ width: `${roomProgress}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] tracking-wider text-subtle">VLNA</p>
            <p className="font-display text-lg font-semibold tabular-nums text-fg">{stats.wave}<span className="text-muted">/{stats.waves}</span></p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px] tracking-wider text-subtle">{breakReady ? "MEZI VLNAMI" : "NEPŘÁTELÉ"}</p>
            <p className={`font-display text-lg font-semibold tabular-nums ${breakReady ? "text-rarity-uncommon" : "text-danger"}`}>
              {breakReady ? "PŘIPRAVENO" : `${stats.remaining} ZBÝVÁ`}
            </p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-rarity-uncommon transition-[width] duration-200" style={{ width: `${waveProgress}%` }} />
        </div>
        {stats.boss || stats.elite ? (
          <div className="mt-2 flex gap-1.5">
            {stats.boss ? <span className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1 font-mono text-[11px] text-danger">BOSS T{stats.bossTier + 1}</span> : null}
            {stats.elite ? <span className="rounded-md border border-ice/30 bg-ice/10 px-2 py-1 font-mono text-[11px] text-ice">ELITA</span> : null}
          </div>
        ) : null}
      </section>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-elevated p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-subtle"><Heart className="size-3.5 text-danger" /> ZDRAVÍ</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-fg">{Math.ceil(hud.hp)}<span className="text-muted">/{Math.ceil(hud.maxHp)}</span></p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-danger" style={{ width: `${hpProgress}%` }} /></div>
        </div>
        <div className="rounded-xl border border-border bg-elevated p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-subtle"><Wrench className="size-3.5 text-ice" /> ŠROT</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-ice">{hud.scrap}</p>
          <p className="mt-1 text-[11px] text-subtle">sektor {stats.sector} · úroveň {stats.level}</p>
        </div>
      </div>
      <section className="rounded-xl border border-border bg-elevated p-3">
        <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-subtle"><Crosshair className="size-4 text-accent-blue" />AKTIVNÍ ZBRAŇ</h3>
        {activeWeapon ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <WeaponIcon archetype={hud.weapons[activeSlot]?.archetype ?? "pistol"} className="size-5 shrink-0 text-ice" />
              <span className="truncate text-sm font-medium">{activeWeapon.name}</span>
            </div>
            <div className="shrink-0 text-right font-mono tabular-nums">
              <span className="text-sm text-rarity-uncommon">{Math.round(activeWeapon.dps)} DPS</span>
              <span className="ml-2 text-[11px] text-subtle">{Math.round(activeWeapon.rpm)} RPM</span>
            </div>
          </div>
        ) : <p className="text-xs text-subtle">Zbraň není k dispozici.</p>}
      </section>
      {hud.waveAwaiting ? <p className="rounded-lg border border-ice/30 bg-ice/10 p-2.5 text-xs text-ice">Další vlna čeká na spuštění. Zavři přehled a spusť ji, až budeš připraven.</p> : null}
    </div>
  );
}

/** Dílna: sazení modů z inventáře do rámů (pravidla §23). */
function DilnaBody({
  hud,
  onSocket,
  onUnsocket,
  betweenWaves,
  onClose,
}: {
  hud: HudSnap;
  onSocket: (modId: string, slot: 0 | 1) => void;
  onUnsocket: (slot: 0 | 1, idx: number) => void;
  betweenWaves: boolean;
  onClose: () => void;
}) {
  const [slot, setSlot] = useState<0 | 1>(hud.slot === 1 ? 1 : 0);
  const w = hud.weapons[slot];
  const fam = w ? familyBonusOf(w.mods) : { mult: 1, family: null as null };
  const canSocket = w && !w.unique && w.mods.length < w.slots;
  return (
    <div className="space-y-3 text-sm">
      <section className="rounded-xl border border-rarity-uncommon/30 bg-rarity-uncommon/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-rarity-uncommon"><Wrench className="size-4" />BEZPEČNÁ PAUZA</p>
          <span className="font-mono text-[11px] text-subtle">MODY {hud.modInv.length}/{MOD_INV_MAX}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-rarity-uncommon" style={{ width: `${(hud.modInv.length / MOD_INV_MAX) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {betweenWaves ? "Čas i nepřátelé jsou pozastaveni. Po zavření přehledu můžeš spustit další vlnu." : "Dílna je dostupná jen v bezpečné pauze mezi vlnami."}
        </p>
        <button type="button" onClick={onClose} className="mt-2 min-h-12 w-full rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-fg hover:border-accent-blue">
          <Play className="mr-1.5 inline size-4" />Zavřít dílnu
        </button>
      </section>
      <div className="grid grid-cols-2 gap-1.5">
        {([0, 1] as const).map((s) => {
          const sw = hud.weapons[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              aria-pressed={slot === s}
              className={`flex min-h-14 min-w-0 items-center gap-2 rounded-xl border px-2 text-left transition-colors ${slot === s ? "border-accent-blue bg-accent-blue/10 text-fg" : "border-border bg-elevated text-muted"}`}
            >
              <WeaponIcon archetype={sw?.archetype ?? "pistol"} className={`size-5 shrink-0 ${sw ? rarityClass(sw.rarity) : "text-subtle"}`} />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{sw ? sw.name : `Slot ${s + 1} · prázdný`}</span>
                <span className="block font-mono text-[11px] text-subtle">{sw ? `${sw.mods.length}/${sw.slots} modů` : "bez zbraně"}</span>
              </span>
            </button>
          );
        })}
      </div>
      {w ? (
        <div className="rounded-xl border border-border bg-surface p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate font-medium ${rarityClass(w.rarity)}`}>{w.name}</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-subtle">
              {w.unique ? "relikvie" : `sloty ${w.mods.length}/${w.slots}`}
            </span>
          </div>
          {!w.unique ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full bg-accent-blue" style={{ width: `${Math.min(100, (w.mods.length / Math.max(1, w.slots)) * 100)}%` }} />
            </div>
          ) : null}
          {w.unique ? (
            <p className="mt-1 text-xs text-subtle">Relikvie se neupravují — jsou dokonalé tak, jak jsou.</p>
          ) : w.mods.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {w.mods.map((m, i) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onUnsocket(slot, i)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-elevated px-2 py-1.5 text-left text-xs"
                    title="Klikni pro vyjmutí"
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-subtle">vyjmout</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-subtle">Prázdné sloty — vyber mod z inventáře níže.</p>
          )}
          {fam.mult > 1 && fam.family ? (
            <p className="mt-1.5 text-xs font-medium text-ice">
              Sada {MOD_FAMILIES[fam.family].name}: +{Math.round((fam.mult - 1) * 100)} % DMG
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-subtle">Slot je prázdný.</p>
      )}
      <div>
        <h3 className="mb-1 font-mono text-[11px] tracking-[0.25em] text-subtle">
          INVENTÁŘ {hud.modInv.length}/{MOD_INV_MAX}
        </h3>
        {hud.modInv.length > 0 ? (
          <ul className="grid grid-cols-2 gap-1.5">
            {hud.modInv.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={!canSocket}
                  onClick={() => onSocket(m.id, slot)}
                  title={`${m.name}: ${m.desc} · ${MOD_FAMILIES[m.family].name}`}
                  aria-label={`Osadit ${m.name}, ${RARITY_LABEL[m.rarity]}, rodina ${MOD_FAMILIES[m.family].name}`}
                  className="flex min-h-16 w-full items-start gap-2 rounded-xl border border-border/60 bg-surface/60 p-2 text-left transition-colors hover:border-accent-blue disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated ${rarityClass(m.rarity)}`}>
                    <Sparkles className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{m.name}</span>
                    <span className={`block font-mono text-[11px] tracking-wider ${rarityClass(m.rarity)}`}>{RARITY_LABEL[m.rarity].toUpperCase()}</span>
                    <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-subtle">{m.desc}</span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">{MOD_FAMILIES[m.family].name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-subtle">Zatím nic — mody padají z lootu.</p>
        )}
      </div>
    </div>
  );
}

function StatsBody({ stats, activeSlot, hud }: { stats: StatsSnap; activeSlot: number; hud: HudSnap }) {
  const r1 = (v: number) => (Math.round(v * 10) / 10).toString();
  const hpProgress = Math.max(0, Math.min(100, (stats.player.hp / Math.max(1, stats.player.maxHp)) * 100));
  const characterProgress = applyCharacterXp(hud.characterLevel, hud.characterXp + hud.runXp);
  const characterXpToNext = xpForNextLevel(characterProgress.level);
  const xpProgress = Math.max(0, Math.min(100, (characterProgress.xp / Math.max(1, characterXpToNext)) * 100));
  const accuracy = hud.shotsFired > 0 ? (hud.shotsHit / hud.shotsFired) * 100 : 0;
  const runTime = `${Math.floor(hud.time / 60)}:${Math.floor(hud.time % 60).toString().padStart(2, "0")}`;
  return (
    <div className="space-y-3 text-[11px] leading-relaxed">
      <section className="rounded-xl border border-border bg-elevated p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-surface p-2">
            <p className="flex items-center gap-1.5 text-subtle"><Heart className="size-3.5 text-danger" />ZDRAVÍ</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">{Math.ceil(stats.player.hp)}/{Math.ceil(stats.player.maxHp)}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-danger" style={{ width: `${hpProgress}%` }} /></div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2">
            <p className="flex items-center gap-1.5 text-subtle"><Sparkles className="size-3.5 text-ice" />XP POSTAVY</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">LVL {characterProgress.level} · {characterProgress.level >= CHARACTER_LEVEL_CAP ? "MAX" : `${characterProgress.xp}/${characterXpToNext}`}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-ice" style={{ width: `${xpProgress}%` }} /></div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono tabular-nums">
          <span className="flex items-center gap-1.5 text-muted"><Clock3 className="size-3.5 text-accent-blue" />{runTime}</span>
          <span className="flex items-center gap-1.5 text-muted"><Crosshair className="size-3.5 text-accent-blue" />PŘESNOST {accuracy.toFixed(1)}%</span>
          <span className="flex items-center gap-1.5 text-rarity-uncommon"><Swords className="size-3.5" />DMG {Math.round(hud.dmgDealt)}</span>
          <span className="flex items-center gap-1.5 text-danger"><Heart className="size-3.5" />PŘIJATO {Math.round(hud.dmgTaken)}</span>
        </div>
        <p className="mt-2 text-[11px] text-subtle">{hud.kills} eliminací · {hud.shotsHit}/{hud.shotsFired} zásahů</p>
      </section>
      <section className="rounded-xl border border-border bg-elevated p-3">
          <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-subtle">
            <BarChart3 className="size-3.5" />
            OBTÍŽNOST
          </h3>
          <div className="grid grid-cols-3 gap-1 font-mono tabular-nums">
            <div>HP <span className="text-danger">×{r1(stats.hpMult)}</span></div>
            <div>DMG <span className="text-danger">×{r1(stats.dmgMult)}</span></div>
            <div>SPD <span className="text-ice">×{r1(stats.speedMult)}</span></div>
          </div>
          <div className="mt-0.5 text-muted">
            Vlna {stats.wave}/{stats.waves} ·{" "}
            {stats.waveIn > 0 ? `další za ${stats.waveIn.toFixed(1)}s` : `zbývá ${stats.remaining}`}
            {stats.elite ? " · ELITA" : ""}
            {stats.boss ? ` · BOSS T${stats.bossTier + 1}` : ""}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-muted">
            <Wrench className="size-3.5" />
            <span>{stats.scrap} šrotu</span>
            {stats.sectorMod ? <span>· {sectorModById(stats.sectorMod)?.name ?? stats.sectorMod}</span> : null}
            <span>· {stats.gamePhase === "early" ? "Early-game" : stats.gamePhase === "mid" ? "Mid-game" : "Hlubina"}</span>
            {stats.anomaly && anomalyDef(stats.anomaly) ? (
              <span className="flex items-center gap-1"><Sparkles className="size-3.5" />{anomalyDef(stats.anomaly)!.name}</span>
            ) : null}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-elevated p-3">
          <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-subtle">
            <User className="size-3.5" />
            JÁ
          </h3>
          <div className="text-muted">
            HP {Math.ceil(stats.player.hp)}/{Math.ceil(stats.player.maxHp)} · rychlost{" "}
            {Math.round(stats.player.moveSpeed)} · armor {Math.round(stats.player.armor * 100)}%
          </div>
          {stats.player.weapons.map((w, i) =>
            w ? (
              <div key={i} className={i === activeSlot ? "text-fg" : "text-muted"}>
                <span className="font-medium">
                  {i === activeSlot ? "▸ " : "· "}DPS {Math.round(w.dps)}
                </span>{" "}
                <span className="truncate">{w.name}</span>
                <div className="font-mono tabular-nums text-[11px]">
                  {Math.round(w.damage)} dmg · {Math.round(w.rpm)} RPM · {w.pellets}× · {w.magSize} ran ·{" "}
                  {w.reload.toFixed(1)}s · krit {Math.round(w.critChance * 100)}% ×{w.critMult.toFixed(1)}
                </div>
              </div>
            ) : null,
          )}
        </section>
        <section className="rounded-xl border border-border bg-elevated p-3">
          <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-subtle">
            <Dices className="size-3.5" />
            MUTÁTORY
          </h3>
          <ul className="space-y-0.5">
            {stats.mutators.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-2">
                <span className={m.polarity === "plus" ? "text-rarity-uncommon" : "text-danger"}>
                  {m.polarity === "plus" ? "+" : "−"} {m.name}
                </span>
                <span className="shrink-0 text-[11px] text-subtle">{m.desc}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-elevated p-3">
          <h3 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-subtle">
            <Trophy className="size-3.5" />
            VÝZVY
          </h3>
          <ul className="space-y-1">
            {stats.challenges.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={c.done ? "text-rarity-uncommon" : "text-muted"}>
                    {c.done ? "✓ " : "· "}{c.name}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-[11px] text-subtle">
                    {c.done ? <span className="text-rarity-uncommon">ODMĚNA +{c.reward}</span> : `${c.progress}/${c.goal}`}
                  </span>
                </div>
                {!c.done ? <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-accent-blue" style={{ width: `${Math.max(0, Math.min(100, (c.progress / Math.max(1, c.goal)) * 100))}%` }} /></div> : null}
              </li>
            ))}
          </ul>
        </section>
        {stats.alive.length > 0 ? (
          <section className="rounded-xl border border-border bg-elevated p-3">
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-subtle">
              <Map className="size-3.5" />
              V MÍSTNOSTI ({stats.alive.length})
            </h3>
            <ul className="space-y-1">
              {stats.alive.map((e, i) => (
                <li key={i}>
                  <div className="flex justify-between font-mono tabular-nums">
                    <span>
                      {e.name}
                      {e.kind === "boss" && e.phase >= 2 ? (
                        <span className="ml-1 text-danger">· FÁZE {e.phase}</span>
                      ) : null}
                      {e.affixes.length > 0 ? (
                        <span className="ml-1" style={{ color: affixDef(e.affixes[0]!).color }}>
                          <Sparkles className="mr-1 inline size-3.5" />
                          {e.affixes.map((a) => affixDef(a).name).join(" + ")}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted">
                      {Math.ceil(e.hp)}/{Math.ceil(e.maxHp)}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full bg-danger"
                      style={{ width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="rounded-xl border border-border bg-elevated p-3">
          <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-subtle">
            <Skull className="size-3.5" />
            NEPŘÁTELÉ · LVL {stats.level}
          </h3>
          <table className="w-full font-mono tabular-nums">
            <thead>
              <tr className="text-left text-[11px] text-subtle">
                <th className="font-normal">Druh</th>
                <th className="text-right font-normal">HP</th>
                <th className="text-right font-normal">Dotek</th>
                <th className="text-right font-normal">Střela</th>
              </tr>
            </thead>
            <tbody>
              {stats.bestiary.map((b) => (
                <tr key={b.kind} className="border-t border-border/60">
                  <td className="py-0.5 pr-1">
                    {b.kind === "boss" ? <span className="text-danger">{b.name}</span> : b.name}
                  </td>
                  <td className="py-0.5 text-right">{Math.round(b.hp)}</td>
                  <td className="py-0.5 text-right">{Math.round(b.contact)}</td>
                  <td className="py-0.5 text-right">{b.bullet === null ? "—" : Math.round(b.bullet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
    </div>
  );
}

const ELEMENT_NAME: Record<string, string> = {
  kinetic: "Kinetika",
  fire: "Oheň",
  ice: "Led",
  shock: "Šok",
  void: "Void",
  toxic: "Toxic",
};

/** Kompaktní přehled postavy: atributy, výbava, schopnost, pasivky a aury. */
function CharBody({ hud, stats }: { hud: HudSnap; stats: StatsSnap }) {
  const codex = codexBonus(loadCodex());
  const mutDmg = mutMult(stats.mutators, "damage");
  const dmgMult = mutDmg * (1 + codex.dmgPct);
  // Skutečná redukce poškození: pasivní plátování × armor z mutátorů (stejný vzorec jako simulace).
  const mutArmor = Math.min(0.5, Math.max(-0.5, mutMult(stats.mutators, "armor") - 1));
  const armorPct = Math.round((1 - (1 - stats.player.armor) * (1 - mutArmor)) * 100);
  const sumPassive = (kind: string) => hud.passives.filter((p) => p.kind === kind).reduce((s, p) => s + p.value, 0);
  const activeWeapon = hud.weapons[hud.slot] ?? hud.weapons[0];
  const lifestealPct = ((applyMods(activeWeapon).behaviors.lifesteal ?? 0) + sumPassive("vampirism")) * 100;
  const magnet = Math.round(MAGNET_R + sumPassive("magnet"));
  const moveSpeed = Math.round(stats.player.moveSpeed * (1 + codex.speedPct));
  // Buckety poškození (§21): vlastnosti a aury s klesajícími výnosy.
  const greedTrait = sumPassive("greed") * (1 - hud.hp / hud.maxHp);
  const traitMult = 1 + drBonus(greedTrait);
  const auraMult = 1 + drBonus(mutMult(stats.mutators, "damage") - 1);
  const effHp = armorPct >= 100 ? Math.ceil(stats.player.maxHp) : Math.round(stats.player.maxHp / (1 - armorPct / 100));
  const mins = Math.floor(hud.time / 60);
  const secs = Math.floor(hud.time % 60)
    .toString()
    .padStart(2, "0");
  return (
    <>
      <p className="font-mono text-[11px] tabular-nums tracking-widest text-subtle">
        LVL {hud.level} · SEKTOR {hud.sector} · {hud.kills} zabití · {mins}:{secs}
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-border/60 bg-elevated">
        <div className="vb-hp-fill h-full rounded-full" style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }} />
      </div>
      <div className="mt-1 font-mono text-xs tabular-nums text-subtle">
        {Math.ceil(hud.hp)}/{Math.ceil(hud.maxHp)} HP
      </div>
      <div className="space-y-4 text-sm">
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Heart className="size-3.5" />
              ATRIBUTY
            </h3>
            <dl className="grid grid-cols-2 gap-1.5 text-xs">
              <div title="Redukce příchozího poškození" className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><Shield className="size-3.5" />Zbroj</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">{armorPct} %</dd>
              </div>
              <div title="Rychlost pohybu" className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><Wind className="size-3.5" />Rychlost</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">{moveSpeed}</dd>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><Crosshair className="size-3.5" />Poškození</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">
                  <Tip title="Poškození" body={`Základ zbraně × vlastnosti ${traitMult.toFixed(2)} × aury ${auraMult.toFixed(2)} × kodex +${(codex.dmgPct * 100).toFixed(1)} % − zbroj cíle. Vlastnosti a aury mají klesající výnosy (§21).`}>
                    <span>×{dmgMult.toFixed(2)}</span>
                  </Tip>
                </dd>
              </div>
              <div title="Vysátí života aktivní zbraní" className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><Heart className="size-3.5" />Vysátí</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">{lifestealPct.toFixed(1)} %</dd>
              </div>
              <div title="Dosah sběru předmětů" className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><Orbit className="size-3.5" />Magnet</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">{magnet}</dd>
              </div>
              <div title="Zbývající dash" className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><Repeat className="size-3.5" />Dash</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">{hud.dash}/{hud.dashMax}</dd>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><MaterialIcon material="scrap" className="size-3.5" />Šrot</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">{hud.scrap}</dd>
              </div>
              <div title="Max HP po přepočtení redukce zbrojí" className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <dt className="flex items-center gap-1.5 text-muted"><Heart className="size-3.5" />Efektivní HP</dt>
                <dd className="mt-1 font-mono tabular-nums text-fg">{effHp}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Swords className="size-3.5" />
              VÝBAVA
            </h3>
            <div className="space-y-2">
              {[0, 1].map((slot) => {
                const w = hud.weapons[slot];
                const line = stats.player.weapons[slot];
                if (!w || !line) {
                  return slot === 1 ? (
                    <div key={slot} className="rounded-xl border border-dashed border-border p-2.5 text-xs text-subtle">
                      Prázdný slot — druhá zbraň padá z lootu.
                    </div>
                  ) : null;
                }
                // Efektivní hodnoty s mody z Dílny (§23).
                const ew = applyMods(w);
                const effDmg = line.damage * (1 + codex.dmgPct);
                const effDps = line.dps * (1 + codex.dmgPct);
                const effCrit = Math.min(CRIT_CHANCE_CAP, Math.max(0, line.critChance + codex.crit));
                const pellets = line.pellets + Math.round(sumPassive("extraPellet"));
                const range = Math.round(w.stats.range * mutMult(stats.mutators, "range"));
                const behaviors = weaponBehaviorsList(ew);
                const fam = familyBonusOf(w.mods);
                return (
                  <div key={w.id} className={`rounded-xl border p-2.5 ${slot === hud.slot ? "border-accent bg-surface" : "border-border/60 bg-surface/60"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-[11px] tracking-widest ${rarityClass(w.rarity)}`}>
                        {RARITY_LABEL[w.rarity].toUpperCase()}
                        {w.unique ? " · UNIKÁT" : ""}
                      </span>
                      {slot === hud.slot ? (
                        <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[11px] text-fg">V RUCE</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                      <WeaponIcon archetype={w.archetype} className="size-4 shrink-0 text-ice" />
                      <span className="truncate">{w.name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span className="inline-block size-2.5 rounded-full" style={{ background: ELEMENT_COLOR[ew.element] }} />
                      {ELEMENT_NAME[ew.element] ?? ew.element} · {ARCHETYPE_LABEL[w.archetype].name}
                    </div>
                    <div className="mt-1 font-mono text-[11px] tabular-nums text-subtle">
                      {w.unique ? "relikvie · bez slotů" : `sloty ${w.mods.length}/${w.slots}`}
                      {w.mods.length > 0 ? ` · ${w.mods.map((m) => m.name).join(" · ")}` : ""}
                    </div>
                    {fam.mult > 1 && fam.family ? (
                      <div className="mt-0.5 text-xs font-medium text-ice">
                        Sada {MOD_FAMILIES[fam.family].name}: +{Math.round((fam.mult - 1) * 100)} % DMG
                      </div>
                    ) : null}
                    <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[11px] tabular-nums">
                      <div>DMG <span className="text-fg">{effDmg.toFixed(1)}</span></div>
                      <div>DPS <span className="text-fg">{Math.round(effDps)}</span></div>
                      <div>RPM <span className="text-fg">{Math.round(line.rpm)}</span></div>
                      <div>Projektily <span className="text-fg">{pellets}×</span></div>
                      <div>Zásobník <span className="text-fg">{line.magSize}</span></div>
                      <div>Přebíjení <span className="text-fg">{line.reload.toFixed(1)}s</span></div>
                      <div>Kritik <span className="text-fg">{Math.round(effCrit * 100)} %</span></div>
                      <div>Násobič <span className="text-fg">×{Math.min(CRIT_MULT_CAP, line.critMult).toFixed(1)}</span></div>
                      <div>Dostřel <span className="text-fg">{range}</span></div>
                    </div>
                    {behaviors.length > 0 ? (
                      <div className="mt-1.5 text-xs text-ice">{behaviors.join(" · ")}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Zap className="size-3.5" />
              SCHOPNOST
            </h3>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{hud.ability.name}</span>
                <span className={`font-mono text-[11px] tracking-widest ${rarityClass(hud.ability.rarity)}`}>
                  {RARITY_LABEL[hud.ability.rarity].toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{hud.ability.desc}</p>
              <div className="mt-1.5 font-mono text-[11px] tabular-nums text-subtle">
                Přebíjení {hud.ability.cooldown.toFixed(1)}s
                {hud.ability.damage > 0 ? ` · Poškození ${Math.round(hud.ability.damage)}` : ""}
                {hud.ability.radius > 0 ? ` · Dosah ${Math.round(hud.ability.radius)}` : ""}
                {hud.ability.duration > 0 ? ` · Trvání ${hud.ability.duration.toFixed(1)}s` : ""}
              </div>
            </div>
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Sparkles className="size-3.5" />
              PASIVKY {hud.passives.length > 0 ? `(${hud.passives.length})` : ""}
            </h3>
            {hud.passives.length > 0 ? (
              <ul className="space-y-1.5">
                {hud.passives.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border/60 bg-surface/60 p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.name}</span>
                      <span className={`font-mono text-[11px] tracking-widest ${rarityClass(p.rarity)}`}>
                        {RARITY_LABEL[p.rarity].toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs leading-relaxed text-muted">{p.desc}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-subtle">Zatím žádné — padají z lootu.</p>
            )}
          </section>
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Wind className="size-3.5" />
              AURY
            </h3>
            <ul className="space-y-0.5 text-xs">
              {stats.mutators.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-2">
                  <span className={m.polarity === "plus" ? "text-rarity-uncommon" : "text-danger"}>
                    {m.polarity === "plus" ? "+" : "−"} {m.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-subtle">{m.desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 rounded-xl border border-border bg-elevated p-2.5 font-mono text-[11px] text-subtle">
              Kodex (trvale): {formatCodexBonus(codex)}
            </p>
          </section>
      </div>
    </>
  );
}

function PauseOverlay({
  hud,
  onResume,
  onQuit,
  muted,
  onMute,
}: {
  hud: HudSnap | null;
  onResume: () => void;
  onQuit: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-end justify-center bg-bg/75 p-4 sm:items-center">
      <div className="vb-dialog vb-enter max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Pause className="size-6 text-accent-blue" />
          Pauza
        </h2>
        {hud ? (
          <p className="mt-1 text-sm text-muted">
            Sektor {hud.sector} · místnost {hud.room}/{hud.rooms} (LVL {hud.level}) · {hud.kills} zabití · seed {hud.seed}
          </p>
        ) : null}
        {hud && hud.passives.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {hud.passives.map((p) => (
              <li key={p.id}>
                <span className="text-fg">{p.name}</span> — {p.desc}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5">
          <button type="button" onClick={onResume} className="vb-btn-primary">
            <Play className="size-5" />
            Pokračovat
          </button>
          <VolumeControls />
          <button
            type="button"
            onClick={onMute}
            className="vb-btn-ghost"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            {muted ? "Zvuk vypnutý" : "Zvuk zapnutý"}
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="vb-btn-ghost text-muted"
          >
            Opustit běh
          </button>
        </div>
      </div>
    </div>
  );
}

function VolumeControls() {
  const [sfx, setSfx] = useState(() => getSfxVolume());
  const [music, setMusic] = useState(() => getMusicVolume());
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <label className="flex items-center gap-3 text-xs text-muted">
        <span className="w-16 shrink-0">Efekty</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={sfx}
          onChange={(e) => {
            const v = Number(e.target.value);
            setSfx(v);
            setSfxVolume(v);
          }}
          className="h-2 flex-1 accent-accent"
        />
        <span className="w-9 text-right font-mono tabular-nums text-fg">{Math.round(sfx * 100)}%</span>
      </label>
      <label className="flex items-center gap-3 text-xs text-muted">
        <span className="w-16 shrink-0">Hudba</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={music}
          onChange={(e) => {
            const v = Number(e.target.value);
            setMusic(v);
            setMusicVolume(v);
          }}
          className="h-2 flex-1 accent-accent"
        />
        <span className="w-9 text-right font-mono tabular-nums text-fg">{Math.round(music * 100)}%</span>
      </label>
    </div>
  );
}

/** Jednovětý tahák, proč je zbraň dobrá — první sedící pravidlo. */
function weaponHint(w: Weapon): string | null {
  const b = w.behaviors;
  if (w.unique) return "Unikát s jedinečným efektem";
  if (w.stats.pellets >= 5) return "Ničivá na blízko";
  if (w.stats.range >= 1000) return "Bezpečná palba z dálky";
  if ((b.lifesteal ?? 0) > 0) return "Léčí tě za zásahy";
  if ((b.explode ?? 0) > 0) return "Plošné poškození výbuchem";
  if ((b.chain ?? 0) > 0) return "Skáče mezi nepřáteli";
  if ((b.homing ?? 0) > 0) return "Střely samy míří na cíl";
  if ((b.pierce ?? 0) >= 6 || b.beam) return "Prochází celou řadou";
  if ((b.bounce ?? 0) > 0) return "Odrazy kolem rohů";
  if ((b.burn ?? 0) > 0 || (b.freeze ?? 0) > 0 || (b.poison ?? 0) > 0 || (b.shockstun ?? 0) > 0)
    return "Dává status pro synergie";
  if (w.stats.rpm >= 700) return "Extrémní kadence";
  return null;
}

/** Porovnání čísla s drženou zbraní: šipka + rozdíl, barva podle směru. */
function CompareDelta({ value, current, format }: { value: number; current: number; format: (v: number) => string }) {
  const diff = value - current;
  if (Math.abs(diff) < 1) return <span className="text-subtle">≈ stejně</span>;
  const up = diff > 0;
  return (
    <span className={up ? "text-rarity-uncommon" : "text-danger"}>
      {up ? "▲" : "▼"} {up ? "+" : "−"}
      {format(Math.abs(diff))}
    </span>
  );
}

function LootOverlay({
  loot,
  rerolls,
  weapons,
  current,
  weaponPick,
  scrapValue,
  scrapTotal,
  scrapUnlocked,
  onPick,
  onScrap,
  onReroll,
}: {
  loot: LootOffer[];
  rerolls: number;
  weapons: [Weapon, Weapon | null];
  /** Právě držená zbraň pro porovnání nabídek. */
  current: Weapon | null;
  weaponPick: number | null;
  scrapValue: number;
  scrapTotal: number;
  scrapUnlocked: boolean;
  onPick: (i: number, slot?: 0 | 1) => void;
  onScrap: () => void;
  onReroll: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/70 p-3 pt-8 sm:items-center">
      <div className="vb-dialog vb-enter max-h-[94dvh] w-full max-w-lg overflow-y-auto p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Swords className="size-6 text-accent-blue" />
            Vyber odměnu
          </h2>
          <div className="flex items-center gap-2">
            <Tip title={GLOSSARY.scrap.term} body={GLOSSARY.scrap.def}>
              <span className="flex items-center gap-1 rounded-lg bg-elevated px-2.5 py-1.5 font-mono text-xs tabular-nums text-subtle">
                <Wrench className="size-3.5" />
                {scrapTotal}
              </span>
            </Tip>
            <button
              type="button"
              disabled={rerolls <= 0}
              onClick={onReroll}
              className="flex h-12 items-center gap-1.5 rounded-xl border border-border px-3.5 text-xs font-medium text-muted transition-transform active:scale-95 disabled:opacity-40"
            >
              <RotateCcw className="size-4" />
              Přerolovat {rerolls}
            </button>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {loot.map((offer, i) => (
            <LootCard key={i} index={i} offer={offer} current={current} selected={weaponPick === i} onPick={() => onPick(i)} />
          ))}
        </div>
        <button
          type="button"
          onClick={onScrap}
          disabled={!scrapUnlocked}
          className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {scrapUnlocked ? <>Rozebrat vše na šrot (+{scrapValue} <MaterialIcon material="scrap" className="size-3.5" />)</> : "Šrot se odemkne na LVL 3"}
        </button>
        {weaponPick !== null ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPick(weaponPick, 0)}
              className="rounded-xl border border-border bg-elevated p-3.5 text-left transition-transform active:scale-[0.98]"
            >
              <div className="text-[11px] tracking-widest text-subtle">SLOT 1</div>
              <div className="truncate text-sm font-medium">{weapons[0].name}</div>
            </button>
            <button
              type="button"
              onClick={() => onPick(weaponPick, 1)}
              className="rounded-xl border border-border bg-elevated p-3.5 text-left transition-transform active:scale-[0.98]"
            >
              <div className="text-[11px] tracking-widest text-subtle">SLOT 2</div>
              <div className="truncate text-sm">{weapons[1]?.name ?? "Prázdný"}</div>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LootCard({ index, offer, current, selected, onPick }: { index: number; offer: LootOffer; current: Weapon | null; selected: boolean; onPick: () => void }) {
  let rarity: Rarity = "common";
  let title = "";
  let desc = "";
  let extra: string[] = [];
  let compare: ReactNode = null;
  let hint: string | null = null;
  let statGrid: { label: string; value: string }[] | null = null;
  let offerIcon: ReactNode = null;
  if (offer.kind === "weapon") {
    offerIcon = <WeaponIcon archetype={offer.weapon.archetype} className="size-5" />;
    rarity = offer.weapon.rarity;
    title = offer.weapon.name;
    desc = `${ARCHETYPE_LABEL[offer.weapon.archetype].name} · ${ELEMENT_NAME[offer.weapon.element] ?? offer.weapon.element}`;
    statGrid = [
      { label: "DMG", value: offer.weapon.stats.damage.toFixed(0) },
      { label: "DPS", value: String(Math.round(dpsEstimate(offer.weapon))) },
      { label: "RPM", value: String(Math.round(offer.weapon.stats.rpm)) },
    ];
    extra = [
      ...weaponBehaviorsList(offer.weapon).slice(0, 3),
    ];
    hint = weaponHint(offer.weapon);
    if (current) {
      const dps = dpsEstimate(offer.weapon);
      const curDps = dpsEstimate(current);
      compare = (
        <div className="mt-1.5 rounded-lg bg-surface px-2 py-1 text-[11px] tabular-nums">
          <CompareDelta value={dps} current={curDps} format={(v) => `${Math.round(v)} DPS`} />{" "}
          <span className="text-subtle">proti {current.name}</span>
        </div>
      );
    }
  } else if (offer.kind === "ability") {
    offerIcon = <Zap className="size-5" />;
    rarity = offer.ability.rarity;
    title = offer.ability.name;
    desc = offer.ability.desc;
    extra = [
      `CD ${offer.ability.cooldown.toFixed(1)}s`,
      offer.ability.damage ? `${Math.round(offer.ability.damage)} dmg` : offer.ability.duration ? `${offer.ability.duration.toFixed(1)}s` : "",
    ];
  } else if (offer.kind === "passive") {
    offerIcon = <Sparkles className="size-5" />;
    rarity = offer.passive.rarity;
    title = offer.passive.name;
    desc = offer.passive.desc;
  } else if (offer.kind === "mod") {
    offerIcon = <Wrench className="size-5" />;
    rarity = offer.mod.rarity;
    title = offer.mod.name;
    desc = offer.mod.desc;
    extra = [`Rodina: ${MOD_FAMILIES[offer.mod.family].name}`];
  } else {
    offerIcon = <Heart className="size-5" />;
    title = offer.name;
    desc = offer.desc;
  }
  return (
    <button
      type="button"
      onClick={onPick}
      style={{ "--vb-i": index, "--vb-glow": RARITY_COLOR[rarity] } as CSSProperties}
      className={`vb-loot-card vb-stagger rounded-2xl bg-elevated p-3.5 text-left ${selected ? "border-accent" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface ${rarityClass(rarity)}`}>{offerIcon}</span>
        <span className="min-w-0">
          <span className={`block text-[11px] font-semibold tracking-[0.15em] ${rarityClass(rarity)}`}>{RARITY_LABEL[rarity]}</span>
          <span className="mt-0.5 block truncate font-display text-[15px] font-semibold leading-snug">{title}</span>
        </span>
      </div>
      <div className="mt-1 text-xs leading-relaxed text-muted">{desc}</div>
      {statGrid ? (
        <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[11px] tabular-nums">
          {statGrid.map((s) => (
            <div key={s.label}>
              {s.label} <span className="text-fg">{s.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {hint ? <div className="mt-1 flex items-center gap-1 text-xs font-medium text-ice"><Sparkles className="size-3.5" />{hint}</div> : null}
      {compare}
      {extra.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-[11px] tabular-nums text-subtle">
          {extra.filter(Boolean).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : null}
    </button>
  );
}

function BaseOverlay({
  hud,
  stats,
  forgeUnlocked,
  arenaUnlocked,
  shopUnlocked,
  onShop,
  onContinue,
  onBank,
}: {
  hud: HudSnap;
  stats: StatsSnap;
  forgeUnlocked: boolean;
  arenaUnlocked: boolean;
  shopUnlocked: boolean;
  onShop: (item: ShopItemId) => void;
  onContinue: (mod: SectorModId) => void;
  onBank: () => void;
}) {
  const offers = shopOffers(hud.sector, hud.rerolls);
  const portalLocked: Record<SectorModId, string | null> = {
    lab: null,
    forge: forgeUnlocked ? null : "odemkne se na LVL 6",
    arena: arenaUnlocked ? null : "odemkne se na LVL 12",
    library: forgeUnlocked ? null : "odemkne se na LVL 6",
    market: arenaUnlocked ? null : "odemkne se na LVL 12",
  };
  // Anomálie příštího sektoru (hud.sector je 1-based právě dohraného).
  const nextAnomaly = anomalyDef(anomalyForSector(hud.seed, hud.sector));
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-4 sm:p-5">
        <p className="font-mono text-[11px] tracking-[0.25em] text-ice">SEKTOR {hud.sector} VYČIŠTĚN</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <DoorOpen className="size-6 text-accent-blue" />
            Báze
          </h2>
          <span className="rounded-xl border border-border bg-elevated px-3.5 py-2 font-mono text-sm tabular-nums shadow">
            <span className="flex items-center gap-1"><MaterialIcon material="scrap" className="size-4" />{hud.scrap} šrotu</span>
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Boss padl. +35 % zdraví a checkpoint sektoru {hud.sector + 1} máš. Šrot získáš rozebráním lootu.
        </p>
        {nextAnomaly ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-ice/40 bg-ice/10 p-3 text-xs leading-relaxed text-ice">
            <Sparkles className="mt-0.5 size-4 shrink-0" />
            <span>Anomálie sektoru {hud.sector + 1}: <strong>{nextAnomaly.name}</strong> — {nextAnomaly.desc}</span>
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-elevated p-3">
          <Stat label="Sektor" value={String(hud.sector)} />
          <Stat label="Zabití" value={String(hud.kills)} />
          <Stat label="HP" value={`${Math.ceil(hud.hp)}/${Math.ceil(hud.maxHp)}`} />
        </div>

        <h3 className="mt-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-subtle">
          <Wrench className="size-4" />
          OBCHOD
        </h3>
        {shopUnlocked ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {offers.map((offer) => {
              const afford = hud.scrap >= offer.cost;
              const capped = offer.id === "reroll" && hud.rerolls >= 4;
                const Icon = offer.id === "heal" ? Heart : offer.id === "maxhp" ? Shield : RotateCcw;
                return (
                  <button
                    key={offer.id}
                    type="button"
                    disabled={!afford || capped}
                    onClick={() => onShop(offer.id)}
                    title={`${offer.name} — ${capped ? "Maximum (4)" : offer.desc}`}
                    className="flex min-h-16 min-w-0 items-center gap-2 rounded-xl border border-border bg-elevated p-2 text-left transition-colors hover:border-accent-blue disabled:opacity-50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-accent-blue"><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{offer.name}</span>
                      <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted"><MaterialIcon material="scrap" className="size-3.5" />{offer.cost}</span>
                    </span>
                  </button>
                );
              })}
          </div>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-border p-3 text-xs text-subtle">
            Obchod se odemkne na LVL 9.
          </p>
        )}

        <h3 className="mt-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-subtle">
          <DoorOpen className="size-4" />
          DALŠÍ EXPEDICE
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {SECTOR_MODS.map((mod) => {
            const locked = portalLocked[mod.id];
            const Icon = mod.id === "lab" ? FlaskConical : mod.id === "forge" ? Wrench : mod.id === "arena" ? Swords : mod.id === "library" ? BookOpen : ShoppingBag;
            return (
              <button
                key={mod.id}
                type="button"
                disabled={locked !== null}
                onClick={() => onContinue(mod.id)}
                title={`${mod.name} — ${locked ?? mod.desc}`}
                className={`vb-stagger flex min-h-16 min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition-colors active:scale-[0.99] ${locked ? "border-border/60 bg-surface/50 text-muted" : "border-border bg-elevated hover:border-accent-blue"}`}
                style={{ "--vb-i": SECTOR_MODS.indexOf(mod) } as CSSProperties}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface ${locked ? "text-subtle" : "text-accent-blue"}`}><Icon className="size-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{mod.name}</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-subtle">
                    {locked ? <Lock className="size-3" /> : <DoorOpen className="size-3" />}
                    {locked ?? `Sektor ${hud.sector + 1}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {stats.sectorMod ? (
          <p className="mt-2 text-xs text-subtle">
            Právě běží: {sectorModById(stats.sectorMod)?.name ?? stats.sectorMod}.
          </p>
        ) : null}

        <h3 className="mt-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-subtle">
          <BarChart3 className="size-4" />
          ROZHODNUTÍ
        </h3>
        <button
          type="button"
          onClick={onBank}
          className="vb-btn-ghost mt-2 w-full"
        >
          Ukončit a uložit (LVL {hud.level})
        </button>
        <p className="mt-1.5 text-center text-[11px] text-subtle">
          Pokračování portálem drží celý build. Bank běh zapíše a vrátí do menu.
        </p>
      </div>
    </div>
  );
}

function EndOverlay({
  win,
  hud,
  stats,
  time,
  freshIds,
  onAgain,
  onMenu,
}: {
  win: boolean;
  hud: HudSnap;
  stats: StatsSnap | null;
  time: string;
  freshIds: AchievementId[];
  onAgain: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          {win ? <Trophy className="size-6 text-state-success" /> : <Skull className="size-6 text-state-danger" />}
          {win ? "Trezor prolomen" : "Běh skončil"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {win ? `Banknuto na LVL ${hud.level}. Checkpoint držíš.` : "Další trezor čeká."}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-elevated p-3">
          <Stat label="Úroveň" value={String(hud.level)} />
          <Stat label="Zabití" value={String(hud.kills)} />
          <Stat label="Čas" value={time} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-border bg-elevated p-3" title="Statistiky běhu">
          <Stat label="DMG ven" value={formatK(hud.dmgDealt)} />
          <Stat label="DMG dovnitř" value={formatK(hud.dmgTaken)} />
          <Stat
            label="Přesnost"
            value={hud.shotsFired > 0 ? `${Math.round((hud.shotsHit / hud.shotsFired) * 100)} %` : "—"}
          />
          <Stat label="Střely" value={`${hud.shotsHit}/${hud.shotsFired}`} />
          <Stat label="Šrot" value={formatK(hud.scrap)} />
          <Stat
            label="Místnost"
            value={String(Math.max(hud.level, hud.room))}
          />
        </div>
        <p className="mt-3 font-mono text-xs tracking-widest text-subtle">SEED {hud.seed}</p>
        <div className="mt-2 text-xs text-muted">
          {hud.weapons[0].name}
          {hud.weapons[1] ? ` · ${hud.weapons[1].name}` : ""}
        </div>
          {freshIds.length > 0 ? (
          <div className="mt-3 rounded-xl border border-border bg-elevated p-3">
            <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
              <Trophy className="size-3.5" />
              NOVÉ ACHIEVEMENTY
            </div>
            <p className="mt-1 text-sm text-muted">{freshIds.map((id) => achievementDef(id).name).join(" · ")}</p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5">
          <button type="button" onClick={onAgain} className="vb-btn-primary">
            <RotateCcw className="size-5" />
            Znovu
          </button>
          {win && stats ? (
            <button
              type="button"
              onClick={() => {
                const canvas = drawBuildCard(
                  buildCardData({
                    sector: hud.sector,
                    level: hud.level,
                    time,
                    kills: hud.kills,
                    weapons: hud.weapons,
                    abilityName: hud.ability.name,
                    passiveNames: hud.passives.map((p) => p.name),
                    mutatorNames: stats.mutators.map((m) => `${m.polarity === "plus" ? "+" : "−"} ${m.name}`),
                    sectorModName: sectorModNameOf(stats.sectorMod),
                    anomalyName: anomalyNameOf(stats.anomaly),
                    seed: hud.seed,
                  }),
                );
                downloadBuildCard(canvas, hud.sector);
              }}
              className="vb-btn-ghost"
            >
              Stáhnout kartu
            </button>
          ) : null}
          <button type="button" onClick={onMenu} className="vb-btn-ghost">
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function TouchLayer({ onCharacter }: { onCharacter: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Stick side="left" onChange={(x, y, a) => setTouchMove(x, y, a)} />
      <Stick side="right" onChange={(x, y, a) => setTouchAim(x, y, a)} />
      <div className="pointer-events-auto absolute right-4 bottom-36 flex flex-col gap-2" style={{ touchAction: "none" }}>
        <button
          type="button"
          onClick={onCharacter}
          onContextMenu={(e) => e.preventDefault()}
          className="flex size-14 items-center justify-center rounded-full border border-border bg-surface/80 text-fg"
          aria-label="Postava"
        >
          <User className="size-5" />
        </button>
        <button
          type="button"
          onPointerDown={tapAbility}
          onContextMenu={(e) => e.preventDefault()}
          className="flex size-14 items-center justify-center rounded-full border border-border bg-surface/80 text-fg"
          aria-label="Schopnost"
        >
          <Zap className="size-5" />
        </button>
        <button
          type="button"
          onPointerDown={tapDash}
          onContextMenu={(e) => e.preventDefault()}
          className="flex size-14 items-center justify-center rounded-full border border-border bg-surface/80 text-xs font-semibold tracking-wide"
        >
          DASH
        </button>
        <button
          type="button"
          onPointerDown={tapSwap}
          onContextMenu={(e) => e.preventDefault()}
          className="flex size-12 items-center justify-center rounded-full border border-border bg-surface/80"
          aria-label="Výměna zbraně"
        >
          <Repeat className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Stick({
  side,
  onChange,
}: {
  side: "left" | "right";
  onChange: (x: number, y: number, active: boolean) => void;
}) {
  const origin = useRef({ x: 0, y: 0, id: -1 });
  const [knob, setKnob] = useState({ x: 0, y: 0, show: false, ox: 0, oy: 0 });

  function onDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Jedna packa = jeden prst; dalsi prst na stejne pacce ignoruj (multitouch patri druhe pacce).
    if (origin.current.id !== -1) return;
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      /* iOS bez capture — pointer udalosti chodi i tak */
    }
    origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    setKnob({ x: 0, y: 0, show: true, ox: e.clientX, oy: e.clientY });
    onChange(0, 0, true);
  }
  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (origin.current.id !== e.pointerId) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    const max = 46;
    const m = Math.hypot(dx, dy);
    const k = m > max ? max / m : 1;
    const x = (dx * k) / max;
    const y = (dy * k) / max;
    setKnob((s) => ({ ...s, x: dx * k, y: dy * k }));
    onChange(x, y, true);
  }
  function onUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (origin.current.id !== e.pointerId) return;
    origin.current.id = -1;
    setKnob({ x: 0, y: 0, show: false, ox: 0, oy: 0 });
    onChange(0, 0, false);
  }

  return (
    <div
      className={`pointer-events-auto absolute bottom-0 top-1/3 ${side === "left" ? "left-0 w-[48%]" : "right-0 w-[52%]"}`}
      style={{ touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {knob.show ? (
        <div
          className="pointer-events-none absolute size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface/30"
          style={{ left: knob.ox, top: knob.oy }}
        >
          <div
            className="absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/80"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          />
        </div>
      ) : (
        <div
          className={`pointer-events-none absolute bottom-10 size-24 rounded-full border border-border/80 bg-surface/20 ${side === "left" ? "left-8" : "right-24"}`}
        />
      )}
    </div>
  );
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
      clearRoom?: () => void;
      toBoss?: () => void;
      toBase?: () => void;
    };
  }
}

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Bot,
  BookMarked,
  CalendarDays,
  Check,
  CircleDot,
  Copy,
  Crosshair,
  Crown,
  Dices,
  DoorOpen,
  Flame,
  FlaskConical,
  Heart,
  HelpCircle,
  Hourglass,
  Lock,
  Map,
  Orbit,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Shield,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Swords,
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
import { loadSave, recordRun, resetProgress, unlockSector, type SaveData } from "./save";
import { GLOSSARY } from "./glossary";
import { ACHIEVEMENTS, achievementDef, loadAchievements, profileStats, unlockAchievements, type AchievementId } from "./achievements";
import { CODEX_CATEGORIES, codexBonus, codexEntries, codexProgress, formatCodexBonus, loadCodex } from "./codex";
import { Run, type GameEvent, type HudSnap, type StatsSnap } from "./sim";
import { getDifficulty, resetDifficulty, setDifficulty, type DifficultySettings } from "./difficulty";
import { dailySeed, loadDaily, recordDaily, weeklySeed, loadWeekly, recordWeekly, type DailyRecord, type WeeklyRecord } from "./daily";
import { WheelPopup } from "./WheelPopup";
import { loadBoard, recordBoard } from "./leaderboard";
import { TUTORIAL_TEXTS, completeTutorial, isTutorialDone, tutorialStepFor } from "./tutorial";
import { SECTOR_MODS, ANOMALIES, anomalyDef, anomalyForSector, sectorModById, shopOffers, type SectorModId, type ShopItemId } from "./expedition";
import { CHALLENGES, challengeDef, loadBadges } from "./challenges";
import { anomalyNameOf, buildCardData, downloadBuildCard, drawBuildCard, sectorModNameOf } from "./buildCard";
import { nextUnlock, unlocksForLevel, UNLOCKS } from "./progression";
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
import { RARITY_COLOR, RARITY_LABEL, ARCHETYPE_LABEL, ELEMENT_COLOR, MAGNET_R, type ArchetypeId, type LootOffer, type Rarity, type Weapon } from "./types";
import { dpsEstimate, starterWeapon, weaponBehaviorsList } from "./weapons";

type Screen = "menu" | "help" | "admin" | "codex" | "achievements" | "cesta" | "slovnicek" | "playing" | "paused" | "loot" | "dead" | "win" | "base" | "wheel";

/** Záložky přehledu: boj, postava, dílna. */
type PanelTab = "battle" | "char" | "workshop";

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
    try {
      const raw = localStorage.getItem("vaultbreak.panel");
      if (raw === "battle" || raw === "char" || raw === "workshop") return raw;
      if (localStorage.getItem("vaultbreak.stats-open") === "1") return "battle";
    } catch {
      /* ignore */
    }
    return window.innerWidth >= 720 ? "battle" : null;
  });
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
    version: 3,
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
  });
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

  /** Uloží profil a připíše nově splněné achievementy (pro hlášku na konci běhu). */
  function commitSave(next: SaveData) {
    setSave(next);
    setFreshAchievements(unlockAchievements(profileStats(next, codexProgress().done)));
  }

  screenRef.current = screen;

  useEffect(() => {
    setBoot(true);
    setSeed(randomSeedString());
    commitSave(loadSave());    setRarityWeights(readRarityWeights());
    setContent(readGameContent());
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
          setScreen("paused");
          screenRef.current = "paused";
        } else if (sc === "paused" && actions.justPause) {
          setScreen("playing");
          screenRef.current = "playing";
        } else if (sc === "playing") {
          if (actions.justStats) setPanelAndSave(panel === "battle" ? null : "battle");
          if (actions.justCharacter) setPanelAndSave(panel === "char" ? null : "char");
          run.update(dt, actions, w, h);
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
            finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled);
            setScreen("dead");
            screenRef.current = "dead";
            setHud(run.snapshot());
            setStats(run.statsSnap());
          } else if (run.phase === "win") {
            finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled);
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
    tutSeen.current = { loot: false, panel: false, base: false };
    const s = (useSeed || seed || randomSeedString()).toUpperCase();
    setSeed(s);
    dailyActiveRef.current = s === dailySeed();
    weeklyActiveRef.current = s === weeklySeed();
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
      starterArchetype: armoryRun ?? undefined,
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

  function finishRun(level: number, kills: number, time: number, runSeed: string, scrapEarned = 0, bossesKilled = 0) {
    const run = runRef.current;
    if (run) recordBlueprintKills(run.blueprintKills);
    commitSave(recordRun(level, kills, time, runSeed, scrapEarned, bossesKilled));
    if (dailyActiveRef.current) {
      setDaily(recordDaily(level));
      recordBoard("daily", daily.key, runSeed, level);
    }
    if (weeklyActiveRef.current) {
      setWeekly(recordWeekly(level));
      recordBoard("weekly", weekly.key, runSeed, level);
    }
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
      finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled);
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
    setPanel(next);
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
      <div className="vb-grid relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
        <Menu
          seed=""
          onSeed={() => undefined}
          save={{ version: 3, bestRooms: 0, bestKills: 0, bestTime: 0, runs: 0, lastSeed: "", bestLevel: 0, maxSector: 1, totalKills: 0, totalScrap: 0, bossesKilled: 0 }}
          startSector={1}
          onSector={() => undefined}
          daily={{ key: "", best: 0, plays: 0, allBest: 0, allBestKey: "" }}
          onDaily={() => undefined}
          weekly={{ key: "", best: 0, plays: 0, allBest: 0, allBestKey: "" }}
          onWeekly={() => undefined}
          onPlay={() => undefined}
          onHelp={() => undefined}
          onAdmin={() => undefined}
          onCodex={() => undefined}
          onAchievements={() => undefined}
          onCesta={() => undefined}
          onSlovnicek={() => undefined}
          torment={false}
          onTorment={() => undefined}
          armory={null}
          onArmory={() => undefined}
          muted={false}
          onMute={() => undefined}
        />
      </div>
    );
  }

  const tutStep = tutorialDone ? -1 : tutorialStepFor(hud?.kills ?? 0, tutSeen.current.loot, tutSeen.current.panel, tutSeen.current.base);

  return (
    <div className="vb-grid relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
      <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none select-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ touchAction: "none" }}
        />
        {screen === "playing" && hud && (
          <Hud
            hud={hud}
            battleOpen={panel === "battle"}
            charOpen={panel === "char"}
            onPause={() => setScreen("paused")}
            onBattle={() => setPanelAndSave(panel === "battle" ? null : "battle")}
            onCharacter={() => setPanelAndSave(panel === "char" ? null : "char")}
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
                <span className="font-mono text-[10px] tracking-widest text-subtle">NÁVOD {tutStep + 1}/4</span>
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
            onCodex={() => setScreen("codex")}
            onAchievements={() => setScreen("achievements")}
            onCesta={() => setScreen("cesta")}
            onSlovnicek={() => setScreen("slovnicek")}
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
        {screen === "cesta" && <CestaScreen save={save} onBack={() => setScreen("menu")} onCodex={() => setScreen("codex")} />}
        {screen === "slovnicek" && <SlovnicekScreen onBack={() => setScreen("menu")} />}
        {screen === "codex" && <CodexScreen onBack={() => setScreen("menu")} />}
        {screen === "achievements" && <AchievementsScreen onBack={() => setScreen("menu")} />}
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
                finishRun(run.level, run.kills, run.time, run.seed, run.scrapEarned, run.bossesKilled);
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
  onCodex,
  onAchievements,
  onCesta,
  onSlovnicek,
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
  onCodex: () => void;
  onAchievements: () => void;
  onCesta: () => void;
  onSlovnicek: () => void;
  torment: boolean;
  onTorment: (v: boolean) => void;
  armory: ArchetypeId | null;
  onArmory: (a: ArchetypeId | null) => void;
  muted: boolean;
  onMute: () => void;
}) {
  const unlocked = Math.max(1, save.maxSector);
  const badges = loadBadges();
  const codex = codexProgress();
  const achievements = loadAchievements();
  const board = loadBoard();
  const blueprints = loadBlueprints();
  const armoryUnlocked = (Object.keys(ARCHETYPE_LABEL) as ArchetypeId[]).filter(
    (a) => killsToRank(blueprints[a] ?? 0) >= 2,
  );
  const [resetArmed, setResetArmed] = useState(false);
  return (
    <div className="vb-vignette absolute inset-0 flex flex-col items-center justify-between overflow-y-auto px-5 py-8">
      <div className="vb-enter-soft flex w-full max-w-md items-center justify-between" style={{ "--vb-i": 0 } as CSSProperties}>
        <span className="rounded-full border border-border bg-surface/80 px-3 py-1.5 font-mono text-[11px] tracking-[0.2em] text-subtle">
          ROGUELITE LOOTER
        </span>
        <button
          type="button"
          onClick={onMute}
          className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-transform active:scale-95"
          aria-label={muted ? "Zapnout zvuk" : "Ztlumit"}
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </div>
      <div className="vb-enter-soft flex flex-col items-center text-center" style={{ "--vb-i": 1 } as CSSProperties}>
        <p className="mb-3 font-mono text-xs tracking-[0.3em] text-ice">Trezor 09 — otevřen</p>
        <h1 className="font-display text-6xl font-extrabold tracking-tight sm:text-7xl">
          <span className="vb-title-gradient">VAULT</span>
          <span className="text-ice">BREAK</span>
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
          Prolomi trezor. Každá zbraň i schopnost je jiná — prefixy, sufixy, elementy a unikátní legendy.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        <label className="vb-stagger flex flex-col gap-1.5 text-left" style={{ "--vb-i": 2 } as CSSProperties}>
          <span className="text-xs font-medium tracking-wide text-subtle">Seed běhu</span>
          <input
            value={seed}
            onChange={(e) => onSeed(e.target.value.toUpperCase().slice(0, 10))}
            className="h-13 rounded-xl border border-border bg-surface px-4 font-mono text-base tracking-[0.2em] text-fg outline-none select-text focus:border-accent"
            spellCheck={false}
            autoComplete="off"
            suppressHydrationWarning
          />
        </label>
        <div className="vb-stagger flex flex-col gap-1.5 text-left" style={{ "--vb-i": 3 } as CSSProperties}>
          <span className="text-xs font-medium tracking-wide text-subtle">
            Startovní sektor {unlocked > 1 ? `(odemčeno do ${unlocked})` : "(poraz bosse pro checkpoint)"}
          </span>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: unlocked }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSector(s)}
                className={`flex h-11 min-w-12 items-center justify-center rounded-xl border px-3 font-mono text-sm tabular-nums transition-transform active:scale-95 ${
                  startSector === s
                    ? "border-accent bg-accent text-accent-fg shadow-[0_4px_16px_-4px_rgba(200,204,212,0.4)]"
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
          <label className="vb-stagger flex cursor-pointer items-center gap-2.5 rounded-xl border border-danger/50 bg-danger/10 px-4 py-3 text-left text-sm" style={{ "--vb-i": 4 } as CSSProperties}>
            <input
              type="checkbox"
              checked={torment}
              onChange={(e) => onTorment(e.target.checked)}
              className="size-5 accent-danger"
            />
            <span>
              <span className="font-semibold text-danger">TORMENT</span>
              <span className="block text-xs text-muted">+25 % síly nepřátel za loot +1 úroveň a +25 % šrotu.</span>
            </span>
          </label>
        ) : null}
        <div className="vb-stagger flex flex-col gap-1.5 text-left" style={{ "--vb-i": 4 } as CSSProperties}>
          <span className="text-xs font-medium tracking-wide text-subtle">
            Zbrojnice {armoryUnlocked.length > 0 ? "(rám rank 2+ nahradí pistoli)" : "(zabíjej archetypem pro rank 2)"}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onArmory(null)}
              title="Výchozí startovní zbraň"
              className={`flex h-11 min-w-12 items-center justify-center rounded-xl border px-3 font-mono text-sm tabular-nums transition-transform active:scale-95 ${
                armory === null
                  ? "border-accent bg-accent text-accent-fg shadow-[0_4px_16px_-4px_rgba(200,204,212,0.4)]"
                  : "border-border bg-surface text-muted"
              }`}
              aria-pressed={armory === null}
            >
              Pistole
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
                  className={`flex h-11 min-w-12 items-center justify-center rounded-xl border px-3 font-mono text-sm tabular-nums transition-transform active:scale-95 ${
                    armory === a
                      ? "border-accent bg-accent text-accent-fg shadow-[0_4px_16px_-4px_rgba(200,204,212,0.4)]"
                      : "border-border bg-surface text-muted"
                  }`}
                  aria-pressed={armory === a}
                >
                  {ARCHETYPE_LABEL[a].name} {rank}
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" onClick={onPlay} className="vb-btn-primary vb-stagger" style={{ "--vb-i": 4 } as CSSProperties}>
          <Play className="size-5" />
          {startSector > 1 ? `Start od sektoru ${startSector}` : "Nový běh"}
        </button>
        <button
          type="button"
          onClick={onDaily}
          className="vb-btn-ghost vb-stagger border-accent/60 bg-elevated font-semibold"
          style={{ "--vb-i": 5 } as CSSProperties}
        >
          <CalendarDays className="size-5" />
          Denní výzva · {dailySeed()}
        </button>
        <p className="text-center text-xs tabular-nums text-subtle">
          Dnes: LVL {daily.best} ({daily.plays}×) · historicky: LVL {daily.allBest}
        </p>
        <button
          type="button"
          onClick={onWeekly}
          className="vb-btn-ghost vb-stagger border-accent/60 bg-elevated font-semibold"
          style={{ "--vb-i": 6 } as CSSProperties}
        >
          <CalendarDays className="size-5" />
          Týdenní výzva · {weeklySeed()}
        </button>
        <p className="text-center text-xs tabular-nums text-subtle">
          Tento týden: LVL {weekly.best} ({weekly.plays}×) · historicky: LVL {weekly.allBest}
        </p>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-mono text-[11px] tracking-[0.25em] text-subtle">ŽEBŘÍČEK · TOP 5</h3>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-medium text-muted">Denní</h4>
              {board.daily.length > 0 ? (
                <ol className="mt-1 space-y-0.5 font-mono text-[11px] tabular-nums">
                  {board.daily.slice(0, 5).map((e, i) => (
                    <li key={`${e.key}-${e.seed}`} className="flex justify-between gap-2">
                      <span className="truncate text-subtle">
                        {i + 1}. {e.seed}
                      </span>
                      <span className="text-fg">LVL {e.level}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-[11px] text-subtle">Zatím prázdný.</p>
              )}
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted">Týdenní</h4>
              {board.weekly.length > 0 ? (
                <ol className="mt-1 space-y-0.5 font-mono text-[11px] tabular-nums">
                  {board.weekly.slice(0, 5).map((e, i) => (
                    <li key={`${e.key}-${e.seed}`} className="flex justify-between gap-2">
                      <span className="truncate text-subtle">
                        {i + 1}. {e.seed}
                      </span>
                      <span className="text-fg">LVL {e.level}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-[11px] text-subtle">Zatím prázdný.</p>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-mono text-[11px] tracking-[0.25em] text-subtle">KOLO ŠTĚSTÍ</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Po startu se roztočí kolo a vylosuje 3 mutátory pro 1. sektor. Před každým
            dalším sektorem se točí znovu.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-mono text-[11px] tracking-[0.25em] text-subtle">
            ODZNAKY {badges.length}/{CHALLENGES.length}
          </h3>
          {badges.length > 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {badges.map((b) => challengeDef(b).name).join(" · ")}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-subtle">
              Plň výzvy v běhu (vidíš je ve stats panelu) a sbírej odznaky.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCodex}
            className="vb-btn-ghost vb-stagger flex-col py-3"
            style={{ "--vb-i": 7 } as CSSProperties}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="size-5" />
              Kodex {codex.done}/{codex.total}
            </span>
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
              <span className="block h-full rounded-full bg-ice" style={{ width: `${(codex.done / Math.max(1, codex.total)) * 100}%` }} />
            </span>
          </button>
          <button
            type="button"
            onClick={onAchievements}
            className="vb-btn-ghost vb-stagger flex-col py-3"
            style={{ "--vb-i": 7 } as CSSProperties}
          >
            <span className="flex items-center gap-2">
              <Trophy className="size-5" />
              Achievementy {achievements.length}/{ACHIEVEMENTS.length}
            </span>
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
              <span
                className="block h-full rounded-full bg-rarity-uncommon"
                style={{ width: `${(achievements.length / ACHIEVEMENTS.length) * 100}%` }}
              />
            </span>
          </button>
        </div>
        <button type="button" onClick={onHelp} className="vb-btn-ghost vb-stagger" style={{ "--vb-i": 8 } as CSSProperties}>
          <HelpCircle className="size-5" />
          Jak hrát
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCesta} className="vb-btn-ghost vb-stagger" style={{ "--vb-i": 8 } as CSSProperties}>
            <Map className="size-5" />
            Cesta
          </button>
          <button
            type="button"
            onClick={onSlovnicek}
            className="vb-btn-ghost vb-stagger"
            style={{ "--vb-i": 8 } as CSSProperties}
          >
            <BookMarked className="size-5" />
            Slovníček
          </button>
        </div>
        <button
          type="button"
          onClick={onAdmin}
          className="vb-btn-ghost vb-stagger text-muted"
          style={{ "--vb-i": 9 } as CSSProperties}
        >
          <SlidersHorizontal className="size-5" />
          Panel správce
        </button>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface px-3 py-3">
          <Stat label="Úroveň" value={String(Math.max(save.bestLevel, save.bestRooms))} />
          <Stat label="Zabitých" value={String(save.bestKills)} />
          <Stat label="Běhů" value={String(save.runs)} />
        </div>
        <p className="text-center text-[11px] tabular-nums text-subtle">
          Celkem: {save.totalKills} zabití · ⚙ {save.totalScrap} šrotu · {save.bossesKilled} bossů
        </p>
        {(() => {
          const next = nextUnlock(Math.max(save.bestLevel, save.bestRooms));
          return next ? (
            <p className="text-center text-[11px] text-subtle">
              LVL {next.level} → {next.name}: {next.desc}
            </p>
          ) : (
            <p className="text-center text-[11px] text-subtle">Vše odemčeno. Trezor je tvůj.</p>
          );
        })()}
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
        <p className="text-center text-[11px] text-subtle">
          Reset smaže save, kodex, achievementy, odznaky, výzvy i blueprinty. Nastavení a zvuk zůstanou.
        </p>
      </div>
    </div>
  );
}

const CODEX_ICONS = {
  enemy: Skull,
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
function CestaScreen({ save, onBack, onCodex }: { save: SaveData; onBack: () => void; onCodex: () => void }) {
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
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter w-full max-w-md p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold">Cesta</h2>
        <p className="mt-1 text-sm text-muted">
          Co se kdy odemkne · jsi na LVL {best}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-ice" style={{ width: `${(doneCount / UNLOCKS.length) * 100}%` }} />
        </div>
        <div className="mt-4 max-h-[52dvh] space-y-4 overflow-y-auto">
          <section>
            <h3 className="mb-1 font-mono text-[11px] tracking-[0.25em] text-subtle">
              PROFIL {doneCount}/{UNLOCKS.length}
            </h3>
            <ul className="space-y-1.5">
              {UNLOCKS.map((u, i) => {
                const has = best >= u.level;
                return (
                  <li
                    key={u.id}
                    className={`rounded-xl border p-2.5 text-sm ${has ? "border-border bg-surface" : i === nextIdx ? "border-accent bg-surface" : "border-border/60 bg-surface/50"}`}
                  >
                    <div className={`flex items-center justify-between gap-2 font-medium ${has ? "text-fg" : "text-subtle"}`}>
                      <span className="flex items-center gap-1.5">
                        {has ? <Check className="size-4 text-rarity-uncommon" /> : <Lock className="size-4" />}
                        {u.name}
                      </span>
                      <span className="font-mono text-[11px]">
                        {has ? "ODEMČENO" : i === nextIdx ? `DÁL · LVL ${u.level}` : `LVL ${u.level}`}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs leading-relaxed text-muted">{u.desc}</div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-mono text-[11px] tracking-[0.25em] text-subtle">
              NEPŘÁTELÉ {foes.length + 1}
            </h3>
            <ul className="space-y-1.5">
              {foes.map((f) => (
                <li key={f.kind} className="rounded-xl border border-border/60 bg-surface/60 p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2 font-medium">
                    <span>{ENEMY_NAME[f.kind]}</span>
                    <span className="font-mono text-[11px] text-subtle">od LVL {f.minLevel}</span>
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted">útok: {ENEMY_ATTACK_LABEL[ENEMY_ATTACK[f.kind]]}</div>
                </li>
              ))}
              <li className="rounded-xl border border-danger/40 bg-surface/60 p-2.5 text-sm">
                <div className="flex items-center justify-between gap-2 font-medium">
                  <span className="text-danger">BOSS</span>
                  <span className="font-mono text-[11px] text-subtle">10. místnost</span>
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted">útok: boss — 3 fáze, volá posily</div>
              </li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-mono text-[11px] tracking-[0.25em] text-subtle">PORTÁLY A ANOMÁLIE</h3>
            <ul className="space-y-1.5">
              {SECTOR_MODS.map((m) => {
                const has = portalUnlocked(m.id, best);
                return (
                  <li key={m.id} className="rounded-xl border border-border/60 bg-surface/60 p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        {has ? <Check className="size-4 text-rarity-uncommon" /> : <Lock className="size-4 text-subtle" />}
                        {m.name}
                      </span>
                      <span className="font-mono text-[11px] text-subtle">{has ? "volba v bázi" : `LVL ${PORTAL_LEVEL[m.id]}`}</span>
                    </div>
                    <div className="mt-0.5 text-xs leading-relaxed text-muted">{m.desc}</div>
                  </li>
                );
              })}
              {ANOMALIES.map((a) => (
                <li key={a.id} className="rounded-xl border border-border/60 bg-surface/60 p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2 font-medium">
                    <span>◆ {a.name}</span>
                    <span className="font-mono text-[11px] text-subtle">sektor 2+</span>
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted">{a.desc}</div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-mono text-[11px] tracking-[0.25em] text-subtle">DÍLNA · BLUEPRINTY</h3>
            <p className="mb-2 text-xs leading-relaxed text-muted">
              Zabíjení archetypem zvedá jeho rank: +5 % DMG (25) → zbrojnice (60) → +1 slot (120) → +10 % DMG (200).
              Mody padají z lootu a sazí se v Dílně (záložka přehledu).
            </p>
            <ul className="space-y-1.5">
              {archs.map((a) => {
                const kills = blueprints[a] ?? 0;
                const rank = killsToRank(kills);
                const next = BLUEPRINT_RANK_KILLS[rank + 1];
                return (
                  <li key={a} className={`rounded-xl border p-2.5 text-sm ${kills > 0 ? "border-border bg-surface" : "border-border/60 bg-surface/50"}`}>
                    <div className="flex items-center justify-between gap-2 font-medium">
                      <span className={kills > 0 ? "text-fg" : "text-subtle"}>{ARCHETYPE_LABEL[a].name}</span>
                      <span className="font-mono text-[11px] text-subtle">
                        {rank > 0 ? `RANK ${rank} · ` : ""}{kills} zabití{next ? ` · dál ${next}` : " · MAX"}
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
            <h3 className="mb-1 font-mono text-[11px] tracking-[0.25em] text-subtle">SBÍRKA</h3>
            <p className="text-xs leading-relaxed text-muted">
              Kodex {codex.done}/{codex.total} — každá položka trvale posiluje postavu. Zamčené se ukazují jako ???.
            </p>
            <button type="button" onClick={onCodex} className="vb-btn-ghost mt-2 w-full">
              <BookOpen className="size-5" />
              Otevřít kodex
            </button>
          </section>
        </div>
        <button type="button" onClick={onBack} className="vb-btn-ghost mt-4 w-full">
          Zpět do menu
        </button>
      </div>
    </div>
  );
}

function SlovnicekScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter w-full max-w-md p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold">Slovníček</h2>
        <p className="mt-1 text-sm text-muted">
          Všechny pojmy na jednom místě · {Object.keys(GLOSSARY).length} hesel
        </p>
        <ul className="mt-4 max-h-[52dvh] space-y-1.5 overflow-y-auto">
          {Object.values(GLOSSARY).map((g) => (
            <li key={g.term} className="rounded-xl border border-border/60 bg-surface/60 p-2.5 text-sm">
              <div className="font-medium">{g.term}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted">{g.def}</div>
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

function CodexScreen({ onBack }: { onBack: () => void }) {
  const unlocked = loadCodex();  const entries = codexEntries();
  const progress = codexProgress(unlocked, entries);
  const total = codexBonus(unlocked, entries);
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter w-full max-w-md p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold">Kodex</h2>
        <p className="mt-1 text-sm text-muted">
          Odemčeno {progress.done}/{progress.total}. Každá položka trvale posiluje postavu od dalšího běhu.
        </p>
        <p className="mt-2 rounded-xl border border-border bg-elevated p-3 text-xs text-muted">
          Celkem: {formatCodexBonus(total)}
        </p>
        <div className="mt-4 max-h-[52dvh] space-y-4 overflow-y-auto">
          {CODEX_CATEGORIES.map((cat) => {
            const items = entries.filter((e) => e.cat === cat.id);
            const done = items.filter((e) => unlocked.has(`${e.cat}:${e.id}`)).length;
            const Icon = CODEX_ICONS[cat.id];
            return (
              <section key={cat.id}>
                <h3 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.25em] text-subtle">
                  <Icon className="size-3.5" />
                  {cat.name.toUpperCase()} {done}/{items.length}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {items.map((e) => {
                    const has = unlocked.has(`${e.cat}:${e.id}`);
                    return (
                      <li
                        key={`${e.cat}:${e.id}`}
                        className={`rounded-xl border p-2.5 text-sm ${has ? "border-border bg-surface" : "border-border/60 bg-surface/50"}`}
                      >
                        <div className={`font-medium ${has ? "text-fg" : "text-subtle"}`}>{has ? e.name : "???"}</div>
                        <div className="mt-0.5 text-xs leading-relaxed text-muted">
                          {has ? e.desc : "??? — potkej to ve hře."}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-subtle">
                          {has ? formatCodexBonus(e.bonus) : "odměna: ???"}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <button type="button" onClick={onBack} className="vb-btn-ghost mt-4 w-full">
          Zpět do menu
        </button>
      </div>
    </div>
  );
}

function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const have = new Set(loadAchievements());
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter w-full max-w-md p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold">Achievementy</h2>
        <p className="mt-1 text-sm text-muted">
          Splněno {have.size}/{ACHIEVEMENTS.length}. Odemknutí je trvalé a samo o sobě odměnou.
        </p>
        <ul className="mt-4 max-h-[52dvh] space-y-1.5 overflow-y-auto">
          {ACHIEVEMENTS.map((a) => {
            const has = have.has(a.id);
            return (
              <li
                key={a.id}
                className={`rounded-xl border p-2.5 text-sm ${has ? "border-border bg-surface" : "border-border/60 bg-surface/50"}`}
              >
                <div className={`flex items-center justify-between gap-2 font-medium ${has ? "text-fg" : "text-subtle"}`}>
                  <span className="flex items-center gap-1.5">
                    {has ? <Trophy className="size-4 text-rarity-uncommon" /> : <Lock className="size-4" />}
                    {a.name}
                  </span>
                  <span className="font-mono text-[11px]">{has ? "SPLNĚNO" : "ZAMČENO"}</span>
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted">{a.desc}</div>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={onBack} className="vb-btn-ghost mt-4 w-full">
          Zpět do menu
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

function Stat({ label, value }: { label: string; value: string }) {  return (
    <div className="text-center">
      <div className="font-display text-lg font-semibold tabular-nums text-fg">{value}</div>
      <div className="text-[11px] tracking-wide text-subtle">{label}</div>
    </div>
  );
}

function Help({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/80 p-4 sm:items-center">
      <div className="vb-dialog vb-enter w-full max-w-md p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold">Jak hrát</h2>
        <div className="mt-4 max-h-[50dvh] space-y-4 overflow-y-auto text-sm leading-relaxed text-muted">
          <section>
            <h3 className="font-medium text-fg">Základy</h3>
            <ul className="mt-1 space-y-1">
              <li>Pohyb je oddělený od míření — WASD nebo levý stick.</li>
              <li>Míření: myš, pravý stick. Na mobilu se střílí automaticky.</li>
              <li>Na mobilu: levá páčka pohyb, pravá páčka míření, tlačítka schopnost / dash / zbraň.</li>
              <li>Dash: mezerník. Schopnost: F nebo Shift.</li>
              <li>Výměna zbraně: Q / E. Dva sloty, neomezené kombinace.</li>
              <li>Statistiky (T): obtížnost, DPS, HP a dmg nepřátel — vždy po ruce.</li>
              <li>Postava (C): atributy, výbava, schopnost a pasivky na jedné kartě.</li>
              <li>Tipy k pojmům: najeď myší nebo tapni na ikony a čísla v HUD.</li>
              <li>Nové ve hře? Obrazovka Cesta v menu ukazuje, co se kdy odemkne.</li>
              <li>Před každou další vlnou je krátká pauza s odpočtem v HUD.</li>
              <li>Kolo štěstí před runem i každým sektorem losuje 3 mutátory — platí jen pro daný sektor.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-medium text-fg">Loot a šrot</h3>
            <ul className="mt-1 space-y-1">
              <li>Po místnosti vybereš loot — zbraň, schopnost, pasivku, nebo vše rozebereš na šrot.</li>
              <li>Šrot (od LVL 3) utratíš v bázi. Čím vyšší rarita, tím víc šrotu.</li>
              <li>Padá ti smůla? Po 3 místnostech bez rare+ hra jednu nabídku vylepší.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-medium text-fg">Báze a expedice</h3>
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
            <h3 className="font-medium text-fg">Dílna a zbrojnice</h3>
            <ul className="mt-1 space-y-1">
              <li>Zbraně jsou rámy s mod-sloty podle rarity. Unikáty (relikvie) se neupravují.</li>
              <li>Mody padají z lootu do inventáře (max 8) a sazí se v Dílně — záložce přehledu vedle Boje a Postavy.</li>
              <li>2+ mody stejné rodiny dávají setový bonus (+10 %, 3 kusy +25 %).</li>
              <li>Zabíjení archetypem zvedá jeho blueprint rank (DMG, slot, startovní rám ve Zbrojnici v menu).</li>
            </ul>
          </section>
          <section>
            <h3 className="font-medium text-fg">Synergie a bossové</h3>
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

function Hud({ hud, battleOpen, charOpen, onPause, onBattle, onCharacter }: { hud: HudSnap; battleOpen: boolean; charOpen: boolean; onPause: () => void; onBattle: () => void; onCharacter: () => void }) {
  const hp = Math.max(0, hud.hp / hud.maxHp);
  const lowHp = hp < 0.3 && hp > 0;
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
      {hud.waveIn > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
          <span className="vb-enter rounded-full border border-ice/50 bg-surface/90 px-4 py-2 font-mono text-sm tabular-nums text-ice shadow-lg">
            Vlna {hud.wave}/{hud.waves} za {hud.waveIn.toFixed(1)}s
          </span>
        </div>
      ) : null}
      {hud.bossInfo ? (
        <div className="pointer-events-none absolute inset-x-0 top-32 flex justify-center sm:top-28">
          <div className="w-64 max-w-[70vw]">
            <div className="mb-1 text-center font-mono text-[11px] tracking-[0.25em] text-danger">
              BOSS · {BOSS_PHASE_NAMES[(hud.bossInfo.phase || 1) as BossPhase].toUpperCase()}
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
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-xs tracking-wide text-muted">
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
                <span className="rounded-md bg-ice/15 px-2 py-0.5 text-ice">
                  ◆ {anomalyDef(hud.anomaly)!.name}
                </span>
              </Tip>
            ) : null}
            {hud.combo > 1 ? (
              <Tip title={GLOSSARY.combo.term} body={GLOSSARY.combo.def}>
                <span className="text-fg">x{hud.combo}</span>
              </Tip>
            ) : null}
            <Tip title={GLOSSARY.scrap.term} body={GLOSSARY.scrap.def}>
              <span className="rounded-md bg-surface/80 px-2 py-0.5 font-mono tabular-nums">
                ⚙ {hud.scrap}
              </span>
            </Tip>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-border/60 bg-elevated/90 shadow">
            <div className={`vb-hp-fill h-full rounded-full ${lowHp ? "vb-hp-low" : ""}`} style={{ width: `${hp * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-xs tabular-nums text-subtle">
            <span>
              {Math.ceil(hud.hp)}/{Math.ceil(hud.maxHp)}
            </span>
            <Tip title={GLOSSARY.dash.term} body={GLOSSARY.dash.def}>
              <span aria-label={`Dash ${hud.dash} z ${hud.dashMax}`}>
                {Array.from({ length: hud.dashMax }, (_, i) => (
                  <span key={i} className={i < hud.dash ? "text-ice" : "text-border"}>
                    ●
                  </span>
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBattle}
            className={`pointer-events-auto flex size-12 items-center justify-center rounded-xl border transition-transform active:scale-95 ${battleOpen ? "border-accent bg-surface text-fg shadow-[0_0_12px_-2px_rgba(200,204,212,0.5)]" : "border-border bg-surface/90 text-fg"}`}
            aria-label="Přehled boje (T)"
            title="Přehled boje (T)"
          >
            <BarChart3 className="size-5" />
          </button>
          <button
            type="button"
            onClick={onCharacter}
            className={`pointer-events-auto flex size-12 items-center justify-center rounded-xl border transition-transform active:scale-95 ${charOpen ? "border-accent bg-surface text-fg shadow-[0_0_12px_-2px_rgba(200,204,212,0.5)]" : "border-border bg-surface/90 text-fg"}`}
            aria-label="Postava (C)"
            title="Postava (C)"
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
      <div className="pointer-events-none mb-28 flex items-end justify-between gap-2 sm:mb-4">
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
        <div className="rounded-xl border border-border bg-surface/90 px-3.5 py-2.5 shadow">
          <Tip title={GLOSSARY.ability.term} body={GLOSSARY.ability.def}>
            <span className="text-[10px] tracking-widest text-subtle">SCHOPNOST ⓘ</span>
          </Tip>
          <div className="text-sm font-medium">{hud.ability.name}</div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-ice transition-[width] duration-150"
              style={{
                width: `${(1 - Math.min(1, hud.abilityCd / Math.max(0.01, hud.ability.cooldown))) * 100}%`,
              }}
            />
          </div>
          <div className="mt-1 font-mono text-[10px] tabular-nums text-subtle" title={`Přebíjení schopnosti (F / Shift): ${hud.ability.desc}`}>
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
      className={`min-w-0 max-w-[42%] rounded-xl border px-3.5 py-2.5 shadow transition-all ${active ? "border-accent bg-surface/95 shadow-[0_0_16px_-4px_rgba(200,204,212,0.5)]" : "border-border bg-surface/70"}`}
    >
      <div className={`text-[10px] font-medium tracking-widest ${rarityClass(weapon.rarity)}`}>{RARITY_LABEL[weapon.rarity]}</div>
      <div className="truncate text-sm font-medium">{weapon.name}</div>
      <div className="font-mono text-[11px] tabular-nums text-muted">
        {reloading ? "Nabíjení" : mag !== undefined ? `${mag}/${magSize}` : `${magSize}`}
      </div>
    </div>
  );
}

function PanelShell({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <div
      className={`pointer-events-none absolute top-16 right-3 bottom-40 flex ${wide ? "w-80 max-w-[86vw]" : "w-60"} flex-col overflow-hidden rounded-xl border border-border bg-surface/92 text-fg sm:bottom-24`}
    >
      <div className="pointer-events-auto flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="truncate font-mono text-[11px] tracking-widest text-subtle">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted"
          aria-label="Zavřít panel"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="pointer-events-auto flex-1 space-y-3 overflow-y-auto px-3 py-2">{children}</div>
    </div>
  );
}

function OverviewPanel({
  tab,
  onTab,
  onClose,
  hud,
  stats,
  onSocket,
  onUnsocket,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  hud: HudSnap;
  stats: StatsSnap;
  onSocket: (modId: string, slot: 0 | 1) => void;
  onUnsocket: (slot: 0 | 1, idx: number) => void;
}) {
  return (
    <PanelShell
      title={tab === "battle" ? `BOJ · SEKTOR ${stats.sector} · LVL ${stats.level}` : tab === "char" ? `POSTAVA · LVL ${hud.level}` : `DÍLNA · MODY ${hud.modInv.length}/8`}
      onClose={onClose}
      wide={tab !== "battle"}
    >
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onTab("battle")}
          aria-pressed={tab === "battle"}
          className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-transform active:scale-95 ${tab === "battle" ? "border-accent bg-elevated text-fg" : "border-border text-muted"}`}
        >
          <BarChart3 className="size-4" />
          Boj
        </button>
        <button
          type="button"
          onClick={() => onTab("char")}
          aria-pressed={tab === "char"}
          className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-transform active:scale-95 ${tab === "char" ? "border-accent bg-elevated text-fg" : "border-border text-muted"}`}
        >
          <User className="size-4" />
          Postava
        </button>
        <button
          type="button"
          onClick={() => onTab("workshop")}
          aria-pressed={tab === "workshop"}
          className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-transform active:scale-95 ${tab === "workshop" ? "border-accent bg-elevated text-fg" : "border-border text-muted"}`}
        >
          <Wrench className="size-4" />
          Dílna
        </button>
      </div>
      {tab === "battle" ? (
        <StatsBody stats={stats} activeSlot={hud.slot} />
      ) : tab === "char" ? (
        <CharBody hud={hud} stats={stats} />
      ) : (
        <DilnaBody hud={hud} onSocket={onSocket} onUnsocket={onUnsocket} />
      )}
    </PanelShell>
  );
}

/** Dílna: sazení modů z inventáře do rámů (pravidla §23). */
function DilnaBody({
  hud,
  onSocket,
  onUnsocket,
}: {
  hud: HudSnap;
  onSocket: (modId: string, slot: 0 | 1) => void;
  onUnsocket: (slot: 0 | 1, idx: number) => void;
}) {
  const [slot, setSlot] = useState<0 | 1>(hud.slot === 1 ? 1 : 0);
  const w = hud.weapons[slot];
  const fam = w ? familyBonusOf(w.mods) : { mult: 1, family: null as null };
  const canSocket = w && !w.unique && w.mods.length < w.slots;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-1.5">
        {([0, 1] as const).map((s) => {
          const sw = hud.weapons[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              aria-pressed={slot === s}
              className={`h-10 flex-1 truncate rounded-xl border px-2 text-xs font-medium transition-transform active:scale-95 ${slot === s ? "border-accent bg-elevated text-fg" : "border-border text-muted"}`}
            >
              {sw ? sw.name : "Prázdný slot"}
            </button>
          );
        })}
      </div>
      {w ? (
        <div className="rounded-xl border border-border bg-surface p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{w.name}</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-subtle">
              {w.unique ? "relikvie" : `sloty ${w.mods.length}/${w.slots}`}
            </span>
          </div>
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
                    <span className="shrink-0 font-mono text-[10px] text-subtle">vyjmout</span>
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
          INVENTÁŘ {hud.modInv.length}/{8}
        </h3>
        {hud.modInv.length > 0 ? (
          <ul className="space-y-1.5">
            {hud.modInv.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={!canSocket}
                  onClick={() => onSocket(m.id, slot)}
                  className="w-full rounded-xl border border-border/60 bg-surface/60 p-2.5 text-left text-sm transition-transform active:scale-[0.99] disabled:opacity-40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className={`font-mono text-[10px] tracking-widest ${rarityClass(m.rarity)}`}>
                      {RARITY_LABEL[m.rarity].toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted">{m.desc}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-subtle">rodina: {MOD_FAMILIES[m.family].name}</div>
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

function StatsBody({ stats, activeSlot }: { stats: StatsSnap; activeSlot: number }) {
  const r1 = (v: number) => (Math.round(v * 10) / 10).toString();
  return (
    <div className="space-y-3 text-[11px] leading-relaxed">
        <section>
          <h3 className="mb-1 font-mono text-[10px] tracking-widest text-subtle">OBTÍŽNOST</h3>
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
          <div className="mt-0.5 text-muted">
            ⚙ {stats.scrap} šrotu{stats.sectorMod ? ` · ${sectorModById(stats.sectorMod)?.name ?? stats.sectorMod}` : ""}
            {` · ${stats.gamePhase === "early" ? "Early-game" : stats.gamePhase === "mid" ? "Mid-game" : "Hlubina"}`}
            {stats.anomaly && anomalyDef(stats.anomaly) ? ` · ◆ ${anomalyDef(stats.anomaly)!.name}` : ""}
          </div>
        </section>
        <section>
          <h3 className="mb-1 font-mono text-[10px] tracking-widest text-subtle">JÁ</h3>
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
                <div className="font-mono tabular-nums text-[10px]">
                  {Math.round(w.damage)} dmg · {Math.round(w.rpm)} RPM · {w.pellets}× · {w.magSize} ran ·{" "}
                  {w.reload.toFixed(1)}s · krit {Math.round(w.critChance * 100)}% ×{w.critMult.toFixed(1)}
                </div>
              </div>
            ) : null,
          )}
        </section>
        <section>
          <h3 className="mb-1 font-mono text-[10px] tracking-widest text-subtle">MUTÁTORY</h3>
          <ul className="space-y-0.5">
            {stats.mutators.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-2">
                <span className={m.polarity === "plus" ? "text-rarity-uncommon" : "text-danger"}>
                  {m.polarity === "plus" ? "+" : "−"} {m.name}
                </span>
                <span className="shrink-0 text-[10px] text-subtle">{m.desc}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-mono text-[10px] tracking-widest text-subtle">VÝZVY</h3>
          <ul className="space-y-1">
            {stats.challenges.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-2">
                <span className={c.done ? "text-rarity-uncommon" : ""}>
                  {c.done ? "✓ " : "· "}{c.name}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-[10px] text-subtle">
                  {c.done ? `+${c.reward}⚙` : `${c.progress}/${c.goal}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
        {stats.alive.length > 0 ? (
          <section>
            <h3 className="mb-1 font-mono text-[10px] tracking-widest text-subtle">V MÍSTNOSTI ({stats.alive.length})</h3>
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
                          ◆ {e.affixes.map((a) => affixDef(a).name).join(" + ")}
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
        <section>
          <h3 className="mb-1 font-mono text-[10px] tracking-widest text-subtle">NEPŘÁTELÉ · LVL {stats.level}</h3>
          <table className="w-full font-mono tabular-nums">
            <thead>
              <tr className="text-left text-[10px] text-subtle">
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

/** Postava ve stylu WoW character sheetu: atributy, výbava, schopnost, pasivky, aury. */
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
            <dl className="space-y-1 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Zbroj (redukce poškození)</dt>
                <dd className="font-mono tabular-nums">{armorPct} %</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Rychlost pohybu</dt>
                <dd className="font-mono tabular-nums">{moveSpeed}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Poškození</dt>
                <dd className="font-mono tabular-nums">
                  <Tip
                    title="Poškození"
                    body={`Základ zbraně × vlastnosti ${traitMult.toFixed(2)} × aury ${auraMult.toFixed(2)} × kodex +${(codex.dmgPct * 100).toFixed(1)} % − zbroj cíle. Vlastnosti a aury mají klesající výnosy (§21).`}
                  >
                    <span>×{dmgMult.toFixed(2)}</span>
                  </Tip>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Vysátí (aktivní zbraň)</dt>
                <dd className="font-mono tabular-nums">{lifestealPct.toFixed(1)} %</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Magnet (dosah sběru)</dt>
                <dd className="font-mono tabular-nums">{magnet}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Dash</dt>
                <dd className="font-mono tabular-nums">
                  {hud.dash}/{hud.dashMax}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Šrot</dt>
                <dd className="font-mono tabular-nums">⚙ {hud.scrap}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Efektivní HP</dt>
                <dd className="font-mono tabular-nums" title="Max HP přepočtené přes redukci zbrojí">
                  {effHp}
                </dd>
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
                  <div key={w.id} className={`rounded-xl border p-3 ${slot === hud.slot ? "border-accent bg-surface" : "border-border/60 bg-surface/60"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-[10px] tracking-widest ${rarityClass(w.rarity)}`}>
                        {RARITY_LABEL[w.rarity].toUpperCase()}
                        {w.unique ? " · UNIKÁT" : ""}
                      </span>
                      {slot === hud.slot ? (
                        <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[10px] text-fg">V RUCE</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-sm font-medium">{w.name}</div>
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
                <span className={`font-mono text-[10px] tracking-widest ${rarityClass(hud.ability.rarity)}`}>
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
                      <span className={`font-mono text-[10px] tracking-widest ${rarityClass(p.rarity)}`}>
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
                  <span className="shrink-0 text-[10px] text-subtle">{m.desc}</span>
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
      <div className="vb-dialog vb-enter w-full max-w-sm p-5 sm:p-6">
        <h2 className="font-display text-3xl font-semibold">Pauza</h2>
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
          <h2 className="font-display text-2xl font-semibold">Vyber odměnu</h2>
          <div className="flex items-center gap-2">
            <Tip title={GLOSSARY.scrap.term} body={GLOSSARY.scrap.def}>
              <span className="rounded-lg bg-elevated px-2.5 py-1.5 font-mono text-xs tabular-nums text-subtle">⚙ {scrapTotal}</span>
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
          {scrapUnlocked ? `Rozebrat vše na šrot (+${scrapValue} ⚙)` : "Šrot se odemkne na LVL 3"}
        </button>
        {weaponPick !== null ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPick(weaponPick, 0)}
              className="rounded-xl border border-border bg-elevated p-3.5 text-left transition-transform active:scale-[0.98]"
            >
              <div className="text-[10px] tracking-widest text-subtle">SLOT 1</div>
              <div className="truncate text-sm font-medium">{weapons[0].name}</div>
            </button>
            <button
              type="button"
              onClick={() => onPick(weaponPick, 1)}
              className="rounded-xl border border-border bg-elevated p-3.5 text-left transition-transform active:scale-[0.98]"
            >
              <div className="text-[10px] tracking-widest text-subtle">SLOT 2</div>
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
  if (offer.kind === "weapon") {
    rarity = offer.weapon.rarity;
    title = offer.weapon.name;
    desc = `${offer.weapon.archetype.toUpperCase()} · ${Math.round(dpsEstimate(offer.weapon))} DPS`;
    extra = [
      `${offer.weapon.stats.damage.toFixed(0)} dmg · ${Math.round(offer.weapon.stats.rpm)} RPM`,
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
    rarity = offer.ability.rarity;
    title = offer.ability.name;
    desc = offer.ability.desc;
    extra = [
      `CD ${offer.ability.cooldown.toFixed(1)}s`,
      offer.ability.damage ? `${Math.round(offer.ability.damage)} dmg` : offer.ability.duration ? `${offer.ability.duration.toFixed(1)}s` : "",
    ];
  } else if (offer.kind === "passive") {
    rarity = offer.passive.rarity;
    title = offer.passive.name;
    desc = offer.passive.desc;
  } else if (offer.kind === "mod") {
    rarity = offer.mod.rarity;
    title = offer.mod.name;
    desc = offer.mod.desc;
    extra = [`Rodina: ${MOD_FAMILIES[offer.mod.family].name}`];
  } else {
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
      <div className={`text-[10px] font-semibold tracking-[0.15em] ${rarityClass(rarity)}`}>{RARITY_LABEL[rarity]}</div>
      <div className="mt-1 font-display text-[15px] font-semibold leading-snug">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted">{desc}</div>
      {hint ? <div className="mt-1 text-xs font-medium text-ice">✦ {hint}</div> : null}
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
      <div className="vb-dialog vb-enter w-full max-w-md p-5 sm:p-6">
        <p className="font-mono text-[11px] tracking-[0.25em] text-ice">SEKTOR {hud.sector} VYČIŠTĚN</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <h2 className="font-display text-3xl font-semibold">Báze</h2>
          <span className="rounded-xl border border-border bg-elevated px-3.5 py-2 font-mono text-sm tabular-nums shadow">
            ⚙ {hud.scrap} šrotu
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Boss padl. +35 % zdraví a checkpoint sektoru {hud.sector + 1} máš. Šrot získáš rozebráním lootu.
        </p>
        {nextAnomaly ? (
          <p className="mt-2 rounded-xl border border-ice/40 bg-ice/10 p-3 text-xs leading-relaxed text-ice">
            ◆ Anomálie sektoru {hud.sector + 1}: <strong>{nextAnomaly.name}</strong> — {nextAnomaly.desc}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-elevated p-3">
          <Stat label="Sektor" value={String(hud.sector)} />
          <Stat label="Zabití" value={String(hud.kills)} />
          <Stat label="HP" value={`${Math.ceil(hud.hp)}/${Math.ceil(hud.maxHp)}`} />
        </div>

        <h3 className="mt-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-subtle">
          <span className="flex size-5 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] text-fg">1</span>
          OBCHOD
        </h3>
        {shopUnlocked ? (
          <div className="mt-2 grid gap-2">
            {offers.map((offer) => {
              const afford = hud.scrap >= offer.cost;
              const capped = offer.id === "reroll" && hud.rerolls >= 4;
              return (
                <button
                  key={offer.id}
                  type="button"
                  disabled={!afford || capped}
                onClick={() => onShop(offer.id)}
                className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-border bg-elevated p-3.5 text-left transition-transform active:scale-[0.99] disabled:opacity-40"
              >
                  <span>
                    <span className="block text-sm font-medium">{offer.name}</span>
                    <span className="block text-xs text-muted">{capped ? "Maximum (4)" : offer.desc}</span>
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums">⚙ {offer.cost}</span>
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
          <span className="flex size-5 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] text-fg">2</span>
          DALŠÍ EXPEDICE
        </h3>
        <div className="mt-2 grid gap-2">
          {SECTOR_MODS.map((mod) => {
            const locked = portalLocked[mod.id];
            return (
              <button
                key={mod.id}
                type="button"
                disabled={locked !== null}
              onClick={() => onContinue(mod.id)}
              className="vb-stagger rounded-2xl border border-border bg-elevated p-4 text-left transition-transform active:scale-[0.99] disabled:opacity-40"
              style={{ "--vb-i": SECTOR_MODS.indexOf(mod) } as CSSProperties}
            >
                <span className="block text-sm font-semibold">
                  {mod.name} <span className="font-normal text-muted">→ sektor {hud.sector + 1}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{locked ?? mod.desc}</span>
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
          <span className="flex size-5 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] text-fg">3</span>
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
      <div className="vb-dialog vb-enter w-full max-w-sm p-5 sm:p-6">
        <h2 className="font-display text-3xl font-semibold">{win ? "Trezor prolomen" : "Běh skončil"}</h2>
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

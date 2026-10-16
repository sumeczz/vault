type Ctx = AudioContext & { webkitAudioContext?: AudioContext };

import type { AbilityKind } from "./types";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let musicBus: GainNode | null = null;
let muted = false;

const SFX_VOL_KEY = "vaultbreak.vol.sfx";
const MUSIC_VOL_KEY = "vaultbreak.vol.music";
let sfxVol = readVol(SFX_VOL_KEY, 0.7);
let musicVol = readVol(MUSIC_VOL_KEY, 0.5);
let noise: AudioBuffer | null = null;

function readVol(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = Number(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
  } catch {
    return fallback;
  }
}

function writeVol(key: string, v: number): void {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* ignore */
  }
}

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  return null;
}

export function unlockAudio(): void {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!ctx) {
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    musicBus = ctx.createGain();
    sfx.gain.value = sfxVol;
    musicBus.gain.value = musicVol * 0.6;
    master.gain.value = muted ? 0 : 0.85;
    sfx.connect(master);
    musicBus.connect(master);
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function resumeAudio(): void {
  if (ctx?.state === "suspended") void ctx.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
  if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.85, ctx.currentTime, 0.02);
}

export function getSfxVolume(): number {
  return sfxVol;
}

export function getMusicVolume(): number {
  return musicVol;
}

export function setSfxVolume(v: number): void {
  sfxVol = Math.min(1, Math.max(0, v));
  writeVol(SFX_VOL_KEY, sfxVol);
  if (sfx && ctx) sfx.gain.setTargetAtTime(sfxVol, ctx.currentTime, 0.02);
}

export function setMusicVolume(v: number): void {
  musicVol = Math.min(1, Math.max(0, v));
  writeVol(MUSIC_VOL_KEY, musicVol);
  if (musicBus && ctx) musicBus.gain.setTargetAtTime(musicVol * 0.6, ctx.currentTime, 0.02);
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.08,
  sweep?: number,
) {
  const c = getCtx();
  if (!c || !sfx) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(sfx);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

function burst(dur: number, gain = 0.12, hp = 1800) {
  const c = getCtx();
  if (!c || !sfx || !noise) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfx);
  src.start();
  src.stop(c.currentTime + dur);
}

function jitter(base: number, amt = 0.08): number {
  return base * (1 + (Math.random() * 2 - 1) * amt);
}

type AbilityVoice = {
  freq: number;
  dur: number;
  type: OscillatorType;
  sweep?: number;
  noise?: number;
};

/** Vlastní procedurální hlas každé schopnosti (frekvence, délka, průběh, šum). */
export const ABILITY_VOICE: Record<AbilityKind, AbilityVoice> = {
  shockwave: { freq: 180, dur: 0.2, type: "sawtooth", sweep: 60, noise: 0.1 },
  grenade: { freq: 120, dur: 0.25, type: "square", sweep: 50, noise: 0.16 },
  timestop: { freq: 880, dur: 0.4, type: "sine", sweep: 220 },
  orbitals: { freq: 520, dur: 0.2, type: "triangle", sweep: 780 },
  shield: { freq: 320, dur: 0.25, type: "sine", sweep: 640 },
  blink: { freq: 900, dur: 0.12, type: "sine", sweep: 300 },
  drone: { freq: 660, dur: 0.12, type: "square", sweep: 880 },
  lightning: { freq: 1200, dur: 0.14, type: "sawtooth", sweep: 200, noise: 0.1 },
  well: { freq: 140, dur: 0.35, type: "sine", sweep: 70 },
  overclock: { freq: 400, dur: 0.2, type: "sawtooth", sweep: 900 },
  mirror: { freq: 500, dur: 0.2, type: "triangle", sweep: 1000 },
  fireball: { freq: 220, dur: 0.22, type: "sawtooth", sweep: 80, noise: 0.12 },
  frostnova: { freq: 990, dur: 0.3, type: "sine", sweep: 330 },
  poisonburst: { freq: 300, dur: 0.3, type: "triangle", sweep: 120, noise: 0.06 },
  execute: { freq: 150, dur: 0.3, type: "square", sweep: 60, noise: 0.14 },
  meteor: { freq: 100, dur: 0.4, type: "sawtooth", sweep: 40, noise: 0.2 },
  volley: { freq: 700, dur: 0.1, type: "square", sweep: 350, noise: 0.08 },
  snipe: { freq: 1400, dur: 0.18, type: "sawtooth", sweep: 300, noise: 0.1 },
  shrapnel: { freq: 350, dur: 0.12, type: "square", sweep: 120, noise: 0.15 },
  hail: { freq: 1100, dur: 0.2, type: "sine", sweep: 500, noise: 0.05 },
  smokescreen: { freq: 240, dur: 0.3, type: "triangle", sweep: 120, noise: 0.08 },
  staticfield: { freq: 1000, dur: 0.16, type: "square", sweep: 400 },
  emp: { freq: 800, dur: 0.3, type: "sawtooth", sweep: 100, noise: 0.1 },
  thundercall: { freq: 1300, dur: 0.2, type: "sawtooth", sweep: 150, noise: 0.12 },
  lifedrain: { freq: 280, dur: 0.3, type: "sine", sweep: 140 },
  bloodpact: { freq: 160, dur: 0.35, type: "sawtooth", sweep: 60, noise: 0.08 },
  firestorm: { freq: 200, dur: 0.35, type: "sawtooth", sweep: 90, noise: 0.16 },
  frostarmor: { freq: 760, dur: 0.3, type: "sine", sweep: 380 },
  bulwark: { freq: 260, dur: 0.25, type: "square", sweep: 130, noise: 0.08 },
  shadowstep: { freq: 950, dur: 0.14, type: "sine", sweep: 250 },
  frenzy: { freq: 450, dur: 0.25, type: "sawtooth", sweep: 950, noise: 0.06 },
  guardian: { freq: 600, dur: 0.18, type: "triangle", sweep: 900 },
  magnetize: { freq: 400, dur: 0.25, type: "sine", sweep: 800 },
  repair: { freq: 350, dur: 0.2, type: "sine", sweep: 700 },
  fielddress: { freq: 300, dur: 0.25, type: "sine", sweep: 600 },
  detonator: { freq: 180, dur: 0.2, type: "square", sweep: 70, noise: 0.14 },
};

export const sfxPlay = {
  shoot(pitch = 1) {
    burst(0.04, 0.07, 2400);
    tone(jitter(420 * pitch), 0.05, "square", 0.035, 180);
  },
  shotgun() {
    burst(0.12, 0.16, 900);
    tone(140, 0.1, "sawtooth", 0.06, 60);
  },
  beam() {
    tone(jitter(880, 0.04), 0.04, "sine", 0.03);
  },
  hit() {
    burst(0.06, 0.1, 700);
    tone(jitter(180), 0.08, "triangle", 0.05, 70);
  },
  crit() {
    burst(0.08, 0.12, 1400);
    tone(720, 0.1, "square", 0.05, 220);
  },
  death() {
    burst(0.2, 0.18, 500);
    tone(140, 0.22, "sawtooth", 0.07, 50);
  },
  dash() {
    burst(0.1, 0.08, 1600);
    tone(520, 0.12, "sine", 0.04, 180);
  },
  ability() {
    tone(240, 0.16, "triangle", 0.07, 90);
    tone(480, 0.18, "sine", 0.04, 160);
  },
  abilityKind(kind: AbilityKind) {
    const v = ABILITY_VOICE[kind];
    if (!v) {
      tone(240, 0.16, "triangle", 0.07, 90);
      return;
    }
    tone(v.freq, v.dur, v.type, 0.07, v.sweep);
    if (v.noise) burst(v.dur * 0.8, v.noise, 1200);
  },
  pickup() {
    tone(520, 0.08, "sine", 0.05, 780);
    tone(780, 0.1, "sine", 0.04, 1040);
  },
  hurt() {
    burst(0.14, 0.14, 400);
    tone(110, 0.18, "sawtooth", 0.08, 50);
  },
  ui() {
    tone(640, 0.05, "square", 0.03);
  },
  reload() {
    tone(200, 0.06, "square", 0.03);
    tone(320, 0.08, "square", 0.025);
  },
  win() {
    tone(320, 0.2, "triangle", 0.06, 480);
    tone(480, 0.24, "triangle", 0.05, 640);
    tone(640, 0.3, "sine", 0.05, 960);
  },
  enemyShoot() {
    tone(jitter(300, 0.1), 0.06, "square", 0.018, 140);
  },
  bossRoar() {
    burst(0.5, 0.2, 300);
    tone(90, 0.5, "sawtooth", 0.1, 45);
    tone(135, 0.4, "sawtooth", 0.06, 60);
  },
  eliteSpawn() {
    tone(880, 0.09, "square", 0.04, 660);
    tone(660, 0.12, "square", 0.04, 880);
  },
  waveClear() {
    tone(520, 0.09, "triangle", 0.05, 660);
    tone(660, 0.12, "triangle", 0.05, 880);
  },
  waveIncoming() {
    tone(440, 0.09, "square", 0.035, 440);
    tone(660, 0.12, "square", 0.035, 660);
  },
  sectorClear() {
    tone(392, 0.16, "triangle", 0.06, 392);
    tone(523, 0.16, "triangle", 0.06, 523);
    tone(659, 0.16, "triangle", 0.06, 659);
    tone(784, 0.3, "sine", 0.06, 1040);
  },
  gameOver() {
    tone(320, 0.25, "sawtooth", 0.07, 200);
    tone(200, 0.3, "sawtooth", 0.07, 120);
    tone(120, 0.5, "triangle", 0.06, 60);
  },
  heal() {
    tone(300, 0.12, "sine", 0.05, 450);
    tone(450, 0.14, "sine", 0.05, 675);
  },
  reroll() {
    tone(jitter(500), 0.05, "square", 0.03);
    tone(jitter(700), 0.05, "square", 0.03);
  },
  deny() {
    tone(160, 0.12, "square", 0.05, 120);
  },
  wheelTick() {
    tone(jitter(900, 0.06), 0.03, "square", 0.02);
  },
};

export type MusicMode = "explore" | "boss" | "base";

// Jednoduchá procedurální smyčka: basa + arpeggio v A-moll, vše tiché v pozadí.
const MUSIC_PATTERNS: Record<MusicMode, { bpm: number; bass: number[]; arp: number[] }> = {
  explore: {
    bpm: 96,
    bass: [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 110, 0, 146.8, 0, 130.8, 0],
    arp: [220, 0, 261.6, 329.6, 0, 261.6, 220, 0, 196, 0, 220, 261.6, 0, 329.6, 261.6, 0],
  },
  boss: {
    bpm: 132,
    bass: [110, 110, 0, 110, 103.8, 0, 110, 0, 110, 110, 0, 110, 130.8, 0, 123.5, 0],
    arp: [220, 0, 220, 261.6, 0, 220, 0, 207.7, 220, 0, 220, 261.6, 329.6, 0, 261.6, 220],
  },
  base: {
    bpm: 64,
    bass: [110, 0, 0, 0, 130.8, 0, 0, 0, 98, 0, 0, 0, 146.8, 0, 0, 0],
    arp: [440, 0, 0, 523.3, 0, 0, 392, 0, 0, 329.6, 0, 0, 261.6, 0, 0, 0],
  },
};

let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicMode: MusicMode = "explore";
let musicStep = 0;
let musicNextT = 0;

function musicNote(freq: number, at: number, dur: number, type: OscillatorType, gain: number) {
  const c = getCtx();
  if (!c || !musicBus) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g);
  g.connect(musicBus);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function musicTick() {
  const c = getCtx();
  if (!c) return;
  const pat = MUSIC_PATTERNS[musicMode];
  const stepDur = 60 / pat.bpm / 2;
  while (musicNextT < c.currentTime + 0.35) {
    const i = musicStep % 16;
    const bass = pat.bass[i];
    const arp = pat.arp[i];
    if (bass) musicNote(bass, musicNextT, stepDur * 1.8, "triangle", 0.05);
    if (arp) musicNote(arp, musicNextT, stepDur * 1.2, "sine", 0.028);
    musicNextT += stepDur;
    musicStep += 1;
  }
}

export function musicStart(mode: MusicMode = "explore"): void {
  if (!getCtx()) return;
  musicMode = mode;
  if (musicTimer) return;
  musicStep = 0;
  const c = getCtx();
  musicNextT = (c?.currentTime ?? 0) + 0.05;
  musicTimer = setInterval(musicTick, 120);
}

export function musicStop(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function setMusicMode(mode: MusicMode): void {
  musicMode = mode;
}

export function getMusicMode(): MusicMode {
  return musicMode;
}

void (0 as unknown as Ctx);

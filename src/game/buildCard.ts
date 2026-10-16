/**
 * Karta buildu ke sdílení — PNG generované po banku v bázi.
 * Čistá data pro testy (buildCardData) + vykreslení na canvas + stažení.
 */
import { RARITY_COLOR, RARITY_LABEL, type Rarity, type Weapon } from "./types";
import { dpsEstimate } from "./weapons";
import { anomalyDef, sectorModById } from "./expedition";

export type BuildCardWeapon = {
  name: string;
  rarity: Rarity;
  dps: number;
};

export type BuildCardData = {
  sector: number;
  level: number;
  time: string;
  kills: number;
  weapons: BuildCardWeapon[];
  ability: string;
  passives: string[];
  mutators: string[];
  expedition: string | null;
  anomaly: string | null;
  seed: string;
  date: string;
};

export type BuildCardInput = {
  sector: number;
  level: number;
  time: string;
  kills: number;
  weapons: [Weapon, Weapon | null];
  abilityName: string;
  passiveNames: string[];
  mutatorNames: string[];
  sectorModName: string | null;
  anomalyName: string | null;
  seed: string;
};

export function buildCardData(input: BuildCardInput): BuildCardData {
  return {
    sector: input.sector,
    level: input.level,
    time: input.time,
    kills: input.kills,
    weapons: input.weapons.flatMap((w): BuildCardWeapon[] =>
      w ? [{ name: w.name, rarity: w.rarity, dps: Math.round(dpsEstimate(w)) }] : [],
    ),
    ability: input.abilityName,
    passives: [...input.passiveNames],
    mutators: [...input.mutatorNames],
    expedition: input.sectorModName,
    anomaly: input.anomalyName,
    seed: input.seed.toUpperCase(),
    date: new Date().toISOString().slice(0, 10),
  };
}

export function sectorModNameOf(id: string | null): string | null {
  if (!id) return null;
  return sectorModById(id as Parameters<typeof sectorModById>[0])?.name ?? null;
}

export function anomalyNameOf(id: string | null): string | null {
  if (!id) return null;
  return anomalyDef(id as Parameters<typeof anomalyDef>[0])?.name ?? null;
}

const W = 640;
const H = 860;

export function drawBuildCard(data: BuildCardData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(200,204,212,0.08)";
  ctx.lineWidth = 1;
  for (let x = 40; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  let y = 64;
  ctx.textAlign = "center";
  ctx.fillStyle = "#71717a";
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillText("V A U L T B R E A K", W / 2, y);
  y += 52;
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "800 44px system-ui, sans-serif";
  ctx.fillText("KARTA BUILDU", W / 2, y);
  y += 40;
  ctx.fillStyle = "#9eb4c4";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(`SEKTOR ${data.sector} · LVL ${data.level}`, W / 2, y);
  y += 34;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "400 18px system-ui, sans-serif";
  ctx.fillText(`Čas ${data.time} · Zabití ${data.kills} · Seed ${data.seed}`, W / 2, y);
  y += 52;

  const section = (title: string) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "#71717a";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(title, 48, y);
    y += 28;
  };
  section("ZBRANĚ");
  for (const w of data.weapons) {
    ctx.fillStyle = RARITY_COLOR[w.rarity];
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(`${RARITY_LABEL[w.rarity]} · ${w.name}`, 48, y);
    y += 26;
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "400 16px system-ui, sans-serif";
    ctx.fillText(`DPS ${w.dps}`, 48, y);
    y += 32;
  }
  section("SCHOPNOST A PASIVKY");
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "400 18px system-ui, sans-serif";
  ctx.fillText(data.ability, 48, y);
  y += 28;
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "400 16px system-ui, sans-serif";
  const passives = data.passives.length > 0 ? data.passives.join(" · ") : "žádné";
  for (const line of wrapText(ctx, passives, W - 96)) {
    ctx.fillText(line, 48, y);
    y += 24;
  }
  y += 8;
  section("MUTÁTORY");
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "400 18px system-ui, sans-serif";
  for (const line of wrapText(ctx, data.mutators.join(" · ") || "žádné", W - 96)) {
    ctx.fillText(line, 48, y);
    y += 26;
  }
  y += 8;
  section("EXPEDICE");
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "400 16px system-ui, sans-serif";
  ctx.fillText(`Portál: ${data.expedition ?? "—"} · Anomálie: ${data.anomaly ?? "—"}`, 48, y);
  y += 44;
  ctx.textAlign = "center";
  ctx.fillStyle = "#71717a";
  ctx.font = "400 14px system-ui, sans-serif";
  ctx.fillText(`${data.date} · vaultbreak`, W / 2, H - 32);
  return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function downloadBuildCard(canvas: HTMLCanvasElement, sector: number): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaultbreak-sektor-${sector}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

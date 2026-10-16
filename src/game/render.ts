import { PLAYER_R, ROOM_H, ROOM_W, WALL, type Weapon } from "./types";
import { affixDef } from "./bestiary";
import type { Bullet, Enemy, Run } from "./sim";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function poly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawWeapon(ctx: CanvasRenderingContext2D, w: Weapon, x: number, y: number, aim: number, scale = 1, muzzle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aim);
  ctx.scale(scale, scale);
  const body = w.colors.body;
  const acc = w.colors.accent;
  ctx.fillStyle = body;
  ctx.strokeStyle = acc;
  ctx.lineWidth = 1.4;
  let bodyL = 16;
  let bodyH = 7;
  let barrelL = 14;
  let barrelH = 3;
  switch (w.archetype) {
    case "pistol":
      bodyL = 12;
      bodyH = 6;
      barrelL = 10;
      barrelH = 2.4;
      break;
    case "smg":
      bodyL = 16;
      bodyH = 7;
      barrelL = 12;
      barrelH = 2.6;
      break;
    case "shotgun":
      bodyL = 18;
      bodyH = 8;
      barrelL = 16;
      barrelH = 4.6;
      break;
    case "rifle":
      bodyL = 20;
      bodyH = 6.5;
      barrelL = 22;
      barrelH = 2.4;
      break;
    case "sniper":
      bodyL = 18;
      bodyH = 6;
      barrelL = 28;
      barrelH = 2;
      break;
    case "launcher":
      bodyL = 18;
      bodyH = 10;
      barrelL = 16;
      barrelH = 7;
      break;
    case "beam":
    case "rail":
      bodyL = 14;
      bodyH = 5;
      barrelL = 26;
      barrelH = 1.8;
      break;
    case "flamer":
      bodyL = 16;
      bodyH = 9;
      barrelL = 12;
      barrelH = 6;
      break;
    case "minigun":
      bodyL = 18;
      bodyH = 10;
      barrelL = 18;
      barrelH = 8;
      break;
    case "bouncer":
      bodyL = 14;
      bodyH = 8;
      barrelL = 12;
      barrelH = 5;
      break;
    case "helix":
      bodyL = 15;
      bodyH = 7;
      barrelL = 16;
      barrelH = 3.2;
      break;
    case "mortar":
      bodyL = 16;
      bodyH = 11;
      barrelL = 14;
      barrelH = 8;
      break;
    case "arc":
      bodyL = 15;
      bodyH = 7;
      barrelL = 18;
      barrelH = 4;
      break;
    case "swarm":
      bodyL = 13;
      bodyH = 9;
      barrelL = 10;
      barrelH = 7;
      break;
    case "harpoon":
      bodyL = 19;
      bodyH = 6;
      barrelL = 24;
      barrelH = 2.2;
      break;
  }
  roundRect(ctx, 6, -bodyH / 2, bodyL, bodyH, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = acc;
  roundRect(ctx, 6 + bodyL - 2, -barrelH / 2, barrelL, barrelH, 1);
  ctx.fill();
  ctx.fillStyle = "#1a1c20";
  ctx.fillRect(8, bodyH / 2 - 1, 6, 5);
  if (w.archetype === "sniper" || w.archetype === "rail") {
    ctx.strokeStyle = acc;
    ctx.beginPath();
    ctx.arc(12, -bodyH / 2 - 3, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (muzzle > 0) {
    // Záblesk v barvě zbraně (element), ne bílý.
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.arc(6 + bodyL + barrelL + 4, 0, 5 + muzzle * 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, e.r * 0.7, e.r * 0.9, e.r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  const col = e.flash > 0 ? "#f4f4f5" : e.color;
  ctx.fillStyle = col;
  ctx.strokeStyle = "rgba(10,10,11,0.7)";
  ctx.lineWidth = 1.6;
  const ang = Math.atan2(e.vy, e.vx);
  switch (e.kind) {
    case "grunt":
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "rusher":
      poly(ctx, 0, 0, e.r + 2, 3, ang);
      ctx.fill();
      ctx.stroke();
      break;
    case "shooter":
      poly(ctx, 0, 0, e.r + 1, 4, Math.PI / 4);
      ctx.fill();
      ctx.stroke();
      break;
    case "tank":
      poly(ctx, 0, 0, e.r, 6, 0);
      ctx.fill();
      ctx.stroke();
      break;
    case "splitter":
      roundRect(ctx, -e.r, -e.r, e.r * 2, e.r * 2, 4);
      ctx.fill();
      ctx.stroke();
      break;
    case "bomber":
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#c45c3e";
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "sniper":
      poly(ctx, 0, 0, e.r + 2, 4, ang);
      ctx.fill();
      ctx.stroke();
      break;
    case "lezec":
      poly(ctx, 0, 0, e.r + 1, 3, ang);
      ctx.fill();
      ctx.stroke();
      break;
    case "drtic":
      poly(ctx, 0, 0, e.r, 8, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(10,10,11,0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "stin":
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(214,221,228,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "stopar":
      poly(ctx, 0, 0, e.r + 1, 5, ang);
      ctx.fill();
      ctx.stroke();
      break;
    case "des":
      poly(ctx, 0, 0, e.r + 2, 4, Math.PI / 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(10,10,11,0.6)";
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "cepel":
      ctx.beginPath();
      ctx.moveTo(e.r + 5, 0);
      ctx.lineTo(0, e.r * 0.5);
      ctx.lineTo(-e.r - 5, 0);
      ctx.lineTo(0, -e.r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "nosorozec":
      poly(ctx, 0, 0, e.r, 6, ang);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(e.r + 6, 0);
      ctx.lineTo(e.r - 2, 4);
      ctx.lineTo(e.r - 2, -4);
      ctx.closePath();
      ctx.fill();
      break;
    case "kopi":
      ctx.beginPath();
      ctx.moveTo(e.r + 7, 0);
      ctx.lineTo(0, e.r * 0.35);
      ctx.lineTo(-e.r - 7, 0);
      ctx.lineTo(0, -e.r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "kanonyr":
      ctx.save();
      ctx.rotate(ang);
      ctx.fillRect(-e.r, -e.r * 0.7, e.r * 2, e.r * 1.4);
      ctx.strokeRect(-e.r, -e.r * 0.7, e.r * 2, e.r * 1.4);
      ctx.fillStyle = col;
      ctx.fillRect(e.r * 0.5, -2.5, e.r + 3, 5);
      ctx.restore();
      break;
    case "ostrostrelec":
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(10,10,11,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-e.r, 0);
      ctx.lineTo(e.r, 0);
      ctx.moveTo(0, -e.r);
      ctx.lineTo(0, e.r);
      ctx.stroke();
      break;
    case "jiskra":
      poly(ctx, 0, 0, e.r + 2, 5, ang);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd76a";
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "vrhac":
      poly(ctx, 0, 0, e.r + 1, 3, ang + Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(10,10,11,0.6)";
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "gardista":
      poly(ctx, 0, 0, e.r, 6, 0);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(214,221,228,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-e.r * 0.45, -e.r * 0.45, e.r * 0.9, e.r * 0.9);
      break;
    case "srsen":
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r + 2, e.r * 0.6, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(214,221,228,0.55)";
      ctx.beginPath();
      ctx.arc(-e.r * 0.4, -e.r * 0.7, e.r * 0.32, 0, Math.PI * 2);
      ctx.arc(e.r * 0.4, e.r * 0.7, e.r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spravce":
      poly(ctx, 0, 0, e.r, 7, ang * 0.2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#9a6bc2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "tekavka":
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd76a";
      ctx.beginPath();
      ctx.arc(0, -e.r - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bourak":
      roundRect(ctx, -e.r, -e.r, e.r * 2, e.r * 2, 5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#c45c3e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "roztoc":
      roundRect(ctx, -e.r * 0.9, -e.r * 0.9, e.r * 1.8, e.r * 1.8, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(10,10,11,0.6)";
      ctx.beginPath();
      ctx.arc(-e.r * 0.3, 0, e.r * 0.18, 0, Math.PI * 2);
      ctx.arc(e.r * 0.3, 0, e.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "medik":
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e8f4ec";
      ctx.fillRect(-2, -e.r * 0.5, 4, e.r);
      ctx.fillRect(-e.r * 0.5, -2, e.r, 4);
      break;
    case "matka":
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(10,10,11,0.45)";
      ctx.beginPath();
      ctx.arc(-e.r * 0.35, -e.r * 0.2, e.r * 0.28, 0, Math.PI * 2);
      ctx.arc(e.r * 0.35, -e.r * 0.2, e.r * 0.28, 0, Math.PI * 2);
      ctx.arc(0, e.r * 0.4, e.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "boss":
      poly(ctx, 0, 0, e.r, 6, ang * 0.15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = e.flash > 0 ? "#f4f4f5" : "#1a1c20";
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  if (e.hp < e.maxHp) {
    const bw = e.r * 2;
    ctx.fillStyle = "rgba(10,10,11,0.7)";
    ctx.fillRect(-bw / 2, -e.r - 8, bw, 3);
    ctx.fillStyle = "#c45c3e";
    ctx.fillRect(-bw / 2, -e.r - 8, bw * (e.hp / e.maxHp), 3);
  }
  if (e.affixes.length > 0) {
    ctx.strokeStyle = affixDef(e.affixes[0]!).color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Status efekty z útoků: hoření, jed, mráz, šok, křehkost.
  const pipY = -e.r - 13;
  if (e.burn > 0) {
    ctx.fillStyle = "#c45c3e";
    ctx.beginPath();
    ctx.moveTo(-9, pipY + 4);
    ctx.lineTo(-6, pipY - 4);
    ctx.lineTo(-3, pipY + 4);
    ctx.closePath();
    ctx.fill();
  }
  if (e.poison > 0) {
    ctx.fillStyle = "#7a9a72";
    ctx.beginPath();
    ctx.arc(0, pipY, 2.6, 0, Math.PI * 2);
    ctx.arc(5.5, pipY + 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.slow > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#8fb4c8";
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (e.stun > 0) {
    ctx.fillStyle = "#c9c07a";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 6, pipY + (i === 0 ? -2 : 0), 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (e.fragile > 0) {
    ctx.strokeStyle = "rgba(214,221,228,0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (e.kind === "boss" && e.phase >= 2) {
    ctx.strokeStyle = e.phase >= 3 ? "#c45c3e" : "#c9c07a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const ang = Math.atan2(b.vy, b.vx);
  if (b.fromBeam) {
    ctx.rotate(ang);
    ctx.fillStyle = b.color;
    ctx.fillRect(-10, -b.r * 0.5, 18, b.r);
    ctx.restore();
    return;
  }
  if (b.explode > 0) {
    // Výbušnina (granát, launcher): tmavý korpus s blikající roznětkou.
    const r = Math.max(5, b.r);
    ctx.fillStyle = "#23252b";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = (b.ttl * 6) % 1 > 0.5 ? "#ffd76a" : b.color;
    ctx.beginPath();
    ctx.arc(0, -r - 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (b.team === 1) {
    // Nepřátelská střela: rudý kosočtverec, vždy jasně rozeznatelný.
    ctx.rotate(ang);
    const pulse = 1 + 0.14 * Math.sin(b.ttl * 18);
    const r = (b.r + 1.5) * pulse;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(r + 3, 0);
    ctx.lineTo(0, r * 0.7);
    ctx.lineTo(-r - 3, 0);
    ctx.lineTo(0, -r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // Hráčovy střely: tvar podle elementu zbraně.
  ctx.rotate(ang);
  const r = Math.max(2.5, b.r);
  switch (b.element) {
    case "fire": {
      // Plamínek ve směru letu.
      const fl = 0.8 + 0.25 * Math.sin(b.ttl * 45);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(r * 2.2 * fl, 0);
      ctx.lineTo(-r, r * 0.9);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(-r, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case "ice": {
      // Ledový kosočtverec.
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(r + 2, 0);
      ctx.lineTo(0, r * 0.75);
      ctx.lineTo(-r - 2, 0);
      ctx.lineTo(0, -r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case "shock": {
      // Blesk: lomená čára ve směru letu.
      ctx.strokeStyle = b.color;
      ctx.lineWidth = Math.max(2, r * 0.7);
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-r - 3, 0);
      ctx.lineTo(-r * 0.3, -r * 0.8);
      ctx.lineTo(r * 0.4, r * 0.8);
      ctx.lineTo(r + 3, 0);
      ctx.stroke();
      break;
    }
    case "toxic": {
      // Bublina se satelity.
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(r * 1.1, -r * 0.9, r * 0.45, 0, Math.PI * 2);
      ctx.arc(-r * 1.2, r * 0.7, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case "void": {
      // Temné jádro s fialovým prstencem.
      ctx.fillStyle = "#14141c";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    default: {
      // Kinetika: svítící jádro se stopou.
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1.5, r * 0.6);
      ctx.beginPath();
      ctx.moveTo(-r - 9, 0);
      ctx.lineTo(-r * 0.5, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  if (b.crit) {
    // Kritický zásah: bílý kroužek.
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderRun(ctx: CanvasRenderingContext2D, run: Run, viewW: number, viewH: number) {
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(viewW / 2 + run.shakeX, viewH / 2 + run.shakeY);
  ctx.scale(run.zoom, run.zoom);
  ctx.translate(-run.cam.x, -run.cam.y);

  ctx.fillStyle = "#121316";
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(WALL, WALL, ROOM_W - WALL * 2, ROOM_H - WALL * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(200,204,212,0.05)";
  ctx.lineWidth = 1;
  const gs = 40;
  const x0 = Math.floor(WALL / gs) * gs;
  const y0 = Math.floor(WALL / gs) * gs;
  ctx.beginPath();
  for (let x = x0; x < ROOM_W; x += gs) {
    ctx.moveTo(x, WALL);
    ctx.lineTo(x, ROOM_H - WALL);
  }
  for (let y = y0; y < ROOM_H; y += gs) {
    ctx.moveTo(WALL, y);
    ctx.lineTo(ROOM_W - WALL, y);
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#1a1c21";
  ctx.fillRect(0, 0, ROOM_W, WALL);
  ctx.fillRect(0, ROOM_H - WALL, ROOM_W, WALL);
  ctx.fillRect(0, 0, WALL, ROOM_H);
  ctx.fillRect(ROOM_W - WALL, 0, WALL, ROOM_H);
  ctx.fillStyle = "rgba(200,204,212,0.08)";
  ctx.fillRect(0, WALL - 2, ROOM_W, 2);
  ctx.fillRect(WALL - 2, 0, 2, ROOM_H);

  for (const o of run.room.obstacles) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(o.x, o.y + o.r * 0.35, o.r * 0.95, o.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#22252b";
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,204,212,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(200,204,212,0.18)";
    ctx.beginPath();
    ctx.arc(o.x - o.r * 0.15, o.y - o.r * 0.2, o.r * 0.72, -Math.PI * 0.2, Math.PI * 0.5);
    ctx.stroke();
  }

  if (run.buffs.well) {
    const w = run.buffs.well;
    ctx.strokeStyle = "rgba(122,126,154,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r * (0.4 + 0.6 * (w.t % 1)), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of run.pickups) {
    if (!p.active) continue;
    ctx.fillStyle = p.kind === "hp" ? "#c45c3e" : "#9eb4c4";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of run.enemies) if (e.active) drawEnemy(ctx, e);
  for (const b of run.bullets) if (b.active) drawBullet(ctx, b);

  const pl = run.player;
  ctx.save();
  ctx.translate(pl.x, pl.y);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, PLAYER_R * 0.75, PLAYER_R, PLAYER_R * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (run.buffs.shield > 0) {
    ctx.strokeStyle = "rgba(158,180,196,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_R + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (pl.dashT > 0 || pl.invuln > 0.2) ctx.globalAlpha = 0.55;
  ctx.fillStyle = pl.invuln > 0 && pl.invuln < HIT_FLASH() ? "#f4f4f5" : "#d6dde4";
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0b";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#0a0a0b";
  ctx.beginPath();
  ctx.arc(Math.cos(pl.aim) * 5, Math.sin(pl.aim) * 5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const wpn = run.weapons[pl.slot];
  if (wpn) drawWeapon(ctx, wpn, pl.x, pl.y, pl.aim, 1, run.muzzle);

  if (run.buffs.orbitals > 0) {
    const n = 3;
    const r = 56;
    for (let i = 0; i < n; i++) {
      const a = run.buffs.orbitalAngle + (i / n) * Math.PI * 2;
      ctx.fillStyle = "#d6dde4";
      ctx.beginPath();
      ctx.arc(pl.x + Math.cos(a) * r, pl.y + Math.sin(a) * r, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (run.buffs.drone > 0) {
    // Dron: malý trojúhelník na krátké orbitě kolem hráče.
    const a = run.buffs.orbitalAngle;
    const dx = pl.x + Math.cos(a) * 24;
    const dy = pl.y + Math.sin(a) * 24;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(a);
    ctx.fillStyle = "#9eb4c4";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, 4);
    ctx.lineTo(-4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (run.buffs.overclock > 0) {
    // Přetaktování: oranžová záře kolem hráče.
    ctx.strokeStyle = "rgba(196,92,62,0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, PLAYER_R + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (run.buffs.mirror > 0) {
    // Zrcadlo: rotující přerušovaný prstenec.
    ctx.strokeStyle = "rgba(158,180,196,0.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -run.time * 30;
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, PLAYER_R + 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (run.buffs.timestop > 0) {
    // Zastavení času: chladný nádech přes celou místnost.
    ctx.fillStyle = "rgba(110,150,200,0.10)";
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }

  for (const p of run.particles) {
    if (!p.active) continue;
    const a = p.life / p.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.kind === "ring") {
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === "bolt") {
      // Blesk: lomená čára mezi dvěma body (Lightning, chain).
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineJoin = "round";
      const segs = 4;
      const ddx = (p.x2 - p.x) / segs;
      const ddy = (p.y2 - p.y) / segs;
      const nl = Math.hypot(p.x2 - p.x, p.y2 - p.y) || 1;
      const ox = (-(p.y2 - p.y) / nl) * 7;
      const oy = ((p.x2 - p.x) / nl) * 7;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (let i = 1; i < segs; i++) {
        const j = (Math.random() - 0.5) * 2;
        ctx.lineTo(p.x + ddx * i + ox * j, p.y + ddy * i + oy * j);
      }
      ctx.lineTo(p.x2, p.y2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.font = "600 12px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  for (const f of run.floats) {
    if (!f.active) continue;
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.fillStyle = f.color;
    ctx.font = f.crit ? "700 14px 'IBM Plex Sans', sans-serif" : "600 12px 'IBM Plex Sans', sans-serif";
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  const g = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.2, viewW / 2, viewH / 2, viewH * 0.75);
  g.addColorStop(0, "rgba(10,10,11,0)");
  g.addColorStop(1, "rgba(10,10,11,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);
}

function HIT_FLASH() {
  return 0.12;
}

import "./style.css";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const hpFill = document.querySelector("#hp-fill");
const hpText = document.querySelector("#hp-text");
const xpFill = document.querySelector("#xp-fill");
const levelText = document.querySelector("#level-text");
const killCount = document.querySelector("#kill-count");
const toast = document.querySelector("#toast");
const WORLD = { w: 2200, h: 1600, tile: 64 };
const keys = new Set();
const camera = { x: 0, y: 0 };
const player = { x: 1100, y: 800, r: 15, speed: 235, hp: 100, maxHp: 100, stamina: 100, xp: 0, level: 1, kills: 0, attackCd: 0, dodgeCd: 0, dodgeTime: 0, pulseCd: 0, invuln: 0, facing: { x: 1, y: 0 }, swing: 0 };
const enemies = [];
const sparks = [];
let lastTime = 0, toastTimer = 0, dead = false;

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize); resize();
function rand(min, max) { return min + Math.random() * (max - min); }
function norm(x, y) { const length = Math.hypot(x, y) || 1; return { x: x / length, y: y / length }; }
function clampPos(x, y, r) { return { x: Math.max(r + 28, Math.min(WORLD.w - r - 28, x)), y: Math.max(r + 28, Math.min(WORLD.h - r - 28, y)) }; }
function spawnEnemy(x, y, elite) { enemies.push({ x, y, r: elite ? 19 : 14, hp: elite ? 70 : 36, maxHp: elite ? 70 : 36, speed: elite ? 66 : rand(74, 94), damage: elite ? 17 : 10, elite, flash: 0, attackCd: rand(.1, .8), seed: rand(0, 10), dead: false }); }
for (let i = 0; i < 13; i++) {
  const angle = Math.random() * Math.PI * 2, distance = rand(250, 800);
  spawnEnemy(Math.max(90, Math.min(WORLD.w - 90, player.x + Math.cos(angle) * distance)), Math.max(90, Math.min(WORLD.h - 90, player.y + Math.sin(angle) * distance)), i === 8);
}
function notify(text) { toast.textContent = text; toast.classList.add("show"); toastTimer = 1.7; }
function neededXp() { return 70 + (player.level - 1) * 35; }
function updateHud() {
  hpFill.style.width = Math.max(0, player.hp / player.maxHp * 100) + "%";
  hpText.textContent = Math.ceil(player.hp) + " / " + player.maxHp;
  xpFill.style.width = (player.xp / neededXp() * 100) + "%";
  levelText.textContent = "LVL " + player.level;
  killCount.textContent = player.kills;
}
function levelUp() {
  while (player.xp >= neededXp()) {
    player.xp -= neededXp(); player.level++; player.maxHp += 8; player.hp = Math.min(player.maxHp, player.hp + 24); player.speed += 2;
    notify("ÚROVEŇ " + player.level + " — síla roste");
  }
}
function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) { const a = Math.PI * 2 * i / count; const speed = rand(50, 180); sparks.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .42, color }); }
}
function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true; player.kills++; player.xp += enemy.elite ? 35 : 18;
  burst(enemy.x, enemy.y, enemy.elite ? "#f0ae5d" : "#83d6b1", 9);
  if (Math.random() < .2) { player.hp = Math.min(player.maxHp, player.hp + 9); notify("Esence získána · +9 HP"); }
  levelUp();
}
function attack() {
  if (dead || player.attackCd > 0) return;
  player.attackCd = .34; player.swing = .17;
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - player.x, dy = enemy.y - player.y;
    if (Math.hypot(dx, dy) < 88 + enemy.r) {
      enemy.hp -= 28 + (player.level - 1) * 4; enemy.flash = .14;
      const n = norm(dx, dy); enemy.x += n.x * 15; enemy.y += n.y * 15;
      if (enemy.hp <= 0) killEnemy(enemy);
    }
  }
}
function pulse() {
  if (dead || player.pulseCd > 0) return;
  player.pulseCd = 5; let hit = 0;
  for (const enemy of enemies) {
    if (enemy.dead || Math.hypot(enemy.x - player.x, enemy.y - player.y) > 155 + enemy.r) continue;
    enemy.hp -= 38 + (player.level - 1) * 5; enemy.flash = .2; hit++;
    const n = norm(enemy.x - player.x, enemy.y - player.y); enemy.x += n.x * 36; enemy.y += n.y * 36;
    if (enemy.hp <= 0) killEnemy(enemy);
  }
  burst(player.x, player.y, "#eab568", 22);
  notify(hit ? "ÉTERICKÝ VÝBOJ · zásahy: " + hit : "ÉTERICKÝ VÝBOJ");
}
function dodge() {
  if (dead || player.dodgeCd > 0 || player.stamina < 28) return;
  const x = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
  const y = Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup"));
  player.facing = Math.hypot(x, y) ? norm(x, y) : player.facing;
  player.dodgeTime = .18; player.dodgeCd = .58; player.stamina -= 28; player.invuln = .24;
}
function keyDown(e) {
  const key = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) e.preventDefault();
  if (!keys.has(key)) {
    if (key === "j" || key === "enter") attack();
    if (key === " ") dodge();
    if (key === "e") pulse();
    if (key === "escape" && dead) location.reload();
  }
  keys.add(key);
}
function keyUp(e) { keys.delete(e.key.toLowerCase()); }
addEventListener("keydown", keyDown); addEventListener("keyup", keyUp);
addEventListener("blur", () => keys.clear());
canvas.addEventListener("pointerdown", e => { if (e.pointerType === "mouse" && e.button === 0) attack(); });
canvas.addEventListener("contextmenu", e => e.preventDefault());
document.querySelectorAll("[data-key]").forEach(button => {
  const key = button.dataset.key;
  const press = e => { e.preventDefault(); keys.add(key); button.classList.add("active"); };
  const release = e => { e.preventDefault(); keys.delete(key); button.classList.remove("active"); };
  button.addEventListener("pointerdown", press);
  ["pointerup", "pointercancel", "pointerleave"].forEach(type => button.addEventListener(type, release));
});
function bindAction(selector, action) {
  const button = document.querySelector(selector);
  button.addEventListener("pointerdown", e => { e.preventDefault(); action(); button.classList.add("active"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(type => button.addEventListener(type, () => button.classList.remove("active")));
}
bindAction("#touch-attack", attack); bindAction("#touch-dodge", dodge); bindAction("#touch-pulse", pulse);

function update(dt) {
  if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove("show");
  if (dead) return;
  player.attackCd = Math.max(0, player.attackCd - dt); player.dodgeCd = Math.max(0, player.dodgeCd - dt); player.pulseCd = Math.max(0, player.pulseCd - dt);
  player.dodgeTime = Math.max(0, player.dodgeTime - dt); player.invuln = Math.max(0, player.invuln - dt); player.swing = Math.max(0, player.swing - dt);
  player.stamina = Math.min(100, player.stamina + dt * 13);
  const mx = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
  const my = Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup"));
  if (mx || my) {
    const n = norm(mx, my); player.facing = n;
    const speed = player.dodgeTime > 0 ? 610 : player.speed;
    const p = clampPos(player.x + n.x * speed * dt, player.y + n.y * speed * dt, player.r); player.x = p.x; player.y = p.y;
  }
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    enemy.flash = Math.max(0, enemy.flash - dt); enemy.attackCd -= dt;
    const dx = player.x - enemy.x, dy = player.y - enemy.y, distance = Math.hypot(dx, dy) || 1;
    if (distance > player.r + enemy.r + 4) {
      const speed = enemy.flash > 0 ? 0 : enemy.speed;
      const p = clampPos(enemy.x + dx / distance * speed * dt, enemy.y + dy / distance * speed * dt, enemy.r); enemy.x = p.x; enemy.y = p.y;
    } else if (enemy.attackCd <= 0 && player.invuln <= 0) {
      player.hp -= enemy.damage; player.invuln = .38; enemy.attackCd = .82;
      const n = norm(player.x - enemy.x, player.y - enemy.y); player.x += n.x * 14; player.y += n.y * 14;
      if (player.hp <= 0) { player.hp = 0; dead = true; notify("Výprava skončila — stiskni Esc pro restart"); }
    }
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) sparks.splice(i, 1);
  }
  const targetX = Math.max(0, Math.min(WORLD.w - innerWidth, player.x - innerWidth / 2));
  const targetY = Math.max(0, Math.min(WORLD.h - innerHeight, player.y - innerHeight / 2));
  camera.x += (targetX - camera.x) * Math.min(1, dt * 6);
  camera.y += (targetY - camera.y) * Math.min(1, dt * 6);
  updateHud();
}
function drawFloor() {
  ctx.fillStyle = "#171a24"; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  const left = Math.floor(camera.x / WORLD.tile) * WORLD.tile, top = Math.floor(camera.y / WORLD.tile) * WORLD.tile;
  ctx.strokeStyle = "#ffffff08"; ctx.lineWidth = 1;
  for (let x = left; x < camera.x + innerWidth + WORLD.tile; x += WORLD.tile) {
    for (let y = top; y < camera.y + innerHeight + WORLD.tile; y += WORLD.tile) {
      ctx.fillStyle = Math.abs(Math.sin(x * .017 + y * .013)) > .85 ? "#1b202a" : "#181c26";
      ctx.fillRect(x, y, WORLD.tile - 1, WORLD.tile - 1); ctx.strokeRect(x + .5, y + .5, WORLD.tile - 1, WORLD.tile - 1);
    }
  }
  ctx.fillStyle = "#2f2930"; ctx.fillRect(0, 0, WORLD.w, 27); ctx.fillRect(0, WORLD.h - 27, WORLD.w, 27); ctx.fillRect(0, 0, 27, WORLD.h); ctx.fillRect(WORLD.w - 27, 0, 27, WORLD.h);
  ctx.strokeStyle = "#725239"; ctx.lineWidth = 2; ctx.strokeRect(28, 28, WORLD.w - 56, WORLD.h - 56);
}
function drawEnemy(e, time) {
  if (e.dead) return;
  ctx.save(); ctx.translate(e.x, e.y + Math.sin(time * .004 + e.seed) * 2);
  ctx.fillStyle = "#080a10a0"; ctx.beginPath(); ctx.ellipse(3, e.r * .72, e.r * 1.15, e.r * .55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.flash > 0 ? "#fff2dc" : e.elite ? "#b66b43" : "#478f80"; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = e.elite ? "#f0b35a" : "#a5ebc6"; ctx.beginPath(); ctx.arc(-e.r * .3, -e.r * .12, 2.1, 0, Math.PI * 2); ctx.arc(e.r * .3, -e.r * .12, 2.1, 0, Math.PI * 2); ctx.fill();
  if (e.hp < e.maxHp || e.elite) { ctx.fillStyle = "#10131b"; ctx.fillRect(-e.r, -e.r - 10, e.r * 2, 3); ctx.fillStyle = e.elite ? "#f0b35a" : "#e36c73"; ctx.fillRect(-e.r, -e.r - 10, e.r * 2 * Math.max(0, e.hp / e.maxHp), 3); }
  ctx.restore();
}
function drawPlayer(time) {
  ctx.save(); ctx.translate(player.x, player.y);
  ctx.fillStyle = "#070910a8"; ctx.beginPath(); ctx.ellipse(2, 12, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
  if (player.invuln > 0 && Math.floor(time / 60) % 2 === 0) ctx.globalAlpha = .5;
  ctx.fillStyle = "#c4c8d7"; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#596176"; ctx.beginPath(); ctx.arc(-2, -4, 10, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#f0b35d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(player.facing.x * 7, player.facing.y * 7); ctx.lineTo(player.facing.x * 24, player.facing.y * 24); ctx.stroke();
  if (player.dodgeTime > 0) { ctx.strokeStyle = "#90d8e6aa"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke(); }
  if (player.swing > 0) { ctx.strokeStyle = "#ffcf81"; ctx.lineWidth = 5; ctx.globalAlpha = player.swing / .17; ctx.beginPath(); ctx.arc(player.facing.x * 18, player.facing.y * 18, 52, -.85, .85); ctx.stroke(); }
  ctx.restore();
}
function render(time) {
  ctx.clearRect(0, 0, innerWidth, innerHeight); ctx.save(); ctx.translate(-camera.x, -camera.y); drawFloor();
  ctx.strokeStyle = "#a37af5a0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(190, 180, 32, 17, -.4, 0, Math.PI * 2); ctx.stroke();
  for (const e of enemies) drawEnemy(e, time);
  for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.life / .42); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1; drawPlayer(time); ctx.restore();
  if (dead) { ctx.fillStyle = "#070810b8"; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.textAlign = "center"; ctx.fillStyle = "#f2c27c"; ctx.font = "700 28px system-ui"; ctx.fillText("VÝPRAVA SKONČILA", innerWidth / 2, innerHeight / 2 - 8); ctx.fillStyle = "#c1c5d2"; ctx.font = "14px system-ui"; ctx.fillText("Stiskni Esc pro nový pokus", innerWidth / 2, innerHeight / 2 + 24); }
}
function frame(time) { const dt = Math.min(.033, (time - (lastTime || time)) / 1000); lastTime = time; update(dt); render(time); requestAnimationFrame(frame); }
updateHud(); notify("Ruiny se probouzejí"); requestAnimationFrame(frame);

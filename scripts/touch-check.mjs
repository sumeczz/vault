#!/usr/bin/env node
// Touch check: emulace iPhonu, CDP dotyky na packy, overeni pohybu/mireni.
// Pouziti: node scripts/touch-check.mjs
import { spawn } from "node:child_process";
import { chromium, devices } from "playwright";

const PORT = 8139;
const server = spawn(
  process.execPath,
  ["scripts/with-app-env.mjs", "vite", "preview", "--port", String(PORT), "--strictPort"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let out = "";
server.stdout.on("data", (d) => (out += d));
server.stderr.on("data", (d) => (out += d));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("preview server nenabehl: " + out.slice(-2000));
}

let failed = false;
try {
  await waitForServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 14"],
    permissions: [],
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  await page.goto(`http://127.0.0.1:${PORT}/?qa`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
  console.log(`pointer: coarse = ${coarse}`);
  await page.getByRole("button", { name: /Nový běh/ }).tap();
  await page.waitForTimeout(800);
  // Kolo štěstí: popup po nové hře — přeskočit a jít do boje (tapem)
  await page.getByRole("button", { name: /Přeskočit/ }).tap();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Do boje!/ }).tap();
  await page.waitForTimeout(1500);

  const pos = () => page.evaluate(() => ({ x: window.__controlsTest?.getX?.() ?? -1, y: window.__controlsTest?.getY?.() ?? -1 }));
  const yaw = () => page.evaluate(() => window.__controlsTest?.getYaw?.() ?? 0);
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });

  const before = await pos();
  console.log(`hrac pred: ${before.x.toFixed(0)},${before.y.toFixed(0)}`);
  if (before.x < 0) {
    console.log("FAIL chybi __controlsTest (nebezi hra?)");
    failed = true;
  }

  // Leva packa: dotyk v (100,600), tah doprava na (170,600), drzet
  await touch("touchStart", [{ x: 100, y: 600, id: 1 }]);
  for (let i = 1; i <= 6; i++) {
    await touch("touchMove", [{ x: 100 + i * 12, y: 600, id: 1 }]);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
  const moved = await pos();
  const dx = moved.x - before.x;
  console.log(`hrac po packy: ${moved.x.toFixed(0)},${moved.y.toFixed(0)} (dx=${dx.toFixed(0)})`);
  if (dx < 40) {
    console.log("FAIL leva packa nehybe hracem doprava");
    failed = true;
  } else {
    console.log("OK   leva packa hybe hracem");
  }
  await touch("touchEnd", [{ x: 172, y: 600, id: 1 }]);
  // Po zvednuti nesmi hrac driftovat (packa se uvolnila)
  await page.waitForTimeout(300);
  const rest1 = await pos();
  await page.waitForTimeout(600);
  const rest2 = await pos();
  const drift = Math.hypot(rest2.x - rest1.x, rest2.y - rest1.y);
  console.log(`drift po uvolneni: ${drift.toFixed(0)}px`);
  if (drift > 30) {
    console.log("FAIL packa zustala viset po touchEnd");
    failed = true;
  } else {
    console.log("OK   packa se uvolnila");
  }

  // Prava packa: dotyk v (300,600), tah — overi zmenu mireni
  const yawBefore = await yaw();
  await touch("touchStart", [{ x: 300, y: 600, id: 2 }]);
  for (let i = 1; i <= 5; i++) {
    await touch("touchMove", [{ x: 300, y: 600 - i * 15, id: 2 }]);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(600);
  const yawAfter = await yaw();
  console.log(`mireni pred/po: ${yawBefore.toFixed(2)} / ${yawAfter.toFixed(2)}`);
  if (Math.abs(yawAfter - yawBefore) < 0.2) {
    console.log("FAIL prava packa nemeni mireni");
    failed = true;
  } else {
    console.log("OK   prava packa meni mireni (a strili)");
  }
  await touch("touchEnd", [{ x: 300, y: 525, id: 2 }]);

  // Multitouch: leva packa taha doleva (hrac je u prave zdi) + prava packa soucasne
  const mBefore = await pos();
  await touch("touchStart", [
    { x: 160, y: 600, id: 3 },
    { x: 300, y: 600, id: 4 },
  ]);
  for (let i = 1; i <= 5; i++) {
    await touch("touchMove", [
      { x: 160 - i * 12, y: 600, id: 3 },
      { x: 300 + i * 10, y: 600, id: 4 },
    ]);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  const mAfter = await pos();
  await touch("touchEnd", [
    { x: 100, y: 600, id: 3 },
    { x: 350, y: 600, id: 4 },
  ]);
  console.log(`multitouch dx=${(mAfter.x - mBefore.x).toFixed(0)}`);
  if (mAfter.x - mBefore.x > -40) {
    console.log("FAIL multitouch nehybe hracem doleva");
    failed = true;
  } else {
    console.log("OK   multitouch funguje (pohyb + mireni zaroven)");
  }

  // Tlacitko DASH tap
  await page.screenshot({ path: "screenshots/touch-iphone.png" });
  // Dash je vpravo cca (350, 640) — tap pres touchscreen
  await page.touchscreen.tap(350, 640);
  await page.waitForTimeout(500);

  await browser.close();
  const realErrors = errors.filter((e) => !e.includes("favicon"));
  if (realErrors.length > 0) {
    console.log("CONSOLE ERRORS:");
    for (const e of realErrors) console.log("  " + e);
    failed = true;
  } else {
    console.log("console: bez chyb");
  }
} catch (e) {
  console.log("FAIL: " + (e.message ?? e));
  failed = true;
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);

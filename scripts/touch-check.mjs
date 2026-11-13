#!/usr/bin/env node
// Touch regression: direction of both sticks and fixed control sizes on multiple viewports.
import { spawn } from "node:child_process";
import { chromium, devices } from "playwright";

const PORT = 8147;
const server = spawn(
  process.execPath,
  ["scripts/with-app-env.mjs", "vite", "dev", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let serverOutput = "";
server.stdout.on("data", (data) => (serverOutput += data));
server.stderr.on("data", (data) => (serverOutput += data));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Vite server did not start: " + serverOutput.slice(-2000));
}

let failed = false;
let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 14"], permissions: [] });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("vaultbreak-profile-v1", JSON.stringify({
      nickname: "QA",
      pin: "0000",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      deviceId: "touch-qa-device",
    }));
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
  });

  await page.goto(`http://127.0.0.1:${PORT}/?qa`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: /Zahájit expedici/ }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /Zahájit expedici/ }).tap();
  await page.getByRole("button", { name: /Přeskočit/ }).tap();
  await page.getByRole("button", { name: /Do boje!/ }).tap();
  await page.waitForTimeout(800);
  const tutorialSkip = page.getByRole("button", { name: /Přeskočit/ });
  if (await tutorialSkip.count()) await tutorialSkip.last().tap();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__controlsTest?.clearRoom?.());

  const position = () => page.evaluate(() => ({
    x: window.__controlsTest?.getX?.() ?? -1,
    y: window.__controlsTest?.getY?.() ?? -1,
  }));
  const yaw = () => page.evaluate(() => window.__controlsTest?.getYaw?.() ?? 0);
  const getStickCenter = async (label) => page.evaluate((ariaLabel) => {
    const zone = document.querySelector(`[aria-label="${ariaLabel}"]`);
    const back = zone?.querySelector(".joystick .back");
    if (!back) return null;
    const rect = back.getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2), width: rect.width, height: rect.height };
  }, label);

  const moveStick = await getStickCenter("Joystick pohybu");
  if (!moveStick) throw new Error("Movement joystick was not mounted");
  console.log("movement stick:", moveStick);
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });

  const beforeUp = await position();
  await touch("touchStart", [{ x: moveStick.x, y: moveStick.y, id: 1 }]);
  for (let i = 1; i <= 6; i++) {
    await touch("touchMove", [{ x: moveStick.x, y: moveStick.y - i * 15, id: 1 }]);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(350);
  const afterUp = await position();
  await touch("touchEnd", [{ x: moveStick.x, y: moveStick.y - 90, id: 1 }]);
  const upDelta = afterUp.y - beforeUp.y;
  console.log(`movement up ΔY=${upDelta.toFixed(0)}`);
  if (upDelta >= -30) {
    console.log("FAIL: movement joystick up did not move the character up");
    failed = true;
  } else console.log("OK: movement joystick up");

  const beforeDown = await position();
  await touch("touchStart", [{ x: moveStick.x, y: moveStick.y, id: 2 }]);
  for (let i = 1; i <= 6; i++) {
    await touch("touchMove", [{ x: moveStick.x, y: moveStick.y + i * 15, id: 2 }]);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(350);
  const afterDown = await position();
  await touch("touchEnd", [{ x: moveStick.x, y: moveStick.y + 90, id: 2 }]);
  const downDelta = afterDown.y - beforeDown.y;
  console.log(`movement down ΔY=${downDelta.toFixed(0)}`);
  if (downDelta <= 30) {
    console.log("FAIL: movement joystick down did not move the character down");
    failed = true;
  } else console.log("OK: movement joystick down");

  await page.getByRole("button", { name: "MANUAL" }).tap();
  await page.waitForTimeout(350);
  const aimStick = await getStickCenter("Joystick míření");
  if (!aimStick) throw new Error("Manual aim joystick was not mounted");
  console.log("aim stick:", aimStick);
  await touch("touchStart", [{ x: aimStick.x, y: aimStick.y, id: 3 }]);
  for (let i = 1; i <= 6; i++) {
    await touch("touchMove", [{ x: aimStick.x, y: aimStick.y - i * 15, id: 3 }]);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(350);
  const aimUp = await yaw();
  await touch("touchEnd", [{ x: aimStick.x, y: aimStick.y - 90, id: 3 }]);
  console.log(`manual aim up = ${aimUp.toFixed(2)} rad`);
  if (Math.abs(aimUp + Math.PI / 2) > 0.45) {
    console.log("FAIL: aim joystick up did not aim up");
    failed = true;
  } else console.log("OK: manual aim joystick up");

  const measureControls = () => page.evaluate(() => {
    const size = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };
    const zone = (label) => document.querySelector(`[aria-label="${label}"] .joystick .back`);
    const utilityLabels = ["Postava", "Schopnost", "Dash", "Výměna zbraně"];
    return {
      movement: size(zone("Joystick pohybu")),
      aim: size(zone("Joystick míření")),
      fire: size(document.querySelector('button[aria-label="Držet pro střelbu"]')),
      utility: utilityLabels.map((label) => size(document.querySelector(`button[aria-label="${label}"]`))),
    };
  });
  const expected = { movement: 126, aim: 116, fire: 76, utility: 48 };
  const checkSizes = (metrics) =>
    metrics.movement?.width === expected.movement && metrics.movement?.height === expected.movement
    && metrics.aim?.width === expected.aim && metrics.aim?.height === expected.aim
    && metrics.fire?.width === expected.fire && metrics.fire?.height === expected.fire
    && metrics.utility.length === 4
    && metrics.utility.every((item) => item?.width === expected.utility && item?.height === expected.utility);

  const checkNoOverlap = () => page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
    const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const movement = rect('[aria-label="Joystick pohybu"] .joystick .back');
    const aim = rect('[aria-label="Joystick míření"] .joystick .back');
    const fire = rect('button[aria-label="Držet pro střelbu"]');
    return { movementAim: overlaps(movement, aim), aimFire: overlaps(aim, fire) };
  });

  const initialMetrics = await measureControls();
  console.log("fixed control sizes:", JSON.stringify(initialMetrics));
  if (!checkSizes(initialMetrics)) {
    console.log("FAIL: touch controls do not match their fixed CSS-pixel sizes");
    failed = true;
  } else console.log("OK: fixed control sizes");
  const initialOverlap = await checkNoOverlap();
  if (initialOverlap.movementAim || initialOverlap.aimFire) {
    console.log("FAIL: touch control hit areas overlap", initialOverlap);
    failed = true;
  }

  const originalViewport = page.viewportSize();
  for (const viewport of [{ width: 320, height: 568 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    const metrics = await measureControls();
    const fixed = checkSizes(metrics);
    const overlap = await checkNoOverlap();
    console.log(`viewport ${viewport.width}x${viewport.height}: ${fixed && !overlap.movementAim && !overlap.aimFire ? "OK fixed layout" : "FAIL layout"}`);
    if (!fixed || overlap.movementAim || overlap.aimFire) failed = true;
  }
  if (originalViewport) await page.setViewportSize(originalViewport);

  if (errors.length) {
    console.log("Browser errors:", errors.join(" | "));
    failed = true;
  } else console.log("Browser console: no errors");

  await browser.close();
} catch (error) {
  console.log("FAIL: " + (error instanceof Error ? error.message : String(error)));
  failed = true;
  await browser?.close();
} finally {
  if (process.platform === "win32" && server.pid) {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
      killer.on("error", resolve);
      killer.on("exit", resolve);
    });
  } else {
    server.kill();
  }
}
process.exit(failed ? 1 : 0);

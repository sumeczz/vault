#!/usr/bin/env node
// Jednorazovy render-check: spusti vite preview z buildu, over DOM + console errors, skonc.
// Pouziti: node scripts/render-check.mjs
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 8137;
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
  const errors = [];
  for (const vp of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: vp });
    page.on("pageerror", (e) => errors.push(`pageerror@${vp.width}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console@${vp.width}: ${m.text().slice(0, 200)}`);
    });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2500);
    const text = (await page.evaluate(() => document.body.innerText)).slice(0, 400);
    const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);
    console.log(`--- viewport ${vp.width}x${vp.height} ---`);
    console.log(`canvas: ${canvasCount}`);
    console.log(`text: ${JSON.stringify(text.slice(0, 200))}`);
    if (!text.includes("VAULT")) {
      console.log("FAIL: chybi ocekavany text VAULT v menu");
      failed = true;
    }
  }
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
  console.log("FAIL: " + e.message);
  failed = true;
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);

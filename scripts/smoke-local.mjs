#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const shotDir = join(root, "screenshots");
mkdirSync(shotDir, { recursive: true });

const url = process.argv[2] || "http://127.0.0.1:8080/";
const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const results = {};

for (const vp of viewports) {
  const errors = { consoleErrors: [], pageErrors: [] };
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.pageErrors.push(String(err?.message || err)));

  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1500);

  const title = await page.title();
  const hasCanvas = (await page.locator("canvas").count()) > 0;
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  const shotPath = join(shotDir, `moba-${vp.name}.png`);
  await page.screenshot({ path: shotPath });

  results[vp.name] = {
    status: resp?.status() ?? 0,
    title,
    hasCanvas,
    bodyTextLen: bodyText.trim().length,
    horizontalOverflow: overflow,
    consoleErrors: errors.consoleErrors,
    pageErrors: errors.pageErrors,
    screenshot: shotPath,
  };
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ url, viewports: results }, null, 2));

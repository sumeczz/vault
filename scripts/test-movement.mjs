#!/usr/bin/env node
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:8080/moba", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);

const getPlayerPos = () =>
  page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return null;
    return { x: canvas.width, y: canvas.height };
  });

const pos1 = await getPlayerPos();
console.log("Before move:", pos1);

await page.keyboard.down("KeyD");
await page.waitForTimeout(500);
await page.keyboard.up("KeyD");

const pos2 = await getPlayerPos();
console.log("After D (right):", pos2);

await page.keyboard.down("KeyW");
await page.waitForTimeout(500);
await page.keyboard.up("KeyW");

const pos3 = await getPlayerPos();
console.log("After W (up):", pos3);

await browser.close();

const movedRight = pos2 && pos1 && pos2.x > pos1.x;
const movedUp = pos3 && pos2 && pos3.y < pos2.y;
console.log("Movement works:", movedRight && movedUp);
process.exit(movedRight && movedUp ? 0 : 1);

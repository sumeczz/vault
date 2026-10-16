#!/usr/bin/env node
// Overi rozehranou hru: menu -> Novy beh -> HUD + stats panel, bez console erroru.
// Pouziti: node scripts/gameplay-check.mjs
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 8138;
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  await page.goto(`http://127.0.0.1:${PORT}/?qa`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const menuText = await page.evaluate(() => document.body.innerText);
  if (!menuText.includes("Denní výzva")) {
    console.log("FAIL menu neukazuje Denni vyzvu");
    failed = true;
  } else {
    console.log("OK   menu ma Denni vyzvu");
  }
  if (!menuText.includes("Týdenní výzva")) {
    console.log("FAIL menu neukazuje Tydenni vyzvu");
    failed = true;
  } else {
    console.log("OK   menu ma Tydenni vyzvu");
  }
  if (!menuText.includes("KOLO ŠTĚSTÍ")) {
    console.log("FAIL menu neukazuje Kolo stesti");
    failed = true;
  } else {
    console.log("OK   menu ma Kolo stesti");
  }
  await page.screenshot({ path: "screenshots/menu.png" });
  // Admin: zalozka Affixy existuje a jde otevrit
  await page.getByRole("button", { name: /Panel správce/ }).click();
  await page.waitForTimeout(800);
  let adminText = await page.evaluate(() => document.body.innerText);
  if (!adminText.includes("Affixy")) {
    console.log("FAIL admin nema zalozku Affixy");
    failed = true;
  } else {
    console.log("OK   admin ma zalozku Affixy");
  }
  await page.getByRole("tab", { name: "Affixy" }).click();
  await page.waitForTimeout(500);
  // Rozklikni prvni affix (details jsou defaultne sbalene)
  await page.locator("details summary").first().click();
  await page.waitForTimeout(400);
  adminText = await page.evaluate(() => document.body.innerText);
  for (const needle of ["Prefix", "Unikátní", "Váha výskytu"]) {
    const ok = adminText.includes(needle);
    console.log(`${ok ? "OK  " : "FAIL"} editor affixu: "${needle}"`);
    if (!ok) failed = true;
  }
  await page.screenshot({ path: "screenshots/admin-affixes.png" });
  await page.getByRole("button", { name: /Zpět do menu/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Nový běh/ }).click();
  await page.waitForTimeout(800);
  // Kolo štěstí: popup s animací po kliknutí na novou hru
  let wheelText = await page.evaluate(() => document.body.innerText);
  if (!wheelText.includes("Losování mutátorů")) {
    console.log("FAIL po Novem behu se neotevrelo kolo stesti");
    failed = true;
  } else {
    console.log("OK   kolo stesti se otevrelo po Novem behu");
  }
  await page.screenshot({ path: "screenshots/gameplay-wheel.png" });
  // Animaci preskocime, overime vysledek losu a pokracujeme do boje
  await page.getByRole("button", { name: /Přeskočit/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Do boje!/ }).click();
  await page.waitForTimeout(800);
  // Hraj: drz W+A chvili, pak strelba klikem do stredu
  await page.keyboard.down("d");
  await page.waitForTimeout(1500);
  await page.keyboard.up("d");
  await page.mouse.move(900, 300);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await page.mouse.up();
  const text = await page.evaluate(() => document.body.innerText);
  console.log("--- HUD text ---");
  console.log(JSON.stringify(text.slice(0, 600)));
  for (const needle of ["SEKTOR 1", "LVL 1", "OBTÍŽNOST", "DPS", "NEPŘÁTELÉ", "MUTÁTORY"]) {
    const ok = text.includes(needle);
    console.log(`${ok ? "OK  " : "FAIL"} obsahuje "${needle}"`);
    if (!ok) failed = true;
  }
  mkdirSync("screenshots", { recursive: true });
  await page.screenshot({ path: "screenshots/gameplay-stats.png" });
  console.log("screenshot: screenshots/gameplay-stats.png");
  // Toggle panelu klavesou T (podrzet, aby to stihl herni snimek)
  await page.keyboard.down("t");
  await page.waitForTimeout(300);
  await page.keyboard.up("t");
  await page.waitForTimeout(400);
  const text2 = await page.evaluate(() => document.body.innerText);
  const toggled = !text2.includes("OBTÍŽNOST");
  console.log(`${toggled ? "OK  " : "FAIL"} toggle T skryje panel`);
  if (!toggled) failed = true;
  await page.keyboard.down("t");
  await page.waitForTimeout(300);
  await page.keyboard.up("t");
  await page.waitForTimeout(400);
  // Keyboard audit: Escape pauzne a znovu pusti hru (podrzet, aby to stihl herni snimek)
  await page.keyboard.down("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.up("Escape");
  await page.waitForTimeout(500);
  let pausedText = await page.evaluate(() => document.body.innerText);
  const pausedOk = pausedText.includes("Pauza");
  console.log(`${pausedOk ? "OK  " : "FAIL"} Escape otevre pauzu`);
  if (!pausedOk) failed = true;
  await page.keyboard.down("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.up("Escape");
  await page.waitForTimeout(500);
  pausedText = await page.evaluate(() => document.body.innerText);
  const resumedOk = !pausedText.includes("Pokračovat");
  console.log(`${resumedOk ? "OK  " : "FAIL"} Escape pusti hru z pauzy`);
  if (!resumedOk) failed = true;
  // Loot flow: chvili strilej (boj je videt), pak mistnost docisti QA hackem
  await page.mouse.move(900, 300);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await page.mouse.up();
  await page.evaluate(() => window.__controlsTest?.clearRoom?.());
  let lootSeen = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const t = await page.evaluate(() => document.body.innerText);
    if (t.includes("Vyber odměnu")) {
      lootSeen = true;
      console.log("OK   loot obrazovka po docisteni mistnosti");
      break;
    }
    if (t.includes("Běh skončil")) {
      console.log("FAIL hrac zemrel pred lootem");
      failed = true;
      break;
    }
  }
  if (!lootSeen) {
    console.log("FAIL loot obrazovka se neobjevila");
    failed = true;
  } else {
    const lootText = await page.evaluate(() => document.body.innerText);
    // Cerstvy profil: srot zamceny do LVL 2 (progression-rules §2) — overuje gating
    const locked = lootText.includes("Šrot se odemkne na LVL 2");
    console.log(`${locked ? "OK  " : "FAIL"} srot zamceny do LVL 2 u noveho profilu`);
    if (!locked) failed = true;
    // Odblokuj srot primo ve hre (simulace profilu LVL 2+) a over plny flow
    await page.evaluate(() => {
      try {
        localStorage.setItem(
          "vaultbreak-v1",
          JSON.stringify({ version: 2, bestRooms: 4, bestKills: 0, bestTime: 0, runs: 1, lastSeed: "", bestLevel: 4, maxSector: 1 }),
        );
      } catch {}
    });
    await page.reload({ waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1200);
    const menuText = await page.evaluate(() => document.body.innerText);
    const unlockShown = menuText.includes("LVL") && menuText.includes("Aréna");
    console.log(`${unlockShown ? "OK  " : "FAIL"} menu ukazuje dalsi odemknuti`);
    if (!unlockShown) failed = true;
    // Novy beh s odemcenym srotem: loot -> Rozebrat -> zpet ve hre se srotem
    await page.getByRole("button", { name: /Start od sektoru 1|Nový běh/ }).click();
    await page.waitForTimeout(600);
    // I tady nejdřív kolo štěstí
    await page.getByRole("button", { name: /Přeskočit/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /Do boje!/ }).click();
    await page.waitForTimeout(1500);
    await page.mouse.move(900, 300);
    await page.mouse.down();
    await page.waitForTimeout(2000);
    await page.mouse.up();
    await page.evaluate(() => window.__controlsTest?.clearRoom?.());
    let loot2 = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      if ((await page.evaluate(() => document.body.innerText)).includes("Vyber odměnu")) {
        loot2 = true;
        break;
      }
    }
    if (!loot2) {
      console.log("FAIL druhy loot se neobjevil");
      failed = true;
    } else {
      await page.getByRole("button", { name: /Rozebrat vše na šrot/ }).click();
      await page.waitForTimeout(800);
      const back = await page.evaluate(() => document.body.innerText);
      const playing = back.includes("SEKTOR 1") && !back.includes("Vyber odměnu");
      console.log(`${playing ? "OK  " : "FAIL"} po srotu zpet ve hre`);
      if (!playing) failed = true;
      const scrapShown = back.includes("šrotu") && !back.includes("0 šrotu");
      console.log(`${scrapShown ? "OK  " : "FAIL"} srot pribyl ve stats panelu`);
      if (!scrapShown) failed = true;
    }
    await page.screenshot({ path: "screenshots/gameplay-loot.png" });
  }

  // Full-loop: skok na bosse -> boj -> loot -> BAZE-hub -> portal do sektoru 2
  await page.evaluate(() => window.__controlsTest?.toBoss?.());
  await page.waitForTimeout(800);
  let bossSeen = (await page.evaluate(() => document.body.innerText)).includes("BOSS");
  console.log(`${bossSeen ? "OK  " : "FAIL"} skok na bosse (HUD ukazuje BOSS)`);
  if (!bossSeen) failed = true;
  await page.screenshot({ path: "screenshots/gameplay-boss.png" });
  let bossLoot = false;
  for (let i = 0; i < 7; i++) {
    await page.evaluate(() => window.__controlsTest?.clearRoom?.());
    await page.waitForTimeout(2500);
    const t = await page.evaluate(() => document.body.innerText);
    if (t.includes("Vyber odměnu")) {
      bossLoot = true;
      break;
    }
    if (t.includes("Běh skončil")) {
      console.log("FAIL hrac zemrel u bosse");
      failed = true;
      break;
    }
  }
  console.log(`${bossLoot ? "OK  " : "FAIL"} boss loot po vlnach`);
  if (!bossLoot) failed = true;
  else {
    // Prvni loot karta v dialogu (zbran jde do prazdneho slotu, jinak prima volba)
    await page.locator("div.vb-dialog div.grid button").first().click();
    await page.waitForTimeout(800);
    let t = await page.evaluate(() => document.body.innerText);
    if (!t.includes("Báze")) {
      // Karta mohla chtit vyber slotu (druha zbran) — klikni prvni nabidku znovu pres text
      console.log("INFO prvni klik nepostoupil, zkousim loot karty");
      failed = true;
    } else {
      console.log("OK   po bossovi je Baze-hub");
      // Profil ma LVL 4: kovarna (3) i obchod (4) odemcene, arena (5) zamcena
      const openChecks = [
        ["odemkne se na LVL 3", false],
        ["Plná oprava", true],
        ["odemkne se na LVL 5", true],
      ];
      for (const [text, shouldContain] of openChecks) {
        const has = t.includes(text);
        const ok = has === shouldContain;
        console.log(`${ok ? "OK  " : "FAIL"} ${shouldContain ? "viditelne" : "nezamcene"}: "${text}"`);
        if (!ok) failed = true;
      }
      await page.screenshot({ path: "screenshots/gameplay-base.png" });
      await page.getByRole("button", { name: /Laboratoř/ }).click();
      await page.waitForTimeout(800);
      // Pred sektorem 2 se toci nove kolo
      wheelText = await page.evaluate(() => document.body.innerText);
      if (!wheelText.includes("Losování mutátorů")) {
        console.log("FAIL pred sektorem 2 se netoci kolo");
        failed = true;
      } else {
        console.log("OK   pred sektorem 2 se toci nove kolo");
      }
      await page.getByRole("button", { name: /Přeskočit/ }).click();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /Do sektoru/ }).click();
      await page.waitForTimeout(1000);
      t = await page.evaluate(() => document.body.innerText);
      const s2 = t.includes("SEKTOR 2");
      console.log(`${s2 ? "OK  " : "FAIL"} portal do sektoru 2`);
      if (!s2) failed = true;
      if (s2) {
        // Druhe kolo v sektoru 2: boss -> loot -> baze -> bank -> win -> karta ke stazeni
        await page.evaluate(() => window.__controlsTest?.toBoss?.());
        await page.waitForTimeout(800);
        let loot3 = false;
        for (let i = 0; i < 7; i++) {
          await page.evaluate(() => window.__controlsTest?.clearRoom?.());
          await page.waitForTimeout(2500);
          const u = await page.evaluate(() => document.body.innerText);
          if (u.includes("Vyber odměnu")) {
            loot3 = true;
            break;
          }
          if (u.includes("Běh skončil")) break;
        }
        if (loot3) {
          await page.locator("div.vb-dialog div.grid button").first().click();
          await page.waitForTimeout(800);
          let v = await page.evaluate(() => document.body.innerText);
          if (v.includes("Vyber odměnu") && !v.includes("Báze")) {
            // Zbraň do obsazeného slotu -> vyber slotu
            await page.getByRole("button", { name: /SLOT 1/ }).click();
            await page.waitForTimeout(800);
            v = await page.evaluate(() => document.body.innerText);
          }
          if (v.includes("Báze")) {
            await page.getByRole("button", { name: /Ukončit a uložit/ }).click();
            await page.waitForTimeout(800);
            v = await page.evaluate(() => document.body.innerText);
            if (v.includes("Trezor prolomen")) {
              console.log("OK   bank po bossovi v sektoru 2");
              const hasCard = v.includes("Stáhnout kartu");
              console.log(`${hasCard ? "OK  " : "FAIL"} win obrazovka nabizi kartu`);
              if (!hasCard) failed = true;
              else {
                const [download] = await Promise.all([
                  page.waitForEvent("download", { timeout: 10000 }),
                  page.getByRole("button", { name: /Stáhnout kartu/ }).click(),
                ]);
                const name = download.suggestedFilename();
                const okName = /\.png$/.test(name);
                console.log(`${okName ? "OK  " : "FAIL"} karta se stahla (${name})`);
                if (!okName) failed = true;
              }
            } else {
              console.log("FAIL po banku neni win obrazovka");
              failed = true;
            }
          } else {
            console.log("FAIL po druhem bossovi neni baze");
            failed = true;
          }
        } else {
          console.log("FAIL loot v sektoru 2 se neobjevil");
          failed = true;
        }
      }
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

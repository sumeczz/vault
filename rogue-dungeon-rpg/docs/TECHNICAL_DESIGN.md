# Technical Design — Abyssbound

## Základ
- Jazyk: JavaScript (ES modules).
- Build a vývojový server: Vite.
- Renderer: HTML Canvas 2D; bez Reactu a CSS frameworku.
- Cíl prototypu: desktopové prohlížeče a dotykové displeje.
- Spuštění: npm install, poté npm run dev. Produkční kontrola: npm run build.

## Struktura
- index.html — herní stránka a HUD.
- package.json — skripty a vývojová závislost.
- src/main.js — herní smyčka, vstupy, souboj, AI a vykreslení.
- src/style.css — HUD, responzivní rozložení a dotykové ovládání.
- docs/ — herní návrh, technický návrh, plán a reference.

## Herní smyčka
1. requestAnimationFrame řídí snímky.
2. Delta time je omezen na 33 ms.
3. update aktualizuje vstup, pohyb, cooldowny, nepřátele, poškození, XP a kameru.
4. render vykreslí svět, entity a efekty ve světových souřadnicích posunutých kamerou.
5. HUD se obnovuje z aktuálního stavu hráče.

## Kamera a souřadnice
Svět používá pixelové souřadnice. Entity zůstávají ve světových souřadnicích; při vykreslení se odečte pozice kamery. Kamera se interpoluje a omezuje podle velikosti světa. Canvas se přizpůsobuje devicePixelRatio (max. 2), zatímco herní souřadnice používají CSS pixely.

## Vstupy
Klávesy jsou uloženy v sadě aktivních vstupů. Útok, úskok a výboj jsou samostatné funkce sdílené klávesnicí a dotykovými tlačítky. Další fáze přidá konfigurovatelný InputMap a automatické uvolnění vstupu při ztrátě fokusu.

## Doporučené budoucí moduly
- World / RoomGraph: graf místností, dveře, spawn pointy a kontrola průchodnosti.
- CombatSystem: hitboxy, hurtboxy, stavy útoků, stagger a elementární interakce.
- Entity archetypy: hráč, nepřítel, projektil a drop.
- ItemDatabase: data výbavy oddělená od logiky.
- RunManager: stav výpravy, odměny, extrakce a smrt.
- SaveService: verzované lokální ukládání.
- AudioBus: hlasitost, zvukové události a pauza.

## Technická pravidla
- Nedávat tajné klíče do klientského kódu; pro MVP nejsou potřeba.
- Herní hodnoty postupně přesunout do konfiguračních objektů.
- Generátor map bude používat seed pro reprodukovatelnost.
- Každá nová mechanika musí mít akceptační scénář.

# Engineering standards — VAULTBREAK

Status: závazná pravidla pro další vývoj  
Aktualizováno: 14. 11. 2026

Tento dokument je technická smlouva projektu. Platí pro všechny nové změny i refaktoring. Pokud implementace, testy a dokumentace nesouhlasí, funkce není dokončená.

## 1. Vlastnictví systémů a hranice

| Vrstva | Jediný vlastník | Smí dělat | Nesmí dělat |
|---|---|---|---|
| Herní pravidla a stav běhu | `src/game/sim.ts` | simulace, entity, kolize, ekonomika běhu, snapshoty | kreslit DOM nebo vlastnit Canvas |
| Vstup | `src/game/input.ts`, `touch-controls.ts` | převod zařízení na normalizované Actions | přímo měnit simulaci mimo předání Actions |
| Herní vykreslení | `src/game/render.ts` | číst stav Run a vykreslit svět | měnit Run, RNG, HP, loot či fyziku |
| Životní cyklus obrazovky | `src/game/GameView.tsx` | vytvořit/zrušit Run, RAF, resize, HUD a obrazovky | implementovat bojová pravidla |
| Trvalá data | `save.ts`, `characters.ts`, `auth.ts` | validace, migrace, serializace a persistování | ukládat transientní stav simulace |
| Herní obsah | příslušné katalogy + `content-settings.ts` | definice a validace obsahu | skrytě přepisovat pravidla simulace |
| Dokumentace | `docs/` | vysvětlovat skutečný stav a smlouvy | označit neověřenou funkci jako hotovou |

Závislosti tečou jedním směrem: UI → vstup/snapshot → simulace; renderer pouze čte simulaci. Simulace nesmí importovat UI ani renderer.

## 2. Neměnná pravidla změn

1. Jedna odpovědnost na modul. Nová funkce musí mít vlastníka a jasný vstup/výstup.
2. Žádná skrytá globální mutace. Sdílený stav musí být explicitní a jeho životní cyklus popsaný.
3. Žádné vedlejší účinky v rendereru. Stejný stav + stejné rozměry = stejný obraz; náhodnost pro vizuál musí být deterministická nebo předpočítaná mimo render pass.
4. Žádný přímý zápis do Canvas rozměrů mimo centrální resize funkci. Změna `canvas.width/height` resetuje kontext včetně transformací a stylů.
5. Každý render frame začíná definovaným stavem kontextu a končí vyváženým `save/restore`. Výjimka v kreslení nesmí zastavit další snímky; RAF musí být naplánován i po zachycené chybě. Při `contextlost` se pozastaví simulace a při `contextrestored` se obnoví kontext a resize transformace.
6. Každý vstup má normalizovaný kontrakt. Klávesnice, myš, gamepad a dotyk nesmí vytvářet paralelní herní logiku.
7. Čas simulace a čas UI jsou oddělené. Delta time musí být omezené po návratu z pozadí; pauza nesmí posouvat simulaci.
8. Náhodnost herních výsledků používá seedované RNG. `Math.random()` se nesmí používat pro loot, boj, spawn ani výsledek testovatelný hráčem.
9. Každý persistovaný formát má verzi, normalizaci, bezpečný fallback a migrační test.
10. Každá změna ceny, prahu, odměny, unlocku nebo statů se promítne do implementace, pravidel, UI a testů v jednom změnovém celku.
11. Žádný nový renderer, engine ani globální subsystém se nesmí zapojit do produkční smyčky bez izolovaného prototypu, fallbacku, měření a QA vrstev.
12. Neprovádět široké automatické přepisy ani formátování nesouvisejících souborů v rámci opravy.

## 3. Renderovací smlouva

- `renderRun(ctx, run, width, height)` je čistý prezentační průchod: čte `Run`, nemění jej.
- Top-down kamera je vlastněna modulem `src/game/camera.ts`; follow používá frame-rate independent exponential damping, kamerový střed se clampuje podle rozměrů viewportu/zoomu a místnostního bounds. Teleport hráče při změně místnosti/sektoru musí atomicky snapnout kameru.
- Camera shake je čistě kosmetický signál a nesmí spotřebovávat combat RNG ani ovlivnit loot/spawn/boj.
- Veškeré transformace se skládají v jednom jasně vymezeném bloku; world-space a screen-space prvky jsou oddělené.
- Vstupní rozměry, DPR, zoom, kamera, pozice hráče a entity se před vykreslením kontrolují na konečnost a rozumné meze.
- Canvas kontext se získá jednou na instanci. Události `contextlost` a `contextrestored` se sledují; ztráta kontextu nesmí být tichá.
- RAF smyčka musí mít watchdog diagnostiku: čas posledního frame, délka frame, stav obrazovky, rozměry canvasu, kamera, zoom a počet aktivních entit/částic.
- Chyba jednoho frame se zaznamená a smyčka se bezpečně obnoví; opakované chyby přejdou do viditelného diagnostického stavu, nikoli do černé obrazovky bez vysvětlení.
- ResizeObserver nesmí opakovaně nastavovat stejné rozměry canvasu. Rozměry se mění pouze při skutečné změně CSS velikosti nebo DPR.
- Při návratu z backgroundu se resetuje časový základ RAF a delta time; nesmí vzniknout skok simulace.
- Renderer musí mít automatické testy pro prázdný stav, plný stav, extrémní zoom, nulové/změněné rozměry, NaN/Infinity a obnovu kontextu.
- PixiJS je v této revizi pouze nainstalovaná, neaktivní experimentální závislost. Není součástí herního renderovacího kontraktu a nesmí se načítat do herní smyčky.

## 4. Simulace a determinismus

- Simulace je autoritativní zdroj pravdy. HUD čte snapshoty; nesmí dopočítávat vlastní varianty herních pravidel.
- Aktualizace entity musí být bezpečná při smrti/despawn během iterace poolu.
- Pooly mají explicitní kapacitu, reset všech polí při alokaci a definované chování při vyčerpání.
- Seedované RNG proudy mají oddělené účely (combat, room, loot, cosmetics). Přidání vizuální náhody nesmí změnit loot ani combat seed.
- Testy pokrývají hranice stavů, přechody sektorů, smrt, restart, pauzu a návrat z pozadí.

## 5. Ukládání a bezpečnost dat

- Profil, postava, nastavení a obsah správce mají oddělené klíče a jasné vlastníky.
- Načtená data z localStorage/importu jsou nedůvěryhodná: validovat typ, rozsah, délku, enumy a velikost.
- Migrace je idempotentní a nesmí při chybě přepsat poslední platná data prázdným stavem.
- Reset má přesně vymezený rozsah a testy zachování dat mimo tento rozsah.
- PIN v lokálním profilu není serverové ověření identity; UI ani dokumentace nesmí tvrdit opak.

## 6. Testovací pyramida a release gate

Každý PR/commit s herní změnou musí projít:

1. `npm run typecheck`
2. `npm run test` — žádné nulové nebo vynechané test suites bez vysvětlení; kontrolovat skutečný součet.
3. `npm run lint` — žádné nové chyby ani varování; existující nálezy mají evidované vlastníky a plán odstranění.
4. `npm run build` — produkční Vercel build včetně migrací/fallbacku.
5. Browser smoke desktop 1280×800 a mobile 390×844, screenshot vizuálně zkontrolovaný, žádné page errors/console errors.
6. Smoke produkčního buildu, ne pouze dev serveru.
7. Interaktivní E2E: nový běh → boj → loot → reroll/šrot → dílna → báze/portál → banknutí i porážka.
8. Dlouhý běh: nejméně 15 minut, opakované vlny, boss, změny velikosti, background/foreground, pauza/resume, kontrola paměti a render frame.
9. Save test: nový profil, migrace staršího save, poškozená data, reset a opětovné spuštění.
10. Změna dokumentace a changelogu ve stejném změnovém celku.

Build pass není důkaz produkční připravenosti. Release je blokován, pokud není dokončena browser QA, dlouhý běh nebo bezpečnostní kontrola dat.

## 7. Změnový proces

1. Zapsat problém, reprodukční kroky, očekávaný výsledek a dotčené vlastníky.
2. Vytvořit test, který selže před opravou.
3. Opravit nejmenší možnou vrstvu bez obcházení kontraktu.
4. Spustit relevantní testy a celý release gate podle rozsahu.
5. Aktualizovat `current-game-state.md`, `game-systems-reference.md`, pravidla a roadmapu podle skutečného dopadu.
6. Přidat záznam do `CHANGELOG.md`.
7. Commitovat až po ověření; pushovat jen čistý, zdokumentovaný a testovaný stav.
8. V závěru uvést přesně ověřené kontroly, neprovedené kontroly a otevřené blokery.

## 8. Aktuálně známé blokery z auditu 14. 11. 2026

- `npm run typecheck`: PASS.
- `npm run test`: PASS; herní suite 117/117, app-data/auth suite 55/55. První glob skriptové sady hlásí 0 testů — je nutné opravit pattern nebo explicitní seznam, aby se skriptové testy skutečně spouštěly.
- `npm run build`: PASS; produkční build generuje Vercel výstup. Zaznamenáno varování o chunku nad 500 kB a bundler direktivách.
- `npm run lint`: FAIL — 8 chyb a 11 varování. Chyby zahrnují prázdné catch bloky, porušení Rules of Hooks v MOBA enginu a další nálezy. Release blokován.
- Browser smoke a dlouhý běh: dosud neověřeno v tomto auditu.
- Canvas zmizení assetů: zatím bez reprodukce a bez potvrzené příčiny; jde o P0 stabilitní blokátor. Nelze označit renderer za produkčně bezpečný.
- PixiJS: experimentální závislost, žádné aktivní napojení na herní smyčku.


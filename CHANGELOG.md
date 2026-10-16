# Changelog

## Znalost nepřátel, mobilní ovládání a systémová dokumentace (17. 10. 2026)

- **Kodex a prestiž**: každý druh nepřítele má samostatný počet zabití a šest
  úrovní znalosti (1/10/50/200/750/2 000). Max. znalost jednorázově připíše
  1 prestižní bod. Body se ukládají, zatím se neutrácejí a nedávají bojový
  bonus; reset herního postupu je smaže. Běžné položky Kodexu a jejich
  existující statistické bonusy zůstávají oddělené.
- **Touch ovládání**: odstraněn pravý joystick. Jediný levý NippleJS joystick
  pohybuje postavou; směr pohybu určuje míření a mobil vždy automaticky střílí.
  Desktop auto-fire má přepínač v nastavení expedice a pauze a preference se
  ukládá lokálně.
- **Motion UI**: animované přechody herních přehledů, progress pruhy a přepínač
  auto-fire respektují `prefers-reduced-motion`.
- **Dokumentace**: opraveny zastaralé popisy ovládání, grafických assetů,
  profilu a XP. Přidána [`docs/game-systems-reference.md`](./docs/game-systems-reference.md)
  s datovými hranicemi, lifecycli, uložišti a vazbami funkcí; aktualizovány
  pravidla progrese, UI, postavu i další plán.
- **Ověření**: `npm run typecheck`, `npm test` (162 testů) a `npm run build`
  prošly. ESLint má 0 chyb a 1 existující upozornění na závislosti hooku
  v `GameView.tsx`.

## Produkční úprava: přihlášení, vlny, statistiky (nové)

- **Přihlášení a registrace**: první spuštění vyžaduje přezdívku (2–16 znaků) a 4místný PIN (+ potvrzení); následně jen PIN. Účet je uložen lokálně pro zařízení (`vaultbreak-profile-v1`), nelze obnovit po smazání dat.
- **Spuštění vlny**: před první vlnou každého sektoru a před 6. vlnou (ELIT, index 5) se zobrazí tlačítko **Start vlna** v HUD; ostatní vlny naskakují automaticky po 2,5 s pauze. Hráč má čas nasadit vylepšení do zbraně v Dílně.
- **Detailní statistiky**: nová obrazovka **Statistiky** v menu (běhy, nejv. úroveň, zabití, bossové, šrot, herní čas, přesnost, střely, poškození ven/dovnitř). Konec běhu ukazuje rozšířené statistiky (střely, šrot, místnost).
- **Save verze 4**: přibyly celkové čítače `totalPlayTime`, `totalShotsFired`, `totalShotsHit`, `totalDmgDealt`, `totalDmgTaken`, `bestRoom`.
- **XP a profilová úroveň (nové)**: v HUD se zobrazuje progresní bar `Lvl N · XP aktuální/požadované`. Za zabití hráč získá běhové XP; po konci běhu se přičte k profilu a leveluje podle progresivního vzorce `100 × 1,5^(level-1)` (L1→2: 100, L30→31: ~55 905). Úroveň a XP přetrvávají napříč běhy (save verze 5, pole `level`, `xp`, `xpTotal`).
- **Grafické assety pro menu (nové)**: jednotná sada 19 UI ikon (`public/assets/ui/icons/`, komponenta `src/game/ui-icons.tsx` s `currentColor` pro všechny stavy), portrét vojáka a 3 environment ilustrace (vstup/interiér trezoru, aréna). V menu nahrazují lucide: Torment lebka, kalendáře výzev, play v NOVÝ BĚH/Start vlna a 5 ikon panelu postavy.
- **Spodní navigace (nová)**: Domů / Postava / Kodex / Achievementy / Cesta s aktivním zvýrazněním a safe-area; nová obrazovka Postava (profil, XP, odznaky).
- **Karty zbraní (nové)**: parametrická komiksová ilustrace všech 16 archetypů (`src/game/weapon-art.tsx`, element akcent, rarity proužek) v loot kartách i v panelu postavy; mřížka DMG/DPS/RPM; low-HP čísla v HUD červeně.
- **Nepřátelé jako assety (nové)**: všech 28 druhů má komiksový SVG sprite (`public/assets/sprites/enemies/`, siluety dle typu útoku, barvy bestiáře); `drawEnemy` je používá s fallbackem na procedurální tvary — HP bary, affix kroužky i status efekty zůstávají canvasové. Při zásahu (bílý flash) se kreslí procedurálně pro čitelnou odezvu.
- **Ikony místo emoji (nové)**: `diamond` ikona v sadě; zámky v Cestě/Achievementech, dash pipky (CSS tečky), `◆` u anomálií/affixů a `⚙` v celém DOM UI nahrazeny ikonami (`statScrap`, `diamond`). Canvas floatry a nápověda si textové znaky nechávají.
- **Návrat od assetů (nové)**: na rozhodnutí nepoužívat SVG assety odstraněn celý asset systém (`src/game/assets.ts`, `src/game/ui-icons.tsx`, `src/game/weapon-art.tsx`, `public/assets/`); UI zpět na lucide + CSS tvary, canvas zpět na čistě procedurální kresbu. Funkce (auth, statistiky, vlny, XP, navigace) i styly Fází 1–4 zachovány.
- **QA Fáze 9**: všechna SVG bez vloženého textu (§19); testy 55 + 93 pass / 0 fail (wave test a save test aktualizovány na nové chování + nový XP test); odstraněny nepoužívané importy (`Lock`, `CalendarDays`). Ověřeno: `npm run typecheck` ✓, `npm test` ✓, `npm run build` ✓.
- Ověřeno: `npm run typecheck` ✓, `npm run build` ✓.

## Dílna + blueprinty (nové, hybrid A+C)

- **Rámy a mody**: zbraně jsou rámy s mod-sloty (unikátní relikvie bez slotů);
  12 modů ve 3 rodinách (Stráž, Hlubina, Prototyp) padá z lootu do inventáře
  (max 8) a sází se v nové záložce **Dílna** v přehledu. Setový bonus rodiny
  2 kusy +10 %, 3 kusy +25 %.
- **Blueprinty**: zabíjení archetypem roste napříč běhy (ranky 25/60/120/200:
  +5 % DMG → **zbrojnice** startovních rámů → +1 slot → +10 % DMG).
- Run i progress tak tvarují každou zbraň: mody z runu, ranky z historie.
- Pravidla §23, Help, slovníček, Cesta (sekce Dílna) i admin simulátor.

## Cesta a Slovníček (nové)

- Nová obrazovka **Cesta** v menu: celá odemykací tabulka profilu (LVL 3–30
  se stavem a dalším cílem), všech 28 nepřátel s typem útoku a LVL, portály,
  anomálie a sbírka s odkazem do kodexu. Pro nováčky + plánovače.
- Nová obrazovka **Slovníček**: všechna hesla pojmů na jednom místě.
- Spawn-tabulka nepřátel (`ENEMY_SPAWN`) je nově jediný zdroj pravdy pro hru
  i UI; losy ze seedů bitově stejné jako dřív.

## Návrh 2 + pevný progress (nové)

- **Bucketový výpočet poškození** (§21, `src/game/scaling.ts`): kyblíky
  gear × vlastnosti × aury × kodex, vlastnosti a aury s klesajícími výnosy
  (`+100 % → +67 %`); strop kritiky 60 % / ×3; vysátí z bossů poloviční.
- **Zbroj nepřátel**: od LVL 10 roste k 30 % (Pancéřovaný +15 %); ignoruje ji
  nová Průraznost (railka, harpuna, sniper, Odstřel); statusové DoT zbroj
  obcházejí. Hráčská zbroj strop 30 %.
- **Pevný progress**: odemykání roztažené na LVL 3–30 (šrot 3, Kovárna 6,
  obchod 9, Aréna 12, synergie 15, affixy 20, Veterán 25) + **Torment** (LVL 30,
  checkbox v menu, HUD odznak).
- **Těžší hra**: křivka HP 0,14→0,17 a DMG 0,06→0,075 za úroveň, rychlost strop
  1,7, pity po 4 (Veterán 3), medkit pod 60 % HP, báze 35 % (Klid 50 %),
  ostrostřelci míří s předstihem.
- **UI popisky ke všemu**: panel postavy ukazuje buckety, efektivní HP a stropy;
  Help, slovníček i pravidla aktualizovány.

## Kola 2, 3, 5, 6 (nové)

- **Statistiky běhu**: koncová obrazovka ukazuje DMG ven/dovnitř a přesnost
  (nové čítače `dmgDealt`/`dmgTaken`/`shotsFired`/`shotsHit` v simulaci).
- **Žebříček**: lokální top 10 denních a týdenních výsledků (seed + LVL)
  v menu; stejné období drží nejlepší výsledek; maže se s resetem.
- **Zvuky schopností**: všech 36 druhů má vlastní procedurální hlas
  (`ABILITY_VOICE`); jezdce Efektů/Hudby v pauze už byly, zůstávají.
- **Tutorial**: první běh provází 4 kontextové tipy (zabití → loot →
  panely → báze), pak se už neukáže; jde přeskočit.

## Reset progressu (nové)

- Menu má tlačítko Resetovat progress s dvoufázovým potvrzením: smaže save,
  kodex, achievementy, odznaky a denní/týdenní výzvy, pak reloadne hru.
- Nastavení (zvuk, obtížnost, katalogy, panel) zůstává. Kryto testem.

## Nový HUD a UI systém

- HUD: boss bar s fází, buff-řádek s odpočty (štít, přetaktování, zrcadlo,
  dron, čas, ostří, studna), dash-pipky, čísla u schopnosti, šrot counter.
- Event feed: toasty za odznaky a kodex přímo během běhu (události ze simulace).
- Tooltipy + slovníček pojmů (`src/game/glossary.ts`, 31 pojmů): hover na
  desktopu, tap na mobilu; napojeno na odznaky, buffy, dash, šrot i loot.
- Loot: porovnání DPS proti držené zbrani (▲▼), tahák „proč je dobrá“, šrot-tip.
- Sjednocené panely: Boj + Postava jako záložky jednoho přehledu (T / C),
  volba se pamatuje. Menu: progress bary kodexu/achievementů a celkové součty
  profilu. Báze: číslované kroky 1 obchod → 2 portál → 3 rozhodnutí.

## Verze 1.0 — velký obsahový balíček

- **25 nových schopností** (36 celkem): Ohnivá koule, Mrazivá nova, Jedová vlna,
  Poprava, Meteor, Salva, Odstřel, Šrapnel, Krupobití, Kouřová clona, Statické
  pole, EMP výboj, Volání bouře, Vysátí života, Krvavá daň, Ohnivá bouře, Ledová
  zbroj, Bašta, Krok stínů, Zuřivost, Věrný stín, Magnetizace, Polní oprava,
  Polní obvaz, Roznětka. Každá má implementaci, vizuál i záznam v kodexu.
- **20 nových nepřátel** (28 celkem) s typy útoku (blízko, výpad, střelba,
  sebevrah, dělení, podpora, líheň): Lezec, Drtič, Stín, Stopař, Děs, Čepel,
  Nosorožec, Kopí, Kanónýr, Ostrostřelec, Jiskra, Vrhač, Gardista, Sršeň,
  Správce (mini-boss), Těkavka, Bourák, Roztoč, Medik (léčí), Matka (líhne).
  AI je datově řízená tabulkami (`ENEMY_RANGED`, `ENEMY_CHARGE`, `ENEMY_BLAST`).
- **Nové zbraně**: 4 archetypy (Minomet, Oblouk, Roj, Harpuna) + 6 unikátů.
- **8 nových mutátorů** (pool 16+16): Kofein, Dravost, Lehký krok, Šťastná ruka,
  Ztuhlé klouby, Těžká hlava, Děravé kapsy, Únava.
- **Další kontent**: 4 pasivky (Regenerace, Mrchožrout, Nenasytnost,
  Soustředění), 2 affixy (Obří, Zběsilý), 2 portály (Knihovna, Tržiště),
  2 anomálie (Hladomor, Přepětí).
- Pravidla `docs/progression-rules.md` §20; losy ze seedů se s větším poolem
  chovají stejně férově (stejný seed = stejný obsah pro všechny).

## Vizuální efekty a ikony (nové)

- Střely mají tvar podle elementu (plamen, ledový kosočtverec, blesk, bublina,
  temné jádro, kinetická stopa); kritické mají bílý kroužek, výbušniny blikající
  roznětku a nepřátelské střely rudý nebezpečný tvar. Záblesk u hlavně má barvu zbraně.
- Nepřátelé ukazují statusy z útoků (hoření, jed, mráz, šok, křehkost).
- Schopnosti a buffy vidět v aréně: blesky u Lightning/chainu, tělo drona,
  prstenec zrcadla, záře přetaktování, nádech zastavení času.
- UI ikony pro nové věci: kodex (kniha + ikona každé kategorie), achievementy
  (trofej/zámek), sekce panelu postavy.

## Panel postavy (nové)

- Character sheet ve stylu WoW (klávesa C, tlačítko v HUD i na mobilu):
  atributy (zbroj, rychlost, poškození, vysátí, magnet, dash), obě zbraně
  s efektivními čísly, schopnost, pasivky a aktivní aury + bonus kodexu.
- Čísla v panelu používají stejné vzorce jako simulace (mutátory i kodex).

## Kodex a achievementy (nové)

- Kodex: 10 kategorií sbírky (nepřátelé, affixy, synergie, unikáty, archetypy,
  schopnosti, pasivky, mutátory, anomálie, portály); zamčené položky jsou `???`
  a každá odemčená přidává minimální trvalý bonus od dalšího běhu.
- 12 achievementů profilu (zabití, sektory, sbírka, šrot, bossové, běhy);
  odemknutí je trvalé, nové se ukážou na konci běhu.
- Save `version: 3` s kumulativními statistikami (`totalKills`, `totalScrap`,
  `bossesKilled`); pravidla `docs/progression-rules.md` §18–§19.

## Nasazení (deploy)

- Nový `docs/DEPLOY.md`: postup nasazení na Vercel, Docker/VPS a holý VPS,
  tabulka proměnných prostředí, checklist a řešení problémů (vše ověřeno buildem).
- Nitro preset jde přepnout proměnnou `NITRO_PRESET=node-server` (výchozí `vercel`
  beze změny): `Dockerfile`, `.dockerignore`, `docker-compose.yml` (app + volitelný
  lokální Postgres).
- Důležité: Install Command na Vercelu musí zůstat `npm install` (ne `--omit=dev`,
  jinak chybí `vite` pro build); `VITE_*` se zapečou při buildu.

## 2. 10. 2026 — final review

- Všech 10 bodů roadmapy hotovo. Ověřeno: typecheck, lint (bez nových nálezů),
  build, `npm test` (55 + 57), render-check (desktop + mobil), touch-check
  (iPhone emulace), gameplay-check (full-loop až po bank v sektoru 2 + karta).
- Opraveno při review: Escape pouští pauzu, autofocus akce kola, test touch-check
  prošel novým wheel flow.

### Výzvy profilu a karta buildu (nové)
- 6 výzev (První krev, Brokovničář, Bez šrámu, Rychlík, Lovec elit, Bossobijec):
  každá 1× za běh, odměna šrot ihned + trvalý odznak; postup ve stats panelu.
- Po banku tlačítko Stáhnout kartu (PNG 640×860 se sektorem, DPS, mutátory, seedem).
- Pravidla sepsána jako `docs/progression-rules.md` §17.

### Pevná pravidla (§§6–10, nové v dokumentu)
- Báze a checkpointy, rerolly, catch-up, tabulky rarity, struktura sektoru a vln —
  vše sepsáno v `docs/progression-rules.md` a vymáháno testy.
- Oprava: start z checkpointu dává +1 reroll (`freeRerolls` se předtím ignoroval).
- Číslování sekcí dokumentu sjednoceno, odkazy z kódu opraveny.

## Aktuální stav (1. 10. 2026)

### Kolo štěstí (nové)
- Popup po kliknutí na novou hru a před každým sektorem: 7,5s animace točení
  se zvuky (lze přeskočit), losují se 3 mutátory (12+/12−) platné jen pro daný sektor.
- Efekty: rychlost, HP, armor, kadence, kritik, vysátí, poškození, přebíjení,
  zásobník, dostřel, rozptyl, šrot, dash. Stejný seed + sektor = stejné mutátory.

### Fáze hry a znovuhratelnost (nové)
- Early (sektor 1), mid-game (2–3) se sektorovou anomálií, end-game Hlubina (4+).
- Anomálie: Zlatá žíla, Štědrý trezor, Ozvěny, Klid před bouří (deterministické ze seedu).
- Hlubina: elity 2 affixy, boss minimum legendary.
- Týdenní výzva vedle denní (ISO týden, `TYD-XXXXXX`).

### Nový vizuál (nové)
- Design systém: animované dialogy, stagger karet, glow loot karet podle rarity,
  gradient titulku, velká tlačítka (48 px+), pulzující BOSS odznak a banner odpočtu vlny.
- HUD: silnější HP bar s přechodem, low-HP červená vignette, větší tlačítka.

### Pauza před vlnou (nové)
- Po vyčištění vlny je 2,5s pauza s odpočtem v HUD a zvukovým signálem; poslední vlna pauzu nemá.

### Přístupnost
- Viditelné focus obrysy na všech prvcích; `prefers-reduced-motion` tlumí screen-shake.

### Editor affixů a unikátů (nové)
- Záložka Affixy: prefixy/suffixy (element, násobiče statistik, chování střel, váha),
  unikátní zbraně (archetyp, element, rarita, staty, chování, váha).
- Generátor losuje affixy i unikáty váženě; prázdné katalogy mají bezpečný fallback.
- Validace: duplicity, nulové váhy, prázdné názvy, extrémní staty.

### Denní výzva (nové)
- Každý den jeden seed, výsledek = dosažená úroveň; záznam dnes + historické maximum.
- Denní běhy se počítají i do profilu.

### Průvodce (nové)
- Nápověda rozdělená na sekce: základy, loot a šrot, báze, synergie a bossové.

### Progrese a odemykání
- Profilová úroveň = nejlepší dosažená úroveň; odemyká šrot (LVL 2), Kovárnu (3),
  obchod (4), Arénu (5), synergie (6), elitní affixy (8), Veterána (10).
- Pravidla jsou závazně sepsaná v `docs/progression-rules.md`.
- Denní výzva: každý den jeden seed, záznam dnes + historické maximum.

### Báze-hub
- Po bossovi: +50 % HP, obchod za šrot (oprava, plátování, vliv), volba expedice
  ze 3 portálů, checkpoint dalšího sektoru.
- Loot jde rozebrat na šrot místo volby odměny.

### Boj
- Boss má 3 fáze (Hněv pod 70 %, Zuřivost pod 30 %): teleport, adds, rychlejší palba.
- Elementární synergie: Toxický výbuch, Křehkost, Pára.
- Elitní affixy: Hbitý, Pancéřovaný, Třaskavý, Zhoubný.
- Reward pravidla: pity timer, boss minimum rarity, Omrzlina je šance (oprava popisu).

### Správce a ladění
- Záložky Simulátor (loot + Dopad schopností/pasivek), Obtížnost (13 parametrů),
  Data (export/import JSON + validace), Affixy (prefixy, suffixy, unikáty).
- Stats panel ve hře (klávesa T): obtížnost, DPS, bestiář, živí nepřátelé.
- Zvuky + procedurální hudba (explore/boss/base), jezdce hlasitosti.
- Dotykové ovládání pro mobily (duální páčky, multitouch).
- Testy: `src/game/game.test.ts` v `npm test` (45 testů), full-loop QA v prohlížeči.

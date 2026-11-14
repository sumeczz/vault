# Plán dalšího vývoje

Plán VAULTBREAK aktualizovaný k 14. 11. 2026. Zohledňuje aktuální implementaci
profilu, postavy, Kodexu, prestiže a ovládání; dokončené etapy nejsou opakovány
jako budoucí úkoly. Propojení herních systémů je popsáno v
[`game-systems-reference.md`](./game-systems-reference.md), číselné smlouvy v
[`progression-rules.md`](./progression-rules.md).

## Stav dokončených základů

| Oblast | Stav |
|---|---|
| Content manager | Editor katalogů, validace, simulátor loot/dopadů, obtížnost, import/export katalogu |
| Profilová progrese | `bestLevel`, Cesta, unlocky LVL 3–30, checkpointy, Torment |
| Roguelite běh | Seedované sektory/místnosti/vlny, boss fáze, loot, báze, portály, mutátory/anomálie |
| Postava | Oddělený XP/level (cap 30), talentové body, tři talentové větve a respec |
| Ekonomika/zbrojnice | Materiálové dropy, fragmenty, recepty, vyrobené startovní zbraně a trvalé komponenty |
| Kodex | Jednorázová sbírka/CodexBonus odděleně od počtů zabití, šesti znalostních úrovní a prestiže |
| Další postup | Výzvy, achievementy, odznaky, denní/týdenní seed a místní leaderboard |
| Rozhraní/ovládání | Ikonové mobile-first stránky, Motion, reduced-motion, Smart Assist / Manual Twin Stick, pevné CSS rozměry touch prvků, průhlednost, rozložení pro levou/pravou ruku |
| Kvalita | Typecheck, testy herních subsystémů a produkční build procházejí; veškerá nová mobilní input cesta ještě vyžaduje reálné iOS/Android zařízení |

## P0 — stabilizace před dalším obsahem

**Průběžná oprava 14. 11. 2026:** přidán samostatný top-down follow camera modul. Kamera nyní clampuje viditelnou oblast k aréně, plynule sleduje hráče s malým look-ahead podle míření a při přechodu do další místnosti/sektoru se okamžitě synchronizuje s novou pozicí hráče. Camera shake již nespotřebovává combat RNG. Automatické testy pokrývají hranice viewportu, smoothing, neplatné hodnoty a přechody až do šesté místnosti. Tato oprava sama o sobě neuzavírá P0 browser/soak QA.

Tato etapa má přednost před všemi produktovými rozšířeními. Do jejího dokončení se nepřidávají nové schopnosti, zbraně, efekty ani progrese. Závazná kritéria jsou v [engineering-standards.md](./engineering-standards.md).

- Reprodukovat zmizení herního světa; přidat diagnostiku Canvas context lost/restored, heartbeat snímků, rozměrů/DPR, kamery/zoomu a neplatných souřadnic.
- Opravit render loop tak, aby výjimka jednoho snímku nezastavila další snímky a chyba nebyla skryta černou obrazovkou.
- Ověřit resize/orientaci, background/foreground, pauzu/resume a 15min běh včetně boss/endgame zátěže.
- Doplnit renderer regresní testy a browser E2E hlavního průchodu.
- Opravit lint chyby a skutečné spouštění skriptových testů (glob nyní vrací 0).
- Rozdělit obrazovku, životní cyklus a renderer na jasně vlastněné moduly až po charakterizačních testech; bez plošného přepisu.

**Hotovo, když:** 15min browser soak test projde bez ztráty obrazu, runtime error, duplicitních RAF smyček či nekontrolovaného růstu paměti; dev i produkční smoke projdou desktopem i mobilem; všechna release gate z engineering-standards.md jsou zelená.

## Další etapy

Etapy jsou seřazeny podle závislostí. Body prestiže jsou nyní sbírané a
trvalé, ale jejich utrácení nezačne, dokud nebude schválen jasný endgame účel
a ekonomika.

### 1. Více postav a třídy — nejbližší funkční rozšíření

Dokončit dosud odloženou šestou etapu
[`character-progression-and-armory.md`](./character-progression-and-armory.md):

- obrazovka výběru a vytvoření postavy, stabilní ID a přejmenování;
- bezpečné přepnutí aktivní postavy bez přenosu XP, talentů, materiálů,
  zbraní a komponent;
- třídy s odlišnou schopností/počáteční výbavou a stromem, ale bez změny
  profilového `bestLevel` a odemykání Cesty;
- definovaná pravidla pro vymazání/archivaci postavy, import starého legacy
  postupu a zachování profilových rekordů;
- testy pro migraci, hranice inventářů, aktivního character ID, banknutí
  odměn a denní/týdenní služební pistoli.

**Hotovo, když:** lze založit dvě postavy, přepínat mezi nimi a ověřit, že
žádná postava nepřebírá progres nebo výbavu druhé; starší lokální save se
načte bez ztráty `bestLevel`.

### 2. Návrh a schválení využití prestiže

Nejprve připravit návrh endgame prestižního stromu/systému, nikoli rovnou
utrácení bodů:

- určit konkrétní herní účel a odměny; oddělit kosmetické, systémové a
  bojové výhody;
- porovnat body za druh (1 PP při 2 000 zabitích) s požadovanou délkou
  endgame, počtem druhů a možností budoucích resetů;
- určit, zda prestiž odemyká funkce, uzly nebo alternativní herní styly,
  a jak zabránit tomu, aby byla povinnou bránou pro běžnou progresi;
- navrhnout UI, reset/vrácení, migraci a dopad na další třídy;
- před implementací předložit design ke schválení.

**Hotovo, když:** uživatel schválí ekonomiku i pravidla; pak lze plánovat
implementaci bez změny nynějšího jednorázového udělení PP za druh.

### 3. Vyvážení ekonomiky a znalostního grindu

- přidat deterministické testovací scénáře/simulace pro délku získání XP,
  receptů a komponent při běžném, elitním a boss dropu;
- ověřit prahy znalosti 1/10/50/200/750/2 000, jednorázovou prestiž,
  persistenci a chování po resetu;
- zkontrolovat vztah profilu, levelu postavy, talentů, komponent a blueprintů,
  aby se jejich bonusy nesčítaly nechtěně nebo podruhé;
- změřit očekávaný čas k výrobě každého archetypu a dostupnost prvních
  materiálů, pak upravit čísla jen se shodou v pravidlech, simulaci i UI.

**Hotovo, když:** tabulky a automatické testy odpovídají simulaci a hráč může
pochopit náklady/drop zdroje přímo v Kovárně bez skrytých podmínek.

### 4. Ukládání, záloha a vysvětlení lokálního profilu

- vyhodnotit export/import profilového postupu a postavních dat jako ruční
  lokální zálohu; formát verzovat, validovat a před přepsáním ukázat náhled;
- jasně zobrazit, že přezdívka/PIN nejsou cloudový účet a postup se
  nesynchronizuje mezi prohlížeči/zařízeními;
- testovat nevalidní/částečně poškozená data, starší save, reset a obnovu.

**Závislost:** nejdřív se schválí, zda export/import patří do uživatelského
rozhraní a jakou přesnou hranici dat má zahrnout; přidání serverového účtu je
samostatné rozhodnutí, ne součást této etapy.

### 5. Ověření mobilního ovládání a přístupnosti

- Dokončit a ověřit dva dostupné režimy mobilní střelby: Smart Assist
  (auto-aim + tlačítko střelby) a Manual Twin Stick (pravý aim joystick +
  tlačítko střelby); VIP auto-aim + auto-fire zůstává zamčeným návrhem do
  zavedení skutečného entitlementu.
- Ověřit souběžný dotyk levého a pravého joysticku, držení střelby při pohybu,
  přerušení dotyku, ztrátu pointer capture, změnu orientace a návrat z pozadí.

- ověřit joystick pohybu i míření na iOS Safari a Android Chrome:
  uchopení, vytažení mimo zónu, zrušení dotyku, změna orientace a souběžný
  vícedotyk;
- ověřit, že Smart Assist nikdy nestřílí bez stisku tlačítka a Manual Twin
  Stick nikdy nespustí střelbu samotným pohybem pravého joysticku;
- provést průchod klávesnicí, screen reader popisky, focus, reduced-motion,
  kontrast a 390px layout všech nových stránek/dialogů;
- opravit pouze potvrzené rozdíly a přidat automatizované regresní testy tam,
  kde jsou stabilně reprodukovatelné.

**Hotovo, když:** ruční testovací matice zařízení projde bez ztraceného
vstupu, nechtěného scrollu, horizontálního overflow nebo závislosti na hoveru.

### 6. Produkční a regresní QA

- rozšířit automatizovaný průchod hlavní smyčkou: nový běh → boj → loot /
  reroll / šrot → bezpečná dílna → báze/portál → banknutí i porážka;
- ověřit, že profilový save, character save, knowledge, PP, daily/weekly,
  leaderboard a reset dodržují své storage hranice;
- před vydáním spustit typecheck, celou sadu testů, lint review, production
  build i browser QA na desktopu a mobilu;
- aktualizovat stavové, systémové i pravidlové dokumenty ve stejném PR jako
  každou změnu herního chování.

## Pravidlo pro změnu plánu

Každá změněná cena, práh, odměna nebo odemykací podmínka se musí aktualizovat
současně v implementaci, `progression-rules.md`, případně
`character-progression-and-armory.md`, testech a herním UI. Funkce se nesmí
označit jako hotová jen na základě dokumentace; vyžaduje běhové ověření.

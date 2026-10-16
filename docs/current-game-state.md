# Aktuální stav hry

Stav k 16. 10. 2026.

## Přehled

VAULTBREAK je single-player top-down roguelite střílečka běžící v prohlížeči. Herní svět kreslí Canvas; menu, HUD, nabídky kořisti a správce jsou React překryvy. Běh probíhá v sektorech po 10 úrovních: elity ve 3. a 6. úrovni sektoru a boss v 10. úrovni.

## Přihlášení (nový)

První spuštění zobrazí obrazovku registrace: zadá se přezdívka (2–16 znaků, písmena, čísla, `_ -`) a 4místný PIN (+ potvrzení). Účet se ukládá lokálně pro toto zařízení (`vaultbreak-profile-v1`); nelze obnovit po smazání dat prohlížeče. Při každém dalším spuštění se zobrazí jen výzva k zadání PINu. Bez správného PINu se do hry nedostanete.

## Hraní

- Pohyb: WASD nebo šipky; na gamepadu levá páčka.
- Míření a střelba: myš; na gamepadu pravá páčka a spoušť.
- Dash: mezerník. Schopnost: F nebo Shift. Přepínání zbraní: Q/E. Statistiky: T.
- Mobilní ovládání používá dotykové vstupy a automatickou střelbu.
- Dotyk: levá páčka pohyb, pravá páčka míření + automatická střelba, tlačítka schopnost/dash/zbraň. Páčky drží jeden prst (multitouch), gesta prohlížeče (zoom/scroll/callout) jsou ve hře potlačená.
- Po vyčištění místnosti se nabídnou tři odměny: zbraně, schopnosti, pasivky nebo léčení. Jednou lze nabídku přehodit.
- Místo volby lze nabídky **rozebrat na šrot** (hodnota podle rarity). Šrot se utrácí v bázi.
- Běh končí porážkou hráče nebo dobrovolným banknutím v bázi. Po poražení bosse následuje báze: +50 % zdraví, checkpoint dalšího sektoru, **obchod** (plná oprava, +15 max HP, +1 reroll; ceny rostou se sektorem) a **volba expedice** ze 3 portálů — Kovárna (víc zbraní + reroll), Aréna (lepší loot, boss dává 4 nabídky), Laboratoř (schopnosti/pasivky + medkit + reroll).
- **Start vlna**: před první vlnou každého sektoru a před 6. vlnou (ELIT, index 5) se v HUD zobrazí tlačítko **Start vlna**. Po kliknutí vlna začne. Ostatní vlny v místnosti naskakují automaticky po 2,5 s pauze s odpočtem v HUD. Hráč má při startu vlny čas otevřít panel přehledu (T) a v záložce **Dílna** nasadit vylepšení do zbraně. Poslední vlna pauzu nemá.
- V menu lze startovat od každého poraženého sektoru (checkpoint). Vyšší start dává bonus k max. HP a posunutý loot RNG, ne plný build.

Hra obsahuje 16 archetypů zbraní, šest elementů, šest rarit a 16 typů vlastností střel. Zbraně skládají základní statistiky, rarity, prefixy/sufixy a herní chování; vybrané legendární a mýtické dropy mohou být existující unikátní zbraně. Schopnosti a pasivky mají pevné typy efektů, které zpracovává simulace. Statusy nesou elementy (burn/led/jed/šok) a od LVL 6 se kombinují: Toxický výbuch (burn+poison), Křehkost (mráz+šok), Pára (burn+mráz). Elity (od LVL 8) a bossové nesou affixy Hbitý/Pancéřovaný/Třaskavý/Zhoubný. Boss má 3 fáze (Jádro/Hněv/Zuřivost, prahy 70 % a 30 % HP): přechod znamená řev, teleport, adds a zrychlení palby (8→10→12 střel). Loot má pity timer (3 místnosti bez rare+, Veterán 2) a boss minimum rare (Veterán epic).

## Progrese a pravidla

Závazný návrh: `docs/progression-rules.md`. Profilový postup = nejlepší dosažená globální
úroveň běhu (`bestLevel`); odemyká šrot (LVL 3), Kovárnu (6), obchod (9), Arénu (12), synergie (15),
elitní affixy (20), Veterána (25) a Torment (30). Zamčené prvky se ukazují
s požadavkem, menu ukazuje další odemknutí. Pevná čísla báze, rerollů, catch-upu,
rarity a struktury sektoru: `docs/progression-rules.md` §§6–10. Denní výzva: každý den jeden seed
(`DEN-XXXXXX`), výsledek = dosažená úroveň, záznam dnes + historické maximum.
Týdenní výzva: stejný vzor s ISO týdnem (`TYD-XXXXXX`).

## Výzvy a karta buildu

Šest výzev profilu (První krev, Brokovničář, Bez šrámu, Rychlík, Lovec elit,
Bossobijec) — každá max 1× za běh, odměna šrot ihned + trvalý odznak. Postup
ve stats panelu, odznaky v menu. Po banku jde stáhnout PNG karta buildu
(sektor, čas, zbraně s DPS, mutátory, seed). Pravidla: `docs/progression-rules.md` §17.

## Kolo štěstí

Před runem i každým sektorem se v popupu točí kolo štěstí (7,5 s animace, lze přeskočit)
a losuje 3 mutátory platné jen pro daný sektor. Stejný seed + sektor = stejné mutátory. Vidět jsou
v menu (pro aktuální seed) a ve stats panelu. Pravidla: `docs/progression-rules.md` §15.

## Fáze hry

Sektor 1 = early-game (čistá pravidla). Sektory 2–3 = mid-game s 1 deterministickou
anomálií (Zlatá žíla, Štědrý trezor, Ozvěny, Klid před bouří). Sektor 4+ = Hlubina:
anomálie + elity 2 affixy + boss minimum legendary. Fáze a anomálie jsou vidět v HUD,
stats panelu a v bázi před volbou portálu. Pravidla: `docs/progression-rules.md` §11–§13.

## Statistiky na obrazovce

Tlačítko grafu v HUD (nebo klávesa T) přepíná panel: násobiče obtížnosti (HP/DMG/SPD), vlna a zbývající nepřátelé, hráč (HP, rychlost, armor, DPS a detaily obou zbraní), žijící nepřátelé s HP bary a bestiář celé úrovně (HP / dotek / střela). Hodnoty počítá `Run.statsSnap()` ze stejného `bestiary.ts`, který používá simulace — panel ukazuje vždy přesná čísla. Volba se pamatuje v `localStorage`.

**Detailní přehled statistik** (nový): tlačítko **Statistiky** v menu otevírá celkové statistiky napříč všemi běhy (počet běhů, nejvyšší úroveň, zabití, bossové, šrot, herní čas, přesnost střel, střely, poškození ven/dovnitř, XP level a XP, odemčení). Koncová obrazovka běhu zobrazuje rozšířené statistiky tohoto běhu: úroveň, zabití, čas, DMG ven/dovnitř, přesnost, střely, šrot a dosaženou místnost.

**XP postavy**: XP z boje se dočasně sčítají během běhu a po jeho konci se připíší
postavě. Nejsou totožná s úrovní účtu: profilové odemykání se nadále řídí
nejvyšší dosaženou globální úrovní běhu (`bestLevel`) a tabulkou na stránce
Cesta. Účetní statistiky a checkpointy zůstávají v profilu; character XP,
talentové body a výbava se ukládají odděleně.

**Talenty, materiály a Kovárna**: postava utrácí body za Výdrž (+8 max. HP),
Balistiku (+3 % poškození zbraní) a Polní sběr (+5 % šance na další běžný
materiál) za stupeň; úrovně 5/10/20/25 odemykají vyšší stupně. Respec stojí
zpočátku 30 šrotu + 2 slitiny a postupně zdražuje. Během běhu padají materiály
a fragmenty mapované na druhy nepřátel; elitní místnosti zaručí materiál i
fragment při každém zabití a boss dá tři fragmenty, dvě slitiny a jádro.
Zásilka se připíše postavě až po porážce nebo banknutí. Kovárna se odemyká
profilovým LVL 6; běžný recept stojí 8 fragmentů, 3 slitiny, 40 šrotu,
pokročilý 12 fragmentů, 4 slitiny, 2 jádra a 80 šrotu. Vyrobenou zbraň lze
nasadit na začátek běžného běhu; denní/týdenní výzvy zůstávají u služební
pistole. Kompletní pravidla a tabulky: `docs/character-progression-and-armory.md`.

**Grafické assety** (nové): hra podporuje grafické assety přes system `src/game/assets.ts` (loader + `drawAsset` s fallbackem na procedurální kresbu). SVG placeholdery v `public/assets/` (player, 28 nepřátel, projectiley pro 6 elementů, pickupy, environment). Integrováno do `render.ts` pro hráče, nepřátelé, střely a pickupy. Chybějící assety graceful degradují. Manifest v `public/assets/manifest.json`. Implementace je připravena pro nahrazení generovanou grafikou.

## Zvuk

WebAudio syntéza bez assetů (`src/game/audio.ts`): střelba, zásahy, krity, smrti, dash, schopnosti, loot, reroll, heal, deny, řev bosse, spawn elity, vyčištění vlny/sektoru, game over. Procedurální hudební smyčka (basa + arpeggio) se třemi režimy — explore / boss / base — přepínanými podle situace. V pauze jsou jezdce hlasitosti efektů a hudby (uložené v `localStorage`) plus mute.

## Panel správce

Panel je v hlavním menu pod tlačítkem **Panel správce**. Změny se ukládají do `localStorage` tohoto prohlížeče a použijí se při příštím běhu. Tlačítko resetu obnoví všechny kategorie správce na výchozí hodnoty. Záložky: Odměny, Schopnosti, Pasivky, Zbraně, **Affixy** (prefixy/suffixy: element, násobiče statistik, chování střel, váha + unikátní zbraně: archetyp, element, rarita, staty, chování, váha), Místnosti, **Simulátor** (generuje N nabídek z konfigurace: podíly typů/rarit, Ø DPS, TOP 5 zbraní + Dopad schopností/pasivek při raritách s kontrolou shody popisu se simulací), **Obtížnost** (13 parametrů křivky + živý náhled LVL 1/10/20/30) a **Data** (export/import JSON katalogu včetně vah, validace s chybami a varováními, náhled před nahrazením).

- **Odměny:** upravitelné váhy šesti rarit; zobrazená procenta jsou normalizované podíly vah. Bez vlastní konfigurace se zachovává původní postupné zvyšování rarit podle místnosti a bosse.
- **Schopnosti:** katalog variant s volbou jednoho z 11 existujících efektů, vahou výskytu, názvy pro tři úrovně rarity, popisem, cooldownem, poškozením, dosahem a trváním.
- **Pasivky:** katalog variant s volbou jednoho z 12 existujících efektů, vahou, názvem, šablonou popisu a rozsahem účinné hodnoty. V popisu lze použít `{value}`.
- **Zbraně:** katalog 12 archetypů; lze měnit název, archetyp, element, váhu, základní rozsahy statistik, kritickou šanci/násobitel a vlastnosti střel.

Nově vytvářené schopnosti, pasivky, affixy i unikáty používají existující herní efekty. Zcela nový herní efekt nebo archetyp zatím vyžaduje změnu kódu.

## Design

Vizuální systém v `src/styles.css` (`vb-btn-primary/ghost`, `vb-dialog`, `vb-enter`,
`vb-stagger`, `vb-loot-card` s glow podle rarity). Větší tlačítka (48 px+), animované
dialogy, low-HP vignette, pulzující BOSS odznak a banner odpočtu vlny. Animace respektují
`prefers-reduced-motion`.

## Technické uspořádání

- `src/game/GameView.tsx`: obrazovky hry, input a vytvoření běhu s nastavením správce. Obsahuje auth bránu (přezdívka + PIN), tlačítko Start vlna v HUD, XP bar v HUD a obrazovku Statistiky. Přednačítá grafické assety (`getAssetLoader().preload()`).
- `src/game/sim.ts`: stav běhu, souboje, místnosti a nabídky odměn. Obsahuje logiku `waveAwaitingStart` a metodu `startWave()`. XP se v `killEnemy` sbírají do běhu a HUD je označuje jako XP postavy.
- `src/game/difficulty.ts`: sektory (10 úrovní), globální úroveň, křivka HP/damage/speed/vln a catch-up bonus. Parametry křivky editovatelné (localStorage `vaultbreak.difficulty.v1`).
- `src/game/expedition.ts`: portály sektorů, šrot, obchod (ceny podle sektoru).
- `src/game/loot-sim.ts`: simulátor nabídek pro správce.
- `src/game/dungeon.ts`: generování místností a vln podle globální úrovně; boss tier přidává vlny po sektorech.
- `src/game/weapons.ts`: generování zbraní, rarity, affixy a unikátní zbraně.
- `src/game/abilities.ts`: výchozí schopnosti/pasivky a jejich generátory.
- `src/game/content-settings.ts`: výchozí katalogy a validace uložených definic.
- `src/game/AdminPanel.tsx`: editor rarit, schopností, pasivek a zbraní.
- `src/game/auth.ts`: správa profilu, přezdívky a 4místného PINu v `localStorage`.
- `src/game/auth-screen.tsx`: obrazovka registrace a přihlášení.
- `src/game/save.ts`: profilové rekordy, checkpointy a souhrnné statistiky (verze 6); nejvyšší globální úroveň řídí účetní odemykání.
- `src/game/characters.ts`: verzovaný postup postavy, převod dosavadních XP ze starého save, XP křivka a talentové body.
- `src/game/assets.ts`: asset loader (`AssetLoader`, `drawAsset`, `getAssetLoader`) s graceful fallback na procedurální kresbu.
- `src/game/render.ts`: používá assety (hráč, nepřátelé, střely, pickupy) s automatickým fallbackem na procedurální kresbu.

## Spuštění a ověření

Po instalaci závislostí spusť `npm run dev`; aplikace je na `http://localhost:8080`. Projekt cílí na Node.js 22. Ověření změn: `npm run typecheck`, `npm test` a `npm run build`. Celý ESLint běh má v repozitáři existující nálezy `prefer-const` mimo UI editoru.

## Známá omezení

Nastavení správce nejsou sdílená mezi prohlížeči ani uživateli. V editoru nelze definovat libovolný nový kód efektu; lze vytvářet a ladit varianty dostupných efektů. Profil (přezdívka + PIN) je uložen jen v aktuálním prohlížeči/zařízení. Grafické assety jsou zatím inline SVG placeholdery — nahrazení generovanou grafikou vyžaduje nové soubory se stejnými názvy v `public/assets/`. Asset system fallbackuje na procedurální kresbu, takže hra zůstává plně hratelná i bez assetů.
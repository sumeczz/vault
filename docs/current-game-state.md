# Aktuální stav hry

Stav k 17. 10. 2026.

Tento dokument je orientační přehled implementovaného produktu. Pravidla a
propojení jednotlivých subsystémů jsou rozepsána v
[`game-systems-reference.md`](./game-systems-reference.md); konkrétní čísla
progrese v [`progression-rules.md`](./progression-rules.md).

## Přehled

VAULTBREAK je single-player top-down roguelite střílečka běžící v prohlížeči. Herní svět kreslí Canvas; menu, HUD, nabídky kořisti a správce jsou React překryvy. Běh probíhá v sektorech po 10 úrovních: elity ve 3. a 6. úrovni sektoru a boss v 10. úrovni.

## Lokální profil a přístup

První spuštění vytvoří lokální profil s přezdívkou (2–16 znaků, písmena,
čísla, `_ -`) a 4místným PINem s potvrzením. Profil se ukládá v
`vaultbreak-profile-v1` tohoto prohlížeče; další spuštění vyžaduje PIN.
Jde o lokální vstupní zámek, nikoli o serverový účet, silné zabezpečení nebo
cloudovou obnovu; smazání úložiště profil odstraní.

## Hraní

- Pohyb: WASD nebo šipky; na gamepadu levá páčka.
- Míření a střelba: myš; na gamepadu pravá páčka a spoušť.
- Dash: mezerník. Schopnost: F nebo Shift. Přepínání zbraní: Q/E. Statistiky: T.
- Mobilní ovládání používá jediný virtuální joystick vlevo, automatickou
  střelbu a míření ve směru pohybu. Pravý joystick byl odstraněn; tlačítka pro
  schopnost, dash, výměnu zbraně a přehled postavy zůstávají vpravo.
- Na PC míří myš nebo pravá páčka gamepadu. Auto-fire lze zapnout/vypnout
  v nastavení expedice i v pauze; preference se ukládá lokálně.
- Dotykové ovládání používá NippleJS; dotykové zóny potlačují gesta stránky.
- Po vyčištění místnosti se nabídnou tři odměny: zbraně, schopnosti, pasivky nebo léčení. Jednou lze nabídku přehodit.
- Místo volby lze nabídky **rozebrat na šrot** (hodnota podle rarity). Šrot se utrácí v bázi.
- Běh končí porážkou hráče nebo dobrovolným banknutím v bázi. Po poražení bosse následuje báze: léčení o 35 % max. HP (50 % při anomálii Klid před bouří), checkpoint dalšího sektoru, obchod podle odemčení a volba z dostupných portálů Laboratoř, Kovárna, Knihovna, Aréna a Tržiště. Účinky portálů i nabídky báze popisuje `progression-rules.md`.
- **Start vlna**: před první vlnou každého sektoru a před elitní vlnou se
  zobrazí ruční Start vlna. Ostatní vlny naskakují po 2,5 s. V bezpečné pauze
  lze otevřít přehled; dílna je dostupná jen bez nepřátel a před další vlnou.
  Poslední vlna pauzu nemá.
- V menu lze startovat od každého poraženého sektoru (checkpoint). Vyšší start dává bonus k max. HP a posunutý loot RNG, ne plný build.

Hra obsahuje 16 archetypů zbraní, šest elementů, šest rarit a 16 typů vlastností střel. Zbraně skládají základní statistiky, rarity, prefixy/sufixy a herní chování; vybrané legendární a mýtické dropy mohou být existující unikátní zbraně. Schopnosti a pasivky mají pevné typy efektů, které zpracovává simulace. Statusy nesou elementy (burn/led/jed/šok); od profilového LVL 15 se kombinují v synergie Toxický výbuch (burn+poison), Křehkost (mráz+šok) a Pára (burn+mráz). Elity se objevují od globálního LVL 8; elitní a boss affixy Hbitý/Pancéřovaný/Třaskavý/Zhoubný se odemykají profilovým LVL 20. Boss má 3 fáze (Jádro/Hněv/Zuřivost, prahy 70 % a 30 % HP): přechod znamená řev, teleport, adds a zrychlení palby (8→10→12 střel). Loot pity se spustí po 4 místnostech bez rare+ (po 3 u Veterána); boss má minimum rare, Veterán epic a Hlubina legendary.

## Progrese a pravidla

Závazný návrh: `docs/progression-rules.md`. Profilový postup = nejlepší dosažená globální
úroveň běhu (`bestLevel`); odemyká šrot (LVL 3), Kovárnu a Knihovnu (6), obchod (9), Arénu a Tržiště (12), synergie (15),
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

**Detailní přehled statistik** (nový): tlačítko **Statistiky** v menu otevírá celkové statistiky napříč všemi běhy (počet běhů, nejvyšší úroveň, zabití, bossové, šrot, herní čas, přesnost střel, střely, poškození ven/dovnitř a odemčení). Level a XP aktivní postavy jsou zobrazeny samostatně na stránce Postava. Koncová obrazovka běhu zobrazuje rozšířené statistiky tohoto běhu: úroveň, zabití, čas, DMG ven/dovnitř, přesnost, střely, šrot a dosaženou místnost.

**XP postavy**: bojové XP se během běhu sčítají dočasně a při porážce nebo
banknutí se připíší aktivní postavě. Každý level-up do capu 30 udělí talentový
bod. Profilové odemykání se nadále řídí pouze nejlepší globální úrovní běhu
(`bestLevel`) a stránkou Cesta. Profilové rekordy/checkpointy a character XP,
talenty, materiály i vybavení zůstávají oddělené.

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
pistole. Komponenty se ukládají na vyrobený archetyp a aplikují se jen na
startovní zbraň aktivní postavy. Detailní tabulky a návaznosti jsou v
[`character-progression-and-armory.md`](./character-progression-and-armory.md).

**Kodex — znalosti a prestiž**: vedle běžných odemčení Kodex eviduje počet
zabití každého nepřítele a šest znalostních úrovní při 1/10/50/200/750/2 000
zabitích. Maximum druhu jednorázově udělí 1 PP, který se ukládá, ale zatím
nemá herní účinek. Tento žurnál je oddělen od CodexBonus; běžné odemčené
položky dál přidávají stávající malé trvalé statistické bonusy. Reset postupu
maže obě části Kodexu.

**Grafika**: herní DOM používá typované mapování ikon z
`src/game/ui-icons.tsx` a Lucide. Canvas vykreslování je v `render.ts`;
zastaralý samostatný asset-loader/SVG placeholder systém není součástí
aktuální architektury.

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

- `src/game/GameView.tsx`: obrazovky, životní cyklus běhu, lokální profilový gate, UI save-boundaries, desktop preference auto-fire a Motion přechody.
- `src/game/input.ts`: sjednocené Actions pro klávesnici, myš, gamepad a mobilní NippleJS joystick.
- `src/game/sim.ts`: stav běhu, souboje, místnosti, odměny, běhové XP/materiály, codex kill-hooky, wave handoff a snapshoty HUD/statistik.
- `src/game/difficulty.ts`: sektory (10 úrovní), globální úroveň, křivka HP/damage/speed/vln a catch-up bonus. Parametry křivky editovatelné (localStorage `vaultbreak.difficulty.v1`).
- `src/game/progression.ts`: jediné mapování profilového `bestLevel` na feature unlocky.
- `src/game/expedition.ts`: portály sektorů, anomálie, šrot, obchod a nabídky báze.
- `src/game/loot-sim.ts`: simulátor nabídek pro správce.
- `src/game/dungeon.ts`: generování místností a vln podle globální úrovně; boss tier přidává vlny po sektorech.
- `src/game/weapons.ts`: generování zbraní, rarity, affixy a unikátní zbraně.
- `src/game/abilities.ts`: výchozí schopnosti/pasivky a jejich generátory.
- `src/game/content-settings.ts`: výchozí katalogy a validace uložených definic.
- `src/game/AdminPanel.tsx`: editor katalogů, simulátor dopadu, obtížnost a import/export; editor volí existující efekty, nedefinuje nové kódové chování.
- `src/game/auth.ts`: správa profilu, přezdívky a 4místného PINu v `localStorage`.
- `src/game/auth-screen.tsx`: obrazovka registrace a přihlášení.
- `src/game/save.ts`: profilové rekordy, checkpointy, souhrnné statistiky a reset postupu (save verze 6).
- `src/game/characters.ts`: verze 1 datového formátu postav, normalizace/migrace legacy XP, XP křivka, talenty, respec a materiálová zásilka.
- `src/game/character-armory.ts` + `src/game/weapon-components.ts`: dropy, recepty, výběr craftovaného startu, ceny a aplikace trvalých komponent.
- `src/game/codex.ts`: jednorázová sbírka/CodexBonus i oddělený žurnál znalostí nepřátel/prestiže.
- `src/game/render.ts`: canvas vykreslování herního světa; DOM ikony jsou centralizované v `src/game/ui-icons.tsx`.

## Spuštění a ověření

Po instalaci závislostí spusť `npm run dev`; aplikace je na `http://localhost:8080`. Projekt cílí na Node.js 22. Ověření změn: `npm run typecheck`, `npm test` a `npm run build`. Celý ESLint běh má v repozitáři existující nálezy `prefer-const` mimo UI editoru.

## Známá omezení

Nastavení správce, obtížnosti, profil a herní save jsou lokální pro prohlížeč;
neexistuje cloudová synchronizace ani bezpečné serverové přihlášení. Formát
dat postav umožňuje seznam identit, avšak tvorba/výběr více postav a tříd
zatím chybí. Body prestiže se ukládají, ale jejich endgame využití ještě není
implementováno. Správce může měnit existující katalogové parametry, ne
definovat nový efekt v kódu. Podrobný backlog je v
[`development-roadmap.md`](./development-roadmap.md).
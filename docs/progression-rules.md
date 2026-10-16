# Pravidla progrese a odměn (zdroj pravdy)

Tento dokument je **závazný návrh systému**, podle kterého se nastavuje celá hra.
Kód se řídí dokumentem, ne naopak. Výjimky schvaluje změna dokumentu, ne hack v kódu.
Implementace: `src/game/progression.ts` (`unlocksForLevel`), `src/game/expedition.ts`,
`src/game/sim.ts`, `src/game/bestiary.ts`.

Číslování sekcí je sekvenční a stabilní — kód na ně odkazuje komentáři `Pravidla §X`.
Nové sekce se přidávají na konec, existující se nikdy nepřečíslovávají.

## 1. Profilová úroveň

- **Žádné XP, žádná měna profilu.** Profilová úroveň = `bestLevel` ze save (nejvyšší dosažená
  globální úroveň napříč všemi běhy).
- `bestLevel` se zapisuje při každém konci běhu (`recordRun` bere maximum). Uložený
  formát má aktuálně verzi (`version: 6`); při načtení se chybějící `bestLevel`
  dopočítá ze staršího `bestRooms`.
  Kumulativní statistiky pro achievementy (`totalKills`, `totalScrap`, `bossesKilled`)
  se přičítají v `recordRun`; chybějící se berou jako 0.
- Vše ostatní (odemykání, minimum lootu, affixy) se odvozuje funkcí `unlocksForLevel(bestLevel)`.
- Důvod: hráč odemyká hraním, ne grindením; nováček není zahlcen, veterán se nenudí.

## 2. Tabulka odemykání

| Profil LVL | Odemkne | Pravidlo |
|---|---|---|
| 1 | Základ: sektor 1–10, loot 3 sloty, báze (heal +35 %, bank, checkpoint), portál Laboratoř | vždy |
| 3 | **Šrot** — rozebírání lootu | `scrap` |
| 6 | **Portály Kovárna + Knihovna** | `forge`, `library` |
| 9 | **Obchod v bázi** (oprava, plátování, vliv) | `shop` |
| 12 | **Portály Aréna + Tržiště** | `arena`, `market` |
| 15 | **Elementární synergie** (do té doby statusy bez kombinací) | `synergy` |
| 20 | **Elitní affixy** (elity i boss; do té doby bez affixů) | `affix` |
| 25 | **Veterán**: pity po 3 místnostech, boss minimum epic | `veteran` |
| 30 | **Torment**: volitelný režim, viz §22 | `torment` |

- Zamčené prvky se v UI **ukazují zamčené s požadavkem** („odemkne se na LVL 3"), nikdy se neskrývají.
- Obrazovka **Cesta** v menu ukazuje celou tabulku (profil, nepřátelé, portály,
  anomálie, sbírka) včetně zamčených řádků a postupu k dalšímu odemčení.
- Menu ukazuje další odemykání („LVL 6 → Kovárna"), aby hráč věděl, za co hraje.

## 3. Reward systém

### 3.1 Sloty nabídek (pevné, od LVL 1)

1. **Vždy zbraň (rám).**
2. Schopnost (30 %) / pasivka (32 %) / zbraň (18 %) / mod (20 %). Kovárna: vždy zbraň. Laboratoř: nikdy zbraň (50/50).
   Knihovna: vždy schopnost. Tržiště: standardní los.
3. Medkit při HP pod 60 %, jinak pasivka. Laboratoř: medkit vždy. Knihovna: vždy pasivka.
   Hladomor: medkit nikdy (§12).
4. Aréna + boss: 4. nabídka (zbraň). Tržiště: 4. nabídka vždy (pasivka).

### 3.2 Rarita

- Základ je progresivní tabulka (`rollRarity`, viz §9), Admin váhy ji přepisují 1:1.
- **Pity timer:** 4 po sobě jdoucí místnosti bez rare+ → nejslabší nabídka se zvedne o tier
  (hodnota +12 %, max mythic; Veterán LVL 25+: už po 3 místnostech). Počítá se i boss loot.
- **Boss minimum:** boss loot obsahuje vždy aspoň rare (Veterán: epic; Hlubina: legendary, viz §13). Jinak beze změny.
- Šrot: common 4, uncommon 7, rare 12, epic 20, legendary 32, mythic 50, medkit 5.

### 3.3 Škálování hodnot

- Zbraň/schopnost/pasivka: základ z katalogu × násobič rarity (`q` = 0 common … 5 mythic):
  poškození ×(1+q·0,18), přebíjení schopnosti ×(1−q·0,06), dosah ×(1+q·0,08),
  trvání ×(1+q·0,1), hodnota pasivky ×(1+q·0,15).
- **Popis je smlouva:** číslo v popisu musí odpovídat tomu, co simulace aplikuje.
  Formát hodnoty: `integer` pro kusy, `percent` pro násobiče/šance, `none` pro boolean.
  Admin záložka Simulátor → Dopad kontroluje shodu a hlásí rozpory jako chyby.

## 4. Elementární synergie (od LVL 15)

Statusy nesou elementy: burn = oheň, slow (mráz) = led, poison = toxic, stun = šok.
Kinetika a void status nemají a do synergií nevstupují.

| Kombinace | Jméno | Efekt |
|---|---|---|
| burn + poison | Toxický výbuch | 25 dmg nepřítele, oba statusy se vymažou |
| slow + stun | Křehkost | +35 % utrženého poškození po 4 s |
| burn + slow | Pára | slow se vymaže, 12 dmg okolí (r 90) |

- Kontroluje se každý tick v `updateEnemies`, před DoT poškozením.
- Do LVL 15 se statusy chovají stejně, jen se nekombinují.

## 5. Elitní affixy (od LVL 20)

Elita nese 1 affix, boss 1 (od 3. sektoru 2; v Hlubině elita 2, viz §13). Affix je vidět:
barevný kroužek + jméno ve stats panelu.

| Affix | Efekt |
|---|---|
| Hbitý | rychlost +35 % |
| Pancéřovaný | HP +60 % |
| Třaskavý | po smrti výbuch (r 60, 50 % bomber-blastu úrovně) |
| Zhoubný | kontaktní dmg +50 % |
| Obří | HP +120 %, větší tělo (r ×1,25) |
| Zběsilý | rychlost +20 %, dmg +25 % |

### 5.1 Fáze bosse

Boss má 3 fáze podle HP: Jádro (100–70 %), Hněv (70–30 %), Zuřivost (pod 30 %).
Přechod: řev, teleport na okraj, vlna adds (Hněv: 2 střelci + 2 rváči; Zuřivost:
2 bombery + 2 trhači), nápis nad bossem.

| Fáze | Střely v salvě | Přebití | Rychlost |
|---|---|---|---|
| Jádro | 8 | 0,7 s | ×1 |
| Hněv | 10 | 0,55 s | ×1,15 |
| Zuřivost | 12 | 0,45 s | ×1,3 |

Fáze 2+ má boss žlutý, fáze 3 červený kroužek; aktuální fáze je ve stats panelu.

## 6. Báze a checkpointy

- Po bossovi sektoru N následuje báze: **+35 % max. HP** (Klid před bouří 50 %),
  **rerolly v bázi = 2**, obchod (§9 v původním číslování — viz ceník níže), volba
  expedice nebo bank (konec běhu, uložení výsledku).
- **Checkpoint se odemyká vstupem do báze**, ne až pokračováním: po bossovi sektoru N
  (1-based) je `maxSector = max(maxSector, N+1)`.
- Pokračování drží celý build (zbraně, schopnost, pasivky, šrot); hráč se objeví
  uprostřed 1. místnosti s 1,5 s nezranitelnosti.
- Bank (`Ukončit a uložit`) zapíše běh (`recordRun`) a vrátí do menu.
- Portály (§2): Laboratoř (LVL 1), Kovárna + Knihovna (LVL 6), Aréna + Tržiště (LVL 12).
  Knihovna dává vždy schopnost + pasivku, Tržiště 4. nabídku (pasivku) v každém lootu.

### Ceník obchodu (ceny rostou se sektorem S, 1-based)

| Zboží | Efekt | Cena |
|---|---|---|
| Plná oprava | HP na maximum | 30 + S·10 |
| Plátování | +15 max. HP (i současné) | 40 + S·15 |
| Vliv v trezoru | +1 reroll, max 4 celkem | 25 + S·10 |

## 7. Rerolly

- Základ **1 reroll na místnost**; Kovárna / Laboratoř / Štědrý trezor +1 každý
  (sčítá se).
- V bázi jsou rerolly vždy 2 (viz §6), nezávisle na portálu.
- Reroll za 0 = deny zvuk, nic se nestane. Reroll generuje loot znovu (§3.1).

## 8. Catch-up (start z checkpointu)

Start ze sektoru N (1-based, N > 1) je nový běh s kompenzací, ne pokračování:

- **+25 max. HP za každý přeskočený sektor**, strop +80
  (N=2: +25, N=3: +50, N=4: +75, N≥5: +80). HP se doplní na nové maximum.
- **+1 reroll do startu** navíc k `roomRerolls` (fresh start má 1).
- Loot i room RNG se posunou o sektor — vyšší start negeneruje identický loot
  jako sektor 1.

## 9. Rarita a tabulky

Postup `t = min(1,35; roomIndex / 8)`, boss vždy `t = 1` (`roomIndex` je 0-based
globální úroveň). Admin váhy tabulku zcela nahrazují.

| Rarita | Váha |
|---|---|
| common | max(0; 0,46 − t·0,5) |
| uncommon | 0,32 − t·0,12 |
| rare | 0,16 + t·0,18 |
| epic | 0,05 + t·0,22 |
| legendary | 0,01 + t·0,16 |
| mythic | boss 0,18, jinak t·0,06 |

- **Unikát:** při legendary 42 %, při mythic 70 % se místo běžné zbraně losuje
  ze seznamu unikátů (váženě; mythic bere i mythic kusy, legendary jen legendary).
- **Affixy zbraně** (`RARITY_MULT`: počet affixů 0/1/2/2/3/3 pro common…mythic):
  prefix s 85 % šancí (váženě), suffix vždy od 2 affixů, třetí affix (jiný prefix)
  se 70 % šancí. Kritická šance +0,03 a kritický násobitel +0,15 za každý affix;
  rozptyl má jitter ±12 %, poškození se zaokrouhluje na 0,1.
- **RARITY_MULT** (dmg / zásobník): common 1 / 1; uncommon 1,08 / 1,05;
  rare 1,18 / 1,1; epic 1,32 / 1,16; legendary 1,5 / 1,22; mythic 1,72 / 1,3.

## 10. Struktura sektoru a vln

- Sektor = 10 místností; elity na 3. a 6. (indexy 2, 5), boss na 10. (index 9).
- Počet vln: `min(diff.waves; 1 + (pos ≥ 2) + (pos ≥ 6))`, max 4.
- Budget vlny: `3 + úroveň + budgetBonus·0,15 + (elita ? 2 : 0) + 2·vlna`.
- Odemykání druhů podle globální úrovně: rusher/shooter/lezec/stopař od 1,
  bomber/tekavka/čepel od 2, splitter/kanónýr/roztoč od 3, tank/stín/jiskra od 4,
  sniper/nosorožec/vrhač od 5, medik/sršeň od 6, drtič/gardista od 8,
  ostrostřelec/bourák od 10, kopí od 12, matka od 14, děs od 16, správce od 20.
- Typy útoku (§20): blízko, výpad, střelba, sebevrah, dělení, podpora, líheň, boss.
- Spawn delay: 1. vlna 0,7 s, další 0,2 s; boss 0,6 s sólo, adds v 8 s
  (tier 2+ další vlna v 10 s).
- **Pauza před další vlnou 2,5 s** s odpočtem v HUD a zvukem; po poslední vlně
  žádná pauza.

## 11. Fáze hry

Fáze se odvozuje od sektoru (`gamePhaseFor`, 0-based), ne od profilu — mid-game
začíná pokaždé v sektoru 2, ať má profil cokoliv. Profi-unlocky (§2) běží paralelně
a týkají se LVL 3–30, tedy celého postupu hrou.

| Fáze | Sektor | LVL | Co je nového |
|---|---|---|---|
| Early-game | 1. | 1–10 | Výuka: čistá pravidla, žádná anomálie, unlocky LVL 3–9 |
| Mid-game | 2.–3. | 11–30 | Sektorová anomálie (§12), boss 2. affix od 3. sektoru |
| End-game (Hlubina) | 4.+ | 31+ | Anomálie + pravidla §13 |

- HUD ukazuje fázi (MID-GAME / Hlubina odznak), stats panel fázi i anomálii.
- Nový obsah se vždy kotví k fázi, nikdy k absolutnímu číslu bez pravidla.

## 12. Anomálie sektoru

- Sektor 1 (idx 0): vždy bez anomálie (pravidlo čistého startu).
- Sektor 2+ (idx ≥ 1): přesně 1 anomálie, deterministická ze seedu + čísla sektoru
  (`anomalyForSector`). Nezávislá na RNG běhu — nedá se přerolovat, stejný seed +
  sektor = stejná anomálie. Vidět je v HUD, stats panelu a v bázi před volbou portálu.

| Anomálie | Efekt |
|---|---|
| Zlatá žíla | loot +2 úrovně, šrot +25 % (zaokrouhleno) |
| Štědrý trezor | +1 reroll v místnosti, medkit v každém lootu |
| Ozvěny | boss +1 nabídka s libovolným portálem (jinak jen Aréna) |
| Klid před bouří | báze léčí 50 % max. HP místo 35 % |
| Hladomor | medkit nikdy nepadá, loot +1 úroveň |
| Přepětí | +1 reroll v místnosti, loot +1 úroveň |

## 13. Hlubina (end-game pravidla)

Sektor 4+ (idx ≥ 3, tier bosse ≥ 3). Anomálie běží dál, navíc pevně:

- Elity nesou **2 různé affixy** (jinak 1).
- Boss loot má minimum **legendary** (jinak rare, Veterán epic).
- Pity po 2 místnostech zůstává výsadou Veterána — Hlubina ho nedává zdarma.

## 14. Denní a týdenní výzva

- Denní: klíč `YYYY-MM-DD` (místní čas), seed `DEN-XXXXXX` (6 znaků, velká písmena).
- Týdenní: klíč ISO týdne `YYYY-Www` (pondělí–neděle, místní čas), seed `TYD-XXXXXX`.
- Jeden seed pro všechny, výsledek = dosažená úroveň; záznam období + historické
  maximum v localStorage. Denní/týdenní běhy se počítají i do profilu (`bestLevel`).
- Menu má obě tlačítka vedle sebe se samostatnými statistikami.

## 15. Kolo štěstí (mutátory)

Po kliknutí na novou hru (i denní/týdenní výzvu, i „Znovu") se otevře popup
s kolem štěstí: **7,5 s plynulého otáčení se zvuky** (tikání + fanfára na konci),
pak se ukážou vylosovaní. Animaci jde přeskočit. Losuje se ze seedu + čísla
sektoru deterministicky (`rollMutators`): **3 různé mutátory** z poolu
16 kladných + 16 záporných, každý s losovanou hodnotou z pevného rozsahu.

Mutátory jsou aura hráče a platí **jen pro aktuální sektor**. Před spuštěním
2. a každého dalšího sektoru (po volbě portálu v bázi) proběhne nové losování;
HP bonus se přepočítá (starý odečte, nový přičte, současné HP se dorovná jen nahoru).

**Proti farmení:** los je čistou funkcí seedu + sektoru — stejný seed + sektor =
stejné 3 mutátory se stejnými hodnotami. Umírání na 1. úrovni pro lepší los
nefunguje; nový los znamená nový seed, tedy nový běh. Denní/týdenní seedy tím
mají pro všechny stejné mutátory (fair play).

| Mutátor | ± | Efekt | Rozsah |
|---|---|---|---|
| Adrenalin | + | rychlost pohybu | 8–15 % |
| Krvežíznivost | + | vysátí ke všem zbraním | 3–6 % |
| Kevlar | + | armor | 8–15 % |
| Přetaktování | + | kadence | 10–20 % |
| Ostré oči | + | kritická šance | 8–15 % |
| Velké kapsy | + | velikost zásobníku | 20–40 % |
| Druhý dech | + | max HP | 20–40 |
| Rychlé ruce | + | kratší přebíjení | 15–25 % |
| Demolice | + | poškození | 10–20 % |
| Ostrostřelec | + | dostřel | 20–50 % |
| Zlatokopectví | + | šrot z lootu | 20–40 % |
| Kluzák | + | dash nabití | +1 |
| Kofein | + | kadence | 6–12 % |
| Dravost | + | poškození | 6–12 % |
| Lehký krok | + | rychlost pohybu | 5–10 % |
| Šťastná ruka | + | kritická šance | 5–10 % |
| Olověné boty | − | rychlost pohybu | 8–15 % |
| Křehké kosti | − | utržené poškození | 8–15 % |
| Krátkozrakost | − | dostřel | 30–50 % |
| Těžké ruce | − | delší přebíjení | 15–30 % |
| Roztřesené ruce | − | rozptyl | 20–40 % |
| Úzké kapsy | − | velikost zásobníku | 20–30 % |
| Tupá čepel | − | poškození | 8–15 % |
| Netrpělivost | − | kadence | 10–20 % |
| Smůla | − | kritická šance | 8–15 % |
| Prázdná peněženka | − | šrot z lootu | 20–40 % |
| Slabé srdce | − | max HP | 15–30 |
| Těžké vybavení | − | dash nabití | −1 (min. 1 celkem) |
| Ztuhlé klouby | − | kadence | 6–12 % |
| Těžká hlava | − | poškození | 5–10 % |
| Děravé kapsy | − | velikost zásobníku | 12–20 % |
| Únava | − | rychlost pohybu | 5–10 % |

- Procentní mutátory se násobí (`1±v`), HP/dash se přičítají. Armor z mutátorů
  má strop ±50 %. Kritická šance nikdy pod 0, dash nikdy pod 1, HP nikdy pod 20.
- Kolo je vidět v menu (pro aktuální seed) a aktivní mutátory ve stats panelu.

## 16. Kam se napojí další funkcionality

- **Kodex:** první výskyt druhu/elementu/synergie se zapíše; pravidla sekcí 4–5 definují, co se sbírá.
- **Nové portály / biomy:** nový záznam v `SECTOR_MODS` + unlock řádek v tabulce §2. Nic víc.
- **Nové mutátory:** nový záznam v `MUTATORS` (kladný/záporný pár drží poměr 50/50); hodnoty se generují samy.
- **Nové mody:** nový záznam v `MOD_DEFS` (§23); generování, loot, šrot i UI si ho najdou.
- **Noví nepřátelé:** nový druh musí být přidán do `EnemyKind`, `ENEMY_ORDER`,
  `ENEMY_NAME`, `ENEMY_SPAWN` (druh, LVL, váha, cena), statistik a tvaru.
  Přidat i mapování dropů/ikony/znalostní záznam a testy; boss se losuje zvlášť
  a do tabulky spawnů nepatří.
- **Karta buildu:** po banku generuje `buildCard.ts` PNG ze snapshotu běhu.

## 17. Výzvy profilu

Šest výzev (`CHALLENGES`), každá max 1× za běh. Splnění dá šrot ihned do běhu
(floater + zvuk) a trvalý odznak do profilu (`vaultbreak.badges.v1`). Postup je
vidět ve stats panelu (VÝZVY), odznaky v menu.

| Výzva | Podmínka | Odměna |
|---|---|---|
| První krev | 25 zabití v jednom sektoru | +30 ⚙ |
| Brokovničář | 20 zabití s brokovnicí v ruce za běh | +40 ⚙ |
| Bez šrámu | vyčištěná místnost bez utrženého zranění | +25 ⚙ |
| Rychlík | sektor vyčištěn do 5:00 času sektoru | +50 ⚙ |
| Lovec elit | 10 zabití v elitních místnostech za běh | +30 ⚙ |
| Bossobijec | boss poražen bez jediného použití schopnosti v boss místnosti | +50 ⚙ |

- Čas sektoru běží od vstupu do sektoru (včetně báze a lootu) a resetuje se
  pokračováním. Zranění v místnosti se počítá po redukci armorem.
- Nové výzvy: nový záznam v `CHALLENGES` + čítač v `Run` + pravidlo výše. Nic víc.

## 18. Kodex

Sbírka všeho, co lze ve hře potkat a sebrat (`src/game/codex.ts`, storage
`vaultbreak.codex.v1` jako `kategorie:id`). Zamčené položky se v UI ukazují jako
`???`; každá odemčená položka přidává minimální trvalý bonus, součet se aplikuje
při startu běhu (HP hned do maxima, poškození/rychlost/kritik do výpočtů).

| Kategorie | Co se zapisuje | Bonus za položku |
|---|---|---|
| Nepřátelé | druh při zabití (`killEnemy`) | +2 max HP |
| Elitní affixy | affix nesený zabitým nepřítelem | +0,5 % poškození |
| Synergie | spuštěná kombinace (toxický výbuch, křehkost, pára) | +1 % poškození |
| Unikátní zbraně | sebraný unikát (párováno jménem, generovaná id jsou náhodná) | +1 max HP |
| Archetypy | archetyp zbraně držené při zabití | +0,5 % poškození |
| Schopnosti | sebraná schopnost | +1 max HP |
| Pasivky | sebraná pasivka | +0,25 % rychlost |
| Mutátory | vylosovaná trojice pro sektor (start i pokračování) | +0,5 max HP |
| Anomálie | anomálie sektoru (start i pokračování) | +1 max HP |
| Portály | zvolený portál při pokračování | +1 % poškození |

- Nová položka kodexu: nový zdroj v `codexEntries()` + `unlockCodex()` na místě
  prvního výskytu/sebrání. Nic víc.
- Jednorázový CodexBonus a znalostní body prestiže jsou dvě úložiště a dvě
  různé odměny; znalostní kill counter nikdy nezvyšuje počet odemčení ani
  bonus k bojovým statistikám.

### Znalost nepřátel a prestiž

Počty zabití a znalostní úrovně nepřátel se ukládají odděleně od sbírkových
odemykání pod `vaultbreak.codex.enemy-knowledge.v1`. Zabité kusy se sčítají
samostatně pro každý druh a úrovně se odemykají při 1, 10, 50, 200, 750 a
2 000 zabitích. Poslední úroveň je záměrně dlouhodobý cíl.

- Dosažení maximální znalosti daného druhu jednorázově udělí **1 bod prestiže**.
- Bod se váže k druhu, nemá současný bojový efekt a je vyhrazen budoucímu
  endgame systému. Opakované zabití po dosažení maxima jej znovu neudělí.
- Kodex zobrazuje počty zabití, aktuální úroveň a postup k dalšímu prahu;
  dosud nepoznaní nepřátelé mají úroveň 0. Souhrn PP ukazuje celkový počet.
- Body prestiže jsou trvalé a záměrně se nemíchají do běžných bonusů Kodexu
  ani do levelu profilu/postavy.

## 19. Achievementy

Dvanáct trvalých met profilu (`src/game/achievements.ts`, storage
`vaultbreak.achievements.v1`). Odemknutí je samo o sobě odměnou; žádné další
staty (ty dává kodex). Vyhodnocují se z profilu (`totalKills`, `totalScrap`,
`bossesKilled`, `maxSector`, `runs`) a počtu položek kodexu při každém uložení
profilu (`commitSave` po `recordRun` i `unlockSector`); nové se ukážou na konci
běhu.

| Achievement | Podmínka |
|---|---|
| Zabiják | celkem 100 zabití |
| Veterán řeže | celkem 1 000 zabití |
| Mlýnek na maso | celkem 5 000 zabití |
| Průzkumník | odemčen 3. sektor |
| Cestovatel Hlubinou | odemčen 5. sektor |
| Sběratel | 15 položek kodexu |
| Archivář | 40 položek kodexu |
| Kronikář trezoru | 70 položek kodexu |
| Šmelinář | celkem 500 šrotu |
| Magnát | celkem 2 500 šrotu |
| Lovec bossů | 5 poražených bossů |
| Vytrvalec | 50 odehraných běhů |

- Čítače běhu: boss se počítá v `killEnemy`, šrot v `scrapLoot`; `recordRun`
  je přičte k profilu. Nový achievement: nový záznam v `ACHIEVEMENTS` + podmínka
  v `earnedAchievements`. Nic víc.

## 20. Balíček obsahu 1.0

Verze 1.0 přidává 25 schopností (36 celkem), 20 nepřátel (28 celkem),
4 archetypy zbraní, 6 unikátů, 4 pasivky, 8 mutátorů, 2 portály a 2 anomálie
(viz tabulky §2, §5, §10, §12, §15). Vše nové se sbírá i do kodexu (§18).

### Nové schopnosti

| Schopnost | Efekt |
|---|---|
| Ohnivá koule | výbušná střela, zapálí okolí |
| Mrazivá nova | zmrazení + zranění kolem |
| Jedová vlna | otrávení + zranění kolem |
| Poprava | drtivý zásah nejslabšímu v dosahu |
| Meteor | velký výbuch před hráčem |
| Salva | 8 odrážejících se střel všemi směry |
| Odstřel | jediná ničivá průrazná střela |
| Šrapnel | kužel 12 střepin |
| Krupobití | déšť 10 mrazivých střel |
| Kouřová clona | omráčení okolí + krátká imunita |
| Statické pole | šok + blesky do okolí |
| EMP výboj | šok + smaže nepřátelské střely v dosahu |
| Volání bouře | až 5 blesků do náhodných cílů |
| Vysátí života | vysaje zdraví z okolí do sebe |
| Krvavá daň | −15 % HP za ničivou novu |
| Ohnivá bouře | velká hořící oblast |
| Ledová zbroj | imunita + mrazivá nova |
| Bašta | imunita + odhození okolí |
| Krok stínů | teleport, omráčí cíl dopadu |
| Zuřivost | přetaktování + zrcadlo najednou |
| Věrný stín | krátký teleport + zdvojené střely |
| Magnetizace | přítáhne všechny dropy |
| Polní oprava | +25 % HP, dobije obě zbraně |
| Polní obvaz | +40 % HP, plný dash |
| Roznětka | hořící/otrávní nepřátelé vybuchnou |

### Noví nepřátelé

| Nepřítel | Typ útoku | Od LVL |
|---|---|---|
| Lezec | blízko (rychlý, slabý) | 1 |
| Stopař | blízko | 1 |
| Těkavka | sebevrah (malý výbuch) | 2 |
| Čepel | výpad | 2 |
| Kanónýr | střelba (dávka 3) | 3 |
| Roztoč | dělení (1×) | 3 |
| Stín | blízko (velmi rychlý) | 4 |
| Jiskra | střelba (brokový rozptyl) | 4 |
| Nosorožec | výpad (těžký) | 5 |
| Vrhač | střelba (3 směry) | 5 |
| Medik | podpora (léčí spojence) | 6 |
| Sršeň | střelba (rychlá, slabá) | 6 |
| Drtič | blízko (těžký tank) | 8 |
| Gardista | střelba (odolný, dávka 3) | 8 |
| Ostrostřelec | střelba (daleká, silná) | 10 |
| Bourák | sebevrah (velký výbuch) | 10 |
| Kopí | výpad (rychlý, daleký) | 12 |
| Matka | líheň (rodí lezce) | 14 |
| Děs | blízko (těžký kontaktní) | 16 |
| Správce | střelba (kruh 8, mini-boss) | 20 |

### Nové zbraně

| Archetyp | Styl |
|---|---|
| Minomet | pomalé těžké výbušné granáty |
| Oblouk | řetězové blesky |
| Roj | hejno naváděných střel |
| Harpuna | průrazná kopí na dálku |

Unikáty: Zvony zkázy (minomet/oheň), Teslův srdec (oblouk/šok), Včelín (roj/toxic),
Dlouhé kopí (harpuna/kinetika, mythic), Polárnice (harpuna/led),
Poslední hřeb (minomet/void, mythic).

### Nové pasivky

| Pasivka | Efekt |
|---|---|
| Regenerace | +HP/s |
| Mrchožrout | +šrot z lootu |
| Nenasytnost | +dmg podle chybějícího HP |
| Soustředění | −rozptyl |

## 21. Výpočet poškození (buckety)

Poškození hráče se skládá z kyblíků (`src/game/scaling.ts`), které se mezi
sebou násobí:

`DMG = základ × vlastnosti × aury × kodex × křehkost × zbroj`

- **Základ** = číslo zbraně/schopnosti (gear je v něm už započtený: rarita, affixy).
- **Vlastnosti** (pasivky, dnes Nenasytnost) a **aury** (mutátory): `1 + DR(bonus)`,
  kde `DR(b) = b / (1 + 0,5·|b|)` — klesající výnosy: +100 % → +67 %,
  +50 % → +40 %, +20 % → +18 %. Postihy symetricky (−20 % → −18 %).
- **Kodex**: `1 + dmgPct` naplno (malé hodnoty, DR by nic neřešil).
- **Křehkost** ×1,35 (debuff na nepříteli, mimo buckety).
- **Zbroj**: `1 − min(0,45; max(0; zbroj − průraznost))`.
  Nepřátelé mají zbroj z úrovně: 0 do LVL 10, pak +1,5 % za úroveň ke stropu
  30 % (Hlubina); Pancéřovaný affix +15 %. Průraznost zbraní (railka, harpuna,
  sniper, Odstřel) ji ignoruje.
- **Statusové DoT** (hoření 9/s, jed 7/s) jdou mimo `hurtEnemy`, a zbroj tak
  **obcházejí** — statusy zůstávají relevantní i pozdě ve hře.
- **Kritika**: strop šance 60 %, strop násobitele ×3 (platí ve střelbě i v UI).
- **Vysátí**: bossové vracejí jen polovinu.
- Hráčská zbroj: strop 30 % (Tlustá kůže), efektivní HP = maxHP / (1 − redukce).

## 22. Torment

Volitelný režim od LVL 30 (checkbox v menu, denní/týdenní výzvy ho nikdy nemají):

- Nepřátelé: HP ×1,25 a dmg ×1,25 (včetně vyvolaných).
- Loot +1 úroveň, šrot z lootu +25 %.
- V HUD svítí odznak TORMENT.
- Nový Torment běh = nový seed; stejný seed + torment = stejný obsah pro všechny.

## 23. Dílna, mody a blueprinty

Zbraně jsou **rámy** s mod-sloty podle rarity (běžná/neobvyklá 1, vzácná/epická 2,
legendární/mýtická 3; unikátní relikvie 0 — neupravují se).

- **Mody** (12 ve 3 rodinách: Stráž, Hlubina, Prototyp) padají z lootu
  (2. nabídka: schopnost 30 % / pasivka 32 % / zbraň 18 % / mod 20 %) do inventáře
  (max 8; plný inventář nový mod rovnou rozebere na šrot). Sází se v Dílně
  (záložka přehledu): element (poslední vyhrává), chování se sčítají, čísla násobí.
- **Setový bonus rodiny**: 2 kusy stejné rodiny +10 % DMG, 3 kusy +25 % DMG.
- **Blueprinty**: zabíjení archetypem se sčítá napříč běhy (flush na konci běhu
  i při odchodu do menu). Ranky: 25 zabití +5 % DMG rámu, 60 zbrojnice
  (startovní rám v menu), 120 +1 mod-slot, 200 +10 % DMG.
- **Zbrojnice**: volba startovního rámu (common) z archetypů s rankem 2+;
  denní/týdenní výzvy mají vždy služební pistoli (fair play).
- Nový mod: nový záznam v `MOD_DEFS` + případně chování do `WEAPON_BEHAVIORS`.
  Nic víc — generování, loot, šrot i UI si ho najdou samy.

## 24. Progrese konkrétní postavy

Účetní postup je výhradně `bestLevel` (§1–§2) a řídí Cestu. Bojová XP z běhu
se připisují vybrané postavě, nikoli profilu. Každá postava má vlastní level,
XP, talentové body a (později) výbavu. Při porážce i banknutí se přidělí již
získaná XP; profilové statistiky, rekordy a checkpointy zůstávají oddělené.

Návrhová křivka, talenty, limity, migrace starých uložených XP a pořadí zavedení
jsou popsány v `docs/character-progression-and-armory.md` §§2–3, 7–8.
Implementace nesmí odvozovat unlock na Cestě z levelu postavy.

## 25. Výroba a trvalé úpravy zbraní

Vyrobená zbraň patří zvolené postavě a lze ji vybrat jako startovní výbavu
před běžným během; denní a týdenní výzvy používají vždy služební pistoli.
Kovárna/crafting se odemyká při profilovém LVL 6 a nesmí se řídit levelem
postavy. Běžný recept stojí 8 fragmentů, 3 slitiny a 40 šrotu; pokročilý
12 fragmentů, 4 slitiny, 2 jádra a 80 šrotu. Fragmenty archetypů, šrot, slitiny, energetická jádra a
elementární katalyzátory mají odlišné zdroje; žádný základní recept není
uzamčen za jediný náhodný drop. Elity a bossové přispívají garantovanou
materiálovou odměnou.

Výroba ani úpravy nemění profilové odemykání (§1–§2). Trvalé komponenty
vyrobených zbraní jsou oddělené od běhových modů a blueprint ranků dle §23.
Dropy získané během běhu se do postavy uloží až při porážce nebo banknutí.
Talenty se nakupují před během; reset vrací body za 30 šrotu + 2 slitiny a
cena každým resetem stoupá o 20 šrotu + 1 slitinu.
Podrobné tabulky zdrojů, ceny a stav implementace jsou v
`docs/character-progression-and-armory.md` §§3–8.

## 26. Systémové napojení a rozšíření

Tato sekce doplňuje pravidla o implementační tok. Podrobný přehled datových
vlastníků, lifecycle, lokálního úložiště a ovládání je v
`docs/game-systems-reference.md`.

### 26.1 Oddělené zdroje postupu

- `save.ts` ukládá profilové rekordy a `bestLevel`. `progression.ts` odvozuje
  unlocky pouze z tohoto maxima; level postavy ani XP z právě probíhajícího
  běhu nesmějí odemknout položku Cesty před uzavřením běhu.
- `characters.ts` ukládá aktivní postavu. XP běhu se připisuje až při
  `finishRun`; každý získaný level přidá jeden talentový bod. Při sestavení
  dalšího běhu se talentové bonusy předají simulaci jako nastavení.
- `sim.ts` vlastní dočasné XP, zásilku materiálů, loot, mody, výzvy i stav
  souboje. Tato běhová vrstva se převede do profilu/postavy jen přes
  uzavírací tok; ukončení bez dokončení nezapočítá zásilku.

### 26.2 Kill událost jako sdílený bod integrace

Po validním zabití nepřítele se vykonávají samostatné výstupy:

1. běhové kill/XP/statistiky a případný postup výzvy;
2. jednorázové odemknutí položky Kodexu, jehož CodexBonus se uplatňuje při
   konstrukci dalšího běhu;
3. navýšení trvalého počítadla znalosti v
   `vaultbreak.codex.enemy-knowledge.v1`;
4. progres blueprintu používaného pro starší profilovou zbrojnici;
5. dočasný drop fragmentů a materiálů do zásilky postavy.

Jde o různé odměny. Změna jedné nesmí duplicitně připsat ostatní. Knowledge
prahy jsou 1/10/50/200/750/2 000 zabití na druh. Pouze první dosažení maxima
každého druhu přidělí 1 PP; prestiž se ukládá, ale zatím ji nelze utratit.

### 26.3 Vstupní a prezentační tok

- `input.ts` převádí klávesnici, myš, gamepad a joystick na jediný `Actions`
  objekt pro simulaci. Mobilní režim zapíná `GameView`; auto-fire je na mobilu
  vynucený a na desktopu volitelný.
- Je-li auto-fire aktivní a hráč se pohybuje, simulace míří ve směru pohybu;
  bez pohybu zachová aktuální směr. Jinak zůstává dostupné míření myší či
  pravým gamepadovým stickem. Odstranění pravého touch sticku nemění gamepad.
- `HudSnap`/`StatsSnap` jsou projekce simulace pro UI, nikoli další zdroj
  herních hodnot. Motion přechody/progress prvky pouze animují již vypočtené
  stavy; `prefers-reduced-motion` nesmí měnit hratelnost.

### 26.4 Rozšíření obsahu

Před přidáním nového nepřítele, zbraně, materiálu, talentu nebo odměny je
nutné aktualizovat:

- autoritativní definici obsahu a generátor/drop mapování;
- systémový konzument (simulace, recept, damage bucket nebo profilový unlock),
  pokud nový obsah mění chování;
- UI ikonku, přístupný název a zobrazení stavu/nákladů;
- normalizaci uložených dat, pokud vzniká nové trvalé pole nebo klíč;
- cílený test pravidla a dokumentaci v tomto souboru či v příslušném
  specializovaném pravidlovém dokumentu.

Nová funkce se nesmí opírat jen o textový popis: její skutečný efekt musí být
napojen do `Run`/příslušného vlastníka stavu a ověřen testem.

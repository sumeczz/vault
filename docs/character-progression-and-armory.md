# Postavy, levelování a zbrojnice

Návrh rozšiřuje progresi VAULTBREAK bez změny pravidla, že účetní odemykání
probíhá přes stránku **Cesta**. Profil, postava a aktuální běh jsou tři odlišné
vrstvy. Tento dokument doplňuje `progression-rules.md`; nemění odemykání profilu
ani obsah existujících odměn v běhu.

## 1. Cíle a hranice

- **Profil/účet** vlastní odemykání funkcí podle nejvyšší dosažené globální
  úrovně běhu (`bestLevel`) a postup zobrazený na stránce Cesta.
- **Postava** vlastní své bojové XP, level, talentové body, trvalé talenty,
  vyrobené zbraně a materiály. XP a bonusy jedné postavy se nepřenášejí na jinou.
- **Běh** vlastní dočasný level, zbraně a build. Tyto hodnoty se po skončení
  běhu nestávají permanentním levelem postavy.
- Při porážce i dobrovolném banknutí se postavě připíšou všechna XP získaná
  během běhu. Profil si zachová dosažený rekord a odemykání.
- Zbraň vyrobená před během je volitelná startovní výbava; kořist a upgrady
  nalezené během běhu zůstávají samostatnou roguelite vrstvou.

Veškeré ceny, prahy a váhy níže jsou počáteční návrhové hodnoty k testování.
Před vydáním se ověří simulací délky postupu a skutečných dropů.

## 2. Level postavy

První verze používá jednu výchozí postavu a strop **30 levelů na postavu**.
Datový model však počítá s více samostatnými postavami, každou s vlastním
identifikátorem. Nová postava začíná na levelu 1 bez XP a talentových bodů.

### XP

- XP se získává za poražené nepřátele v běhu, stejně jako nynější bojové XP.
- Výchozí odměna odpovídá současné simulaci: běžný nepřítel 10 XP,
  matka/správce 25 XP, boss 50 XP.
- Základní křivka pro level `L`:
  `XP(L → L+1) = round(100 × 1.12^(L−1))`.
- XP do dalšího levelu se zobrazují u postavy a v HUD jako **XP postavy**;
  čítač se po každém postupu správně přenese i přes více levelů v jednom běhu.
- Při dosažení stropu se další XP nepřevádějí na skrytou sílu. Získaná XP se
  evidují ve statistikách, ale neudělují další levely ani body.

Převod existujícího uloženého postupu: profilová XP z dosavadního formátu se
jednorázově převedou na výchozí postavu. `bestLevel` zůstává v profilu beze změny
a nadále řídí Cestu.

## 3. Odměna za level a talenty

Každý level-up mezi 1 a 30 udělí **1 talentový bod**. První level-up tak dá
postavě jeden bod; bod se utrácí ručně mezi běhy. Body se neudělují za level,
který už postava měla při migraci, aby dříve získaný progres nevytvořil
neočekávaný náskok; migrace ponechá stávající level, XP a celkový čítač.

Implementované trvalé efekty: Výdrž přidá +8 max. HP za stupeň, Balistika
zvyšuje poškození zbraní o 3 % za stupeň a Polní sběr přidává 5% šanci na
další běžný materiál za stupeň. Bonusy se načtou při tvorbě běhu a neovlivňují
profilový `bestLevel`.

### Talentové větve

První strom tvoří tři větve, každá s pěti stupni. Jeden stupeň stojí jeden bod.
Každá větev má hard cap 5; talentový bod nelze utratit bez potvrzené a platné
volby.

| Větev | Bonus za stupeň | Strop | Účel |
|---|---|---:|---|
| Výdrž | +8 maximálního zdraví | +40 HP | víc prostoru na chybu |
| Balistika | +3 % poškození zbraní | +15 % | přímý, kontrolovaný růst síly |
| Polní sběr | +5 % šance na dodatečný běžný materiál z nepřátel | +25 % | lepší přístup k výrobě, ne přímé poškození |

Efekty se počítají jako aditivní bonusy mimo běhové rarity a násobiče; stejné
bonusy se nesmí přidat dvakrát při restartu nebo návratu z báze. Žádná větev
nepřekročí strop a souhrnný permanentní bonus je omezený tak, aby roguelite
výběr odměn zůstal hlavním zdrojem síly během běhu.

### Odemčení a respec

- Level 1: základní stupně talentů.
- Level 5: zpřístupní se druhé stupně.
- Level 10: třetí stupně.
- Level 20: čtvrté stupně.
- Level 25: páté stupně.
- Talent lze resetovat před během za šrot a slitiny. První reset stojí 30 šrotu
  a 2 slitiny; každé další zvýší cenu o 20 šrotu a 1 slitinu. Utracené body se
  vrátí.
- Budoucí třídy mohou talentový strom obměnit, nemění však účetní Cestu.

## 4. Zdroje a zbraňové fragmenty

Postava má inventář materiálů bez oddělených desítek téměř totožných měn.
První sada obsahuje:

| Materiál | Hlavní zdroj | Použití |
|---|---|---|
| Šrot | současný systém rozebrání lootu a odměny | běžná výroba a práce v bázi |
| Slitiny | obrnění nepřátelé, vyšší sektory, Kovárna | rámy, hlavně, odolné komponenty |
| Energetická jádra | elity, bossové, Laboratoř | zásobníky, kadence, schopnostní/energetické upgrady |
| Elementární katalyzátory | elementární nepřátelé a tematické anomálie | výroba či změna elementu |
| Fragment archetypu | nepřátelé a lokace podle archetypu | výroba konkrétní zbraně |

Drop není zaručený z každého běžného nepřítele. V sektoru 1 má běžný nepřítel
20% šanci na fragment svého archetypu a 30% šanci na materiál; obě šance rostou
se sektorem. Polní sběr přidá 5% šanci za stupeň na další běžný materiál.
Každý nepřítel v elitní místnosti zaručí fragment i materiál. Boss vždy dá
3 fragmenty náhodných archetypů, 2 slitiny a 1 energetické jádro.
Garantovaná odměna elit a bossů brání tomu, aby recept závisel pouze na RNG.

Počáteční mapa zdrojů:

| Zdroj / lokace | Preferované dropy |
|---|---|
| běžní protivníci | materiál podle druhu; fragment cílového archetypu |
| obrnění protivníci | slitiny; např. Tank → brokovnice, Gardista → puška |
| rychlí a rojoví protivníci | např. Trhač/Těkavka → samopal, Sršeň/Roztoč → roj |
| Jiskra / Děs / Matka | šokový / void / toxický katalyzátor |
| elita | garantovaný fragment i materiál za každé zabití v elitní místnosti |
| boss | garantované 3 náhodné fragmenty, 2 slitiny a jádro |
| portál Kovárna | při materiálovém dropu upřednostní slitiny |
| portál Laboratoř | při materiálovém dropu upřednostní jádra a katalyzátory |
| Aréna / vyšší sektor | větší výnos, ale bez výhradního materiálu nutného pro základní zbraň |

Mapování všech druhů na fragment archetypu je v
`src/game/character-armory.ts`; používá stávající nepřátele, elementy a
sektorové portály Kovárna/Laboratoř.

## 5. Výroba a zbrojnice

Každá zbraň vyžaduje recept odemčený s Kovárnou na profilovém LVL 6 a přesné
množství fragmentů svého archetypu, materiálů a šrotu. Běžný recept stojí
8 fragmentů, 3 slitiny a 40 šrotu; pokročilý 12 fragmentů, 4 slitiny,
2 jádra a 80 šrotu. Duplicitní fragmenty se sčítají; výroba bez zdrojů ani
výroba již vlastněné zbraně není povolena.

Po výrobě zbraň patří do zbrojnice vybrané postavy. Před během lze zvolit
nejvýše jednu vyrobenou startovní zbraň. Dosavadní pistole zůstává záložním
rámem. Denní a týdenní běhy používají vždy služební pistoli; vyrobená zbraň
postavy má přednost před starším výběrem z profilových blueprintů.

Návrhové ceny základních receptů:

| Třída receptu | Fragmenty archetypu | Slitiny | Jádra | Katalyzátor | Šrot |
|---|---:|---:|---:|---:|---:|
| Běžný archetyp | 8 | 3 | 0 | 0 | 40 |
| Pokročilý archetyp | 12 | 4 | 2 | 0 | 80 |
| Elementární varianta | 12 | 3 | 2 | 2 stejného elementu | 100 |
| Unikát / relikvie | speciální recept | zkouška boss dropu | zkouška boss dropu | podle efektu | individuálně |

Recepty jsou návrhová vrstva, nikoli další profilový unlock. Kovárna jako
funkce zůstává gated přes Cestu podle `progression-rules.md`.

## 6. Úpravy vyrobených zbraní

Trvalé komponenty jsou uložené na postavě a konkrétní vyrobené zbrani; profilové
blueprinty, lootové mody a nalezené zbraně zůstávají oddělené. Kovárna musí být
odemčená přes profilovou Cestu na LVL 6 a cílový archetyp musí být vyrobený.
Každá zbraň má tři sloty, po jednom osazeném komponentu v každém:

| Slot | Komponenta | Efekt za každý stupeň |
|---|---|---|
| Hlaveň | Přesná hlaveň | +3 procentní body kritické šance |
| Hlaveň | Prodloužená hlaveň | +8 % dostřelu |
| Hlaveň | Průrazná hlaveň | +8 procentních bodů průraznosti zbroje |
| Hlaveň | Těžká hlaveň | +8 % poškození, −6 % kadence |
| Zásobník | Rozšířený zásobník | +20 % kapacity, +8 % času přebití |
| Zásobník | Rychlopřebíjení | −8 % času přebití, −6 % kapacity |
| Zásobník | Vysokotlaký zásobník | +7 % kadence, −8 % kapacity |
| Jádro | Kinetické jádro | Zachová kinetický element, +6 % poškození |
| Jádro | Žhavé jádro | Oheň, hoření, +3 % poškození |
| Jádro | Kryogenní jádro | Led, zpomalení na 0,25 s, +2 % poškození |
| Jádro | Výbojové jádro | Šok, +10 procentních bodů šance na omráčení, +2 % poškození |
| Jádro | Toxické jádro | Toxický element, jed, +3 % poškození |
| Jádro | Jádro prázdnoty | Void, +1 řetězový cíl, +2 % poškození |

Každá komponenta má tři stupně, odemykané úrovní postavy **1 / 10 / 20**.
Náklady za jeden nákup (včetně prvního osazení) jsou:

| Stupeň | Relevantní materiál | Šrot | Jádra | Úroveň postavy |
|---|---:|---:|---:|---:|
| 1 | 2 slitiny nebo 2 katalyzátory příslušného elementu | 20 | 0 | 1 |
| 2 | 4 slitiny nebo 4 katalyzátory příslušného elementu | 45 | 1 | 10 |
| 3 | 7 slitin nebo 7 katalyzátorů příslušného elementu | 80 | 2 | 20 |

Při upgradu téže komponenty se kupuje další stupeň. Výměna za jiný typ stejného
slotu osadí nový kus na stupeň 1 a účtuje jeho plnou cenu; původní komponenta
ani materiály se nevracejí. Potvrzovací krok ukáže cenu před odečtem. Jádra
spotřebují katalyzátor elementu dané varianty; kinetické jádro používá slitiny.

Samostatná stránka Kovárny odděluje výrobu od úprav přepínačem režimů.
Materiálový sklad zůstává přehledný nad oběma režimy; výroba nabízí recepty a
drop zdroje vybrané zbraně, úpravy filtrují zbrojnici jen na vyrobené zbraně.
Sloty komponent jsou kompaktní přepínače, takže se současně zobrazuje pouze
jeden slot a jeho varianty. Kovárna zobrazuje aktuální konfiguraci, efekty
komponent, dostupné materiály a porovnání statistik před/po. Náhled používá reprezentativní běžnou zbraň
archetypu; skutečné rozmezí startovní zbraně se stále losuje při startu běhu.
Komponenty se aplikují pouze na startovní zbraň vyrobenou aktivní postavou.
Denní/týdenní služební pistole, profilová záložní zbraň ani zbraně nalezené
během běhu komponenty nepřebírají.

Stávající mody a blueprinty (`progression-rules.md` §23) se zachovají.
Řemeslné komponenty mají odlišný účel od loot modů: komponenta je trvalá
konfigurace vyrobené zbraně, mod zůstává předmět nalezený a zasazovaný během
běhu.

## 7. Ukládání, migrace a ochrana postupu

- Uložit postavy pod odděleným verzovaným klíčem; každá postava má stabilní ID.
- Účetní save nadále vlastní `bestLevel`, statistiky běhů a checkpointy.
- XP postavy, talentové body, ranky talentů, respecy, materiály, fragmenty,
  vyrobené archetypy a startovní výbava se ukládají s postavou pod
  `vaultbreak.characters.v1`, ne v účtu.
- Migrace současných profilových XP do výchozí postavy se provede jednou a bez
  vymazání `bestLevel`; starší save bez XP začíná jako postava level 1.
- Reset profilu jasně vysvětlí, zda resetuje i postavy, než je potvrzen. Export
  a import uložených postav se doplní před přidáním více postav.
- Zásilka zdrojů se ukládá při porážce nebo banknutí; při opuštění běhu před
  ukončením se ztrácí. Zápisy talentů a výroby probíhají při potvrzené akci,
  ne v herním snímkovacím cyklu. Neplatný save spadne na bezpečné výchozí
  hodnoty bez změny účtového unlocku.

## 8. Implementační etapy

1. **Rozdělení progrese:** samostatné verzované uložení postavy, převod XP,
   oddělené profilové rekordy, testy a jasné označení XP postavy v UI.
2. **Talenty:** body za level-up, limity a unlocky stupňů, respec a aplikace
   bonusů při tvorbě běhu.
3. **Kořist materiálů:** datové drop tabulky podle archetypu, nepřítele,
   elementu a lokace; garantované odměny elit/bossů.
4. **Výroba:** recepty, fragmenty, materiály, UI Kovárny a výběr startovní
   zbraně; validace cen i denních/týdenních běhů.
5. **Trvalé úpravy:** sloty, ceny, porovnání před/po, potvrzení nákladů a
   oddělení od existujících loot modů.
6. **Více postav/tříd:** výběr, vytvoření postavy, samostatné ukládání a
   specializované stromy po ověření prvních pěti etap.

### Stav práce

- Návrh i datové hranice: sepsané.
- Etapa 1: hotovo; samostatný character save, migrace starých XP, zápis XP po
  běhu a HUD/postava používají odteď úroveň konkrétní postavy.
- Etapa 2: hotovo; nákup talentů, prahy, trvalé bonusy a respec za rostoucí cenu.
- Etapa 3: hotovo; dropy materiálů/fragmentů, cílené zdroje nepřátel,
  garantované zásilky elit/bossů a bankování po konci běhu.
- Etapa 4: hotovo; recepty, validace nákladů, UI Kovárny a volba vyrobené
  startovní zbraně; denní/týdenní výzvy zůstávají na standardní pistoli.
- Etapa 5: hotovo; komponenty na vyrobených zbraních, tři sloty a stupně,
  ceny podle surovin, levelové brány, potvrzení výměny, náhled statistik,
  uložení na postavě a použití pouze na vyrobené startovní zbrani. Výroba a
  úpravy jsou dostupné na samostatné stránce Kovárny, oddělené od přehledu
  postavy.
- Etapa 6: čeká; více postav/tříd.

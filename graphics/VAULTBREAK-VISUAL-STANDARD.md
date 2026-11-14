# VAULTBREAK — jednotný vizuální standard
Verze 1.0 · 14. 11. 2026 · Závazná specifikace pro UI, HUD a herní grafiku

> **Účel:** Každá obrazovka, nabídka, karta, ikona, herní prvek a budoucí asset musí působit jako součást jedné hry. Tento dokument je společný vizuální kontrakt. Nová stránka nesmí zavádět vlastní barvy, typografii, rámečky, ikony ani rozměrový systém.

## 0. Rozsah, zdroje a priorita pravidel

Dokument vznikl rozborem všech pěti souborů ve složce `graphics/` a kontrolou současných pravidel UI, CSS tokenů, ikon, asset manifestu a výrobní dokumentace.

| Zdroj | Rozměr | Co určuje |
|---|---:|---|
| `Specifikace UI a vizuálního stylu VAULTBREAK.png` | 1024×1536 | hlavní mobilní UI, barvy, typografii, layout, tlačítka, karty, navigaci, HUD a ikony |
| `Vaultbreak_ Sci-fi asset bible.png` | 1536×1024 | tematiku světa, prostředí, zbraně, nepřátele, materiály, efekty a obecnou vizuální identitu |
| `Vaultbreak_ Systém lootu a rarit.png` | 1024×1536 | rarity, loot drop, inventář, detail zbraně, porovnání a affixy |
| `ff785ce1-2538-4224-bdc8-63220acca979.png` | 1672×941 | referenční záběr boje, rozmístění HUD a mobilních ovladačů v herní scéně |
| `Atlas sci-fi vojáka v brnění.png` | 1536×1024 | referenční siluetu, orientace a varianty póz postavy; nikoli hotový sprite sheet |

### Hierarchie při rozporu

1. **Herní pravidla a skutečné hodnoty:** kód, typy, bestiary a `docs/progression-rules.md`. Vzhled nesmí vymýšlet mechaniku.
2. **Rozložení a komponenty UI:** tento dokument společně s `docs/ui-rules.md`. Nové obrazovky přebírají komponenty a tokeny odtud.
3. **Vizuální téma světa:** sci-fi komiksová asset bible jako tematická reference.
4. **Technické zpracování herních spriteů:** aktuálně schválený `docs/asset-production-plan.md`, `docs/player-basic-combat-asset-brief.md` a `public/assets/game/manifest.json`.

### Zjištěný rozpor, který se nesmí zamaskovat

Obrázky UI a asset bible ukazují **sci-fi komiks / cel-shaded** styl, futuristickou zbroj, energetické zbraně a industriální sci-fi prostředí. Později schválená výrobní dokumentace herních spriteů však stanovuje **retro arcade comic pixel-art**, ruční dokončení v LibreSprite a výslovně zakazuje sci-fi brnění, energetické zbraně a fantasy rekvizity. Proto platí:

- UI, karty, ikony, panely, rámečky, HUD a layout se řídí vizuálními referencemi a tímto standardem.
- Herní sprite produkce zůstává v dosud schváleném pixel-art workflow, dokud nebude art direction výslovně změněn.
- Atlas vojáka a sci-fi asset bible jsou pro sprite produkci pouze tematické/poziční reference; nejsou automaticky schválené finální assety.
- Nikdo nesmí tento rozpor řešit tím, že na jedné stránce použije pixel-art postavu a na druhé realistický 3D render. Případná změna směru musí být schválena jednou změnou tohoto dokumentu a asset plánu.

## 1. Základní identita VAULTBREAK

- Žánrový dojem: sci-fi roguelite looter, industriální trezor / laboratoř / aréna, akční a čitelný.
- UI: tmavé, technické, čisté, s jasnou hierarchií a výraznými akcenty.
- Ilustrace a herní svět: komiksové/cel-shaded reference, tvrdé světlo a stín, výrazné obrysy, siluety a lokální světelné zdroje.
- Rozhraní musí zůstat čitelné i při rychlém boji. Efekt, textura ani dekorace nesmí přebít číslo, název, stav nebo akční tlačítko.
- Jeden význam = jedna vizuální konvence napříč celou hrou. Barva, tvar, ikona a umístění se nesmí měnit podle stránky.

## 2. Barvy — centrální tokeny

### 2.1 Základní UI paleta

| Token / role | HEX | Použití |
|---|---|---|
| Background | `#080D13` | hlavní pozadí obrazovek |
| Surface | `#101923` | základní karty, panely a navigace |
| Raised surface | `#172431` | zvýšené karty, vybrané plochy a vnitřní panely |
| Border | `#304354` | běžný obrys, oddělovač, neaktivní rámeček |
| Text primary | `#F3F6FA` | hlavní text a hodnoty |
| Text secondary | `#A8B6C5` | popis, metadata a méně důležité údaje |
| Blue accent | `#43BFFF` | výběr, technologie, navigace, focus, aktivní prvek |
| Orange accent | `#FF8A24` | hlavní akce, důležité vybavení, energie a interakce |
| Success | `#52D69A` | splněno, potvrzeno, pozitivní stav |
| Danger | `#FF555B` | kritické nebezpečí, poškození, boss alert |
| Purple accent | `#B58AFF` | speciální/epické, výzvy a sekundární vzácné akcenty |

### 2.2 Pravidla použití barvy

- Pozadí je vždy nejtmavší; obsahové plochy se od něj odlišují o jeden až dva stupně.
- Modrá označuje aktivní výběr, technologii, focus a informační progres. Oranžová označuje hlavní akci a výrazný interaktivní prvek.
- Zelená je pouze pozitivní stav; červená pouze nebezpečí/chybu/poškození. Fialová označuje zvláštní nebo vzácný obsah.
- Barva nesmí být jediným nositelem informace. Každý stav má zároveň ikonu, text, tvar nebo číselný údaj.
- Nepoužívat nové lokální HEX hodnoty, pokud existuje odpovídající token. Průhlednost a jemné odstíny se tvoří z tokenu přes opacity/color-mix.
- Žlutá `#FFD24A` z asset bible je doplňkový akcent pro zvláštní odlesk či odměnu; nenahrazuje oranžovou hlavní akce ani raritní barvy.
- Všechny nové barvy musí být doplněny do centrálních tokenů, ne zapsány pouze do jedné komponenty.

## 3. Rarita — jediný společný systém

Hra má šest interních rarit v tomto pořadí: `common`, `uncommon`, `rare`, `epic`, `legendary`, `mythic`. Vizuální rarity se používá u zbraní, schopností, pasivek, modů, loot dropu, inventáře, detailu, porovnání, odměn i souhrnů.

| Interní hodnota | Český název | Barva | Vizuální charakter |
|---|---|---|---|
| `common` | Běžná | neutrální šedomodrá `#8A9099` | klidný rámeček, bez výrazné záře |
| `uncommon` | Neobvyklá | zelená `#52D69A` | jemný zelený akcent |
| `rare` | Vzácná | modrá `#43BFFF` | jasnější modrý obrys |
| `epic` | Epická | fialová `#B58AFF` | fialový obrys a mírná záře |
| `legendary` | Legendární | oranžová `#FF8A24` | silnější teplý obrys a omezený glow |
| `mythic` | Mýtická | červená `#FF555B` | nejvýraznější speciální rámeček a symbol |

- Referenční loot obrázek používá název „Exotická“ pro nejvyšší červenou kategorii. Kód hry ale používá `mythic` / „Mýtická“. V UI se zachová skutečný interní název a lokalizace hry; kvůli obrázku se nepřejmenovává datový typ.
- Rarita mění pouze barevný akcent, symbol a intenzitu obrysu/záře. **Nikdy nemění rozměr, vnitřní mřížku, polohu názvu ani pořadí statistik karty.**
- Legendární a mýtická karta mohou mít výraznější okraj, ne jinou geometrii.
- Rarita se vždy zobrazuje textem a/nebo ikonou; nesmí být rozpoznatelná pouze podle barvy.
- V inventáři musí být rarita čitelná i v malém náhledu: barevný horní proužek/okraj + drobný symbol nebo zřetelný štítek.

## 4. Typografie

- Jednotný font: **Inter**, fallback `Segoe UI`, následně `system-ui`, včetně podpory české diakritiky.
- Nepřidávat další display font pro jednotlivé stránky. Logo je samostatný brand asset, ne vzor pro běžný text.
- Nadpisy jsou výrazné, krátké, bílé; technické štítky mohou používat uppercase a tracking.
- Technická čísla, seed, časy a hodnoty používají tabulární číslice/monospace pouze v místech, kde to zlepšuje porovnání.
- Text v ilustracích se negeneruje. Všechny názvy, hodnoty a štítky jsou skutečné UI textové vrstvy.

| Role | Velikost |
|---|---:|
| Logo / wordmark | 28–36 px |
| Nadpis obrazovky | 24–28 px |
| Nadpis sekce | 16–18 px; technický uppercase štítek 11–12 px |
| Název karty | 15–17 px |
| Základní text | 14–16 px |
| Popis / sekundární text | 12–14 px |
| Technický text | 11–12 px |
| Klíčová statistika | 18–24 px |

Technický text nikdy nesmí klesnout pod 11 px. Na mobilu se text raději zalomí nebo zkrátí s dostupným detailem než zmenší pod tuto hranici.

## 5. Mřížka, rozměry a responzivita

### 5.1 Referenční mobil

- Referenční viewport: **390 px portrait**.
- Obsahový sloupec: **358 px**, maximální šířka `max-w-md`, na desktopu centrovaný.
- Horizontální odsazení: **16 px**.
- Vnitřní odsazení karty: **12–16 px**.
- Mezery mezi prvky: **8–12 px**; mezera sekcí: **20 px**.
- Spodní rezerva stránky s navigací: **112 px**.
- Safe area: nahoře `max(12px, env(safe-area-inset-top))`, dole podle `env(safe-area-inset-bottom)`.
- Na 390 px nesmí vzniknout horizontální overflow.
- Hlavní stránky jsou scrollovatelné sloupce; dialogy mají vlastní scroll a nesmí překročit dostupnou výšku viewportu.

### 5.2 Desktop a landscape

- Používá stejnou typografii, barvy, karty, ikony a pořadí informací jako mobil.
- Větší šířka dovoluje více sloupců, nikoli nové komponenty nebo jiné barevné schéma.
- Herní bojový screenshot 1672×941 je landscape reference pro scénu a rozložení prvků v boji; nenahrazuje portrait-first specifikaci menu a metastránek.
- Rozložení HUD se může přizpůsobit dostupné ploše, ale jeho skupiny a významové pozice zůstávají stejné.

## 6. Tlačítka a interaktivní prvky

### 6.1 Primární akce

- Oranžové `#FF8A24`, tmavý text `#080D13`, bold 18–22 px.
- Výška 64–76 px, radius přibližně 16 px.
- Jedna hlavní primární akce na obrazovku nebo dialog: například Nový běh, Pokračovat, Znovu, Vzít, Vyměnit, Start vlna.
- Ikona vlevo, text uprostřed; ikona nikdy nesmí nahradit popisek hlavní akce.

### 6.2 Sekundární akce

- Tmavý povrch, obrys `#304354`, světlý text 14–16 px.
- Výška 48–56 px, stejný radius a vnitřní odsazení napříč aplikací.
- Hover/focus zvýrazní obrys modře; pressed stav krátce ztmaví nebo zmenší prvek, ale nesmí posunout okolní layout.

### 6.3 Ikonová tlačítka, výběr a přepínače

- Dotyková plocha minimálně **48×48 px**; ikona obvykle 20–24 px.
- Výběr: modrý obrys + jasnější povrch + zřetelný aktivní indikátor.
- Zamčeno: zámek + konkrétní podmínka; nikdy jen snížená opacity.
- Přepínač: jednotná geometrie 52×30 px, oranžový stav ON, tmavý OFF, světlý jezdec.
- Focus-visible: 2px modrý obrys s odsazením; musí fungovat klávesnicí.
- Neaktivní/disabled: tlumený kontrast, žádný hover glow, ale text zůstává čitelný.

## 7. Karty, panely a dialogy

### 7.1 Základní karta

- Surface `#101923`, border `#304354`, radius 12–16 px (větší hero/dialog 16–24 px).
- Nadpis 15–17 px, popis 12–14 px, vnitřní odsazení 12–16 px.
- Jedna karta = jeden tematický celek. Nemíchat několik nezávislých akcí do jedné karty.
- Všechny karty stejného typu sdílejí rozměry, vnitřní mřížku a pořadí obsahu.

### 7.2 Stavové karty

- Neutrální: standardní border.
- Aktivní/vybraná: modrý border a slabý modrý povrch.
- Splněno: zelený border + ikona potvrzení + text stavu.
- Nebezpečí: červený border + ikona + konkrétní stav.
- Zamčeno: zámek + požadavek/podmínka.
- Stavová varianta nemění geometrii ani rozložení karty.

### 7.3 Hero a dialog

- Hero ilustrace je oddělena od textové plochy; text je vždy na kontrastním neprůhledném nebo ztmaveném podkladu.
- Dialog používá jednotný tmavý povrch, jemný border, velký radius a stín. Nesmí dostat vlastní náhodný styl.
- Dlouhý dialog má vlastní scroll; primární akce a návrat/zavření musí zůstat dosažitelné.

## 8. Spodní navigace a stránky

- Jednotné pořadí navigace podle aktuálního produktu: **Domů / Postava / Kovárna / Kodex / Úspěchy / Cesta**.
- Ikona 20 px + krátký text 11 px; minimální výška navigačního prvku 64 px.
- Aktivní položka: modrá ikona/text a viditelný indikátor. Neaktivní: sekundární text.
- Pozadí `#080D13` s vysokou neprůhledností, jemný blur, horní border a respektování safe-area.
- Navigace je viditelná na hlavních metastránkách; během běhu a v modálních herních dialozích se skryje.
- Každá stránka používá stejnou hlavičku, šířku obsahu, rytmus sekcí a komponenty.
- Stránky se liší obsahem, nikoli vlastním design systémem. Domů nesmí kopírovat celé přehledy Postavy, Kodexu a Úspěchů; každá informace má své primární místo.

## 9. Ikonografie

- Výchozí UI ikony: Lucide, jednotný line-art, tah přibližně 2 px, kulaté konce, bez výplně, `currentColor`.
- Standardní velikosti: 16 px (husté řádky), 20 px (navigace/ovládání), 24 px (důležité akce), 32 px (velké prázdné stavy/ilustrativní symbol).
- Jedna funkce = jedna ikona napříč celou hrou. Například HP, zbraň, dash, šrot, mapa, kodex a rarity nesmí měnit symbol podle stránky.
- Ikony zbraní, nepřátel, talentů, elementů a materiálů se mapují centrálně v `src/game/ui-icons.tsx`; nové mapování se přidává tam, ne lokálně v komponentě.
- DOM UI nepoužívá emoji jako náhradu ikon. Výjimkou jsou textové/bojové floatry, kde je to výslovně součást stylu.
- Ikona musí mít přístupný český název nebo `aria-label`; tooltip nesmí být jediným zdrojem důležité informace.
- Barevný akcent ikony odpovídá významu (např. boss/crit červeně, aktivní technologie modře, odměna oranžově), nikoli osobnímu vkusu autora stránky.
- Vlastní rastrové ikony musí odpovídat jednotné mřížce, optické velikosti, tloušťce obrysu a kontrastu; nesmějí se míchat s náhodnými emoji, 3D ikonami a tenkými outline sadami.

## 10. Herní HUD — pevná informační architektura

HUD je součástí stejného design systému, ale musí zůstat oddělený od dekorace herního světa.

### 10.1 Horní informační oblast

- Stav postavy/portrét a level: kompaktní skupina; level má vlastní čitelný štítek.
- HP a XP: konzistentní progress bary s čísly aktuální/maximální hodnoty.
- Zdroje (šrot, kredity či jiné skutečně existující měny): ikona + hodnota; nepřidávat měnu jen proto, že ji ukazuje referenční obrázek.
- Pauza: vždy stejná ikonová akce v horní bezpečné oblasti.
- Boss bar: horní střední oblast, název/fáze + HP; nesmí se překrývat s HP hráče ani systémovými indikátory.

### 10.2 Bojové indikátory

- HP hráče: červený gradient, čísla vždy viditelná; low HP navíc červená pulzace/vignette, ne pouze změna barvy.
- XP: ledově/modře laděný bar s úrovní a číselným postupem.
- Boss: výrazný červený indikátor a fáze.
- Buff/debuff: kompaktní čipy s jednotnou ikonou, případně stackem a odpočtem.
- Poškození, kritický zásah a stav nepřítele: odlišné tvary/ikony a kontrast; barevná sémantika zůstává konzistentní.
- Toasty: jedna sjednocená pozice mimo ovládací zóny, stejné pozadí, ikona, délka zobrazení a typografie.
- Start vlny/odpočet: jednotný horní střed, primární oranžová akce, sekundární stavový banner.
- Statistiky a přehledy: stejné číselné formáty a názvy jako na stránce Postava/Statistiky.

### 10.3 Mobilní ovládání

- Ovládací zóny jsou pevné a nesmějí se překrývat s toastem, důležitým textem ani interaktivním panelem.
- Pohybový joystick vlevo; akční tlačítka vpravo dole. Dash, schopnost, střelba a další akce mají stabilní pořadí a symbol.
- Základní dotyková plocha je nejméně 48×48 px; hlavní akce mohou být větší.
- Průhlednost ovladačů je řízená nastavením, ale ikony a obrysy musí zůstat čitelné nad světlým i tmavým prostředím.
- Screenshot boje je referencí pro kompozici a tematiku; přesné ovládací režimy se řídí aktuálním `docs/ui-rules.md` a implementací. Starší obrázek ukazuje levý joystick a více pravostranných tlačítek; nesmí přepsat aktuální Smart Assist / Manual Twin Stick pravidla.

## 11. Progress bary, čísla a statistiky

- Každý progress bar má vizuální výplň i číselný stav.
- HP: červená; XP: modrá/ledová; splněno: zelená; nebezpečí: červená.
- Čísla jsou zarovnaná a používají tabulární číslice; jednotky jsou vždy uvedeny, pokud mohou být nejasné.
- DMG/DPS/RPM mají pevné pořadí a stejnou mřížku na všech kartách zbraní.
- Porovnání: nová hodnota, stará hodnota a šipka změny; zlepšení/zhoršení se nesmí vyjadřovat pouze barvou.
- Neznámá nebo zamčená hodnota se nezobrazuje jako nula; zobrazí se stav/požadavek.

## 12. Zbraně, vybavení a inventář

### 12.1 Karta zbraně

Pořadí informací je neměnné:
1. rarita + její symbol;
2. ilustrace/sprite zbraně;
3. název a archetyp;
4. hlavní statistiky **DMG / DPS / RPM**;
5. doplňkové hodnoty (zásobník, přebíjení, krit, násobitel, dostřel, průraz);
6. prefixy/suffixy/unikátní vlastnost;
7. akce nebo požadavek.

- Všechny archetypy používají stejnou šablonu. Liší se pouze ilustrací, názvem, typem a hodnotami.
- Zbraň musí mít siluetu odpovídající skutečnému archetypu; vizuál nesmí slibovat jiný typ střelby nebo dostřel.
- Ilustrace se v kartě vejde do pevného rámečku a má jednotné zarovnání, padding a měřítko.
- V inventáři je kompaktní mřížka; detail vybraného předmětu je jeden samostatný panel.

### 12.2 Porovnání

- Vybavený předmět a nový předmět jsou vedle sebe nebo nad sebou ve stejné geometrii.
- Rozdíly jsou v jedné zarovnané tabulce: DMG, DPS, RPM a další parametry.
- Šipka nahoru/dolů a barva pouze doplňují číselný rozdíl.
- Akce Vyměnit je primární pouze tehdy, když je skutečně hlavním rozhodnutím.

### 12.3 Materiály a předměty

- Materiály mají stálou ikonu a stálou barvu v inventáři, kovárně, odměně i tooltipu.
- Počet se vždy zobrazuje u ikony; typ materiálu se nesmí měnit podle kontextu.
- Loot truhla, kontejner, kreditový box, klíč, stimulátor, mod a fragment musí mít odlišitelnou siluetu i v malé velikosti.
- Ceny a náklady používají stejnou ikonografii jako sklad.

## 13. Postava, nepřátelé a svět

### 13.1 Hráčská postava

- Jeden stabilní hlavní design, proporce, obrys, barevné akcenty a měřítko napříč idle, pohybem, útokem, zásahem, dashem a smrtí.
- Všechny snímky jedné animace sdílejí stejný pivot a vizuální měřítko; postava nesmí při animaci poskakovat.
- Zbraň se vykresluje jako samostatný prvek, pokud to dovoluje aktuální renderer; míření nesmí nechtěně deformovat tělo.
- Portrét v UI je stejná identita postavy, ne jiný náhodný voják.

### 13.2 Nepřátelé

- Každý druh má jedinečnou siluetu podle skutečné bojové role (melee, charge, ranged, suicide, split, support, spawner, boss).
- Hráč a nepřítel musí být rozeznatelní tvarem i bez barvy.
- Boss má větší vizuální váhu, čitelný obrys a jasně rozpoznatelné fáze/útoky.
- HP bar, affix, status a telegraph útoku jsou samostatné dynamické overlaye; nesmí být napevno vypálené do sprite.
- Barva nepřítele je řízena existujícími daty; artwork nesmí přepsat `Enemy.color` ani element.

### 13.3 Prostředí a biome

- Prostředí vychází z průmyslového komplexu, laboratoře, podzemní jeskyně, arény, hlubinného komplexu, trezoru a interiéru podle skutečných herních oblastí.
- Jednotlivé biomy mohou mít vlastní světelné akcenty a dekorace, ale základní kontrast, obrysy, měřítko dlaždic a čitelnost zůstávají jednotné.
- Interaktivní objekt musí být rozeznatelný od dekorace; dekorace nesmí vypadat jako loot, dveře nebo nebezpečí.
- Podlaha a dekorace nesmí mít kontrast silnější než hráč, nepřátelé a projektily.
- Světelné zdroje používají modrou/oranžovou jako hlavní kontrast, ne náhodné duhové efekty.

## 14. Projektily, VFX a status efekty

- Projektil hráče a nepřítele se musí lišit tvarem, obrysem, pohybovou stopou nebo symbolem; nespoléhat pouze na barvu.
- Elementární efekty mají stabilní symbol i barevnou rodinu: oheň, led, elektřina, toxicita, kinetika a void.
- Každý efekt má jasný začátek, vrchol a konec; délka nesmí zakrývat další útok.
- Zásah: krátký komiksový impact; kritický zásah má vlastní jasný indikátor.
- Dash: směrové speed-lines/trail, nikoli neprůhledná plocha přes hráče.
- Exploze: čitelný vnější tvar a krátký flash; nezahlcovat scénu dlouhotrvající září.
- Status overlaye jsou samostatné od sprite: hoření, mráz, jed, šok, křehkost a další stavy podle existujících typů.
- Efekty respektují reduced-motion; při omezení pohybu se zachová informace, nikoli nutně animace.

## 15. Assety — výroba a integrace

- Schválený produkční postup podle současných dokumentů: AI pouze pro koncept/reference, finální pixel-art ručně v LibreSprite.
- Herní sprite: PNG RGBA s průhledným pozadím, pevné buňky sprite sheetu, zaznamenané frameWidth/frameHeight, počet snímků, FPS, loop a pivot.
- Každý asset má jednoznačné ID, cestu, stav a metadata v `public/assets/game/manifest.json`.
- Pivoty a měřítko se nemění mezi snímky; asset se ověřuje při skutečném herním zoomu na desktopu i mobilu.
- Kolize, hitbox, HP, rychlost, damage, AI, loot a timing jsou vždy vlastnictvím simulace. Obrázek nikdy neurčuje fyziku.
- HP, rarity, affix, status, kritický zásah a další dynamické prvky se vykreslují samostatně.
- Procedurální renderer zůstává fallbackem; asset se stane výchozím až po QA.
- Stav v manifestu zůstává `planned`, dokud skutečný soubor neexistuje a neprojde kontrolou.

### 15.1 Referenční rozměry pilotní sady

| Asset | Buňka | Pivot | Animace |
|---|---:|---:|---|
| Hráč | 64×64 | 32,32 | idle 4/8 fps; walk 6/12; fire 3/15; hit 2/12; dash 3/15; death 6/9 |
| Pistole | 48×24 | 12,17 | idle 1 frame; fire 2/15 |
| Grunt | 48×48 | 24,24 | idle 4/8; move 6/12; attack 3/12; hit 2/12; death 5/9 |
| Kinetický projektil | 16×16 | 8,8 | 1 frame |
| Muzzle flash | 32×32 | 4,16 | 4/15 |
| Kinetický hit | 32×32 | 16,16 | 4/15 |
| Dash trail | 48×48 | 24,24 | 4/15 |
| Death VFX | 48×48 | 24,24 | 5/10 |

Tyto rozměry jsou technický kontrakt schválené pilotní sady, ne univerzální povinnost pro každý budoucí asset. Nový typ musí mít vlastní metadata a zachovat měřítko ve světě.

## 16. Zvuk a hudba — hranice této obrazové specifikace

Referenční obrázky neurčují hudební žánr, tempo, tóninu, hlasitost, mix ani zvukové efekty. Tyto parametry se proto nesmějí vydávat za převzaté z obrázků. Vizuální pravidla pro zvukové ovladače jsou ale závazná:

- Hlasitost efektů, hudby a mute používají stejný styl slideru/toggle jako ostatní nastavení.
- Ikony zvuku, hudby a mute se nemění mezi menu, pauzou a nastavením.
- Zvukový stav je vyjádřen ikonou i dostupným textem/tooltipem.
- Zvukové nastavení používá stejnou kartu, labely, spacing a focus stav jako ostatní UI.

## 17. Přístupnost a čitelnost

- Kontrast textu a pozadí musí být dostatečný; sekundární text nesmí zmizet do pozadí.
- Barva není jediným nositelem stavu: vždy přidat text, ikonu, tvar nebo číslo.
- Focus-visible obrys 2 px, jasný a konzistentní.
- Dotykové cíle minimálně 48×48 px.
- Žádná důležitá informace nesmí být dostupná pouze přes hover.
- Respektovat `prefers-reduced-motion`; animace nesmí blokovat interakci ani skrývat číselný stav.
- Texty jsou česky, používají správnou diakritiku a konzistentní názvy herních systémů.

## 18. Zakázané odchylky

- Nová paleta, nový font nebo nová ikonová sada jen pro jednu stránku.
- Jiný radius, border, stín nebo padding pro komponenty stejné role.
- Emoji místo ikon v DOM UI.
- Rarita vyjádřená jen barvou, případně odlišnou velikostí karty.
- Text nebo čísla napevno vložená do obrázku, pokud mají být lokalizovatelná/dynamická.
- Dekorativní textura, glow nebo animace, která snižuje čitelnost boje.
- Sprite, který mění hitbox, kolizi nebo herní význam.
- Vizuální návrh, který přidává neexistující zbraň, měnu, předmět, schopnost, nepřítele nebo mechaniku.
- Lokální CSS výjimka bez zdůvodnění a aktualizace centrálního standardu.

## 19. Povinný checklist pro každou novou obrazovku / komponentu

- [ ] Používá centrální background/surface/border/text/accent tokeny.
- [ ] Používá Inter a typografickou stupnici tohoto dokumentu.
- [ ] Používá existující button/card/dialog varianty.
- [ ] Má stejné radiusy, spacing a vnitřní odsazení jako komponenty stejné role.
- [ ] Používá centrální Lucide / typované herní mapování ikon.
- [ ] Výběr, success, danger a locked stavy odpovídají jednotnému systému.
- [ ] Rarita používá stejnou barvu, symbol a geometrii napříč všemi místy.
- [ ] Čísla, ceny, podmínky a progress jsou čitelné bez hoveru.
- [ ] Dotykové cíle jsou nejméně 48×48 px.
- [ ] 390px portrait nemá horizontální overflow; safe-area a spodní navigace nic nezakrývají.
- [ ] Desktop/landscape zachovává stejnou identitu a hierarchii.
- [ ] Reduced-motion a focus-visible jsou funkční.
- [ ] Ilustrace neobsahuje UI text a neovlivňuje herní pravidla.
- [ ] Pokud jde o asset, má metadata, pivot, transparentní pozadí, fallback a QA.
- [ ] Odpovídá skutečným typům a pravidlům hry; nevymýšlí nové herní vlastnosti.

## 20. Technický zdroj pravdy a navazující údržba

- UI tokeny: `src/styles.css` — sjednotit legacy aliasy na výše uvedené canonical hodnoty.
- UI pravidla a layout: `docs/ui-rules.md`.
- Ikonová mapa: `src/game/ui-icons.tsx`.
- Herní asset manifest: `public/assets/game/manifest.json`.
- Asset workflow: `docs/asset-production-plan.md`.
- První sprite brief: `docs/player-basic-combat-asset-brief.md`.
- Herní mechaniky a názvy: `src/game/types.ts`, bestiary a `docs/progression-rules.md`.

### Zjištěné rozdíly v aktuální implementaci k nápravě

1. `src/styles.css` stále obsahuje staré obecné barvy a rarity aliasy, které neodpovídají referenčním barvám (např. epic/legendary/mythic). Nové komponenty je nesmí používat; je nutné je postupně přesměrovat na canonical tokeny výše.
2. `src/game/types.ts` má nyní rarity barvy common/uncommon/rare/epic/legendary/mythic `#8A9099 / #5EA38A / #6B93C2 / #C45C3E / #D6DDE4 / #9EB4C4`. To neodpovídá referenčnímu systému. Vizuální tokeny v tomto dokumentu jsou cílový standard; migrace musí proběhnout centrálně a s kontrolou všech míst, kde se rarity kreslí.
3. Referenční loot obrázek označuje nejvyšší raritu jako „Exotická“, ale hra má interní `mythic` / české „Mýtická“. Zůstává název hry; vizuální červená kategorie se mapuje na mythic.
4. Herní screenshot je landscape a ukazuje starší kompozici dotykového ovládání. Metastránky a aktuální UI pravidla zůstávají portrait-first; aktuální implementované ovládací režimy mají přednost před screenshotem.
5. Sci-fi brnění a 3D/cel-shaded atlas postavy jsou v rozporu s později schváleným retro pixel-art sprite workflow. Před produkcí finálních spriteů je nutné sjednotit art direction; tento dokument sám o sobě nepřepíná schválený výrobní proces.

**Pravidlo změny:** změna centrální barvy, rarity, typografie, ikony, rozměru komponenty nebo art direction se provádí nejprve v tomto dokumentu a následně v tokenu/komponentě/manifestu. Nikdy ne pouze na jedné stránce.

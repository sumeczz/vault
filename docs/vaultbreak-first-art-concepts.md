# Vaultbreak — referenční koncepty první art sady

**Verze:** 1.0  
**Rozsah:** pouze vizuální návrh hráče, výchozí pistole a nepřítele grunt  
**Status:** připraveno ke schválení před generováním referenčních obrázků

Tento dokument převádí schválený směr *retro arcade comic pixel-art* do konkrétního zadání pro první referenční list. Nejde o finální herní sprity. Žádný koncept nesmí měnit mechaniky ani doplňovat neověřený příběh hry.

## Společná pravidla listu

- Pohled striktně shora (top-down), bez izometrie a bez bočního pohledu.
- Vzhled jako ručně kreslená arkádová komiksová pixel-art hra: silný tmavý obrys, malé množství odstínů, tvrdé stíny, lehce nepravidelné kontury.
- Paleta: Ink #17151a, Warm paper #e8d8b5, Bone #b9b09a, Brick red #bd4938, Mustard #d5a642, Petrol #477c78, Plum #76516f.
- Čitelnost siluety má přednost před drobnými detaily. Žádné vyhlazování, rozmazání, realistické textury ani 3D render.
- Každý objekt samostatně na průhledném nebo neutrálním pozadí, bez textu, UI, rámečků a dekorativního prostředí.
- Referenční list má ukázat jednu hlavní podobu každého objektu a několik detailních výřezů; nesmí předstírat hotovou animaci ani sprite sheet.

## Koncept A — hráč player_comic

**Základní silueta:** kompaktní lidská postava v praktickém, vrstveném oblečení a lehké výstroji. Hlava, trup, obě paže a nohy musí být rozeznatelné i při zmenšení. Postava je natočená přibližně nahoru, ale ruce a držení těla dovolují samostatné míření zbraní.

**Výtvarné zpracování:** výrazná hlava a ramena, krátké bloky světla na oblečení, tmavý obrys a jedna dobře čitelná barevná plocha v horní části těla. Výstroj je civilní/praktická, ne futuristické brnění.

**Výrazy pohybu:** neutrální klidový postoj; při pohybu mírné roztažení končetin; při zásahu krátké stažení těla; dash zdůraznit komiksovými směrovými čárami mimo hlavní siluetu.

**Záměrně neurčeno:** konkrétní obličej, účes, pohlavní rysy, značka oblečení, batoh, helma ani příběhové insignie. Tyto prvky se nesmí vymyslet jako hotový fakt; koncept má zůstat čitelný bez nich.

## Koncept B — výchozí pistole weapon_pistol

**Základní silueta:** konvenční retro ruční pistole, při pohledu shora, hlaveň míří doprava (+X). Jasně odlišit hlaveň, závěr a rukojeť. Jednoduché robustní tvary vhodné pro malé rozlišení.

**Výtvarné zpracování:** tmavý obrys, kovové plochy v Bone/Warm paper, jeden malý Brick red nebo Mustard akcent. Žádné světelné jádro, energetické vedení, hologram, laserový zaměřovač ani sci-fi díly.

**Čitelnost:** tvar musí být rozpoznatelný jako pistole i bez záblesku. Záblesk ústí hlavně bude samostatný efekt, nikoli součást textury zbraně.

**Technické omezení:** referenční koncept ukazuje orientaci a proporce, nikoli změnu dostřelu, kadence, poškození nebo zpětného rázu. Pivot zůstává podle výrobní specifikace a před implementací se ověří proti drawWeapon.

## Koncept C — základní nepřítel enemy_grunt

**Role:** základní kontaktní/melee nepřítel podle bestiary. Jeho nebezpečí musí být čitelné z postoje a pohybu, ne z ikonky nebo textového štítku.

**Základní silueta:** lidská nebo humanoidní kompaktní postava s výrazně dopředným těžištěm, rameny a pažemi připravenými k útoku zblízka. Musí být od hráče odlišitelná tvarem, nikoli jen barvou.

**Výtvarné zpracování:** těžší, hrubší komiksové tvary, ostřejší stínování a méně pravidelný obrys než u hráče. Barevný akcent může používat Brick red nebo Plum, ale barva sama nesmí být jediným identifikátorem nepřítele.

**Záměrně neurčeno:** druh, původ, konkrétní oblečení, zbraně v ruce, mutace, krev, brnění a příběhové vysvětlení. Koncept nesmí přidat zombie, robota, vojáka ani fantasy nestvůru bez opory ve hře.

## Kompozice referenčního listu

1. Nahoře: tři objekty vedle sebe ve stejné měřítkové logice — hráč, pistole, grunt.
2. U každého: čistý top-down hlavní pohled a menší detail siluety.
3. Dole: pět barevných vzorků z palety a krátké technické popisky rozměrů.
4. Bez scénického pozadí, bez herního HUD a bez dodatečných objektů.

## Co bude následovat po schválení

1. Vytvořit jeden referenční obrázek s těmito třemi objekty.
2. Zkontrolovat, zda odpovídá skutečnému top-down pohledu a retro komiksové estetice.
3. Teprve po výběru finální podoby ručně překreslit pixely v LibreSprite.
4. Exportovat herní PNG a doplnit skutečná metadata do manifestu.
5. Napojit assety přes renderovací vrstvu s procedurálním fallbackem.

**Hranice této etapy:** zatím se negenerují finální herní PNG, nepřepisuje se renderer a nemění se žádná herní logika.
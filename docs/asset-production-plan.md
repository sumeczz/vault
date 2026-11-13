# Vaultbreak — plán tvorby herních assetů

**Stav:** přípravná fáze, bez nových obrázkových assetů  
**Cíl:** nahradit procedurální grafiku skutečnými herními assety bez zásahu do simulace a herních pravidel.

## 1. Varianty tvorby assetů

### Varianta A — generativní AI
- Koncepty a jednotlivé objekty se tvoří pomocí generátoru obrázků.
- Výstupy se následně ručně čistí, sjednocují, ořezávají a skládají do sprite sheetů.
- Výhody: rychlé hledání výtvarného směru, nízká vstupní bariéra, rychlé koncepty.
- Nevýhody: obtížnější konzistence postavy mezi snímky, nepřesné průhlednosti a okraje, nutná ruční kontrola animací a pivotů.
- Vhodné pro: koncepty, portréty, statické dekorace, návrhy prostředí a referenční listy.

### Varianta B — ruční pixel-art / 2D editor
- Kreslení a animace v Aseprite, LibreSprite nebo Krita.
- Výhody: přesné rozměry, konzistentní siluety, plná kontrola nad snímky a pivoty.
- Nevýhody: nejvyšší časová náročnost; vyžaduje výtvarnou práci.
- Vhodné pro: hráče, nepřátele, zbraně, projektily a krátké smyčkové animace.

### Varianta C — hybrid (doporučeno)
- AI slouží pro koncepty a výtvarné podklady.
- Finální herní sprite se čistí a upravuje v Aseprite/Krita.
- Animace se ručně sjednocují, kontrolují a exportují do PNG sprite sheetů.
- Výhody: rychlý začátek a současně kontrola nad výslednou kvalitou, rozměry a konzistencí.
- Nevýhody: vyžaduje jeden kontrolní krok mezi generováním a importem.
- Vhodné pro: celý Vaultbreak.

### Varianta D — hotové asset packy
- Nákup nebo použití licencovaných balíčků (např. itch.io, GameDev Market, Kenney).
- Výhody: hotové animace, konzistentní sady a rychlé prototypování.
- Nevýhody: hra se musí přizpůsobit stylu balíčku; licence a redistribuce se musí ověřit; unikátní bossové a výbava mohou chybět.
- Vhodné pro: prostředí, dekorace a dočasné prototypy.

## 2. Výtvarné směry k výběru

1. **Komiksové sci-fi:** výrazný ink obrys, tvrdé stíny, industriální tvary, oranžové a elektricky modré akcenty. Nejbližší dosavadnímu vizuálnímu směru hry.
2. **Dark pixel-art:** 32/64px pixel-art, omezená paleta, čitelné siluety, ručně animované snímky.
3. **Hand-painted top-down:** malované textury, výrazné světlo a stín, detailnější prostředí.
4. **Stylizovaný vector/cartoon:** čisté tvary, pevné obrysy, snadno škálovatelné objekty, méně textur.

**Schváleno:** hybridní workflow AI konceptů + ruční dokončení v LibreSprite, výtvarný směr komiksové sci-fi pixel-art. Podrobný výrobní brief první sady je v `docs/player-basic-combat-asset-brief.md`; paleta pro LibreSprite je v `public/assets/game/vaultbreak-comic.gpl`.

## 3. Technický standard

### Souřadnice a měřítko
- Herní svět používá world-space souřadnice; assety se kreslí kolem definovaného pivotu.
- Pivot postavy a nepřítele: střed chodidel/těla podle finálního návrhu, jednotně pro všechny snímky.
- Měřítko se nastavuje v manifestu, nikoliv úpravou simulace.
- Žádný sprite nesmí měnit kolizní radius ani fyzické rozměry entity.

### Formáty
- PNG RGBA pro statické obrázky a sprite sheety.
- JSON manifest pro rozměry, snímky, pivot, měřítko, animace a ID assetů.
- Žádné vložené pozadí; průhlednost musí být skutečný alpha kanál.
- Exporty musí mít stejné rozměry buněk a konzistentní padding.

### Animace
- Hráč: idle, walk/run, fire, hit, dash, death.
- Nepřítel: idle/move, attack, hit, death; speciální stavy podle druhu.
- Zbraň: samostatný objekt orientovaný podle aim; muzzle flash a projektily jsou samostatné efekty.
- Animace nesmí ovlivňovat hitboxy, rychlost, časování útoku ani jiné herní hodnoty.

### Čitelnost
- Silueta musí být rozeznatelná při běžném herním zoomu i na mobilu.
- Nepřátelské střely a nebezpečné útoky musí zůstat kontrastní.
- HP, affix, status a telegraph overlay zůstávají oddělené od sprite.
- Kritické informace nesmí být součástí textury (např. HP bar nebo čísla).

## 4. Pořadí implementace

1. Referenční styl a měřítko.
2. Hráč: idle + pohyb + smrt, poté střelba a dash.
3. Jedna základní zbraň a projektil.
4. Jeden běžný nepřítel: pohyb, útok, zásah a smrt.
5. Testovací místnost a kontrola čitelnosti.
6. Zbytek nepřátel a zbraní.
7. Tileset místnosti, překážky, dveře a dekorace.
8. VFX, loot, bossové a finální polish.

## 5. Akceptační checklist každého assetu

- [ ] Odpovídá zvolenému výtvarnému směru.
- [ ] Má průhledné pozadí a čisté okraje.
- [ ] Má správné rozměry buněk a pivot.
- [ ] Má konzistentní měřítko napříč snímky.
- [ ] Animace nemění zdánlivou velikost objektu.
- [ ] Je čitelný při herním zoomu a na mobilu.
- [ ] Neobsahuje herní UI ani texty, které mají být vykresleny dynamicky.
- [ ] Jeho licence dovoluje použití a distribuci ve hře.
- [ ] Při chybějícím souboru funguje procedurální fallback.
- [ ] Je ověřen v reálné herní scéně, nikoliv jen samostatně.

## 6. Pravidlo migrace

Assety se budou zapojovat postupně přes renderovací vrstvu. Herní simulace, AI, kolize, HP, poškození, loot, spawn tabulky a ukládání zůstávají zdrojem pravdy. Každá etapa musí zachovat procedurální fallback a projít typecheckem, testy a buildem.

## 7. První balíček — Player & Basic Combat

- Hráč: idle, pohyb, střelba, zásah, dash a smrt.
- Jedna základní zbraň s odděleným pivotem.
- Projektil, muzzle flash a zásahový efekt.
- Jeden základní nepřítel se smyčkou pohybu, útokem, zásahem a smrtí.
- Testovací místnost pro kontrolu kontrastu, velikosti a animací.

**Záměrně se zatím nevytváří žádné finální obrázky.** Workflow a výtvarný směr jsou schválené; kreslení začne podle výrobního briefu až po uzavření konkrétních konceptů postavy, grunta a pistole.

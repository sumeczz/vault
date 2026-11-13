# Player & Basic Combat — výrobní specifikace v1

**Schválené zadání:** hybridní workflow, komiksové sci-fi, LibreSprite.  
**Stav:** připraveno pro kreslení; finální obrázkové soubory zatím nejsou vytvořené.

## Výtvarný směr
Komiksová sci-fi stylizace převedená do čistého pixel-artu:
- Siluety čitelné shora, lehce izometrický dojem pouze ve stínování (kamera hry zůstává top-down).
- Tmavý ink obrys 1–2 px, velké barevné plochy, omezené tvrdé stíny.
- Základní paleta: grafit #171a20, ocel #d6dde4, studená modrošedá #9eb4c4, oranžová #c45c3e, světlý akcent #f0c879.
- Oranžová značí hráčovy zbraňové/energetické akcenty; nepřátelská nebezpečí musí zůstat odlišitelná i bez barvy.
- Žádné měkké airbrush přechody, rozmazané okraje ani textury šumu.

## LibreSprite — nastavení projektu
- Barevný režim: RGB/RGBA, průhledné pozadí.
- Pracovní canvas postavy: 64×64 px na snímek; postava zabírá přibližně 30–36 px na výšku.
- Základní grunt: 48×48 px na snímek; tělo přibližně 24–30 px.
- Pistole: 48×24 px, orientovaná doprava (+X); pivot v místě uchopení.
- Projektil: samostatný 16×16 px sprite; muzzle flash a zásahový efekt samostatně.
- Všechny snímky jedné animace mají stejný rozměr a stabilní pivot.
- Export sprite sheetů jako PNG RGBA bez pozadí; metadata animací evidovat v manifestu.
- FPS: idle 6–8, walk 10–12, fire 12–15, hit 12, dash 12–15, death 8–10.

## 1. Hráč — player_comic
**Silueta:** kompaktní obrněnec/průzkumník, široká ramena, výrazná helma s oranžovým hledím. Směr pohledu určuje aim zbraně, nikoli otočení celého těla.  
**Pivot:** střed těla (32,32) v buňce 64×64.

| Animace | Snímků | Smyčka | Poznámka |
|---|---:|---|---|
| idle | 4 | ano | jemné dýchání, stabilní silueta |
| walk | 6 | ano | střídání nohou, trup stabilní |
| fire | 3 | ne | krátký zpětný ráz |
| hit | 2 | ne | krátký ocelový záblesk |
| dash | 3 | ne | naklonění; speed lines samostatný VFX |
| death | 6 | ne | zhroucení, poslední snímek držet |

Sprite nesmí obsahovat HP bar, štít, orbitální efekty, zbraň ani text. Tyto prvky zůstávají samostatně vykreslované.

## 2. Základní zbraň — weapon_pistol
**Silueta:** industriální sci-fi pistole s robustním závěrem, krátkou hlavní a oranžovým energetickým článkem.  
**Canvas:** 48×24 px, orientace doprava (+X).  
**Pivot:** bod uchopení rukojeti, výchozí souřadnice (12,17); před implementací ověřit vůči aktuálnímu umístění zbraně v renderu.  
**Animace:** idle 1 snímek; fire recoil 2 snímky. Muzzle flash je samostatný efekt.

## 3. Základní nepřítel — enemy_grunt
**Role:** nejběžnější melee nepřítel, první protivník pro combat test.  
**Silueta:** nízký agresivní biomechanický/robotický tvor, kulaté jádro, dvě výrazná klešťová zakončení. Od hráče se liší tvarem, ne pouze barvou.  
**Paleta:** tmavý grafit, rezavá červeň a utlumený kovový akcent. Stávající Enemy.color zůstává datovým tintem/fallbackem.  
**Canvas:** 48×48 px; pivot střed těla (24,24).

| Animace | Snímků | Smyčka |
|---|---:|---|
| idle | 4 | ano |
| move | 6 | ano |
| attack | 3 | ne |
| hit | 2 | ne |
| death | 5 | ne |

Pohybové snímky nesmí měnit vnější rozměr siluety.

## 4. Základní bojové assety

| ID | Canvas | Obsah |
|---|---:|---|
| projectile_kinetic | 16×16 | kovový projektil s jasným středem |
| fx_muzzle_pistol | 32×32 | 4 snímky oranžového komiksového záblesku |
| fx_hit_kinetic | 32×32 | 4 snímky hvězdicového zásahu |
| fx_dash_trail | 48×48 | 4 snímky směrové stopy, oddělené od těla |
| fx_enemy_death | 48×48 | 5 snímků rozpadových částic |

## 5. Exportní struktura
- public/assets/game/characters/player_comic.png
- public/assets/game/weapons/weapon_pistol.png
- public/assets/game/enemies/enemy_grunt.png
- public/assets/game/projectiles/projectile_kinetic.png
- public/assets/game/effects/fx_muzzle_pistol.png
- public/assets/game/effects/fx_hit_kinetic.png
- public/assets/game/effects/fx_dash_trail.png
- public/assets/game/effects/fx_enemy_death.png

Každý záznam v manifestu obsahuje cestu, rozměry snímku, pivot, animace, FPS a stav QA. Položky zůstávají ve stavu planned, dokud neexistují skutečné PNG soubory.

## 6. Hybridní pracovní postup
1. Připravit AI referenční sheet pro hráče, pistoli a grunta (pouze koncepty).
2. Vybrat jeden konzistentní návrh každého objektu.
3. V LibreSprite ručně překreslit/čistit siluety, paletu, obrysy a animační snímky.
4. Zkontrolovat pivoty, průhlednost, rozměry buněk a vizuální kontinuitu.
5. Exportovat PNG sprite sheety a zapsat skutečná metadata.
6. Zapojit nejprve hráče a grunta přes renderovací vrstvu s procedurálním fallbackem.
7. Ověřit desktop i mobil. Porovnat velikost sprite s PLAYER_R a Enemy.r.
8. Zapnout jako výchozí až po QA.

## 7. Akceptační kritéria
- Hráč je rozeznatelný od grunta i při zmenšení.
- Směr zbraně odpovídá aim bez rotace těla.
- Žádné poskakování pivotu ani změna velikosti mezi snímky.
- Zásah, dash a střelba zůstávají čitelné i při překryvu.
- Enemy tint, HP bar, affix a status overlay zůstávají dynamické.
- Nepřátelské střely zůstávají vizuálně odlišné.
- Simulace, kolize a herní hodnoty jsou beze změny.
- Chybějící/neplatný soubor vrátí vykreslování na procedurální variantu.
- Ověřeno v tutorialu i elitní místnosti.

## 8. Otevřené výtvarné volby
Finální podoba helmy a siluety hráče, přesná podoba grunta (robot/biomechanická bytost) a návrh pistole se uzavřou podle referenčních konceptů. Finální obrázky se zatím nevytvářejí.

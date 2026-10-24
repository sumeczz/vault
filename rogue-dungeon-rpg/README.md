# Rogue Dungeon RPG — vlastní herní projekt

> Pracovní název: **Abyssbound** (lze změnit). Samostatná akční roguelike RPG inspirovaná obecnými principy žánru a ovládáním hry Rogue Dungeon RPG. Nejde o kopii původní hry.

## Stav

**Fáze:** dokumentace a technický základ. Zatím nejde o hotovou hru.

## Cíl

Vytvořit vlastní dungeon action-RPG s plynulým pohybem, kamerou sledující hráče, čitelným bojem v reálném čase, procedurálně skládanými místnostmi, lootem a trvalým postupem mezi výpravami.

## Ovládání

- Desktop: WASD / šipky = pohyb, levé tlačítko myši = základní útok, mezerník = úskok, Q/E/R = schopnosti, I = inventář, Esc = pauza.
- Mobil: virtuální joystick vlevo, útok a schopnosti vpravo; rozmístění UI musí respektovat bezpečné okraje displeje.
- Ovládání má podporovat remapping a stejné herní akce musí mít společnou abstrakci pro myš/klávesnici i dotyk.

## Kamera

- Pohled shora pod úhlem (top-down / lehce izometrická stylizace); pevná orientace světa.
- Plynulé sledování hráče s interpolací, omezení na hranice místnosti a volitelný mírný dynamický zoom.
- Kamera nesmí trhat, přeskakovat mezi cíli ani skrývat blízké hrozby; během boss arény použije širší rámování.

## Vlastní bojový systém

- Pohyb a boj probíhají v reálném čase.
- Základní útok, úskok s krátkým i-frame oknem, stamina a nejméně 3 aktivní schopnosti.
- Čitelné telegraphy nepřátel: náběh, útok, recovery.
- Kombo / stagger systém, slabiny na elementy a jasná zpětná vazba zásahů.
- Damage, cooldowny, dosahy a invulnerability frames budou konfigurovatelné, ne natvrdo rozptýlené v kódu.

## Herní smyčka

1. Hráč se připraví v útočišti.
2. Vybere výpravu a vstoupí do procedurálně sestaveného dungeonu.
3. Prozkoumává místnosti, bojuje, sbírá loot a vybírá odměny.
4. Porazí elitního nepřítele / bosse nebo se rozhodne extrahovat.
5. Vrátí se s odměnami, odemkne permanentní zlepšení a zahájí další výpravu.

## Struktura dokumentace

- `docs/GAME_DESIGN.md` — vize, pilíře, smyčka a rozsah MVP.
- `docs/TECHNICAL_DESIGN.md` — architektura a technická rozhodnutí.
- `docs/ROADMAP.md` — etapy vývoje a akceptační kritéria.
- `docs/REFERENCE.md` — referenční hra a hranice inspirace.
- `src/` — zatím vyhrazené pro implementaci; herní kód přijde v další fázi.

## Zatím navržený stack

Pro rychlý, přístupný 2D prototyp: **TypeScript + Vite + Phaser 3**, HTML/CSS pro menu a HUD. O finálním stacku lze rozhodnout po ověření cílové platformy. Kód bude bez frameworku UI navíc, pokud nebude potřeba.

## Spuštění

V této první fázi není herní build přítomný, takže zatím není co spouštět. Dalším krokem je inicializace minimální hratelné scény, pohybu hráče a kamery.

## Licence a reference

Projekt má vlastní název, svět, grafiku, data, schopnosti a implementaci. Rogue Dungeon RPG je pouze designová reference pro obecné principy žánru a přístupnosti ovládání. Nepřebíráme její zdrojový kód, grafiku, názvy předmětů ani jiné chráněné assety.

- Rogue Dungeon RPG: https://play.google.com/store/apps/details?id=io.cordova.RogueRpg

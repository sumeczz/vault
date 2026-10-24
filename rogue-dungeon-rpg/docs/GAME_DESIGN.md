# Game Design — Abyssbound

## Vize
Abyssbound je původní top-down akční roguelike RPG o sestupu do živoucích ruin. Krátké výpravy kombinují čitelný souboj v reálném čase, průzkum, rozhodování nad kořistí a dlouhodobý rozvoj hrdiny.

## Designové pilíře
1. **Čitelný boj:** nebezpečné útoky mají náběh, zásah a zotavení; hráč se učí pohybem, ne jen statistikami.
2. **Přesné ovládání:** nízká vstupní bariéra, jasná odezva, stejné akce pro klávesnici i dotyk.
3. **Smysluplné odměny:** každá výprava nabízí volbu mezi okamžitou silou, rizikem a trvalým postupem.
4. **Znovuhratelnost:** rozdílné místnosti, nepřátelské sestavy a odměny tvoří odlišné běhy.
5. **Vlastní identita:** prastaré ruiny, éterická energie, originální nepřátelé a vlastní pojmenování systémů.

## Herní smyčka
Příprava v útočišti → výběr trasy → průzkum místností → boj a kořist → elitní střet nebo extrakce → odměny → trvalé odemčení → další sestup.

## Pohyb a kamera
- Volný pohyb v 2D prostoru; diagonála je normalizována.
- Kamera plynule sleduje hráče interpolací, drží se uvnitř hranic světa a neotáčí se.
- Hráč zůstává středem pozornosti; budoucí boss aréna může kameru mírně oddálit.
- Desktop: WASD / šipky. Mobil: virtuální směrový ovladač.

## Boj
- Základní útok na krátkou vzdálenost.
- Úskok: krátký přesun s oknem nezranitelnosti, který spotřebovává výdrž.
- Éterický výboj: plošná schopnost s cooldownem.
- Nepřátelé pronásledují hráče a útočí zblízka. Další iterace přidá telegraphy, různé archetypy a fáze útoků.
- Číselné hodnoty jsou počáteční ladicí hodnoty, nikoli finální balance.

## Progrese a kořist
MVP používá XP a úrovně, které zvyšují zdraví a poškození. Později přibydou zbraně, brnění, artefakty, rarita, efekty setů a trvalé odemčení v útočišti. Pravidla ztráty zdrojů při smrti budou rozhodnuta samostatně.

## MVP
- Jedna hratelná aréna s hranicemi a kamerou.
- Klávesnice a dotykové ovládání.
- Základní útok, úskok a plošná schopnost.
- Běžný a elitní nepřítel.
- HP, XP, level a počítadlo poražených nepřátel.
- Lokální běh v prohlížeči bez účtu a backendu.

## Mimo MVP
Multiplayer, cloudové ukládání, rozsáhlý inventář, crafting, příběhové dialogy, desítky tříd a finální grafické assety.

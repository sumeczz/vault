# Sjednocená UI knihovna VAULTBREAK

## Stav
První implementační vrstva je v `src/components/ui.tsx`. Komponenty jsou záměrně prezentační: nepřebírají herní logiku ani stav obrazovek.

## Základní komponenty

| Komponenta | Účel | Klíčové varianty |
|---|---|---|
| `Button` | Akce a potvrzení | primary, secondary, danger, subtle; sm, md, lg |
| `Panel` | Sdílený povrch obsahu | default, raised, success, danger |
| `Badge` | Stav, kategorie a rarita | neutral, info, success, warning, danger, rarity |
| `ProgressBar` | HP, XP a další postup | hp, xp, success, danger, accent |
| `SectionHeading` | Nadpis sekce s volitelnou akcí | title, eyebrow, action |

## Pravidla použití
- Nové obrazovky mají přednostně používat tyto komponenty místo vlastních opakovaných variant.
- Stávající obrazovky se převádějí postupně; nepřepisovat je hromadně bez vizuální kontroly.
- `Button` má výchozí dotykovou výšku 48 px. Varianta `sm` je určena pro husté desktopové ovládací prvky, ne pro hlavní mobilní akce.
- `Badge` vyjadřuje stav textem i barvou; barva nesmí být jedinou informací.
- `ProgressBar` ořezává neplatné hodnoty a poskytuje sémantiku progressbar.
- Rarita používá `tone="rarity"` a CSS proměnnou `--vb-rarity-color`; konkrétní mapování rarit bude v další části centralizováno z herních typů.
- Komponenty přijímají `className` pro výjimečné rozvržení, ne pro vytváření nové vizuální varianty.

## Design tokeny
Komponenty používají canonical tokeny definované v `src/styles.css`: background, surface, border, text, accent a stavové barvy. Legacy třídy zůstávají zachovány, dokud neproběhne migrace existujících obrazovek.

## Další kroky
1. Centralizovat mapování rarity a barev.
2. Přidat sdílené form controls, dialog a tooltip.
3. Převádět existující obrazovky po jedné a ověřovat desktop i mobil.
## Design system – část 2: centrální tokeny a hlavičky obrazovek

- Legacy CSS aliasy `bg/surface/elevated/fg/muted/accent/danger/border` nyní odkazují na schválenou paletu VAULTBREAK.
- Rarity mají jednotné mapování: common šedá, uncommon zelená, rare modrá, epic fialová, legendary oranžová, mythic červená.
- `RARITY_COLOR` v `src/game/types.ts` zůstává jediným zdrojem barev pro herní data; Tailwind rarity tokeny odpovídají stejným hodnotám.
- Přidána komponenta `ScreenHeader` pro jednotnou hierarchii eyebrow / title / description / icon.
- ScreenHeader nyní používají Postava, Kovárna, Cesta, Kodex a Úspěchy.
- Herní logika, ukládání dat, názvy rarit a ovládání zůstávají beze změny.
\n## Design system – část 3: další obrazovky a akce

- ScreenHeader rozšířen na Slovníček a Statistiky.
- Zpětné akce v těchto obrazovkách používají sdílenou komponentu Button místo lokálních tříd.
- Všechny hlavní metastránky nyní používají stejnou hlavičku a stejnou vizuální hierarchii.
\n## Design system – část 4: hlavní menu

- Hlavní akce Zahájit expedici používá sdílený Button (primary, large, full width).
- Zvuk, terminálové akce a reset profilu používají Button se sdílenými variantami.
- Výzvy a Terminál jsou sjednocené přes Panel + SectionHeading.
- Seed běhu používá společný vstup `.vb-ui-input` s jednotným focus stavem.
- Denní a týdenní výzvy zůstávají jako informační dlaždice, protože zobrazují vedle akce také seed, nejlepší úroveň a počet pokusů.
- Výběr sektoru a zbrojnice si zachovávají vlastní skupinové stavy `aria-pressed`; nejde o obecná tlačítka.
\n

## Design system – část 5: výzkum inventáře a loot nabídky

- Přidán `docs/game-inventory-ui-research.md` s podklady Android Developers, Unity a IEEE COG a rozhodnutími pro desktop/mobil.
- Loot nabídka používá responzivní mřížku: 1 sloupec na telefonu, 2 na střední šířce a 3 na široké obrazovce.
- Dialog loot nabídky dostal větší maximální šířku a bezpečnější mobilní odsazení; obsah zůstává uvnitř vlastního scrollu.
- Karta odměny používá sdílený `Badge` pro textovou raritu a centrální `RARITY_COLOR`; výběr má výraznější focus a vybraný stav.
- Herní logika, nabídky, přerolování, scrap ani sloty zbraní se nemění.


## Design system – část 6: kovárna a zbrojnice

- Kovárna dostala širší pracovní plochu (`max-w-5xl`), zatímco obrazovka Postavy zůstává kompaktní (`max-w-md`).
- Výběr zbraní ve výrobě i úpravách používá 2 sloupce na telefonu, 3 na středních šířkách a 4 na široké obrazovce.
- Sloty úprav mají větší rozestupy a dotykové cíle; výběr komponent zůstává čitelný v jednom sloupci na telefonu a přechází do více sloupců na širších obrazovkách.
- Zachována je stávající logika receptů, materiálů, level požadavků, potvrzování výměny a nasazení startovní zbraně.


## Design system – část 7: zbrojnice postavy

- Stránka Postava obsahuje samostatnou sekci Zbrojnice: vlastněné zbraně jsou v responzivní mřížce, detail vybrané položky je oddělený panel.
- Výběr má viditelný stav a `aria-pressed`; nasazená startovní zbraň je označena textovým štítkem.
- Detail používá jednotnou statistickou mřížku DMG/DPS/RPM, zásobník/přebití/krit a samostatnou oblast tří slotů součástí.
- Mobil zobrazuje výběr nad detailem v jednom sloupci; širší obrazovky rozšiřují mřížku bez změny informační hierarchie.
- Nasazení používá sdílený Button a existující akci `onStarter`; data a herní mechaniky zůstávají beze změny.


## Design system – část 8: inventář výbavy a sklad

- Zbrojnice má ovládací řádek filtrů a řazení, přehled vlastněných položek a oddělený detail zvolené zbraně.
- Porovnání zbraní používá tabulku se třemi sloupci a stejné statistické definice jako detail; lepší hodnoty jsou zvýrazněné, nikoliv přepsané do jiných jednotek.
- Sklad materiálů na stránce Postava seskupuje základní suroviny, elementární katalyzátory a fragmenty zbraní.
- Akce z inventáře vedou do Kovárny pro úpravy; nasazení startovní zbraně zůstává samostatnou akcí.
- Ovládací prvky mají minimální výšku 44 px a na mobilu se skládají do jednoho sloupce.

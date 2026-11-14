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
\n
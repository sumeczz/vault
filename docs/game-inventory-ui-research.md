# Výzkum rozložení herního inventáře a lootu

## Cíl
Zvolit srozumitelnou informační architekturu pro inventář, výběr lootu a kovárnu VAULTBREAK. Zdroje slouží jako podklad pro rozložení a interakce; vizuální jazyk zůstává definovaný v `graphics/VAULTBREAK-VISUAL-STANDARD.md`.

## Ověřené principy ze zdrojů

1. **Hierarchické skupiny a jasný focus.** Android Developers doporučují rozdělit složité herní nabídky do hlavních kategorií a podřízených položek, seskupovat prvky a výrazně ukazovat aktivní výběr. U inventáře zmiňují jasný rámeček vybraného slotu a přizpůsobené akční nápovědy.
2. **Třídění a okamžitá zpětná vazba.** Unity doporučuje inventář organizovaný podle typu, srozumitelné ovládací prompty, okamžitou odezvu a ovládání odpovídající zařízení.
3. **Inventář jako čtyři propojené části.** Výzkum publikovaný v rámci IEEE COG popisuje inventář přes rozhraní, reprezentaci předmětu, uspořádání a manipulaci. To podporuje návrh, ve kterém není samotná mřížka jediným prvkem.
4. **Grid versus list.** Grid umožňuje rychle prohlédnout mnoho položek; seznam je vhodnější pro porovnávání položek s více textovými statistikami. Slotové vybavení má být oddělené od samotného seznamu vlastněných předmětů. Jde o praktický návrhový kompromis, ne o univerzální pravidlo.

## Rozhodnutí pro VAULTBREAK

### Inventář a zbrojnice
- Hlavní kategorie zůstávají v horní části jako záložky nebo skupiny.
- Vlastněné předměty se zobrazují v jednotné mřížce.
- Vybraný předmět má samostatný detailní panel se statistikami, stavem vlastnictví a jedinou primární akcí.
- Desktop může zobrazit mřížku a detail vedle sebe; mobil používá nejprve výběr a následně detail pod ním / v samostatném kroku. Žádný stísněný dvousloupcový layout na úzkém viewportu.
- Výběr musí být viditelný rámečkem a sémanticky dostupný přes `aria-pressed`; informace nesmí záviset jen na hoveru.
- Sloty vybavení a jejich obsazenost zůstávají samostatnou oblastí.

### Výběr lootu
- Nabídky jsou rovnocenné karty v responzivní mřížce: jeden sloupec na telefonu, dva na středních šířkách, tři na širokém viewportu.
- Karta drží stabilní pořadí: rarita, ikona, název, stručný popis, klíčové statistiky, porovnání a doplňující vlastnosti.
- Rarita používá centrální `RARITY_COLOR` a textový štítek, nikoli samotnou barvu.
- Výběr je viditelný rámečkem a focus stavem. Akce výběru zbraně a cílového slotu zůstává oddělená.
- Přerolování a rozebrání používají existující sdílené akční styly.

### Mobilní pravidla
- Dotykové cíle nejméně 48 px.
- Bez vnořeného scrollování mřížky uvnitř dalšího scrollovatelného panelu, pokud to není nutné.
- Dlouhé detaily se čtou pod vybranou položkou; nepřetěžovat kartu drobným textem.
- Žádná horizontální scrollovací mřížka jako jediný způsob nalezení položky.

## Co tento krok nemění
Žádná herní mechanika, loot tabulky, ceny, crafting recepty, rarity data ani vybavení slotů. Změny jsou prezentační a přístupnostní. Kovárna zatím zůstává v existujícím kompaktním výběru zbraní; její plné přepracování na mřížku + detail bude samostatný krok po ověření všech stavů a šířek.

## Zdroje
- Android Developers — Recommended practices (game controller): https://developer.android.com/games/sdk/game-controller/recommended-practices
- Unity — Video Game UI Basics: https://unity.com/blog/video-game-ui-ux-basics
- IEEE COG — A. Game-Related Requirements (2021): https://ieee-cog.org/2021/assets/papers/paper_1.pdf
- Abratabia — Inventory UI Design Patterns for Games (sekundární praktický přehled): https://www.abratabia.com/game-ui-design/inventory-ui.php

Oficiální platformní doporučení a akademický zdroj mají přednost; sekundární přehled slouží pouze jako praktické doplnění.


## Implementace sdíleného zobrazení zbraně

- Přidán komponentový základ `src/game/weapon-ui.tsx`: `WeaponPanel` a `WeaponStatGrid` sdílejí identitu, raritu, element, unikátní stav a šest klíčových statistik.
- Loot karty používají stejný výpočet a pořadí statistik jako zbrojnice a Kovárna.
- Detail zbrojnice používá společný panel pro vlastněnou zbraň včetně aktuálně osazených komponent.
- Výběr výroby v Kovárně zobrazuje referenční statistiky archetypu; u již vyrobené zbraně jsou započtené její komponenty.
- Výměna komponent v Kovárně nadále ukazuje rozdíl před/po a používá stejný zdroj výpočtu komponent jako inventář.
- UI změna nemění loot generování, raritu, statistiky uložených zbraní ani save formát.

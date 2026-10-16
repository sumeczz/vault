# UI pravidla VAULTBREAK (v1.1)

Závazný návrh rozložení: velikosti, prvky, stránky a herní plocha.
Kód se řídí tímto dokumentem — výjimky schvaluje jeho aktualizace.

Pravidlo č. 1: **více ikon, méně textu.** Každá sekce má ikonu v nadpisu,
každý řádek statistiky má ikonu vlevo. Text nese jen informaci, kterou ikona
neunese (jména, čísla, podmínky). Popisy se krátí na jednu větu.

---

## 1. Plátno a mřížka

- Referenční šířka: **390 px** (mobil, portrait). Sloupec obsahu: **358 px**.
- Horizontální odsazení obrazovky: **16 px** (`px-5` na 390 px dává ~358 px obsahu).
- Maximální šířka sloupce: `max-w-md`, na desktopu centrovaná.
- Vertikální rytmus: mezera prvků **12 px** (`gap-3`), mezera sekcí **20 px**.
- Vnitřní odsazení karty: **12–16 px** (`p-4`).
- Spodní odsazení stránek s navigací: **112 px** (`pb-28`), aby navigace nic nezakrývala.
- Bezpečné oblasti: nahoře `max(12px, env(safe-area-inset-top))`, dole navigace
  `max(8px, env(safe-area-inset-bottom))`.
- Žádný horizontální overflow na 390 px — ověřuje smoke test.

## 2. Typografická stupnice

| Použití | Velikost | Příklad |
|---|---|---|
| Logo / wordmark | 28–36 px (`text-4xl`) | VAULTBREAK, POSTAVA |
| Nadpis obrazovky | 24–28 px (`text-2xl`) | Kodex, Báze, dialogy |
| Nadpis sekce | mono 11 px + tracking `0.25em`, velká písmena | POSTAVA, ODZNAKY |
| Název karty | 15–17 px | jméno zbraně, karty |
| Základní text | 14–16 px (`text-sm`) | popisy, těla karet |
| Popis | 12–14 px (`text-xs`) | vysvětlivky |
| Technický text | 11–12 px (`text-[11px]`, mono) | čísla, seedy, postupy |
| Klíčová statistika | 18–24 px (`text-lg`) | velké číslo ve StatsScreen |

Technické texty nikdy pod 11 px. České znaky (ěščřžýáíé) — font Inter latin-ext.

## 3. Tlačítka

- **Primární** (`vb-btn-primary`): oranžová `#FF8A24`, výška 64 px, tmavý text
  18 px bold. Jen jedna na obrazovku: Nový běh, Pokračovat, Znovu, Start vlna.
- **Sekundární** (`vb-btn-ghost`): tmavý povrch, výška 52 px, text 14–16 px.
- **Ikonové**: dotyková plocha min. **48 × 48 px**, ikona 20–24 px.
- **Výběrové** (sektor, zbrojnice, sloty): min. 48 px, vybrané = modrý obrys
  + jasnější povrch, zamčené = zámek + podmínka (nikdy jen průhlednost).
- **Přepínač** (`vb-switch`, Torment): 52 × 30 px, oranžový ve stavu ON,
  vizuální stav se mění okamžitě s hodnotou, `role="switch"`.
- Každé tlačítko min. 48 px na výšku/šířku dotykové plochy.

## 4. Karty a panely

- **Základní karta**: `surface`, obrys `border`, radius 16–24 px, nadpis 15–17 px,
  popis 12–14 px, ikona volitelná.
- **Hero karta** (`vb-hero`): ilustrace nahoře (CSS/kreslená, bez textů UI),
  text na kontrastním gradientním podkladu.
- **Panel postavy**: portrét 56 px → `LVL N · SEKTOR M` → XP bar s čísly →
  5 statistik (ikona + hodnota + název).
- **Karta zbraně**: rarita → ilustrace s rarity proužkem → název → typ →
  mřížka DMG/DPS/RPM → chování → porovnání. Základ = 3 čísla, zbytek detail.
- **Stavové karty**: `vb-card-success` (zelený obrys), `vb-card-danger`
  (červený obrys), `vb-card-locked` (zámek + podmínka).
- Rarita nikdy nemění rozměry komponenty; legendární smí výraznější rámeček.
- **Inventář a kovárna**: nabídky zbraní a materiálů jsou kompaktní mřížky ikon,
  nikoli dlouhé seznamy velkých karet. Výběr zobrazí jediný panel detailu s
  ikonami nákladů, počtem fragmentů, zdroji dropů a odpovídající akcí.
- **Informace na vyžádání**: ikony mají český `title` a přístupný název.
  Hover/focus odhalí úplný popis; mobilní rozhraní zachovává viditelné názvy
  a počty, takže tooltip není jediným zdrojem důležité informace.

## 5. Progress bary

- Každý bar: vizuální indikátor + **čísla** (`aktuální/maximum`), rychlá animace.
- HP bar: červený gradient, low-HP = pulz + červená čísla + vignette.
- XP bar (`vb-xp-fill`): ledový gradient, text `Lvl N · XP x/y`.
- Barva nikdy není jedinou informací o stavu.

## 6. Stránky (mobile-first)

Všechny hlavní obrazovky jsou **celostránkové scrollovatelné sloupce**
(ne dialogy), se spodní navigací:

```
.vb-vignette .absolute .inset-0 .flex .flex-col .items-center
.overflow-y-auto .px-5 .pt-8 .pb-28
  .w-full .max-w-md .flex-col .gap-3
    hlavička (štítek + nadpis 4xl)
    ... sekce ...
```

- **Domů** (menu): hero → NOVÝ BĚH → sbalitelné nastavení expedice (seed, sektor,
  Torment, zbrojnice) → denní/týdenní výzva → pomocné → admin. Souhrny postavy,
  profilu, žebříčku, Kodexu, Úspěchů a Cesty patří na své vlastní stránky a
  neopakují se na Domů.
- **Postava**: hlavička → CharacterPanel → odznaky.
- **Kovárna**: hlavička → přepínač Výroba/Úpravy → sklad materiálů →
  kompaktní výběr zbraně → jeden detail receptu nebo komponentového slotu.
  Výběr úprav zobrazuje jen vyrobené zbraně; prázdná zbrojnice nabídne přechod
  na výrobu. Postava neobsahuje výrobní recepty ani trvalé úpravy.
- **Kodex**: hlavička + souhrn bonusu → kategorie s ikonami → položky
  (odemčené: jméno/popis/bonus; zamčené: `???`).
- **Achievementy**: hlavička + počet → položky (SPLNĚNO/ZAMČENO + popis).
- **Cesta**: hlavička + progress bar → profil → nepřátelé → portály/anomálie →
  dílna → sbírka.
- Dialogy zůstávají jen pro: nápovědu, slovníček, správce, statistiky běhu,
  pauzu, loot, bázi, konec běhu, kolo štěstí, auth. Všechny mají Zpět.

## 7. Spodní navigace

- Položky (stabilní pořadí): **Domů / Postava / Kovárna / Kodex / Úspěchy / Cesta**.
- Každá: ikona 20 px + krátký text 11 px, min. výška 64 px, `aria-current`.
- Aktivní = modrá (`accent-blue`) + indikátor; neaktivní = muted.
- Pozadí `bg-bg/95` + blur, horní obrys, safe-area dole, `z-20`.
- Zobrazena na 6 hlavních stránkách; ve hře a v dialozích skrytá. Kovárna je
  dostupná i před odemčením, aby bylo možné prohlížet sklad; výroba a úpravy
  zobrazí zámek s požadavkem profilového LVL 6.

## 8. Herní plocha (canvas + HUD)

- Canvas fullscreen pod UI; kamera sleduje hráče, zoom dle šířky.
- HUD respektuje safe-area; na mobilu je vlevo jeden virtuální joystick, směr
  pohybu současně určuje míření a automatická střelba je vždy zapnutá. Pravý
  joystick se nezobrazuje. Na PC míří myš/gamepad a automatickou střelbu lze
  zapnout v nastavení expedice nebo v pauze.
- Tlačítka schopnost/dash/zbraň vpravo dole (56 px), postava vedle nich.
- HP bar nad postavou (canvas), XP bar + čísla v HUD, boss bar nahoře,
  buff-čipy s odpočty, odpočet vlny / tlačítko Start vlna centrované nahoře.
- Toasty vpravo, mimo dosah palců. Horní akce otevírají kompaktní přehledy
  Boj, Statistiky běhu a Výbava; otevřený přehled pozastaví simulaci.
- Boj zobrazuje postup místnosti/vln, stav nepřátel, HP a aktivní zbraň.
  Statistiky běhu zobrazují čas, přesnost, zásahy, poškození, XP a výzvy s
  progress bary. Barvy stavů vždy doplňují číselné hodnoty.
- Dílna je záložka přehledu a lze ji otevřít pouze v bezpečné pauze mezi vlnami
  (žádní nepřátelé, další vlna existuje a běží odpočet, nebo čeká ruční start).
  Po vstupu zůstává běh pozastavený; mimo toto okno je záložka uzamčená.
- Panely mají vlastní scroll, zavírací akci a na mobilu zůstávají ovladatelné
  dotykem; nepřekrývají interaktivní canvas ovládání.
- Přechody panelů/záložek, průběhové pruhy a přepínače používají Motion
  s krátkou animací; respektují `prefers-reduced-motion` a bez animace zachovají
  stejný stav i informace.
- Mobilní joystick je jediný, statický a levostranný. NippleJS se inicializuje
  až po připojení DOM z React efektu a při odchodu z obrazovky se zničí;
  knihovna se nesmí importovat synchronně při serverovém renderování, protože
  inicializuje přístup k `window`.
- Mobilní auto-fire se nesmí dát vypnout; desktopové auto-fire je preference
  s přístupným `role="switch"` v nastavení expedice a pauze.
- Animace jsou prezentační: nesmí odkládat kliknutí, měnit výsledek akce ani
  skrývat aktuální číselný stav progressu.

## 9. Ikony

- Styl: tah 2 px, kulaté konce, jednoduché siluety, `currentColor` (dědí barvu).
- Akcentové ikony nesou barvu významu (lebka červená, kalendář modrá/fialová).
- Emoji v DOM UI zakázána (⚙◆● → ikony/CSS); canvas floatry a próza výjimka.
- Herní ikony vybavení, nepřátel, materiálů a talentů mají typované mapování v
  `src/game/ui-icons.tsx` a jednotnou linkovou kresbu Lucide. Nové vlastní
  ilustrace mimo tuto knihovnu patří do `public/assets/ui/icons/` s manifestem.
- Ikony se používají opakovaně v inventáři, výběru výbavy, drop přehledu i
  kodexu; čísla a názvy zůstávají čitelné i bez hoveru.

## 10. Kontrolní seznam obrazovky

- [ ] Hlavička: štítek + nadpis 4xl, centrovaná.
- [ ] Každá sekce má ikonu v nadpisu.
- [ ] Žádný odstavec delší než 2 věty mimo nápovědu/slovníček.
- [ ] Všechny dotykové prvky ≥ 48 px.
- [ ] Čísla u všech rozhodovacích hodnot.
- [ ] Spodní odsazení 112 px (navigace nic nezakrývá).
- [ ] Žádný text uvnitř ilustrací.
- [ ] Na 390 px bez horizontálního posunu.

## 11. Kompaktní herní přehledy a dialogy

- Herní HUD používá malé samostatné skupiny pro stav běhu, zdraví/XP, výbavu
  a schopnosti; zachová čitelná čísla a nesmí zakrýt ovládací zóny.
- Zbraň a schopnost mají ikonu, krátký název a klíčový stav (zásobník,
  nabití). Podrobnosti patří do tooltipu nebo panelu Postavy.
- Postava, Boj a Dílna používají kompaktní mřížky/řádky s ikonou, názvem
  a hodnotou. Dlouhé popisy a méně časté detaily lze skrýt do rozbalovací
  položky, ale musí být dostupné klávesnicí a dotykem.
- Cesta, Kodex a Úspěchy zobrazují stav odemčení přímo na položce; kategorie
  a záznamy se mohou rozbalovat, aby důležité souhrny nebyly utopené v dlouhém
  seznamu.
- Obchod a portály v bázi jsou ikonové dlaždice se stále viditelným názvem,
  cenou nebo podmínkou. Uzamčené položky vždy uvádějí, jak se odemknou.
- Dlouhé dialogy mají vlastní vertikální scroll a nepřekračují výšku
  dostupného viewportu; jejich primární a návratové akce zůstávají dosažitelné.
- `summary` a tlačítka mají zřetelný `focus-visible` obrys; důležité informace
  nesmějí být dostupné pouze hoverem.

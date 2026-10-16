# VAULTBREAK — mapa funkcí a systémových vazeb

Stav implementace k 17. 10. 2026. Tento dokument vysvětluje, jak spolu herní
funkce spolupracují, kde se jejich stav ukládá a které moduly jsou jejich
vstupními body. Číselná pravidla a vyvážení zůstávají ve
[`progression-rules.md`](./progression-rules.md), systém postavy a výroby v
[`character-progression-and-armory.md`](./character-progression-and-armory.md)
a požadavky na rozhraní v [`ui-rules.md`](./ui-rules.md).

## 1. Základní hranice postupu

Hra má tři odlišné vrstvy postupu. Záměna těchto vrstev by změnila odemykání
nebo přenos síly mezi běhy.

| Vrstva | Vlastní data | Co ovlivňuje | Co neovlivňuje |
|---|---|---|---|
| Profil | `bestLevel`, checkpointy, kumulativní statistiky a rekordy | stránku Cesta, profilové funkce a dostupnost portálů/systémů | XP a talenty aktivní postavy |
| Aktivní postava | její level/XP, talentové body, talenty, materiály, vyrobené zbraně a komponenty | trvalé bonusy při startu běhu, dropy navázané na Polní sběr a možnost startovní zbraně | profilovou Cestu a profilový `bestLevel` |
| Běh | seed, sektor/místnost/vlnu, HP, dočasné XP, loot, mody a dočasné zdroje | okamžitý boj a výsledky právě probíhající expedice | neukládá se jako trvalý build; odměny se převedou až při uzavření běhu |

Profilový unlock je vždy odvozen od `bestLevel` přes `unlocksForLevel()`.
Level postavy plyne z bojového XP a její strop je 30. Level uvnitř běhu je
postup encounterů a není ani jedním z těchto dvou levelů.

## 2. Průchod hry od spuštění po odměny

1. `GameView` načte lokální profil, profilový save, aktivní postavu, nastavení
   obsahu, obtížnosti a ovládání. Navigace zobrazuje Domů, Postavu, Kovárnu,
   Kodex, Úspěchy a Cestu.
2. Hráč zvolí běžnou expedici, checkpoint nebo denní/týdenní výzvu. Výběr
   seed/portálu a kola mutátorů připraví neměnné nastavení sektoru pro `Run`.
   Denní a týdenní běh vždy použije služební pistoli, nikoli vyrobenou zbraň
   postavy.
3. `Run` sestaví postavu z aktivního charakteru, talentů, Kodex bonusů,
   startovní výbavy a sektorových modifikátorů. Simulace postaví místnosti,
   vlny a nepřátele z datových tabulek a seedovaného generátoru.
4. Každý tik vstupu (`sampleInput`) řídí pohyb, míření, střelbu, dash,
   schopnost, změnu zbraně a klávesové akce. `Run.update()` aplikuje boj,
   statusy, kolize, poškození, XP a smrt nepřátel.
5. Zabití přispívá do několika nezávislých subsystémů: běhové statistiky /
   výzvy, dosud neodemčené záznamy Kodexu, trvalé počítadlo znalosti nepřítele,
   blueprint archetypu a zásilka materiálů. Tyto záznamy mají různé klíče i
   okamžik uložení.
6. Vyčištění místnosti otevře odměnu. Hráč zvolí jednu z nabídek, přeroluje,
   případně rozebere nabídku na šrot; odměna se uloží do běhu, ne ihned do
   trvalého skladu postavy.
7. Po bossovi je báze: léčení, obchod podle odemčení, banknutí nebo výběr
   dalšího portálu. Mezi bezpečnými vlnami lze otevřít přehled a Dílna; při
   souboji nebo běžné vlně je Dílna zamčená.
8. Při porážce nebo banknutí `finishRun` zapíše profilové statistiky a
   checkpointy, přidělí aktivní postavě všechna získaná XP a bezpečně připíše
   materiálovou zásilku. Až tento okamžik převádí dočasný běhový postup na
   dlouhodobý.

## 3. Trvalé systémy a jejich návaznosti

### 3.1 Profil, Cesta a checkpointy

- `save.ts` načítá a zapisuje profil na klíči `vaultbreak-v1` (save verze 6).
- `recordRun()` aktualizuje rekordy, kumulativní statistiky a `bestLevel`.
- `unlockSector()` zvyšuje checkpoint po poražení bosse.
- `progression.ts` převádí nejlepší dosaženou úroveň na sadu unlocků; Cesta
  zobrazuje jejich stav a nejbližší cíl. `GameView` stejný výsledek používá
  k povolení šrotu, Kovárny, obchodu, portálů, synergií, affixů, Veterána a
  Tormentu.
- Profil s lokální přezdívkou/PINem je uložen v tomto zařízení. Není to
  serverový účet, cloud synchronizace ani ochrana proti úpravám klientského
  úložiště.

### 3.2 Postava, XP a talenty

- `characters.ts` vlastní verzovaný soubor postav pod
  `vaultbreak.characters.v1`; v současné verzi je aktivní výchozí postava.
  Datový formát má ID a seznam, ale uživatelské vytváření/výběr více postav a
  tříd zatím implementováno není.
- `xpForNextLevel()` určuje exponenciální náklady XP; `applyCharacterXp()`
  může převést více úrovní najednou a uplatní strop 30. `awardCharacterXp()`
  přidává za každý získaný level talentový bod.
- `finishRun` volá zápis profilu; ten přidělí běhové XP postavě. XP jsou za
  života běhu dočasná, level-up a bod se stanou trvalými až při jeho uzavření.
- `purchaseCharacterTalent()` kontroluje body, úroveň odemčení a cap větve.
  `respecCharacterTalents()` vrací utracené body za rostoucí cenu šrotu a
  slitin. `Run` načítá talenty při sestavení běhu: Výdrž ovlivní max HP,
  Balistika poškození a Polní sběr šanci na dodatečný běžný materiál.
- Tato větev nepoužívá Cestu; profilový unlock se nikdy neodvozuje z levelu
  postavy.

### 3.3 Výroba, trvalé komponenty a běhové upgrady

Zbraň může být upravena ve třech nezaměnitelných vrstvách:

1. **Vyrobená startovní zbraň** — `character-armory.ts` ověří profilový unlock,
   vlastnictví a cenu; recept odečte materiály a přidá archetyp do zbrojnice
   postavy.
2. **Trvalé komponenty** — `weapon-components.ts` definuje sloty hlaveň,
   zásobník a jádro, jejich efekty a náklady. Upgrade patří ke konkrétnímu
   vyrobenému archetypu; `previewComponentWeapon()` počítá náhled před/po.
   Při novém komponentu v již obsazeném slotu se původní součást nevrací.
3. **Běhové mody/loot** — mody a nalezené zbraně patří právě probíhajícímu
   buildu. Modifikace této vrstvy se po běhu nepřenášejí do trvalé zbrojnice.

Vyrobený archetyp se aplikuje pouze jako výbava běžného běhu aktivní postavy.
Denní/týdenní výzva používá služební pistoli. Profilové blueprinty a jejich
bonusy jsou zvláštní historická vrstva (§23 pravidel progrese).

### 3.4 Materiály a jejich bankování

- `rollCharacterMaterialDrop()` volá simulace při zabití a určuje fragment,
  šrot, slitiny, jádra nebo elementární katalyzátor podle druhu nepřítele,
  sektoru, elitního stavu, portálu a talentu Polní sběr.
- `describeMaterialDrop()` převádí drop do herní zprávy; drop sám je uložen ve
  sbírce daného `Run`, takže banknutí/porážka je jediný převod do skladu.
- `grantCharacterRunMaterials()` připíše zásilku aktivní postavě při dokončení
  běhu. Výroba i úpravy spotřebují právě tento sklad.
- Šrot může současně vznikat rozebíráním kořisti, výzvami a dropy. Každý
  konzument (obchod, respec, výroba, úpravy) odečítá cenu ze správné vrstvy
  a musí ji zobrazit před potvrzením.

### 3.5 Kodex, znalost nepřátel a prestiž

Jde o dva související, ale významově oddělené záznamy:

- `vaultbreak.codex.v1` obsahuje jednorázová odemčení. `codexEntries()` je
  katalog, `unlockCodex()` zapisuje první setkání, `codexBonus()` sčítá pouze
  skutečně odemčené položky. Tento bonus se uplatní při sestavení běhu na
  HP, poškození, rychlost a kritickou šanci; není to měna.
- `vaultbreak.codex.enemy-knowledge.v1` obsahuje celoživotní počet zabití
  každého nepřítele a druhy, za něž byla prestiž již udělena.
  `recordEnemyKill()` běží při každém platném zabití, aktualizuje znalostní
  stupeň a jednorázově zapíše bod při maximu 2 000 zabití daného druhu.
- `enemyKnowledgeProgress()` vypočítává šest stupňů na prazích 1/10/50/200/
  750/2 000 a průběh k dalšímu. Obrazovka Kodex zobrazuje počítadla, pruhy a
  součet PP. Znalosti/PP neposilují postavu ani profilové achievementy;
  bod čeká na budoucí endgame využití.
- Zabití zároveň může poprvé odemknout položku enemy/affix/archetype v běžném
  Kodexu a přidat progres blueprintu. To jsou tři oddělené výstupy téhož
  bojového okamžiku.

### 3.6 Výzvy, achievementy a denní/týdenní běhy

- `Run` průběžně aktualizuje výzvy běhu; odměna šrot se nejdříve připíše do
  běhu, odznak je trvalý profilový zápis. Stats panel ukazuje progres.
- Achievementy se vyhodnocují z profilu a dokončení Kodexu; `commitSave()`
  připraví nové odemčené položky pro oznámení po běhu.
- `daily.ts` a `weekly.ts` spravují seed pro období a nejlepší výsledek.
  `leaderboard.ts` uchovává lokální výsledky. Reset progresu tato data maže,
  nastavení správce a obtížnosti ponechává.

## 4. Boj, obsah a číselný dopad

- `GameView` spravuje React obrazovky a životní cyklus; `Run` v `sim.ts` je
  zdroj pravdy pro stav běhu. `HudSnap` a `StatsSnap` jsou projekce běhového
  stavu do rozhraní, ne paralelní herní simulace.
- `dungeon.ts` sestaví místnosti a vlny; `bestiary.ts` určuje nepřátele a
  jejich statistiky. `Run.statsSnap()` používá stejné definice jako souboj,
  takže informace ve statistikách odpovídají simulaci.
- `weapons.ts` a `abilities.ts` poskytují definice a losování; `content-settings.ts`
  poskytuje validované katalogy pro editor správce. Nově konfigurované efekty
  vybírají existující typ efektu — editor nevytváří libovolný nový kód.
- `difficulty.ts`, mutátory, portály, anomálie a Torment upravují parametry
  sektoru/běhu. `scaling.ts` sdružuje výpočet poškození, zbroj, kritické
  limity a klesající výnosy; efekty se nesmí násobit znovu v UI.
- Přechody místností spouštějí odměny a mezi vlnami případně krátkou pauzu.
  První vlna sektoru a elitní vlna vyžadují ruční Start vlna; poslední vlna
  nemá pauzu. Bezpečná pauza umožňuje dílnu, která nemění běhové loot mody na
  trvalé komponenty.

## 5. Ovládání a rozhraní

### Ovládání

- `input.ts` sjednocuje klávesnici, myš, gamepad a dotyk do `Actions`.
  `bindInput()` připojí události a vrátí cleanup; `sampleInput()` se čte
  simulací v herním cyklu.
- Klávesnice: WASD/šipky, mezerník pro dash, F/Shift pro schopnost, Q/E pro
  výměnu zbraně, P/Escape pro pauzu, T pro bojový přehled, C pro výbavu.
- Myš míří a levé tlačítko střílí. Gamepad má levou páčku pro pohyb, pravou
  pro míření a tlačítka/spoušť pro akce.
- Na dotykovém zařízení `TouchLayer` zpřístupní jeden levý statický joystick
  NippleJS a tlačítka schopnosti, dash, výměny zbraně a postavy. Knihovna se
  načítá dynamicky z efektu, aby její přístup k `window` nenarušil SSR.
  `setTouchControlsEnabled()` vynutí automatickou střelbu; při pohybu je směr
  joystiku současně směrem míření. Při zastavení zůstane zachován poslední
  směr.
- Na desktopu je automatická střelba volitelná, uložená jako preference
  `vaultbreak.controls.auto-fire` a přepínatelná v nastavení expedice/pauze.
  V režimu auto-fire míří při pohybu směrem pohybu; myší lze mířit a střílet
  ručně, pokud je vypnutá.
- Při odchodu z touch ovládání nebo unmountu se joystick zničí a vstup pohybu
  vynuluje. Ovládací zóna potlačuje gesta stránky během hry.

### UI, animace a přístupnost

- Canvas kreslí svět; `GameView` vrství na něj HUD, dialogy a celostránkové
  obrazovky. `ui-icons.tsx` je centrální mapování herních ikon.
- Hlavní navigace je přítomná jen na hlavních obrazovkách. Herní přehledy
  Boj/Statistiky běhu/Výbava pozastavují simulaci; dílna je podmíněná
  bezpečnou pauzou mezi vlnami.
- Motion v `GameView` animuje vstup/výstup přehledů, stav přepínače a růst
  vybraných progress barů. `useReducedMotion()` vypne přebytečný pohyb, aniž
  by měnil hodnoty nebo dostupnost funkcí. CSS může poskytovat další
  přechody; požadavek na vzhled a dotykovou velikost je v `ui-rules.md`.
- Progress je vždy vyjádřen číslem i barvou/pruhem. Tooltip může doplnit
  detail, nesmí být jediným místem s cenou, stavem či podmínkou.

## 6. Ukládání a reset

| Klíč | Vlastník | Obsah / dopad |
|---|---|---|
| `vaultbreak-v1` | `save.ts` | profilové rekordy, bestLevel, checkpointy a souhrnné statistiky |
| `vaultbreak.characters.v1` | `characters.ts` | aktivní postava, XP, talenty, materiály, zbrojnice a komponenty |
| `vaultbreak.codex.v1` | `codex.ts` | jednorázová sbírka, jejíž položky dávají CodexBonus |
| `vaultbreak.codex.enemy-knowledge.v1` | `codex.ts` | zabití jednotlivých druhů a prestižní body |
| `vaultbreak.achievements.v1`, `vaultbreak.badges.v1` | achievements/challenges | trvalá odemčení profilu |
| `vaultbreak.daily.v1`, `vaultbreak.weekly.v1`, `vaultbreak.board.v1` | denní/týdenní moduly | osobní výsledky období a místní žebříček |
| `vaultbreak.blueprints.v1`, `vaultbreak.armory.v1` | `mods.ts` | dlouhodobý progres rámů a starší profilová zbrojnice |
| `vaultbreak.content-catalogs.v1` | `content-settings.ts` | katalogy správy obsahu |
| `vaultbreak.difficulty.v1` | `difficulty.ts` | vlastní obtížnost prohlížeče |
| `vaultbreak-profile-v1` | `auth.ts` | místní přezdívka/PIN; není součástí synchronizovaného účtu |
| `vaultbreak.controls.auto-fire` | `GameView` | preference desktopového auto-fire |

`resetProgress()` maže herní save, postavu, Kodex včetně znalostí/prestiže,
achievementy/odznaky, denní/týdenní výsledky, leaderboard a blueprint/zbrojnici.
Nemá mazat profilové přihlášení, nastavení hlasitosti, obtížnost, správce ani
volbu auto-fire. Zásilka z nedokončeného běhu se při zavření bez uzavření
nepřevádí do postavy.

## 7. Hranice implementace a ověření

- Více postav a tříd je datově připravená budoucí práce, ne hotová funkce.
- Prestiž se uděluje a ukládá, ale zatím ji nelze utratit a neposkytuje bonus.
- Lokální přezdívka/PIN, skóre i konfigurace jsou pouze v konkrétním
  prohlížeči; neexistuje cloudová záloha ani synchronizace.
- Správce mění existující obsahové definice a parametry. Nový efekt, chování
  zbraně nebo archetyp vyžaduje změnu implementace i testů.
- Cílové ověření změn: `npm run typecheck`, `npm test`, cílený ESLint a
  `npm run build`; UI změny navíc ověřit na úzkém viewportu i v běhovém
  průchodu.

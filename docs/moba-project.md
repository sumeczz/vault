# NEXUS ARENA — 2D MOBA (projektová dokumentace)

## 1. Koncept

Jednoduchá 2D top-down MOBA ve stylu League of Legends (klasická tří-cestná mapa),
ale s **vlastními mechanikami** — nekopírujeme LoL schopnosti ani itemy.

- **Žánr:** MOBA (top-down, 5v5 → zjednodušeno na 3v5 botů pro jednoho hráče)
- **Cíl:** zničit nepřátelský Nexus (baštu) na druhém konci mapy
- **Unikát:** místo itemů a schopností s cooldowny → **Energie + Kombinační systém**
  (hráč má 3 základní moduly, které se kombinují — viz §4)

## 2. Mapa (LoL kompakt)

```
        NEPŘÍTEL
   [Nexus] [Inhibitor] [Turret T3]
        \                 /
         \   JUNGLE      /
          \   (křížky)   /
           \             /
   [Turret T2]       [Turret T2]
           \           /
            \  MID     /
             \         /
   [Turret T1]—[River]—[Turret T1]
             /         \
            /   JUNGLE  \
           /             \
   [Turret T2]       [Turret T2]
           \           /
            \         /
   [Turret T3] [Inhibitor] [Nexus]
        HRÁČ
```

- **3 cesty (lanes):** top / mid / bottom — diagonální symetrie jako v LoL
- **River:** dělí mapu na dvě poloviny, obsahuje **Neutralního Golema**
  (buff: +regenerace energie po zabití)
- **Jungle:** mezi cestami, **3 kampy** na každé straně (zkušenost + energie)
- **Turrety:** 3 na lane + 2 base — agresivní, prioritizují miniony
- **Minion wave:** spawn každých 20s, 3 melee + 2 ranged, jdou po lane path
- **Velikost:** 2560×2560 world units, kamera následuje hráče

## 3. Základní mechaniky

| Mechanika | Popis |
|---|---|
| Pohyb | WASD / right-click-to-move (obě podporováno) |
| Útok | Auto-attack na nejbližšího nepřítele v dosahu (LMB / A+click) |
| Zkušenost | Level 1–10, +HP/+DMG za level |
| Energie | Regeneruje se, spotřebovává se na moduly |
| Respawn | 5s + 2s/level, u vlastního Nexusu |
| Výhra/Prohra | Nexus HP → 0 |

## 4. Unikát: Kombinační systém (místo QWER)

Hráč má **3 moduly** (klávesy 1/2/3), každý s vlastní spotřebou energie:

1. **Blesk** — line skillshot, rychlý, nízký cooldown
2. **Štít** — dočasný shield + krátké zrychlení
3. **Přesun** — blink na krátkou vzdálenost

**Kombinace:** použití 2 modulů do 1.5s za sebou → **Combo efekt** (např.
Blesk→Štít = výbuch kolem hráče). Odměna za kreativitu bez stovky schopností.

## 5. Nepřátelé (boti)

- **3 AI boti** na lanech (top/mid/bot), jednoduché stavové chování:
  farm → push → retreat pod turret → respawn
- **Turret AI:** střílí nejbližšího nepřítele v radiusu
- **Golem v river:** neutrální, buff po zabití

## 6. Grafický styl

**Procedurální geometrický vektorový styl** na Canvas 2D — čistý flat design,
žádné assety ani generátory, vše se kreslí canvas cestami (path, arc, polygon).

- **Mapa:** top-down — lanes jako světlé pásinky, jungle tmavší s texturou
  kruhů, river s gradientem, turrety/nexus jako geometrické tvary v team
  barvách (modrá vs červená)
- **Jednotky:** minioni = malé koule s outline, hráč = hexagon s ukazatelem
  směru, turrety = obdélníky s rotující hlavní, nexus = diamant
- **Efekty:** částice (blesk = čára + jiskry, štít = glow, přesun = trail),
  screen shake, damage numbers, heal glow
- **Minimap:** stejný styl zmenšený do rohu

## 7. Tech stack

- **React 19 + TanStack Start** (scaffold již v workspace)
- **Canvas 2D** render (jednoduchý, rychlý, žádný engine)
- **Zustand** pro game state (auth/db OFF — single-player vs boti)
- **Fixed timestep** game loop (60 Hz) + render interpolation
- **Pathfinding:** waypoint graph po lanech + jednoduchý steering v jungle

## 8. Architektura

```
src/
  game/
    engine/        # game loop, input, camera
    entities/      # player, minion, turret, nexus, golem
    systems/       # combat, waves, xp, combo, AI
    map/           # mapa, waypointy, lane data
    render/        # canvas draw, sprite/shape art
  routes/
    index.tsx      # herní obrazovka (canvas + HUD)
  components/
    Hud.tsx        # HP, energie, level, combo indikátor
    Minimap.tsx    # minimapa
```

## 9. Milestones

| Fáce | Obsah | Status |
|---|---|---|
| M1 | Mapa + pohyb hráče + kamera | hotovo |
| M2 | Minion waves + turrety + combat | hotovo |
| M3 | Moduly + combo systém | hotovo |
| M4 | Boti AI + golem + buff | hotovo |
| M5 | HUD + minimapa + výhra/prohra | hotovo |
| M6 | Polish: zvuk, efekty, brand | plán |

## 10. Rozdíly vs LoL (záměrné)

- Žádné itemy → **Energie + Combo** jako progres
- 3v5 místo 5v5 (single-player proti botům)
- Level cap 10 (rychlejší hra ~10 min)
- Žádný last-hit → automatické farmení

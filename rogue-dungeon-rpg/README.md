# Abyssbound — Dungeon Action RPG

> Původní akční roguelike RPG prototyp inspirovaný obecnými principy žánru a přístupným ovládáním hry Rogue Dungeon RPG. Nejde o kopii původní hry.

## Stav projektu

**Verze:** 0.1.0 — první hratelný základ. Prototyp obsahuje top-down arénu, plynulou kameru, pohyb, základní útok, úskok, éterický výboj, jednoduché nepřátele, XP, úrovně a HUD. Build ani hraní zatím nebyly ověřeny na pracovním počítači.

## Spuštění

Vyžaduje Node.js a npm.

1. Otevři terminál v této složce.
2. Spusť `npm install`.
3. Spusť `npm run dev`.
4. Otevři adresu, kterou vypíše Vite.

Produkční build ověříš příkazem `npm run build`.

## Ovládání

- **WASD / šipky:** pohyb
- **J / levé tlačítko myši:** základní útok
- **Mezerník:** úskok (spotřebuje výdrž)
- **E:** plošný éterický výboj
- **Esc po smrti:** nový pokus
- Mobil: virtuální směrový ovladač a akční tlačítka

## Dokumentace

- `docs/GAME_DESIGN.md` — herní vize, pilíře, smyčka a rozsah MVP.
- `docs/TECHNICAL_DESIGN.md` — architektura a technická rozhodnutí.
- `docs/ROADMAP.md` — milníky a akceptační kritéria.
- `docs/REFERENCE.md` — předloha a hranice inspirace.

## Plánovaný základ

JavaScript (ES modules), Vite, Canvas 2D a responzivní HTML/CSS bez Reactu a Tailwindu. Herní data se budou postupně oddělovat od logiky; procedural generation a persistentní progrese patří do dalších milníků.

## Pravidla inspirace

Projekt má vlastní název, svět, logiku, grafiku a herní systémy. Rogue Dungeon RPG slouží pouze jako designová reference. Nepřebíráme zdrojový kód ani chráněné assety původní hry.

- Reference: https://play.google.com/store/apps/details?id=io.cordova.RogueRpg

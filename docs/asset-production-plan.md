# Vaultbreak â€” plĂˇn tvorby hernĂ­ch assetĹŻ

**Stav:** pĹ™Ă­pravnĂˇ fĂˇze; prvnĂ­ sada mĂˇ schvĂˇlenĂ˝ technickĂ˝ rozsah, finĂˇlnĂ­ PNG zatĂ­m nejsou vytvoĹ™enĂ©.
**CĂ­l:** nahradit procedurĂˇlnĂ­ grafiku skuteÄŤnĂ˝mi assety bez zĂˇsahu do simulace a hernĂ­ch pravidel.

## 1. SchvĂˇlenĂ˝ vĂ˝robnĂ­ postup

**HybridnĂ­ workflow:** AI se pouĹľĂ­vĂˇ pouze pro referenÄŤnĂ­ koncepty a vĂ˝tvarnĂ© podklady; finĂˇlnĂ­ pixely a animaÄŤnĂ­ snĂ­mky se ruÄŤnÄ› dokonÄŤujĂ­ v LibreSprite. Koncept nenĂ­ automaticky hernĂ­ asset.

## 2. SchvĂˇlenĂ˝ vĂ˝tvarnĂ˝ smÄ›r

**Retro Arcade Comic Pixel-Art.** OriginĂˇlnĂ­ retro pulp/arkĂˇdovĂˇ komiksovĂˇ kresba pro top-down roguelite stĹ™Ă­leÄŤku.

- SilnĂ© ink obrysy, tvrdĂ© pixelovĂ© stĂ­ny a omezenĂˇ teplĂˇ paleta.
- VĂ˝raznĂ© siluety, krĂˇtkĂ© speed-lines, komiksovĂ© zĂˇsahy a vĂ˝buchy.
- Bez sci-fi brnÄ›nĂ­, futuristickĂ˝ch energetickĂ˝ch zbranĂ­, fantasy meÄŤĹŻ/ĹˇtĂ­tĹŻ a neexistujĂ­cĂ­ch rekvizit.
- Stylizace nesmĂ­ mÄ›nit hernĂ­ ÄŤitelnost ani naznaÄŤovat jinou mechaniku.

VĂ˝robnĂ­ specifikace: `docs/player-basic-combat-asset-brief.md`.
LibreSprite paleta: `public/assets/game/vaultbreak-comic.gpl`.
StrojovÄ› ÄŤitelnĂ˝ seznam: `public/assets/game/manifest.json`.

## 3. TechnickĂ˝ standard

- Top-down world-space vykreslovĂˇnĂ­; pivoty a mÄ›Ĺ™Ă­tko patĹ™Ă­ do asset metadat.
- PNG RGBA s prĹŻhlednĂ˝m pozadĂ­m a pevnĂ˝mi buĹkami.
- Ĺ˝ĂˇdnĂ˝ sprite nesmĂ­ mÄ›nit koliznĂ­ radius, hitbox, rychlost, HP, Ăştok ani timing.
- HP, affix, status, rarity a dalĹˇĂ­ dynamickĂ© prvky zĹŻstĂˇvajĂ­ oddÄ›lenĂ©.
- ProcedurĂˇlnĂ­ fallback zĹŻstĂˇvĂˇ povinnĂ˝.
- Manifest pouĹľĂ­vĂˇ stav `planned`, dokud soubor skuteÄŤnÄ› neexistuje a neprojde QA.

## 4. PrvnĂ­ sada â€” Player & Basic Combat

- HrĂˇÄŤ: idle, pohyb, stĹ™elba, zĂˇsah, dash a smrt.
- VĂ˝chozĂ­ pistole: samostatnĂ˝ sprite s recoil animacĂ­.
- Grunt: zĂˇkladnĂ­ kontaktnĂ­ nepĹ™Ă­tel dle bestiary.
- Projektil, muzzle flash, hit effect, dash trail a death VFX.

PrvnĂ­ sada stanovĂ­ vĂ˝tvarnĂˇ pravidla. Hra mĂˇ 16 archetypĹŻ zbranĂ­ a 28 druhĹŻ nepĹ™Ăˇtel; dalĹˇĂ­ sady musĂ­ respektovat jejich existujĂ­cĂ­ hernĂ­ role a chovĂˇnĂ­.

## 5. PoĹ™adĂ­ vĂ˝roby

1. ReferenÄŤnĂ­ koncepty hrĂˇÄŤe, pistole a grunta.
2. SchvĂˇlenĂ­ jejich siluet a palety.
3. RuÄŤnĂ­ dokonÄŤenĂ­ pixel-artu a animacĂ­ v LibreSprite.
4. Export PNG RGBA a aktualizace metadat.
5. ZapojenĂ­ pĹ™es renderovacĂ­ vrstvu s procedurĂˇlnĂ­m fallbackem.
6. Test v bÄ›ĹľnĂ©m bÄ›hu, pĹ™i stĹ™elbÄ›, dash, zĂˇsahu, na mobilu a v elitnĂ­ mĂ­stnosti.
7. Teprve potĂ© dalĹˇĂ­ zbranÄ›, nepĹ™ĂˇtelĂ©, prostĹ™edĂ­ a VFX.

## 6. AkceptaÄŤnĂ­ checklist

- [ ] OdpovĂ­dĂˇ retro arcade comic smÄ›ru.
- [ ] PrĹŻhlednĂ© pozadĂ­ a ÄŤistĂ© okraje.
- [ ] SprĂˇvnĂ© rozmÄ›ry bunÄ›k a stabilnĂ­ pivot.
- [ ] ÄŚitelnĂ˝ pĹ™i hernĂ­m zoomu i na mobilu.
- [ ] NepĹ™ĂˇtelskĂ© stĹ™ely jsou rozeznatelnĂ©.
- [ ] Neobsahuje hernĂ­ UI ani texty vykreslovanĂ© dynamicky.
- [ ] ProcedurĂˇlnĂ­ fallback funguje.
- [ ] OvÄ›Ĺ™eno v reĂˇlnĂ© hernĂ­ scĂ©nÄ›.
- [ ] Simulace a vyvĂˇĹľenĂ­ beze zmÄ›ny.

## 7. Pravidlo migrace

Assety se zapojujĂ­ postupnÄ› pĹ™es renderovacĂ­ vrstvu. Simulace, AI, kolize, HP, poĹˇkozenĂ­, loot, spawn tabulky a uklĂˇdĂˇnĂ­ zĹŻstĂˇvajĂ­ zdrojem pravdy. KaĹľdĂˇ etapa musĂ­ projĂ­t typecheckem, testy a buildem.

## Referenční koncepty první sady

Konkrétní vizuální zadání hráče, výchozí pistole a grunta před generováním referenčního obrázku: [vaultbreak-first-art-concepts.md](./vaultbreak-first-art-concepts.md). Finální herní PNG se nevytvářejí před schválením referenční podoby.


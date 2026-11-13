# Player & Basic Combat â€” vĂ˝robnĂ­ specifikace v2

**ZadĂˇnĂ­:** hybridnĂ­ workflow, retro arcade comic pixel-art, LibreSprite.
**Hra:** VAULTBREAK â€” top-down single-player roguelite stĹ™Ă­leÄŤka.
**Stav:** specifikace pĹ™ipravena; finĂˇlnĂ­ PNG assety zatĂ­m nejsou vytvoĹ™enĂ©.

## 1. VĂ˝tvarnĂˇ identita

Vaultbreak dostĂˇvĂˇ vlastnĂ­ retro pulp/arcade komiksovĂ˝ vzhled. Nejde o sci-fi, fantasy RPG ani realistickou vojenskou simulaci.

- Pohled shora; objekt musĂ­ bĂ˝t ÄŤitelnĂ˝ pĹ™i malĂ©m hernĂ­m zoomu.
- SilnĂ© ink obrysy, ĂşspornĂ© pixelovĂ© stĂ­novĂˇnĂ­, omezenĂˇ paleta a ruÄŤnÄ› kreslenĂ© nepravidelnosti.
- KomiksovĂ© akcenty: krĂˇtkĂ© speed-lines, hvÄ›zdicovĂ© zĂˇsahy, tvrdĂ© tvary vĂ˝buchĹŻ a vĂ˝raznĂˇ silueta projektilĹŻ.
- Retro dojem tvoĹ™Ă­ kresba, kontrast, rastr a animace â€” ne pĹ™idĂˇvĂˇnĂ­ tematickĂ˝ch rekvizit, kterĂ© hra nemĂˇ.
- Ĺ˝ĂˇdnĂ© helmy s futuristickĂ˝m hledĂ­m, energetickĂˇ jĂˇdra, robotickĂ© konÄŤetiny, meÄŤe, ĹˇtĂ­ty, runy ani vesmĂ­rnĂ© vybavenĂ­.
- NĂˇvrhy nesmĂ­ pĹ™edjĂ­mat pĹ™Ă­bÄ›h ÄŤi prostĹ™edĂ­, kterĂ© nenĂ­ doloĹľenĂ© ve hĹ™e.

### Paleta LibreSprite

| NĂˇzev | HEX | PouĹľitĂ­ |
|---|---|---|
| Ink | #17151a | obrysy, hlubokĂ© stĂ­ny |
| Warm paper | #e8d8b5 | svÄ›tlĂ© plochy, odlesky |
| Bone | #b9b09a | neutrĂˇlnĂ­ stĹ™ednĂ­ tĂłn |
| Brick red | #bd4938 | hrĂˇÄŤskĂ©/bojovĂ© akcenty |
| Mustard | #d5a642 | vĂ˝stĹ™ely, dĹŻleĹľitĂ© zĂˇblesky |
| Petrol | #477c78 | sekundĂˇrnĂ­ kontrast |
| Plum | #76516f | vzĂˇcnĂ©/temnĂ© akcenty |

Barvy jsou vĂ˝tvarnĂ© vodĂ­tko, ne hernĂ­ stav. Enemy.color, elementy, rarity, affixy a status overlay zĹŻstĂˇvajĂ­ Ĺ™Ă­zenĂ© existujĂ­cĂ­mi daty.

## 2. TechnickĂˇ pravidla

- Canvas: prĹŻhlednĂ© RGBA PNG; sprite sheet v pevnĂ˝ch buĹkĂˇch.
- Kamera zĹŻstĂˇvĂˇ top-down. ZbraĹ se vykresluje samostatnÄ› podle aim; tÄ›lo hrĂˇÄŤe se nemusĂ­ otĂˇÄŤet za kurzorem.
- Pivoty jsou lokĂˇlnĂ­ metadata assetu. NesmĂ­ mÄ›nit PLAYER_R, Enemy.r, kolize, dosah, rychlost, HP ani timing.
- NepĹ™ĂˇtelskĂ© projektily musĂ­ bĂ˝t rozeznatelnĂ© od hrĂˇÄŤovĂ˝ch i bez spolĂ©hĂˇnĂ­ pouze na barvu.
- HP bar, affix, statusy, kritickĂ© zĂˇsahy a ostatnĂ­ dynamickĂ© overlaye zĹŻstĂˇvajĂ­ mimo texturu.
- ChybÄ›jĂ­cĂ­ nebo vadnĂ˝ soubor musĂ­ bezpeÄŤnÄ› pĹ™ejĂ­t na souÄŤasnĂ© procedurĂˇlnĂ­ vykreslenĂ­.
- V manifestu je stav planned aĹľ do existence PNG a dokonÄŤenĂ­ QA.

## 3. PrvnĂ­ sada â€” skuteÄŤnĂ˝ obsah hry

### HrĂˇÄŤ â€” player_comic
- 64Ă—64 px, pivot (32,32), postava zabĂ­rĂˇ pĹ™ibliĹľnÄ› 30â€“36 px.
- Silueta kompaktnĂ­ho arkĂˇdovĂ©ho stĹ™elce: praktickĂ© vrstvenĂ© obleÄŤenĂ­/vĂ˝stroj, jasnĂˇ hlava a ramena, ÄŤitelnĂ© ruce.
- Ĺ˝ĂˇdnĂ© sci-fi brnÄ›nĂ­ ani fantasy zbroj. KonkrĂ©tnĂ­ obliÄŤej, ĂşÄŤes a drobnĂ© doplĹky se uzavĹ™ou aĹľ po konceptu.
- Animace: idle 4/8 fps loop; walk 6/12 loop; fire 3/15; hit 2/12; dash 3/15; death 6/9.

### VĂ˝chozĂ­ pistole â€” weapon_pistol
- 48Ă—24 px, orientace doprava (+X), pivot (12,17) podle pĹŻvodnĂ­ specifikace; pĹ™i integraci ovÄ›Ĺ™it proti drawWeapon.
- Retro ruÄŤnĂ­ stĹ™elnĂˇ zbraĹ s ÄŤitelnou hlavnĂ­, zĂˇvÄ›rem a rukojetĂ­. Bez energetickĂ©ho ÄŤlĂˇnku ÄŤi svÄ›telnĂ˝ch sci-fi prvkĹŻ.
- Idle 1 frame; fire/recoil 2 frames. Muzzle flash je samostatnĂ˝ efekt.
- Vzhled pistole nesmĂ­ naznaÄŤovat jinĂ© statistiky nebo chovĂˇnĂ­ zbranÄ›.

### ZĂˇkladnĂ­ nepĹ™Ă­tel â€” enemy_grunt
- 48Ă—48 px, pivot (24,24), kontaktnĂ­/melee role dle bestiary.
- ZĹ™etelnÄ› odliĹˇnĂˇ silueta od hrĂˇÄŤe; komiksovÄ› pĹ™ehnanĂ© proporce a agresivnĂ­ ÄŤitelnĂ© drĹľenĂ­ tÄ›la.
- Bez robotickĂ˝ch klepet a biomechanickĂ˝ch implantĂˇtĹŻ. KonkrĂ©tnĂ­ druh odÄ›vu/tÄ›la se rozhodne podle referenÄŤnĂ­ho konceptu.
- Animace: idle 4/8 loop; move 6/12 loop; attack 3/12; hit 2/12; death 5/9.

### BojovĂ© efekty
- projectile_kinetic: 16Ă—16, 1 frame; malĂˇ ÄŤitelnĂˇ stĹ™ela s krĂˇtkou stopou Ĺ™eĹˇenou oddÄ›lenÄ›.
- fx_muzzle_pistol: 32Ă—32, 4 frames; ostrĂ˝ komiksovĂ˝ vĂ˝Ĺˇleh z hlavnÄ›.
- fx_hit_kinetic: 32Ă—32, 4 frames; hvÄ›zdicovĂ˝ zĂˇsah, krĂˇtkĂ© Ăşlomky.
- fx_dash_trail: 48Ă—48, 4 frames; smÄ›rovĂ© speed-lines, ne energetickĂˇ aura.
- fx_enemy_death: 48Ă—48, 5 frames; krĂˇtkĂ˝ stylizovanĂ˝ rozpad/impact bez pĹ™edpokladu krve ÄŤi konkrĂ©tnĂ­ho materiĂˇlu.

## 4. Rozsah prvnĂ­ sady a nĂˇvaznost na zbytek hry

PrvnĂ­ sada je pouze pilotnĂ­ vizuĂˇlnĂ­ vzorek. Vaultbreak mĂˇ 16 archetypĹŻ zbranĂ­ a 28 druhĹŻ nepĹ™Ăˇtel; pistole a grunt proto stanovĂ­ pravidla ÄŤitelnosti, nikoli podobu vĹˇech dalĹˇĂ­ch objektĹŻ.

DalĹˇĂ­ zbranÄ› se budou navrhovat podle skuteÄŤnĂ˝ch archetypĹŻ: pistol, smg, shotgun, rifle, sniper, launcher, beam, flamer, bouncer, minigun, rail, helix, mortar, arc, swarm a harpoon. KaĹľdĂ˝ musĂ­ mĂ­t samostatnou siluetu odpovĂ­dajĂ­cĂ­ jeho skuteÄŤnĂ©mu chovĂˇnĂ­. NepĹ™ĂˇtelĂ© se budou dÄ›lit podle reĂˇlnĂ˝ch ĂştoÄŤnĂ˝ch rolĂ­ z bestiary (melee, charge, ranged, suicide, split, support, spawner, boss).

## 5. HybridnĂ­ workflow

1. PĹ™ipravit pouze referenÄŤnĂ­ koncepty hrĂˇÄŤe, pistole a grunta v jednotnĂ©m retro comic smÄ›ru.
2. SchvĂˇlit vizuĂˇlnĂ­ podobu; koncepty nejsou finĂˇlnĂ­ hernĂ­ assety.
3. RuÄŤnÄ› pĹ™ekreslit a vyÄŤistit pixely v LibreSprite.
4. RuÄŤnÄ› vytvoĹ™it animaÄŤnĂ­ snĂ­mky; udrĹľet pivot, mÄ›Ĺ™Ă­tko a obrys.
5. Exportovat PNG RGBA a zapsat skuteÄŤnĂˇ metadata do manifestu.
6. Zapojit pĹ™es renderovacĂ­ vrstvu s procedurĂˇlnĂ­m fallbackem.
7. OvÄ›Ĺ™it v reĂˇlnĂ©m bÄ›hu: pohyb, mĂ­Ĺ™enĂ­, stĹ™elbu, zĂˇsah, dash, smrt, mobilnĂ­ zoom a pĹ™ekryv efektĹŻ.

## 6. AkceptaÄŤnĂ­ kritĂ©ria

- HrĂˇÄŤ, pistole a grunt jsou okamĹľitÄ› rozliĹˇitelnĂ­ pĹ™i bÄ›ĹľnĂ©m hernĂ­m zoomu.
- StĹ™elba a smÄ›r mĂ­Ĺ™enĂ­ odpovĂ­dajĂ­ souÄŤasnĂ©mu input/render systĂ©mu.
- NepĹ™ĂˇtelskĂ© stĹ™ely zĹŻstĂˇvajĂ­ odliĹˇitelnĂ© od hrĂˇÄŤovĂ˝ch.
- Pivoty mezi snĂ­mky neposkakujĂ­.
- HP, rarity, affixy, statusy a dalĹˇĂ­ overlaye zĹŻstĂˇvajĂ­ funkÄŤnĂ­.
- NezmÄ›nila se simulace, fyzika, kolize, AI, loot ani vyvĂˇĹľenĂ­.
- Bez assetu se vykreslĂ­ souÄŤasnĂˇ procedurĂˇlnĂ­ varianta.
- Asset se aktivuje jako vĂ˝chozĂ­ aĹľ po QA.

## 7. Co zĂˇmÄ›rnÄ› nenĂ­ souÄŤĂˇstĂ­ tĂ©to etapy

- ZmÄ›na hernĂ­ch mechanik, zbranĂ­ nebo nepĹ™Ăˇtel.
- VytvĂˇĹ™enĂ­ novĂ˝ch tĹ™Ă­d, lore, prostĹ™edĂ­ nebo pĹ™Ă­bÄ›hu.
- NahrazenĂ­ celĂ© sady 16 zbranĂ­ a 28 nepĹ™Ăˇtel najednou.
- FinĂˇlnĂ­ PNG pĹ™ed schvĂˇlenĂ­m referenÄŤnĂ­ podoby.

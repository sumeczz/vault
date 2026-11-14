# Mobilní HUD – minimalistická úprava

## Cíl
Na telefonu musí mít herní plocha prioritu. HUD nesmí překrývat střed bojiště ani vytvářet několik současně viditelných vrstev ovládání a oznámení.

## Pravidla mobilního zobrazení (do 640 px)
- Horní stavový panel zobrazuje sektor/místnost/level, HP, XP a aktivní zbraň s municí v kompaktní podobě.
- Z horního panelu se skrývají doplňkové štítky, dlouhé buff popisy a redundantní texty. Podrobnosti zůstávají dostupné v přehledech.
- Akční ikony nahoře mají 34 × 34 px; spodní zbraňové karty jsou na mobilu skryté.
- Přepínač Auto aim / Manuální míření je dostupný v nastavení ovládání, nikoliv trvale nad bojištěm.
- Oznámení se řadí do fronty po jednom, zobrazí se nejvýše jedno a po 2,4 s zmizí.
- Joystick pohybu 104 px, joystick míření 96 px, střelba 64 px, utility tlačítka 42 px.
- Postava je dostupná přes horní ikonu; spodní utility lišta proto neobsahuje duplicitní tlačítko postavy.
- Boss/wave informace jsou kompaktní a posunuté pod horní HUD.
- Safe-area odsazení respektuje výřezy a spodní oblast iOS.

## Zachované chování
- Auto aim zůstává výchozím režimem.
- Manuální režim stále aktivuje druhý joystick.
- Střelba zůstává samostatným podrženým tlačítkem.
- Dash, schopnost a výměna zbraně zůstávají dostupné.
- Desktopové rozložení není těmito mobilními pravidly měněno.

## Ověření
- TypeScript a lint cílového souboru.
- Herní testy 120/120.
- App-data/auth testy 55/55.
- Produkční build.
- Kompletní test suite má 8 existujících selhání v `scripts/grok-pwa-plugin.test.mjs`, mimo herní UI; tyto testy nebyly touto změnou upravovány.
- Ještě je nutná fyzická kontrola na iPhonu Safari; automatický build sám o sobě nepotvrzuje ergonomii skutečného dotyku.

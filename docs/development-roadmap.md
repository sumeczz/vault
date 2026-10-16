# Plán dalšího vývoje

Původních deset kroků (navržených po rozšíření správce) a jejich stav k 2. 10. 2026.
Každý krok lze dokončit samostatně.

| # | Krok | Stav |
|---|------|------|
| 1 | Testy katalogů obsahu | ✅ hotovo (`src/game/game.test.ts`, 57 testů v `npm test`) |
| 2 | Náhled kořisti ve správci | ✅ hotovo (Simulátor + Dopad) |
| 3 | Import a export katalogů | ✅ hotovo (záložka Data) |
| 4 | Validace a bezpečné limity | ✅ hotovo |
| 5 | Úprava affixů a unikátních zbraní | ✅ hotovo (záložka Affixy) |
| 6 | Vyvážení schopností a pasivek | ✅ hotovo (Dopad + kontrola formátů + editor obtížnosti) |
| 7 | Editor místností a vln | ✅ hotovo z dřívějška |
| 8 | Progrese a ukládání běhů | ✅ hotovo (unlocky, checkpointy, báze-hub, denní + týdenní výzva, výzvy profilu, karta buildu) |
| 9 | Mobilní a přístupnostní průchod | ✅ hotovo (dotyky, focus, reduced-motion, keyboard pauza + autofocus) |
| 10 | Předvydávací QA a obsahová dokumentace | ✅ hotovo (full-loop QA, changelog, průvodce, final review 2. 10. 2026) |

Nad rámec plánu přibylo: fáze bosse, synergie elementů, elitní affixy, pity timer,
unlock systém (`docs/progression-rules.md` §§1–19), pauza před vlnou, stats panel, zvuky a hudba,
fáze hry a anomálie, Hlubina, kolo štěstí (popup, los na sektor), výzvy profilu, karta buildu.

1. **Testy katalogů obsahu**
   Přidat testy pro validaci, migraci a ukládání zbraní, schopností, pasivek i vah rarit. Ověřit prázdné katalogy, neplatné hodnoty a deterministické generování.

2. **Náhled kořisti ve správci**
   Přidat simulátor, který z aktuální konfigurace vygeneruje sadu nabídek bez spuštění běhu. Ukazovat četnost rarit, typů odměn a DPS zbraní.

3. **Import a export katalogů**
   Umožnit stáhnout a načíst JSON katalogy. Přidat verzi formátu, validaci při importu a potvrzení před nahrazením uložených dat.

4. **Validace a bezpečné limity**
   Kontrolovat extrémní kombinace statistik, neplatné popisy, nulové součty vah a duplicity. Před uložením zobrazit srozumitelnou chybu nebo varování.

5. **Úprava affixů a unikátních zbraní**
   Rozšířit správce o prefixy, sufixy a unikátní zbraně; umožnit jim nastavit element, statistické modifikátory, chování střel a váhu výskytu.

6. **Vyvážení schopností a pasivek**
   Přidat porovnání hodnot při jednotlivých raritách a souhrnný přehled dopadu. Ověřit, že desetinné a procentní hodnoty odpovídají efektu, který simulace aplikuje.

7. **Editor místností a vln**
   Zpřístupnit počty a typy nepřátel, pořadí vln, elitní místnosti a boss encounter. Zachovat seed běhu pro opakovatelné testování.

8. **Progrese a ukládání běhů**
   Navrhnout odemykání obsahu, statistiky a případné výzvy. Verzionovat uložené profily a bezpečně migrovat starší lokální data.

9. **Mobilní a přístupnostní průchod**
   Otestovat správce i hru na úzkém viewportu a dotykovém zařízení. Doplnit ovládání klávesnicí, viditelné focus stavy a omezení pohybu respektující systémovou volbu.

10. **Předvydávací QA a obsahová dokumentace**
    Automatizovat průchod: start běhu, boj, odměna, reroll, pauza a konec hry. Ověřit produkční build v desktopu i mobilu a doplnit changelog i stručný návod pro hráče.

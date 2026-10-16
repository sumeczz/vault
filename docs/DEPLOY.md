# Nasazení hry na web (deploy)

VAULTBREAK je **serverová Node aplikace** (TanStack Start + Nitro), ne jen
statické soubory — na obyčejný statický hosting (GitHub Pages apod.) **nejde**
nasadit. Potřebuješ hosting, který umí běžet Node server, nebo Vercel.

Požadavky pro všechny varianty: **Node.js 22**, příkaz `npm run build` musí
projít (ověřeno: `typecheck` + `build` + `npm test`).

## Varianta A — Vercel (nejjednodušší, doporučeno)

1. Hoď repozitář na GitHub (commitni vše **kromě** `node_modules`, `.vercel`, `.output`).
2. Na [vercel.com](https://vercel.com) dej *Add New → Project* a vyber repozitář.
3. Nastav **Build Command** na `npm run build` (pozor: samotné `vite build` nestačí —
   `npm run build` po buildu ještě pouští DB migrace).
4. **Install Command přepiš** na `npm install` (nebo `npm ci`). Pozor: v repu je
   ve `vercel.json` nastaveno `npm install --omit=dev`, které by přeskočilo
   devDependencies — a bez nich (`vite`, `typescript`) build spadne.
5. Přidej proměnné prostředí (*Environment Variables*):
   - `BETTER_AUTH_SECRET` = náhodný dlouhý řetězec (povinné v produkci,
     jinak se po každém restartu zneplatní všechny session),
   - `BETTER_AUTH_URL` = veřejná URL aplikace, např. `https://tvoje-hra.vercel.app`
     (povinné — jinak nebude fungovat přihlašování),
   - `DATABASE_URL` = connection string na Postgres (doporučeno Neon —
     bez ní jede vestavěná PGLite, jejíž data na serverless **mizí**),
   - `VITE_AUTH_ENABLED` = `false`, jen pokud chceš hru **bez přihlašování**.
     Pozor: `VITE_` proměnné se zapečou **při buildu**, zpětně je nezměníš.
6. Dej *Deploy*. Hotovo — Vercel při každém pushi přebuilduje sám.

## Varianta B — Docker / vlastní VPS (ověřeno lokálním buildem)

Repozitář umí i klasický Node server: preset Nitro se přepíná proměnnou
`NITRO_PRESET` (`vercel` je výchozí; `node-server` pro VPS).

1. Na serveru měj Docker (nebo Node 22 + reverse proxy, viz varianta C).
2. Vytvoř soubor `.env.deploy` (do repozitáře **necommitovat**):
   ```env
   BETTER_AUTH_SECRET=tady-nahodny-dlouhy-retezec
   BETTER_AUTH_URL=https://tvoje-domena.cz
   # Volitelné: bez DATABASE_URL jede PGLite (data mizí s restartem kontejneru)
   # DATABASE_URL=postgresql://vaultbreak:vaultbreak@db:5432/vaultbreak
   ```
   Secret vygeneruješ příkazem `openssl rand -base64 32`.
3. Postav a spusť:
   ```sh
   docker compose --env-file .env.deploy up -d --build
   ```
   Hra běží na portu 8080. S profilem `db` se přidá i lokální Postgres
   s perzistentním volumem (a pak v `.env.deploy` nastav výše uvedené
   `DATABASE_URL`):
   ```sh
   docker compose --profile db --env-file .env.deploy up -d --build
   ```
4. Před server dej reverse proxy s HTTPS (Caddy / nginx / Traefik) — přihlašování
   přes HTTPS vyžaduje shodu `BETTER_AUTH_URL` s adresou v prohlížeči.

Co se děje uvnitř: multi-stage `Dockerfile` postaví aplikaci
(`NITRO_PRESET=node-server npm run build`), runtime image obsahuje jen
produkční závislosti a startuje `node scripts/migrate.mjs && node
.output/server/index.mjs`. Migrace bez `DATABASE_URL` jen přeskočí.

## Varianta C — VPS bez Dockeru

1. Nainstaluj Node.js 22, naklonuj repozitář, spusť `npm install`
   (plný — build potřebuje devDependencies).
2. Nastav proměnné prostředí (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
   případně `DATABASE_URL` a `VITE_*` — ty ale musí být nastavené **před buildem**).
3. Postav a spusť:
   ```sh
   NITRO_PRESET=node-server npm run build
   HOST=0.0.0.0 PORT=8080 node .output/server/index.mjs
   ```
   Pro běh na pozadí použij `systemd` unit / `pm2` / `tmux`.
4. HTTPS přes reverse proxy (viz varianta B, bod 4).

## Přehled proměnných prostředí

| Proměnná | Kdy nastavit | Povinná? | Význam |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | před startem serveru | ano (produkce) | podpis session; bez ní se session po restartu zneplatní |
| `BETTER_AUTH_URL` | před startem serveru | ano, pokud je login zapnutý | veřejná URL aplikace (OAuth redirecty, trusted origins) |
| `DATABASE_URL` | před startem (migrace i běh) | ne | Postgres (Neon); bez ní PGLite — data nepřežijí restart/scale |
| `VITE_AUTH_ENABLED` | **před buildem** | ne (`true`) | `false` = hra bez přihlašování |
| `VITE_STUN_URLS` | **před buildem** | ne | vlastní STUN servery pro P2P multiplayer |
| `HOST` / `PORT` | před startem (jen node-server) | ne (`0.0.0.0` / `8080` v Docker image) | bind adresa a port |
| `NITRO_PRESET` | **před buildem** | ne (`vercel`) | `node-server` pro Docker/VPS |
| `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` | před startem | jen pro login přes brokera | per-app údaje od Grok platformy; bez nich hra jede bez loginu |
| `GROK_PROJECT_ID` / `GROK_GATE_ORIGIN` | — | ne | jen pro Grok sandbox/preview, na vlastním serveru **nenastavovat** |

## Kontrolní checklist před spuštěním

- [ ] `npm run typecheck`, `npm test`, `npm run build` prochází lokálně
- [ ] `BETTER_AUTH_SECRET` nastavený (dlouhý, náhodný, nikde v gitu)
- [ ] `BETTER_AUTH_URL` přesně odpovídá veřejné adrese včetně `https://`
- [ ] Pokud má být login: přihlašování přes Google/X jde přes Grok auth brokera
  a vyžaduje per-app údaje `GROK_AUTH_CLIENT_ID` + `GROK_AUTH_CLIENT_SECRET`
  (+ případně `GROK_AUTH_ISSUER`). Bez nich (nebo s `VITE_AUTH_ENABLED=false`)
  jede hra bez přihlašování — na hraní to stačí.
- [ ] Pokud mají data přežít restart: `DATABASE_URL` na Postgres
- [ ] Po nasazení: otevřít hru, projít 1 místnost, zkusit login, zkontrolovat logy

## Řešení problémů

- **Build na Vercelu padá na chybějícím `vite`** → Install Command je `--omit=dev`
  (viz `vercel.json`): přepiš ho na `npm install`.
- **`Invalid origin` při loginu** → `BETTER_AUTH_URL` nesouhlasí s adresou v prohlížeči.
- **Po restartu jsou všichni odhlášení** → chybí `BETTER_AUTH_SECRET`, nebo se mění
  při každém deployi.
- **Data mizí** → není nastavená `DATABASE_URL`, jede efemérní PGLite.
- **Změna `VITE_*` se neprojeví** → tyto proměnné se zapečou při buildu,
  je potřeba rebuild + redeploy.

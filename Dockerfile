# VAULTBREAK — produkční image (Node server, Nitro node-server preset).
# Build:  docker build -t vaultbreak .
# Run:    docker run --rm -p 8080:8080 \
#           -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
#           -e BETTER_AUTH_URL="https://tvoje-domena.cz" \
#           [-e DATABASE_URL="postgresql://..."] \
#           vaultbreak
# Nebo přes docker compose (viz docker-compose.yml).
# Bez DATABASE_URL jede vestavěná PGLite (data se neukládají mezi restarty).

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Db:migrate při buildu bez DATABASE_URL jen přeskočí (ověřeno v logu).
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-slim AS run
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/.output ./.output
COPY --from=build /app/scripts ./scripts
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
# Migrace při startu (bez DATABASE_URL přeskočí, PGLite se migruje sama za běhu).
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]

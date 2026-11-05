# Backend: Hono-API mit Spielkern. Build-Kontext ist das Repo-Wurzelverzeichnis.
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS basis
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Erst nur die Paketlisten kopieren, damit Docker die Installation zwischenspeichert
FROM basis AS laufzeit
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/engine/package.json packages/engine/
COPY games/nordbyte/package.json games/nordbyte/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "@planspiel/api..."
COPY packages/core packages/core
COPY packages/engine packages/engine
COPY games/nordbyte games/nordbyte
COPY apps/api apps/api

WORKDIR /app/apps/api
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
HEALTHCHECK --interval=5s --timeout=3s --retries=20 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/gesund').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "src/server.ts"]

# Frontend: baut die React-App und liefert sie mit einem kleinen Node-Server aus.
# Anfragen an /api leitet der Server an das Backend weiter (API_URL).
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS bau
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter "@planspiel/web..."
COPY packages/core packages/core
COPY apps/web apps/web
RUN pnpm --filter @planspiel/web build

FROM ${NODE_IMAGE} AS laufzeit
WORKDIR /app
COPY --from=bau /app/apps/web/dist ./dist
COPY apps/web/server.mjs ./server.mjs
ENV PORT=8080 API_URL=http://api:8787
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --retries=20 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]

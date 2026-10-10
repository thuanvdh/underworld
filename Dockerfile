# UNDERWORLD: API + Mini App + Telegram bot in one container.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/combat/package.json packages/combat/
COPY apps/api/package.json apps/api/
COPY apps/bot/package.json apps/bot/
COPY apps/miniapp/package.json apps/miniapp/
COPY tools/sim/package.json tools/sim/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    NODE_NO_WARNINGS=1 \
    DB_PATH=/data/underworld.db \
    PORT=3000
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/bot ./apps/bot
COPY --from=build /app/apps/miniapp/package.json ./apps/miniapp/package.json
COPY --from=build /app/apps/miniapp/dist ./apps/miniapp/dist
COPY --from=build /app/tools/sim/package.json ./tools/sim/package.json
# World-writable so the app works whichever UID the host runs it as.
RUN mkdir -p /data && chown node:node /data && chmod 1777 /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/src/production.ts"]

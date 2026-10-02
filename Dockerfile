FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
COPY assets assets
RUN pnpm --filter @pb/shared build \
  && pnpm --filter @pb/api build \
  && pnpm --filter @pb/web build \
  && pnpm --filter @pb/api deploy --prod /out/api \
  && mkdir -p /out/api/dist/db /out/web \
  && cp -r apps/api/dist/. /out/api/dist/ \
  && cp apps/api/src/db/schema.sql /out/api/dist/db/schema.sql \
  && cp -r apps/api/certs /out/api/certs \
  && cp -r apps/web/dist/. /out/web/

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=80
ENV WEB_DIST=/app/web
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/api /app
COPY --from=build /out/web /app/web
COPY docker/amvera-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 80
ENTRYPOINT ["tini", "--", "/app/entrypoint.sh"]

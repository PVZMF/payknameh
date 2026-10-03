# One image for the web app and the worker (Tech §2.2, §2.7); the command picks the role:
#   app      node server.js            (default)
#   worker   node dist/worker.mjs
#   migrate  node dist/migrate.mjs     (separate step before app and worker, Tech §13.3)
#
# Tech §13.4: Docker Hub and npm may be unreachable from Iran, so both are build args.
#   docker build --build-arg REGISTRY_MIRROR=docker.arvancloud.ir \
#                --build-arg NPM_REGISTRY=https://<npm-mirror>/ ...

ARG REGISTRY_MIRROR=docker.io
ARG NODE_IMAGE=library/node:22.21.1-alpine3.22

FROM ${REGISTRY_MIRROR}/${NODE_IMAGE} AS base
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable \
 && npm config set registry "$NPM_REGISTRY" \
 && echo "registry=$NPM_REGISTRY" > /root/.npmrc
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack install && pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build && pnpm build:worker

FROM ${REGISTRY_MIRROR}/${NODE_IMAGE} AS runtime
ARG APP_VERSION=0.0.0
ARG APP_COMMIT=unknown
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_COMMIT=${APP_COMMIT}
LABEL org.opencontainers.image.title="payknameh" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_COMMIT}"
WORKDIR /app

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/dist ./dist
# The migration runner reads SQL files at runtime.
COPY --from=build --chown=node:node /app/src/server/db/migrations ./src/server/db/migrations

USER node
EXPOSE 3000 3001
CMD ["node", "server.js"]

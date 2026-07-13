# syntax=docker/dockerfile:1

# Build a standalone Next.js server. Debian is used (rather than Alpine) so
# better-sqlite3's native binary works consistently on common self-hosts.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpm.yaml .npmrc ./
RUN apt-get update \
  && apt-get install --no-install-recommends -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . ./
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The standalone output includes only traced production dependencies.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir -p /app/db && chown -R node:node /app/db

USER node
EXPOSE 3000
VOLUME ["/app/db"]
CMD ["node", "server.js"]

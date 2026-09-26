# Used verbatim by the Lizard build (a repo Dockerfile bypasses lizardpack
# auto-detect). It exists to pin three things the synthesized Dockerfile got
# wrong: npm as the installer (matching package-lock.json — a stale
# pnpm-lock.yaml in the repo made auto-detect pick pnpm, whose install fails),
# Node 22 (googleapis requires >=22), and OpenSSL (Prisma needs libssl, which
# the slim image does not ship).
#
# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# deps: install with the lockfile only, so dependency layers cache.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The app opts into standalone output when this is set (see next.config.ts).
ENV NEXT_OUTPUT_MODE=standalone
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

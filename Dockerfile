FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Force NODE_ENV=development for install so devDependencies (TypeScript,
# Tailwind, drizzle-kit) are installed. Without this, if the build host
# has NODE_ENV=production set (e.g. Coolify default), pnpm skips devDeps
# and `pnpm build` fails on missing tsc / tailwindcss / etc. The runner
# stage below resets NODE_ENV=production for the actual server runtime.
#
# --no-frozen-lockfile lets Docker's pnpm migrate the lockfile if our local
# pnpm version differs from the Dockerfile's pinned 9.0.0.
ENV NODE_ENV=development
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
# Builder MUST have NODE_ENV=production. Next.js 16's `next build` uses
# production React internally — setting NODE_ENV=development here triggers
# "Cannot read properties of null (reading 'useContext')" when prerendering
# /_global-error. The devDependencies installed in the deps stage carry
# over via the COPY below; they're already on disk and don't get pruned
# by NODE_ENV switching at this point.
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage the two packages scripts/migrate.mjs imports. `next build` bundles
# server dependencies into .next/server, so .next/standalone/node_modules
# carries only next/react/react-dom — drizzle-orm and postgres are NOT
# importable at runtime there. Both are dependency-free, so a dereferenced
# copy is enough (pnpm's node_modules entries are symlinks into .pnpm,
# hence -L). Source maps are dropped: ~9MB instead of ~16MB, and nothing
# in the runner reads them.
RUN mkdir -p /migrate-deps \
 && cp -RL node_modules/drizzle-orm /migrate-deps/ \
 && cp -RL node_modules/postgres /migrate-deps/ \
 && find /migrate-deps -name '*.map' -delete

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# public/ skipped — we don't ship static assets in the repo. Next.js 16 with
# app router uses app/icon.png, app/favicon.ico, etc. (file-based routing for
# metadata) instead. If we ever add a public/ directory later, restore:
#   COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# The migration runner and the packages it needs. node resolves bare
# imports from the importing file upward, so /app/scripts/node_modules is
# found first and nothing shadows the server's own bundled copies.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /migrate-deps ./scripts/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# busybox wget, so no extra package. Gives the orchestrator a signal that
# means "serving and the database answers", not just "process alive".
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health >/dev/null || exit 1

# ENTRYPOINT, not CMD: migrations then run even if the orchestrator
# overrides the start command, which arrives as "$@".
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]

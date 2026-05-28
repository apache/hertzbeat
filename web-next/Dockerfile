FROM node:22-alpine AS deps
WORKDIR /app
COPY web-next/package.json web-next/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_FILE_TRACING_ROOT=/app
COPY --from=deps /app/node_modules ./node_modules
COPY web-next ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ARG HERTZBEAT_RELEASE_VERSION=dev
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4200
ENV HOSTNAME=0.0.0.0
LABEL org.opencontainers.image.title="Apache HertzBeat Web Next"
LABEL org.opencontainers.image.version="${HERTZBEAT_RELEASE_VERSION}"
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 4200
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -q -O - "http://127.0.0.1:${PORT}/overview" > /dev/null || exit 1
CMD ["node", "server.js"]

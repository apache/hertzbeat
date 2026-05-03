FROM node:20-alpine AS deps
WORKDIR /app
COPY web-next/package.json web-next/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY web-next ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4200
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app ./
EXPOSE 4200
CMD ["npx", "next", "start", "-p", "4200", "-H", "0.0.0.0"]

# syntax=docker/dockerfile:1.7

# ---- deps stage: install production deps only ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    SIP_LOCAL_PORT=5070

# wget is used by HEALTHCHECK; tini reaps zombies and forwards signals
RUN apk add --no-cache tini wget

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY lib ./lib
COPY public ./public

# Persist sip-config.json + recordings on a mounted volume
RUN mkdir -p /data/recordings && \
    ln -s /data/recordings ./recordings && \
    ln -s /data/sip-config.json ./sip-config.json && \
    addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app /data
VOLUME ["/data"]

USER app

EXPOSE 3000
EXPOSE 5070/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

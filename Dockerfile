# Build Stage
FROM node:20 AS build
LABEL name="emergency-contacts-print-qr"

# Create app dir
WORKDIR /app

# Secret definitions (will be mounted at build time)
RUN --mount=type=secret,id=redis_password \
    --mount=type=secret,id=fb_project_id \
    --mount=type=secret,id=fb_client_email \
    --mount=type=secret,id=fb_private_key \
    export REDIS_HOST=${REDIS_HOST} && \
    export REDIS_PORT=${REDIS_PORT} && \
    export DOMAIN=${DOMAIN} && \
    export REDIS_PASSWORD=$(cat /run/secrets/redis_password) && \

    export FB_PROJECT_ID=$(cat /run/secrets/fb_project_id) && \
    export FB_CLIENT_EMAIL=$(cat /run/secrets/fb_client_email) && \
    export FB_PRIVATE_KEY=$(cat /run/secrets/fb_private_key) && \
    pnpm build

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9.11
RUN pnpm config set store-dir /root/.local/share/pnpm/store/v3
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]

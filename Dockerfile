# Build Stage
FROM node:20 AS build
LABEL name="emergency-contacts-print-qr"

# Create app dir
WORKDIR /app

# Declare build arguments for secrets/config
ARG REDIS_HOST
ARG REDIS_PORT
ARG REDIS_PASSWORD
ARG DOMAIN
ARG FB_PROJECT_ID
ARG FB_CLIENT_EMAIL
ARG FB_PRIVATE_KEY

# Set runtime environment variables from build arguments
ENV REDIS_HOST=${REDIS_HOST}
ENV REDIS_PORT=${REDIS_PORT}
ENV REDIS_PASSWORD=${REDIS_PASSWORD}
ENV DOMAIN=${DOMAIN}
ENV FB_PROJECT_ID=${FB_PROJECT_ID}
ENV FB_CLIENT_EMAIL=${FB_CLIENT_EMAIL}
# Note: Ensure your application handles the FB_PRIVATE_KEY correctly, especially regarding newlines.
# Docker's ENV instruction generally handles multi-line values passed via build-args correctly.
ENV FB_PRIVATE_KEY=${FB_PRIVATE_KEY}

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9.11
RUN pnpm config set store-dir /root/.local/share/pnpm/store/v3
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]

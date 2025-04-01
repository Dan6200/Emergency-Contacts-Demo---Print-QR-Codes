# Build Stage
FROM node:20 AS build
LABEL name="emergency-contacts-print-qr"

# Create app dir
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9.11
RUN pnpm config set store-dir /root/.local/share/pnpm/store/v3
RUN pnpm install --frozen-lockfile
COPY . .
RUN DISABLE_FIREBASE=true pnpm build

# EXPOSE 3000
#
# CMD ["pnpm", "start"]

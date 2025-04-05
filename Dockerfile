# Build Stage
FROM node:20 AS build
LABEL name="emergency-contacts-print-qr"

# Create app dir
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.11
RUN pnpm config set store-dir /root/.local/share/pnpm/store/v3

# Copy dependency definitions
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Get PDFKit font metrics files (now handled automatically by PDFKIT_DISABLE_FONTCONFIG=1)

# Build the application, accepting build arguments and mounting secrets
ARG REDIS_HOST
ARG REDIS_PORT
ARG DOMAIN

# Set runtime environment variables from build arguments
# These ARGs are also available as env vars during the build stage
ENV REDIS_HOST=${REDIS_HOST}
ENV REDIS_PORT=${REDIS_PORT}
ENV DOMAIN=${DOMAIN}
ENV PDFKIT_DISABLE_FONTCONFIG=1

# Create persistent storage directory
RUN mkdir -p /app/persistent

# Secrets are only available during this RUN command
# Build arguments (REDIS_HOST, etc.) are already available as environment variables here
RUN --mount=type=secret,id=redis_password \
    --mount=type=secret,id=fb_project_id \
    --mount=type=secret,id=fb_client_email \
    --mount=type=secret,id=fb_private_key \

    export REDIS_PASSWORD=$(cat /run/secrets/redis_password) && \
    export FB_PROJECT_ID=$(cat /run/secrets/fb_project_id) && \
    export FB_CLIENT_EMAIL=$(cat /run/secrets/fb_client_email) && \
    export FB_PRIVATE_KEY=$(cat /run/secrets/fb_private_key) && \
    pnpm build


EXPOSE 3000

# Create and switch to non-root user for security
RUN useradd -r -u 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser

CMD ["pnpm", "start"]

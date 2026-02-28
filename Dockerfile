FROM node:22-alpine AS base

RUN apk add --no-cache dumb-init
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Build the application
FROM deps AS build

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ src/

RUN pnpm run build

RUN pnpm prune --prod

# Create production image
FROM node:22-alpine AS production

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV NODE_ENV=production

WORKDIR /app

RUN chown -R node:node /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]

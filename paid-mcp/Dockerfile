# AETHERWEB paid-mcp — x402 gateway
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4021
# Safe default; override in production
ENV DEMO_MODE=false
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
RUN mkdir -p /app/data/receipts
VOLUME ["/app/data"]
EXPOSE 4021
USER node
CMD ["node", "dist/index.js"]

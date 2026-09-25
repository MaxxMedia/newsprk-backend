FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

ENV NODE_ENV=production
RUN npm ci --omit=dev

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "src/app.js"]

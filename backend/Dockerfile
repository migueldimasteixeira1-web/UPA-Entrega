FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_DEMO_DATA\" = \"true\" ]; then node prisma/seed.js; fi && node src/index.js"]

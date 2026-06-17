FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node prisma/seed.js && npm run dev"]

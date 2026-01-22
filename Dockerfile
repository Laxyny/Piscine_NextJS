FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

COPY backend/prisma ./backend/prisma

RUN npm install

COPY . .

RUN npx prisma generate --schema=./backend/prisma/schema.prisma

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma db push --schema=./backend/prisma/schema.prisma && npm start"]

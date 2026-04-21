FROM node:20-alpine
RUN apk add --no-cache iputils
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 3000
CMD sh -c "npx prisma db push && node .next/standalone/server.js"

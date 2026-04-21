FROM node:20-slim
RUN apt-get update && apt-get install -y openssl iputils-ping && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
RUN cp -r .next/static .next/standalone/.next/static
EXPOSE 3000
CMD sh -c "npx prisma db push && node .next/standalone/server.js"

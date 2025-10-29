FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json ./
RUN pnpm i --frozen-lockfile
COPY . .
EXPOSE 3004
CMD ["node", "app.js"]
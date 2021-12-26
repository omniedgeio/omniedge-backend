FROM public.ecr.aws/u2c0c8c5/node:16-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

WORKDIR /app/build/
RUN npm ci --production
COPY .env.prod ./.env

FROM public.ecr.aws/u2c0c8c5/node:16-alpine

WORKDIR /app

COPY --from=builder /app .
EXPOSE 80 80

ENTRYPOINT ["node", "/app/build/server.js"]

FROM public.ecr.aws/docker/library/node:16-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

WORKDIR /app/build/
RUN npm ci --production

FROM public.ecr.aws/docker/library/node:16-alpine

WORKDIR /app

COPY --from=builder /app .
EXPOSE 3333 3333

ENTRYPOINT ["node", "/app/build/server.js"]

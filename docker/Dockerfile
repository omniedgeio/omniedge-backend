FROM public.ecr.aws/docker/library/node:16-alpine as builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

WORKDIR /app/build/
RUN npm ci --production

FROM public.ecr.aws/docker/library/node:16-alpine

ARG GIT_SHA
ARG GIT_TAG
ARG BUILD_TIME

ENV GIT_SHA=$GIT_SHA
ENV GIT_TAG=$GIT_TAG
ENV BUILD_TIME=$BUILD_TIME

WORKDIR /app

COPY --from=builder /app .

ENTRYPOINT ["node", "/app/build/server.js"]

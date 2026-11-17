FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=512
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:h5

FROM caddy:2-alpine
COPY --from=build /app/dist/build/h5 /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80

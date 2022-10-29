FROM node:18-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm ci

COPY tsconfig*.json ./

COPY src src
COPY bin bin

RUN npm run build

FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist/ dist/
COPY --from=builder /usr/src/app/bin/ bin/

COPY package*.json ./
RUN npm install

RUN mkdir /data /config
RUN chown -R nobody:nogroup /data /config
RUN chmod 2777 /data /config
RUN umask u=rwx,g=rwx,o=rwx /data /config

ENTRYPOINT [ "npm", "start", "--" ]
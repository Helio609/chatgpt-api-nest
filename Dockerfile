FROM node:lts-alpine AS builder

WORKDIR /app

COPY ./package.json /app

RUN npm install --production

COPY . /app

RUN npm run build

FROM node:lts

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY ./package.json /app

EXPOSE 3000

CMD [ "/bin/sh", "-c", "npm run start:prod" ]
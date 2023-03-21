FROM node:lts-alpine

ENV DATABASE_URL=
ENV JWT_SECRET=iloveyoubaby
ENV OPENAI_BASE_URL=https://api.openai.com
ENV OPENAI_INIT_KEY=

WORKDIR /app

COPY ./package.json /app

RUN npm install

COPY . /app

RUN npx prisma generate && npm run build

ENTRYPOINT ["/bin/sh", "-c", "npx prisma db push && npm run start:prod" ]

EXPOSE 3000
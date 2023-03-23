# ChatGPT API Powered By NestJS

Hi there, v1.0.0 is coming!

This is a ChatGPT back-end written based on NestJS, which supports basic user registration and login, as well as JWT authentication, and supports two types of transmission modes.

This server implementation includes the storage of historical conversation data and supports handling when tokens exceed the limit. The details can be found in `openai.service.ts`. By default, 1000 tokens are kept for responses, but if using GPT-4, the range can be adjusted as needed.

## Instructions

1. Direct deployment: Prepare a Postgres database, modify the database configuration in `.env.example`, rename it to `.env`, and start with `npm run build && npm run start:prod`.
2. Docker deployment: Modify the configuration in `docker-compose.yml`.

```
docker build -t erohal/chatgpt-api-nest:latest .
docker-compose -f docker-compose.yml up
```

## Testing

The backend has integrated Swagger. Access `http://localhost:3000/swagger` to test.

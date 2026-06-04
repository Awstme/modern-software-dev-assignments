FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY backend ./backend
RUN npm run build

FROM node:24-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend ./backend
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/backend/data

EXPOSE 3001

CMD ["npm", "run", "server"]

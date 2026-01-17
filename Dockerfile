FROM node:25-alpine AS builder
# First, install node modules and transpile TypeScript for prod.

WORKDIR /app

COPY . .
RUN npm ci && npm cache clean --force
RUN npm run build

FROM node:25-alpine AS production
# Next, copy over `dist` files and run production image.

WORKDIR /app

COPY --from=builder /app/dist /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

EXPOSE 3001

CMD ["node", "app.js"]

FROM node:22-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci

# Generate the Prisma client against the schema
COPY prisma ./prisma
RUN npx prisma generate

# Build the app
COPY . .
RUN npm run build

EXPOSE 3000

# db push syncs the schema (no migration files needed for dev/compose), then boot
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]

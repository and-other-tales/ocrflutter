#!/bin/sh

set -e

echo "🚀 Starting Next.js application on Cloud Run..."

# Construct DATABASE_URL from environment variables
if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ] && [ -n "$DB_PASSWORD" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?schema=public"
  echo "✅ DATABASE_URL constructed from Cloud Run environment variables"
else
  echo "⚠️  Warning: DB_HOST, DB_USER, DB_NAME, or DB_PASSWORD not set. Using DATABASE_URL if available."
fi

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set. Please configure database environment variables."
  exit 1
fi

# Run Prisma migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Seed database if ADMIN_PASSWORD is provided
if [ -n "$ADMIN_PASSWORD" ]; then
  echo "🌱 Seeding database with admin user..."
  npx prisma db seed || echo "⚠️  Seed already run or failed (this is okay if admin already exists)"
fi

# Start the Next.js server
echo "🎉 Starting Next.js server on port ${PORT:-8080}..."
exec node server.js

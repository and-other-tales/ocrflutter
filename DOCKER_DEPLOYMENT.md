# Docker Deployment Guide

This guide explains how to deploy the Novel OCR Admin application locally using Docker Compose with PostgreSQL, Redis (for BullMQ), and all required services.

## Architecture

The docker-compose setup includes:

- **PostgreSQL**: Database for storing application data
- **Redis**: Message queue backend for BullMQ job processing
- **Web App**: Next.js application (port 3000)
- **Worker**: BullMQ worker for OCR processing
- **Redis Commander** (optional): Web UI for Redis (port 8081)
- **pgAdmin** (optional): Web UI for PostgreSQL (port 5050)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose V2+
- At least 4GB RAM available for Docker

## Quick Start

### 1. Environment Setup

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` and update the following if needed:
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `AUTH_SECRET`: Same as NEXTAUTH_SECRET
- `ADMIN_PASSWORD`: Default admin password
- Google Cloud credentials (if using GCP OCR services)

### 2. Start Services (Production Mode)

Build and start all services:

```bash
docker-compose up -d
```

This will:
1. Start PostgreSQL and Redis
2. Build the web application and worker
3. Run database migrations
4. Start the Next.js app on port 3000
5. Start the BullMQ worker

### 3. Access the Application

- **Web App**: http://localhost:3000
- **Redis Commander**: http://localhost:8081 (if using `--profile tools`)
- **pgAdmin**: http://localhost:5050 (if using `--profile tools`)

### 4. Start Optional Tools

To start the Redis Commander and pgAdmin tools:

```bash
docker-compose --profile tools up -d
```

## Development Mode

For local development with hot reload:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This will:
- Mount your local source code into the containers
- Enable hot reload for both web and worker
- Run in development mode

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f worker
docker-compose logs -f redis
docker-compose logs -f postgres
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Rebuild Services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build web
docker-compose build worker

# Rebuild and restart
docker-compose up -d --build
```

### Run Database Migrations

```bash
docker-compose exec web npx prisma migrate deploy
```

### Seed Database

```bash
docker-compose exec web npm run db:seed
```

### Access Database

```bash
# Using psql
docker-compose exec postgres psql -U postgres -d novel_ocr_admin

# Using Prisma Studio (from host)
npx prisma studio
```

### Access Redis CLI

```bash
docker-compose exec redis redis-cli
```

### Execute Commands in Containers

```bash
# Run shell in web container
docker-compose exec web sh

# Run shell in worker container
docker-compose exec worker sh
```

## Environment Variables

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NEXTAUTH_SECRET`: NextAuth.js secret key
- `NEXTAUTH_URL`: Application URL
- `AUTH_SECRET`: Auth.js secret (same as NEXTAUTH_SECRET)

### Optional Variables

- `GOOGLE_CLOUD_PROJECT_ID`: GCP project ID for OCR
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to GCP credentials JSON
- `GCS_BUCKET_NAME`: Google Cloud Storage bucket name
- `WORKER_CONCURRENCY`: Number of parallel OCR jobs (default: 5)
- `OCR_MAX_RETRIES`: Max retry attempts for failed jobs (default: 3)

## Volumes

The setup creates persistent volumes for:

- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis persistence files
- `gcp-credentials`: Google Cloud credentials (optional)

## Networking

All services communicate over a bridge network (`novel-ocr-network`). Services can reference each other by their service names:

- `postgres`: Database host
- `redis`: Redis host
- `web`: Web application
- `worker`: Worker service

## Troubleshooting

### Services won't start

```bash
# Check service status
docker-compose ps

# Check logs for errors
docker-compose logs

# Restart specific service
docker-compose restart web
```

### Database connection errors

```bash
# Verify PostgreSQL is healthy
docker-compose exec postgres pg_isready -U postgres

# Check database exists
docker-compose exec postgres psql -U postgres -c "\l"
```

### Redis connection errors

```bash
# Verify Redis is healthy
docker-compose exec redis redis-cli ping

# Check Redis info
docker-compose exec redis redis-cli info
```

### Worker not processing jobs

```bash
# Check worker logs
docker-compose logs -f worker

# Verify Redis connection from worker
docker-compose exec worker sh -c 'echo "PING" | nc redis 6379'

# Check BullMQ queues in Redis
docker-compose exec redis redis-cli KEYS "bull:*"
```

### Port already in use

If ports 3000, 5432, or 6379 are already in use, edit `docker-compose.yml` and change the port mappings:

```yaml
ports:
  - '3001:3000'  # Change host port to 3001
```

### Clean slate reset

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Restart fresh
docker-compose up -d --build
```

## Production Considerations

For production deployment:

1. **Use strong secrets**: Generate secure values for all `*_SECRET` variables
2. **Enable SSL/TLS**: Configure reverse proxy (nginx, traefik) with HTTPS
3. **Configure Redis password**: Set `REDIS_PASSWORD` and update connection strings
4. **Resource limits**: Add memory/CPU limits to service definitions
5. **Backup volumes**: Implement regular backups of `postgres_data` and `redis_data`
6. **Monitoring**: Add monitoring tools (Prometheus, Grafana)
7. **Log aggregation**: Configure centralized logging
8. **Health checks**: Services already have health checks configured

## Google Cloud Integration

If using Google Cloud Vision API for OCR:

1. Create a service account in GCP
2. Download the JSON credentials file
3. Mount it in the containers:

```yaml
volumes:
  - ./path/to/credentials.json:/app/credentials/gcp-key.json:ro
environment:
  - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/gcp-key.json
```

Or use the `gcp-credentials` volume defined in docker-compose.yml.

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review environment variables in `.env`
- Verify all services are healthy: `docker-compose ps`

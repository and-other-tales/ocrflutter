# Novel OCR Admin Panel - Cloud Run Ready

This application has been configured for deployment on Google Cloud Run with port 8080 and environment-based database configuration.

## Quick Start - Deploy to Cloud Run

### Option 1: Automated Deployment (Recommended)

```bash
# Make the deployment script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will guide you through the deployment process and prompt for all required configuration.

### Option 2: Manual Deployment

See [CLOUD_RUN_DEPLOYMENT.md](./CLOUD_RUN_DEPLOYMENT.md) for detailed manual deployment instructions.

## Cloud Run Configuration

### Required Environment Variables

Set these in your Cloud Run service configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host (Cloud SQL IP) | `10.x.x.x` |
| `DB_USER` | Database username | `postgres` |
| `DB_NAME` | Database name | `novel_ocr_admin` |
| `DB_PASSWORD` | Database password | `your-secure-password` |
| `ADMIN_PASSWORD` | Admin panel login password | `your-admin-password` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Cloud Run service URL | `https://your-service-url` |
| `AUTH_SECRET` | Same as NEXTAUTH_SECRET | Same value |
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://your-service-url` |

### Automatic Configuration

The application automatically:
- Constructs `DATABASE_URL` from `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`
- Listens on port `8080` (Cloud Run standard)
- Runs database migrations on startup
- Seeds the database with admin user using `ADMIN_PASSWORD`

## What Changed for Cloud Run

### 1. Dockerfile (`Dockerfile`)
Multi-stage Docker build optimized for Next.js and Cloud Run:
- Stage 1: Install dependencies and generate Prisma Client
- Stage 2: Build Next.js application
- Stage 3: Create minimal production image

### 2. Startup Script (`scripts/startup.sh`)
Handles application initialization:
- Constructs DATABASE_URL from environment variables
- Runs Prisma migrations (`prisma migrate deploy`)
- Generates Prisma Client
- Seeds database if ADMIN_PASSWORD is provided
- Starts Next.js server on port 8080

### 3. Next.js Configuration (`next.config.js`)
Added `output: 'standalone'` for optimized Docker deployment.

### 4. Environment Configuration (`.env.example`)
Updated with:
- Cloud Run environment variables documentation
- Separate sections for local dev vs Cloud Run
- Deployment notes and instructions

### 5. Database Seed (`prisma/seed.ts`)
Modified to use `ADMIN_PASSWORD` environment variable instead of hardcoded password.

### 6. Health Check Endpoint (`app/api/health/route.ts`)
New endpoint for Cloud Run health checks:
- `GET /api/health`
- Returns database connection status
- Returns 503 if unhealthy

### 7. Package Scripts (`package.json`)
Added convenience scripts:
```json
{
  "db:migrate": "prisma migrate deploy",
  "docker:build": "docker build -t novel-ocr-admin:latest .",
  "docker:run": "docker run -p 8080:8080 --env-file .env novel-ocr-admin:latest",
  "gcloud:build": "gcloud builds submit --tag gcr.io/${PROJECT_ID}/novel-ocr-admin",
  "gcloud:deploy": "gcloud run deploy novel-ocr-admin --image gcr.io/${PROJECT_ID}/novel-ocr-admin ..."
}
```

### 8. Deployment Files
- `deploy.sh` - Interactive deployment script
- `cloudbuild.yaml` - Cloud Build CI/CD configuration
- `.dockerignore` - Optimizes Docker build
- `.gcloudignore` - Optimizes Cloud Build

## Local Testing with Docker

Test the Docker image locally before deploying:

```bash
# Build the image
npm run docker:build

# Create .env file with required variables
cat > .env << EOF
DATABASE_URL="postgresql://user:password@host.docker.internal:5432/novel_ocr_admin"
NEXTAUTH_SECRET="local-dev-secret"
NEXTAUTH_URL="http://localhost:8080"
AUTH_SECRET="local-dev-secret"
ADMIN_PASSWORD="admin123"
NEXT_PUBLIC_API_URL="http://localhost:8080"
EOF

# Run the container
npm run docker:run

# Access at http://localhost:8080
```

## Architecture

```
┌─────────────────────────────────────────────┐
│         Google Cloud Run Service             │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │      Next.js Application (Port 8080)   │ │
│  │                                         │ │
│  │  • Admin Panel UI                      │ │
│  │  • Public Lookup API                   │ │
│  │  • Rate Limiting (in-memory)           │ │
│  │  • NextAuth.js Authentication          │ │
│  └────────────┬───────────────────────────┘ │
│               │                              │
└───────────────┼──────────────────────────────┘
                │
                │ VPC Connector
                │
                ▼
┌─────────────────────────────────────────────┐
│         Cloud SQL PostgreSQL                 │
│                                              │
│  • Novel OCR fingerprints                   │
│  • Lookup logs                              │
│  • API keys                                 │
│  • Admin users                              │
└─────────────────────────────────────────────┘
```

## Deployment Checklist

Before deploying to production:

- [ ] Create Cloud SQL PostgreSQL instance
- [ ] Generate strong NEXTAUTH_SECRET (`openssl rand -base64 32`)
- [ ] Set strong ADMIN_PASSWORD
- [ ] Create secure DB_PASSWORD
- [ ] Set up VPC connector for Cloud SQL private IP
- [ ] Configure environment variables in Cloud Run
- [ ] Test health endpoint: `/api/health`
- [ ] Verify database connection
- [ ] Test admin login
- [ ] Test public lookup API
- [ ] Set up Cloud Monitoring alerts
- [ ] Configure Cloud Armor for DDoS protection (optional)
- [ ] Enable Cloud Audit Logs (optional)

## Endpoints

### Root & Admin
- `GET /` - Redirects to https://othertales.co
- `GET /admin` - Admin login page
- `GET /dashboard` - Admin dashboard (requires auth)
- `GET /dashboard/novels` - Novel management
- `GET /dashboard/analytics` - Analytics
- `GET /dashboard/api-keys` - API key management
- `GET /dashboard/settings` - Settings

### Public API
- `POST /api/novel/lookup` - OCR lookup endpoint
  - Requires `X-API-Key` header or rate limited by IP
  - Port: 8080

### Health Check
- `GET /api/health` - Application health status

## Security Features

- ✅ Rate limiting (IP-based and API key-based)
- ✅ NextAuth.js authentication
- ✅ Password hashing with bcrypt
- ✅ API key masking
- ✅ Role-based access control
- ✅ Environment variable secrets
- ✅ Docker non-root user
- ✅ Database connection over VPC

## Monitoring

View logs in real-time:
```bash
gcloud run services logs read novel-ocr-admin \
  --region us-central1 \
  --limit 50 \
  --follow
```

Check health:
```bash
curl https://your-service-url/api/health
```

## Troubleshooting

### Service won't start
```bash
# Check logs
gcloud run services logs read novel-ocr-admin --region us-central1

# Common issues:
# - Missing environment variables
# - Database connection failure
# - Migration errors
```

### Database connection issues
```bash
# Verify VPC connector
gcloud compute networks vpc-access connectors describe novel-ocr-connector --region us-central1

# Test database connection from Cloud Shell
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"
```

### Cannot access admin panel
1. Check NEXTAUTH_URL matches your service URL
2. Verify ADMIN_PASSWORD was used in seeding
3. Try health check endpoint first
4. Check service allows unauthenticated requests

## Support

- Cloud Run docs: https://cloud.google.com/run/docs
- Prisma docs: https://www.prisma.io/docs
- Next.js docs: https://nextjs.org/docs

## Default Credentials

After deployment with ADMIN_PASSWORD set:
- **Email**: `admin@example.com`
- **Password**: Your `ADMIN_PASSWORD` value

## Port Configuration

The application is configured to:
- Listen on port `8080` (Cloud Run standard)
- Accept the `PORT` environment variable from Cloud Run
- Work with Next.js standalone output mode

No code changes needed - everything is automatic!

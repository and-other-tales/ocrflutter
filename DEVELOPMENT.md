# Development Guide

This guide covers local development setup for the Novel OCR Admin system.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Google Cloud account (for GCS and Vision API)

## Quick Start

### 1. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379

Optional GUI tools (use `--profile tools`):
```bash
docker-compose --profile tools up -d
```

This additionally starts:
- **Redis Commander** at http://localhost:8081
- **pgAdmin** at http://localhost:5050 (login: admin@example.com / admin)

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Database (matches docker-compose)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/novel_ocr_admin"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="same-as-nextauth-secret"

# Google Cloud (required for OCR)
GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"
GOOGLE_APPLICATION_CREDENTIALS="./path/to/service-account-key.json"
GCS_BUCKET_NAME="your-project-id-manuscripts"

# Redis (matches docker-compose)
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# OCR Configuration
PDF_MAX_SIZE_MB="50"
OCR_CONFIDENCE_THRESHOLD="70"
OCR_MAX_RETRIES="3"
WORKER_CONCURRENCY="5"
```

### 3. Set Up Google Cloud

1. **Create a GCP project** and enable APIs:
   ```bash
   gcloud services enable vision.googleapis.com storage-api.googleapis.com
   ```

2. **Create a service account**:
   ```bash
   gcloud iam service-accounts create ocr-service-account \
     --display-name="OCR Service Account"
   ```

3. **Grant permissions**:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:ocr-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:ocr-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/cloudvision.admin"
   ```

4. **Create and download key**:
   ```bash
   gcloud iam service-accounts keys create ./gcp-key.json \
     --iam-account=ocr-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

5. **Create GCS bucket**:
   ```bash
   gsutil mb gs://YOUR_PROJECT_ID-manuscripts
   ```

### 4. Initialize Database

Generate Prisma client and run migrations:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 5. Start Development Server

Start the Next.js development server:

```bash
npm run dev
```

The app will be available at http://localhost:3000

Login with default credentials:
- **Email**: admin@example.com
- **Password**: admin123

### 6. Start OCR Worker

In a separate terminal, start the background OCR worker:

```bash
npm run worker
```

This worker processes PDF OCR jobs from the Redis queue.

## Development Workflow

### Upload a PDF for OCR Processing

1. Navigate to **Manuscripts** in the sidebar
2. Click **Upload PDF**
3. Upload a production-ready PDF file of a novel
4. Fill in metadata (title, author, language)
5. Select text orientation (optional - auto-detected)
6. Click **Upload and Process**

The PDF will be:
1. Validated (file type, size, encryption check)
2. Uploaded to Google Cloud Storage
3. Queued for OCR processing
4. Processed by the worker (extracts first 3 words from first 3 lines)
5. Available for manual review/editing
6. Convertible to a Novel entry for the lookup system

### Monitor OCR Processing

- **Manuscripts List**: Shows real-time status (Pending → Processing → Completed/Failed)
- **Manuscript Detail**: View extracted words, confidence score, orientation
- **Redis Commander** (optional): Monitor job queue at http://localhost:8081

### Testing the Lookup API

Once a manuscript is converted to a novel:

```bash
curl -X POST http://localhost:3000/api/novel/lookup \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "line1": "first three words",
    "line2": "second three words",
    "line3": "third three words"
  }'
```

## Database Management

### Reset Database

```bash
npx prisma migrate reset
npx prisma db seed
```

### View Database

```bash
npx prisma studio
```

Or use pgAdmin at http://localhost:5050 (if started with `--profile tools`)

## Stopping Services

### Stop Docker services:

```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes all data):

```bash
docker-compose down -v
```

## Troubleshooting

### Redis Connection Errors

Ensure Redis is running:
```bash
docker-compose ps
```

Restart Redis if needed:
```bash
docker-compose restart redis
```

### Database Connection Errors

Check PostgreSQL is running and accessible:
```bash
docker-compose logs postgres
```

### OCR Worker Not Processing

1. Check worker is running: `npm run worker`
2. Check Redis connection in worker logs
3. Verify Google Cloud credentials are valid
4. Check job queue in Redis Commander

### Build Errors

If you encounter TypeScript errors after adding new Prisma models:
```bash
npx prisma generate
npm run build
```

## Production Deployment

For production deployment to Cloud Run, see the main README.md and the plan file at `.claude/plans/`.

Key differences for production:
- Use Memorystore Redis instead of local Redis
- Use Cloud SQL instead of local PostgreSQL
- Deploy two Cloud Run services: main app + worker
- Use workload identity instead of service account keys
- Configure proper environment variables in Cloud Run console

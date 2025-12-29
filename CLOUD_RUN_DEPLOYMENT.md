# Google Cloud Run Deployment Guide

This guide explains how to deploy the Novel OCR Admin Panel to Google Cloud Run.

## Prerequisites

1. Google Cloud Project with billing enabled
2. gcloud CLI installed and authenticated
3. Cloud SQL PostgreSQL instance created
4. Docker installed (for local testing)

## Step 1: Set Up Cloud SQL

```bash
# Create a Cloud SQL PostgreSQL instance
gcloud sql instances create novel-ocr-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create the database
gcloud sql databases create novel_ocr_admin \
  --instance=novel-ocr-db

# Set the postgres user password
gcloud sql users set-password postgres \
  --instance=novel-ocr-db \
  --password=YOUR_SECURE_PASSWORD

# Get the private IP address (for VPC connection)
gcloud sql instances describe novel-ocr-db --format="value(ipAddresses[0].ipAddress)"
```

## Step 2: Build and Push Docker Image

```bash
# Set your project ID
export PROJECT_ID=your-project-id
export REGION=us-central1

# Configure Docker for Google Container Registry
gcloud auth configure-docker

# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/novel-ocr-admin:latest .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/novel-ocr-admin:latest
```

## Step 3: Deploy to Cloud Run

```bash
# Deploy the service
gcloud run deploy novel-ocr-admin \
  --image gcr.io/$PROJECT_ID/novel-ocr-admin:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "DB_HOST=10.x.x.x,DB_USER=postgres,DB_NAME=novel_ocr_admin,DB_PASSWORD=YOUR_DB_PASSWORD,ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD,NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET,NEXTAUTH_URL=https://your-service-url,AUTH_SECRET=YOUR_NEXTAUTH_SECRET" \
  --vpc-connector your-vpc-connector
```

### Required Environment Variables

Set these in the Cloud Run console or via gcloud:

- `DB_HOST` - Cloud SQL private IP address
- `DB_USER` - Database user (usually 'postgres')
- `DB_NAME` - Database name ('novel_ocr_admin')
- `DB_PASSWORD` - Database password (secure)
- `ADMIN_PASSWORD` - Admin panel password (secure)
- `NEXTAUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your Cloud Run service URL
- `AUTH_SECRET` - Same as NEXTAUTH_SECRET
- `NEXT_PUBLIC_API_URL` - Your Cloud Run service URL

### Optional Environment Variables

- `PORT` - Automatically set to 8080 by Cloud Run
- `NODE_ENV` - Automatically set to 'production'

## Step 4: Set Up VPC Connector (for Cloud SQL Private IP)

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create novel-ocr-connector \
  --region $REGION \
  --range 10.8.0.0/28

# Update Cloud Run service to use the connector
gcloud run services update novel-ocr-admin \
  --region $REGION \
  --vpc-connector novel-ocr-connector
```

## Step 5: Verify Deployment

```bash
# Get the service URL
gcloud run services describe novel-ocr-admin \
  --region $REGION \
  --format="value(status.url)"

# Test health endpoint
curl https://your-service-url/api/health

# Test login
# Visit https://your-service-url/login
# Email: admin@example.com
# Password: YOUR_ADMIN_PASSWORD
```

## Local Testing with Docker

Before deploying to Cloud Run, test locally:

```bash
# Build the image
docker build -t novel-ocr-admin:local .

# Run locally with environment variables
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/novel_ocr_admin" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="http://localhost:8080" \
  -e AUTH_SECRET="your-secret" \
  -e ADMIN_PASSWORD="admin123" \
  novel-ocr-admin:local

# Test at http://localhost:8080
```

## Continuous Deployment with Cloud Build

Create a `cloudbuild.yaml`:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/novel-ocr-admin:$COMMIT_SHA', '.']

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/novel-ocr-admin:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'novel-ocr-admin'
      - '--image=gcr.io/$PROJECT_ID/novel-ocr-admin:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'

images:
  - 'gcr.io/$PROJECT_ID/novel-ocr-admin:$COMMIT_SHA'
```

## Monitoring and Logs

```bash
# View logs
gcloud run services logs read novel-ocr-admin \
  --region $REGION \
  --limit 50

# View metrics in Cloud Console
# Navigate to: Cloud Run > novel-ocr-admin > Metrics
```

## Security Recommendations

1. **Use Secret Manager** for sensitive environment variables:
   ```bash
   echo -n "your-secret" | gcloud secrets create admin-password --data-file=-
   ```

2. **Enable Cloud Armor** for DDoS protection

3. **Set up Cloud IAM** for authentication instead of `--allow-unauthenticated`

4. **Enable VPC Service Controls** for additional security

5. **Use Cloud SQL Auth Proxy** for enhanced database security

6. **Regularly rotate secrets** (NEXTAUTH_SECRET, ADMIN_PASSWORD)

## Troubleshooting

### Database Connection Issues
- Check VPC connector is properly configured
- Verify Cloud SQL private IP is correct
- Ensure database credentials are correct
- Check Cloud SQL instance is running

### Migration Failures
- Check database permissions
- Verify DATABASE_URL is correctly constructed
- Review startup script logs

### Service Won't Start
- Check environment variables are set
- Review Cloud Run logs: `gcloud run services logs read`
- Verify Docker image builds successfully locally

### Rate Limiting Issues
- Rate limiting uses in-memory storage
- For multiple instances, consider Redis for distributed rate limiting

## Scaling

Cloud Run auto-scales based on load:
- Minimum instances: 0 (default)
- Maximum instances: 10 (configurable)
- CPU allocation: Only during request processing
- Memory: 1Gi (adjustable)

To update scaling:
```bash
gcloud run services update novel-ocr-admin \
  --region $REGION \
  --min-instances 1 \
  --max-instances 20
```

## Cost Optimization

1. Use minimum instances = 0 for development
2. Set appropriate memory and CPU limits
3. Enable request timeout (300s default)
4. Use Cloud SQL Auto-scaling for database
5. Monitor with Cloud Monitoring to adjust resources

## Support

For issues specific to Cloud Run deployment, consult:
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)

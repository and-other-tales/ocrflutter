# Google Cloud Run Deployment Guide

This guide explains how to deploy the Novel OCR Admin Panel to Google Cloud Run with PostgreSQL database.

## Prerequisites

- Google Cloud Platform account
- `gcloud` CLI installed and configured
- Docker installed locally (for testing)
- PostgreSQL database instance

## Environment Variables

The application requires the following environment variables:

```bash
# Authentication
NEXTAUTH_SECRET=<your-secret-key>
NEXTAUTH_URL=https://your-app-url.run.app
ADMIN_PASSWORD=<your-admin-password>

# Database Configuration (Cloud SQL or external PostgreSQL)
DB_HOST=<your-db-host>
DB_NAME=novel_ocr_admin
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_PORT=5432
DB_SSL=true

# API Configuration
NEXT_PUBLIC_API_URL=https://your-app-url.run.app
```

## Step 1: Set Up PostgreSQL Database

### Option A: Cloud SQL (Recommended)

1. **Create a Cloud SQL PostgreSQL instance:**

```bash
gcloud sql instances create novel-ocr-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

2. **Create the database:**

```bash
gcloud sql databases create novel_ocr_admin \
  --instance=novel-ocr-db
```

3. **Set the postgres password:**

```bash
gcloud sql users set-password postgres \
  --instance=novel-ocr-db \
  --password=<YOUR_DB_PASSWORD>
```

4. **Get the connection name:**

```bash
gcloud sql instances describe novel-ocr-db \
  --format='value(connectionName)'
```

Save this for later (format: `project:region:instance`)

5. **Initialize the database schema:**

```bash
# Connect to the database
gcloud sql connect novel-ocr-db --user=postgres

# Run the schema.sql file
\i schema.sql
```

Or upload the schema.sql file through Cloud Console.

### Option B: External PostgreSQL

If using an external PostgreSQL database, ensure it's accessible from Google Cloud Run and configure the environment variables accordingly.

## Step 2: Build and Push Docker Image

1. **Set your Google Cloud project:**

```bash
export PROJECT_ID=<your-project-id>
gcloud config set project $PROJECT_ID
```

2. **Enable required APIs:**

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

3. **Build the Docker image:**

```bash
docker build -t gcr.io/$PROJECT_ID/novel-ocr-admin:latest .
```

4. **Test the image locally (optional):**

```bash
docker run -p 8080:8080 \
  -e DB_HOST=<your-db-host> \
  -e DB_NAME=novel_ocr_admin \
  -e DB_USER=postgres \
  -e DB_PASSWORD=<your-password> \
  -e ADMIN_PASSWORD=password123 \
  -e NEXTAUTH_SECRET=your-dev-secret \
  -e NEXTAUTH_URL=http://localhost:8080 \
  gcr.io/$PROJECT_ID/novel-ocr-admin:latest
```

5. **Push to Google Container Registry:**

```bash
docker push gcr.io/$PROJECT_ID/novel-ocr-admin:latest
```

## Step 3: Deploy to Cloud Run

### If using Cloud SQL:

```bash
gcloud run deploy novel-ocr-admin \
  --image gcr.io/$PROJECT_ID/novel-ocr-admin:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances <PROJECT_ID>:<REGION>:<INSTANCE_NAME> \
  --set-env-vars "DB_HOST=/cloudsql/<PROJECT_ID>:<REGION>:<INSTANCE_NAME>" \
  --set-env-vars "DB_NAME=novel_ocr_admin" \
  --set-env-vars "DB_USER=postgres" \
  --set-secrets "DB_PASSWORD=novel-db-password:latest" \
  --set-secrets "ADMIN_PASSWORD=admin-password:latest" \
  --set-secrets "NEXTAUTH_SECRET=nextauth-secret:latest" \
  --set-env-vars "DB_PORT=5432" \
  --set-env-vars "DB_SSL=false" \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://novel-ocr-admin-HASH-uc.a.run.app" \
  --set-env-vars "NEXTAUTH_URL=https://novel-ocr-admin-HASH-uc.a.run.app" \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

### If using external PostgreSQL:

```bash
gcloud run deploy novel-ocr-admin \
  --image gcr.io/$PROJECT_ID/novel-ocr-admin:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DB_HOST=<your-external-db-host>" \
  --set-env-vars "DB_NAME=novel_ocr_admin" \
  --set-env-vars "DB_USER=postgres" \
  --set-secrets "DB_PASSWORD=novel-db-password:latest" \
  --set-secrets "ADMIN_PASSWORD=admin-password:latest" \
  --set-secrets "NEXTAUTH_SECRET=nextauth-secret:latest" \
  --set-env-vars "DB_PORT=5432" \
  --set-env-vars "DB_SSL=true" \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://novel-ocr-admin-HASH-uc.a.run.app" \
  --set-env-vars "NEXTAUTH_URL=https://novel-ocr-admin-HASH-uc.a.run.app" \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

**Note:** Replace `https://novel-ocr-admin-HASH-uc.a.run.app` with your actual Cloud Run URL after first deployment.

## Step 4: Create Secrets (Recommended)

Instead of passing sensitive data as environment variables, use Google Cloud Secret Manager:

1. **Create secrets:**

```bash
# Database password
echo -n "<YOUR_DB_PASSWORD>" | gcloud secrets create novel-db-password --data-file=-

# Admin password
echo -n "<YOUR_ADMIN_PASSWORD>" | gcloud secrets create admin-password --data-file=-

# NextAuth secret
echo -n "$(openssl rand -base64 32)" | gcloud secrets create nextauth-secret --data-file=-
```

2. **Grant Cloud Run access to secrets:**

```bash
gcloud secrets add-iam-policy-binding novel-db-password \
  --member=serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding admin-password \
  --member=serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding nextauth-secret \
  --member=serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

## Step 5: Update and Redeploy

To update the application:

1. **Make your code changes**

2. **Rebuild and push:**

```bash
docker build -t gcr.io/$PROJECT_ID/novel-ocr-admin:latest .
docker push gcr.io/$PROJECT_ID/novel-ocr-admin:latest
```

3. **Redeploy:**

```bash
gcloud run deploy novel-ocr-admin \
  --image gcr.io/$PROJECT_ID/novel-ocr-admin:latest \
  --platform managed \
  --region us-central1
```

## Step 6: Configure Custom Domain (Optional)

1. **Map your domain:**

```bash
gcloud run domain-mappings create \
  --service novel-ocr-admin \
  --domain admin.yourdomain.com \
  --region us-central1
```

2. **Update DNS records as instructed by the output**

3. **Update environment variables:**

```bash
gcloud run services update novel-ocr-admin \
  --update-env-vars NEXTAUTH_URL=https://admin.yourdomain.com \
  --update-env-vars NEXT_PUBLIC_API_URL=https://admin.yourdomain.com \
  --region us-central1
```

## Step 7: Monitoring and Logging

1. **View logs:**

```bash
gcloud run services logs read novel-ocr-admin \
  --region us-central1 \
  --limit 50
```

2. **Monitor metrics in Cloud Console:**

- Navigate to Cloud Run > novel-ocr-admin
- View metrics, logs, and revisions

## Troubleshooting

### Database connection issues:

1. **Check Cloud SQL connection:**

```bash
gcloud sql instances describe novel-ocr-db
```

2. **Test database connectivity:**

```bash
gcloud sql connect novel-ocr-db --user=postgres
```

3. **Verify environment variables:**

```bash
gcloud run services describe novel-ocr-admin \
  --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)'
```

### Application not starting:

1. **Check container logs:**

```bash
gcloud run services logs read novel-ocr-admin --region us-central1 --limit 100
```

2. **Verify port 8080 is exposed in Dockerfile**

3. **Check memory and CPU limits**

### Authentication issues:

1. **Verify NEXTAUTH_SECRET is set**

2. **Check NEXTAUTH_URL matches your actual URL**

3. **Ensure ADMIN_PASSWORD is correctly set**

## Costs

Approximate monthly costs for minimal usage:

- Cloud Run: $0-5 (free tier: 2 million requests/month)
- Cloud SQL (db-f1-micro): ~$7-10/month
- Container Registry storage: ~$0.026/GB/month

For production, consider:
- Upgrading Cloud SQL instance type
- Enabling Cloud SQL automatic backups
- Using Cloud CDN for static assets
- Implementing Cloud Armor for DDoS protection

## Security Best Practices

1. **Enable HTTPS only** (Cloud Run does this by default)
2. **Use Secret Manager** for sensitive data
3. **Implement IP whitelisting** if needed
4. **Regular database backups**
5. **Monitor access logs**
6. **Use least privilege IAM roles**
7. **Keep dependencies updated**

## Support

For issues:
- Check Cloud Run logs
- Review database connection settings
- Verify all environment variables are set correctly
- Consult Google Cloud documentation

---

**Deployment complete!** Access your admin panel at the Cloud Run URL.

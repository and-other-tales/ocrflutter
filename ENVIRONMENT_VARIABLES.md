# Environment Variables for Cloud Run

This document provides the exact environment variables to set in Google Cloud Run console.

## Setting Environment Variables

### Via Cloud Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select your service: `novel-ocr-admin`
3. Click "EDIT & DEPLOY NEW REVISION"
4. Expand "Container, Variables & Secrets, Connections, Security"
5. Click "Variables & Secrets" tab
6. Add the following variables:

### Via gcloud Command

```bash
gcloud run services update novel-ocr-admin \
  --region us-central1 \
  --set-env-vars "\
DB_HOST=10.x.x.x,\
DB_USER=postgres,\
DB_NAME=novel_ocr_admin,\
DB_PASSWORD=your-secure-db-password,\
ADMIN_PASSWORD=your-secure-admin-password,\
NEXTAUTH_SECRET=your-nextauth-secret-key,\
NEXTAUTH_URL=https://your-service-url,\
AUTH_SECRET=your-nextauth-secret-key,\
NEXT_PUBLIC_API_URL=https://your-service-url"
```

## Required Environment Variables

### Database Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `DB_HOST` | `10.x.x.x` | Cloud SQL private IP address or connection name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_NAME` | `novel_ocr_admin` | Database name |
| `DB_PASSWORD` | `<secure-password>` | Database password (create a strong one) |

**How to get DB_HOST:**
```bash
# Get Cloud SQL private IP
gcloud sql instances describe YOUR-INSTANCE-NAME \
  --format="value(ipAddresses[0].ipAddress)"
```

### Authentication Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `ADMIN_PASSWORD` | `<secure-password>` | Password for admin@example.com account |
| `NEXTAUTH_SECRET` | `<random-32-char-string>` | NextAuth.js secret key |
| `NEXTAUTH_URL` | `https://your-service-url` | Your Cloud Run service URL |
| `AUTH_SECRET` | `<same-as-nextauth-secret>` | Same as NEXTAUTH_SECRET |

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**Get your service URL:**
```bash
gcloud run services describe novel-ocr-admin \
  --region us-central1 \
  --format="value(status.url)"
```

### API Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-service-url` | Public API URL (same as NEXTAUTH_URL) |

## Example Values

Here's an example configuration (DO NOT use these exact values in production):

```bash
# Database (Cloud SQL)
DB_HOST=10.123.45.67
DB_USER=postgres
DB_NAME=novel_ocr_admin
DB_PASSWORD=MySecureDbPass123!

# Admin Account
ADMIN_PASSWORD=AdminPass456!

# NextAuth (generate your own!)
NEXTAUTH_SECRET=abcdef1234567890abcdef1234567890abcdef12
NEXTAUTH_URL=https://novel-ocr-admin-abc123-uc.a.run.app
AUTH_SECRET=abcdef1234567890abcdef1234567890abcdef12

# API
NEXT_PUBLIC_API_URL=https://novel-ocr-admin-abc123-uc.a.run.app
```

## Automated Environment Variables

These are automatically set by Cloud Run (do not set manually):

- `PORT=8080` - Cloud Run automatically sets this
- `NODE_ENV=production` - Set by the Dockerfile

## Using Secret Manager (Recommended for Production)

For sensitive values, use Google Secret Manager instead of environment variables:

### 1. Create secrets:
```bash
# Create database password secret
echo -n "your-db-password" | gcloud secrets create db-password --data-file=-

# Create admin password secret
echo -n "your-admin-password" | gcloud secrets create admin-password --data-file=-

# Create NextAuth secret
openssl rand -base64 32 | gcloud secrets create nextauth-secret --data-file=-
```

### 2. Grant Cloud Run access:
```bash
# Get Cloud Run service account
SERVICE_ACCOUNT=$(gcloud run services describe novel-ocr-admin \
  --region us-central1 \
  --format="value(spec.template.spec.serviceAccountName)")

# Grant access to secrets
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding admin-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding nextauth-secret \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Update Cloud Run to use secrets:
```bash
gcloud run services update novel-ocr-admin \
  --region us-central1 \
  --update-secrets=DB_PASSWORD=db-password:latest \
  --update-secrets=ADMIN_PASSWORD=admin-password:latest \
  --update-secrets=NEXTAUTH_SECRET=nextauth-secret:latest \
  --update-secrets=AUTH_SECRET=nextauth-secret:latest
```

## Verification

After setting environment variables, verify they're correctly set:

```bash
# View current environment variables (sensitive values are hidden)
gcloud run services describe novel-ocr-admin \
  --region us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"

# Test the health endpoint
SERVICE_URL=$(gcloud run services describe novel-ocr-admin \
  --region us-central1 \
  --format="value(status.url)")

curl $SERVICE_URL/api/health
```

Expected health response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:34:56.789Z",
  "database": "connected",
  "uptime": 123.45
}
```

## Troubleshooting

### DATABASE_URL construction fails
- Ensure all DB_* variables are set
- Check for typos in variable names
- Verify DB_HOST has the correct IP address

### Cannot connect to database
- Verify VPC connector is configured
- Check Cloud SQL instance is running
- Confirm DB_PASSWORD is correct
- Test connection from Cloud Shell

### Admin login fails
- Verify ADMIN_PASSWORD was set during first deployment
- Check if database seeding completed successfully
- Review startup logs for seed errors

### NextAuth errors
- Ensure NEXTAUTH_SECRET is set and 32+ characters
- Verify NEXTAUTH_URL matches your service URL exactly
- Confirm AUTH_SECRET equals NEXTAUTH_SECRET

## Security Best Practices

1. **Strong Passwords**: Use passwords with 16+ characters, mixed case, numbers, and symbols
2. **Rotate Secrets**: Change NEXTAUTH_SECRET and passwords regularly
3. **Use Secret Manager**: Store sensitive values in Secret Manager, not plain environment variables
4. **Restrict Access**: Limit who can view/modify environment variables in Cloud Console
5. **Audit Logs**: Enable Cloud Audit Logs to track environment variable changes

## Quick Setup Script

Run this interactive script to set all environment variables:

```bash
#!/bin/bash

echo "Cloud Run Environment Variable Setup"
echo "====================================="
echo ""

# Collect values
read -p "DB_HOST (Cloud SQL IP): " DB_HOST
read -p "DB_USER [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}
read -p "DB_NAME [novel_ocr_admin]: " DB_NAME
DB_NAME=${DB_NAME:-novel_ocr_admin}
read -sp "DB_PASSWORD: " DB_PASSWORD
echo ""
read -sp "ADMIN_PASSWORD: " ADMIN_PASSWORD
echo ""
read -p "NEXTAUTH_SECRET (or press enter to generate): " NEXTAUTH_SECRET
if [ -z "$NEXTAUTH_SECRET" ]; then
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  echo "Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
fi

# Get service URL
SERVICE_URL=$(gcloud run services describe novel-ocr-admin \
  --region us-central1 \
  --format="value(status.url)" 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
  read -p "NEXTAUTH_URL (service not deployed yet): " NEXTAUTH_URL
else
  NEXTAUTH_URL=$SERVICE_URL
  echo "Using service URL: $NEXTAUTH_URL"
fi

# Apply to Cloud Run
echo ""
echo "Applying environment variables to Cloud Run..."

gcloud run services update novel-ocr-admin \
  --region us-central1 \
  --set-env-vars "\
DB_HOST=$DB_HOST,\
DB_USER=$DB_USER,\
DB_NAME=$DB_NAME,\
DB_PASSWORD=$DB_PASSWORD,\
ADMIN_PASSWORD=$ADMIN_PASSWORD,\
NEXTAUTH_SECRET=$NEXTAUTH_SECRET,\
NEXTAUTH_URL=$NEXTAUTH_URL,\
AUTH_SECRET=$NEXTAUTH_SECRET,\
NEXT_PUBLIC_API_URL=$NEXTAUTH_URL"

echo ""
echo "✅ Environment variables set successfully!"
```

Save this as `setup-env.sh`, make it executable with `chmod +x setup-env.sh`, and run it.

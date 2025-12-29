#!/bin/bash

# Google Cloud Run Deployment Script for Novel OCR Admin Panel
# This script helps deploy the application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
command -v gcloud >/dev/null 2>&1 || { echo -e "${RED}Error: gcloud CLI is not installed${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: docker is not installed${NC}" >&2; exit 1; }

echo -e "${GREEN}🚀 Novel OCR Admin Panel - Cloud Run Deployment${NC}"
echo ""

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Enter your Google Cloud Project ID:${NC}"
    read PROJECT_ID
fi

# Get region
REGION=${REGION:-us-central1}
echo -e "${YELLOW}Region: ${REGION}${NC}"

# Get service name
SERVICE_NAME=${SERVICE_NAME:-novel-ocr-admin}
echo -e "${YELLOW}Service name: ${SERVICE_NAME}${NC}"

# Confirm deployment
echo ""
echo -e "${YELLOW}This will:${NC}"
echo "  1. Build Docker image"
echo "  2. Push to Google Container Registry"
echo "  3. Deploy to Cloud Run in project: $PROJECT_ID"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Step 1: Build Docker image
echo ""
echo -e "${GREEN}📦 Step 1: Building Docker image...${NC}"
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .

# Step 2: Configure Docker for GCR
echo ""
echo -e "${GREEN}🔧 Step 2: Configuring Docker for Google Container Registry...${NC}"
gcloud auth configure-docker --quiet

# Step 3: Push to GCR
echo ""
echo -e "${GREEN}⬆️  Step 3: Pushing image to Google Container Registry...${NC}"
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest

# Step 4: Check if service exists
echo ""
echo -e "${GREEN}🔍 Step 4: Checking if service exists...${NC}"
if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Service exists - updating..."
    ACTION="update"
else
    echo "Service does not exist - creating new service..."
    ACTION="create"
fi

# Step 5: Deploy to Cloud Run
echo ""
echo -e "${GREEN}🚀 Step 5: Deploying to Cloud Run...${NC}"

if [ "$ACTION" == "create" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  First deployment detected!${NC}"
    echo "You need to set environment variables. Please provide the following:"
    echo ""

    read -p "DB_HOST (Cloud SQL private IP): " DB_HOST
    read -p "DB_USER (default: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    read -p "DB_NAME (default: novel_ocr_admin): " DB_NAME
    DB_NAME=${DB_NAME:-novel_ocr_admin}
    read -sp "DB_PASSWORD: " DB_PASSWORD
    echo ""
    read -sp "ADMIN_PASSWORD (for admin@example.com): " ADMIN_PASSWORD
    echo ""
    read -p "NEXTAUTH_SECRET (generate with 'openssl rand -base64 32'): " NEXTAUTH_SECRET

    # Get service URL (will be set after deployment)
    echo ""
    echo -e "${YELLOW}Note: NEXTAUTH_URL will be set after getting the service URL${NC}"

    gcloud run deploy $SERVICE_NAME \
        --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
        --platform managed \
        --region $REGION \
        --project $PROJECT_ID \
        --allow-unauthenticated \
        --port 8080 \
        --memory 1Gi \
        --cpu 1 \
        --timeout 300 \
        --max-instances 10 \
        --set-env-vars "DB_HOST=$DB_HOST,DB_USER=$DB_USER,DB_NAME=$DB_NAME,DB_PASSWORD=$DB_PASSWORD,ADMIN_PASSWORD=$ADMIN_PASSWORD,NEXTAUTH_SECRET=$NEXTAUTH_SECRET,AUTH_SECRET=$NEXTAUTH_SECRET"

    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)")

    echo ""
    echo -e "${YELLOW}Updating NEXTAUTH_URL to: $SERVICE_URL${NC}"

    # Update with correct URL
    gcloud run services update $SERVICE_NAME \
        --region $REGION \
        --project $PROJECT_ID \
        --update-env-vars "NEXTAUTH_URL=$SERVICE_URL,NEXT_PUBLIC_API_URL=$SERVICE_URL"
else
    gcloud run deploy $SERVICE_NAME \
        --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
        --platform managed \
        --region $REGION \
        --project $PROJECT_ID
fi

# Step 6: Get service URL
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format="value(status.url)")

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Novel OCR Admin Panel Deployed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Service URL:    ${GREEN}$SERVICE_URL${NC}"
echo -e "Health Check:   ${GREEN}$SERVICE_URL/api/health${NC}"
echo -e "Login Page:     ${GREEN}$SERVICE_URL/login${NC}"
echo ""
echo "Default credentials:"
echo "  Email:    admin@example.com"
echo "  Password: [Your ADMIN_PASSWORD]"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Visit the health check endpoint to verify deployment"
echo "  2. Login to the admin panel"
echo "  3. Configure VPC connector if using Cloud SQL private IP"
echo "  4. Set up monitoring and alerts"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  gcloud run services logs read $SERVICE_NAME --region $REGION --project $PROJECT_ID"
echo ""

#!/bin/bash

# Docker Compose Startup Script for Novel OCR Admin

set -e

echo "🐳 Novel OCR Admin - Docker Compose Setup"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.docker template..."
    cp .env.docker .env
    echo "✅ .env file created. Please review and update it if needed."
    echo ""
fi

# Parse command line arguments
MODE="prod"
PROFILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            MODE="dev"
            shift
            ;;
        --tools)
            PROFILE="--profile tools"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev     Start in development mode with hot reload"
            echo "  --tools   Include optional tools (Redis Commander, pgAdmin)"
            echo "  --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                  # Start in production mode"
            echo "  $0 --dev            # Start in development mode"
            echo "  $0 --tools          # Start with optional tools"
            echo "  $0 --dev --tools    # Start in dev mode with tools"
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Run '$0 --help' for usage information."
            exit 1
            ;;
    esac
done

# Start services based on mode
if [ "$MODE" = "dev" ]; then
    echo "🚀 Starting services in DEVELOPMENT mode..."
    echo "   - Hot reload enabled"
    echo "   - Source code mounted as volume"
    echo ""
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up $PROFILE --build
else
    echo "🚀 Starting services in PRODUCTION mode..."
    echo ""
    docker-compose up $PROFILE -d --build

    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    echo "🌐 Access Points:"
    echo "   - Web App:         http://localhost:3000"
    if [[ "$PROFILE" == *"tools"* ]]; then
        echo "   - Redis Commander: http://localhost:8081"
        echo "   - pgAdmin:         http://localhost:5050"
        echo "                      (Email: admin@example.com, Password: admin)"
    fi
    echo ""
    echo "📝 Useful Commands:"
    echo "   View logs:          docker-compose logs -f"
    echo "   Stop services:      docker-compose down"
    echo "   Restart:            docker-compose restart"
    echo "   See all commands:   cat DOCKER_DEPLOYMENT.md"
    echo ""
fi

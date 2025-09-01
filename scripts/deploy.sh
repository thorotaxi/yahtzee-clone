#!/bin/bash

# Yahtzee Clone Deployment Script
# This script prepares the project for deployment

echo "🚀 Starting Yahtzee Clone deployment preparation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf server/dist/

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

print_status "Installing backend dependencies..."
cd server
npm install --production
cd ..

# Build frontend
print_status "Building frontend..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Frontend build failed. dist/ directory not found."
    exit 1
fi

print_status "Frontend build completed successfully!"

# Create deployment package
print_status "Creating deployment package..."
mkdir -p deployment
cp -r dist/ deployment/frontend/
cp -r server/ deployment/backend/
cp env.example deployment/
cp DEPLOYMENT.md deployment/
cp README.md deployment/

# Clean up backend node_modules for deployment
print_status "Cleaning up backend for deployment..."
rm -rf deployment/backend/node_modules/
rm -rf deployment/backend/server.log
rm -rf deployment/backend/*.db

print_status "Deployment package created in deployment/ directory"

# Display next steps
echo ""
print_status "Deployment preparation completed!"
echo ""
echo "Next steps:"
echo "1. Frontend (Vercel):"
echo "   - Upload deployment/frontend/ to Vercel"
echo "   - Set environment variable VITE_API_URL"
echo ""
echo "2. Backend (Railway):"
echo "   - Upload deployment/backend/ to Railway"
echo "   - Set environment variables from env.example"
echo ""
echo "3. Connect services:"
echo "   - Update CORS_ORIGINS with frontend URL"
echo "   - Update VITE_API_URL with backend URL"
echo ""
echo "See DEPLOYMENT.md for detailed instructions."

print_status "Deployment preparation script completed successfully! 🎉"

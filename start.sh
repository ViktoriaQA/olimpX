#!/bin/bash

# Build and start the full-stack application

# Install Node.js and npm if not available
if ! command -v npm &> /dev/null; then
    echo "npm not found, installing Node.js and npm..."
    apt update && apt install -y curl
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt install -y nodejs
fi

echo "Building frontend..."
cd frontend
npm install
npm audit fix --audit-level=moderate
npm run build

# Verify frontend build completed successfully
if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed - dist directory not found"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ Frontend build failed - index.html not found"
    exit 1
fi

echo "✅ Frontend build completed successfully"

echo "Building backend..."
cd ../backend
npm install
npm audit fix --audit-level=moderate
npm run build

# Verify backend build completed successfully
if [ ! -d "dist" ]; then
    echo "❌ Backend build failed - dist directory not found"
    exit 1
fi

echo "✅ Backend build completed successfully"

echo "Starting backend server..."
npm start
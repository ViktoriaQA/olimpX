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
npm run build

echo "Building backend..."
cd ../backend
npm install
npm run build

echo "Starting backend server..."
npm start
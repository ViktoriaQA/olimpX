#!/bin/bash

# Test script for monthly subscription renewal
# This script tests the automatic renewal system

echo "🧪 Starting monthly renewal test..."
echo "⏰ Test started at: $(date)"

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$MONOBANK_TOKEN" ]; then
    echo "⚠️  MONOBANK_TOKEN environment variable is not set (using test token)"
fi

# Navigate to backend directory
cd "$(dirname "$0")/../.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Compile TypeScript if needed
if [ ! -d "dist" ]; then
    echo "🔨 Compiling TypeScript..."
    npm run build
fi

# Run the monthly renewal test
echo "🔄 Running monthly renewal test..."
npx ts-node src/scripts/testMonthlyRenewal.ts

# Check the result
if [ $? -eq 0 ]; then
    echo "✅ Monthly renewal test completed successfully"
    echo "🎉 Test passed - automatic renewal system is working correctly"
else
    echo "❌ Monthly renewal test failed"
    echo "🔍 Check the logs above for details"
    exit 1
fi

echo "📊 Test completed at: $(date)"

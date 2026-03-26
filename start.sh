#!/bin/bash

# Fast pre-push checks for development

echo "🔍 Running pre-push checks..."

# 1. Quick smoke tests (only critical paths)
echo "💨 Running smoke tests..."
npm run test:e2e:smoke || { echo "❌ Smoke tests failed"; exit 1; }

echo "✅ Pre-push checks passed! 🚀"
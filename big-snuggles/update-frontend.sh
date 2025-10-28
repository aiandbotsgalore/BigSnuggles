#!/bin/bash

# Frontend Update Script
# Run this after you've deployed the backend and have its URL

echo "🔄 Big Snuggles Frontend - Backend URL Update"
echo "=============================================="
echo ""

# Check if backend URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Backend URL not provided"
    echo ""
    echo "Usage: bash update-frontend.sh <backend-url>"
    echo ""
    echo "Example:"
    echo "  bash update-frontend.sh https://big-snuggles-backend.onrender.com"
    echo ""
    exit 1
fi

BACKEND_URL="$1"

# Remove trailing slash if present
BACKEND_URL="${BACKEND_URL%/}"

echo "📝 Updating frontend configuration..."
echo "   Backend URL: $BACKEND_URL"
echo ""

# Update frontend .env
cd /workspace/big-snuggles/frontend || exit 1

cat > .env << EOF
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=\${SUPABASE_URL:-https://your-project.supabase.co}
VITE_SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY:-stub-supabase-anon-key}

# Backend API Configuration
VITE_API_BASE_URL=$BACKEND_URL
VITE_API_URL=$BACKEND_URL
VITE_BACKEND_URL=$BACKEND_URL

# WebSocket Configuration
VITE_WS_URL=$BACKEND_URL

# Stripe Configuration (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=\${STRIPE_PUBLISHABLE_KEY:-pk_test_your_publishable_key}
EOF

echo "✅ Frontend .env updated"
echo ""
echo "🔨 Rebuilding frontend..."

# Build frontend
sudo npm run build --mode development

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend build successful!"
    echo ""
    echo "📦 Distribution files ready in: frontend/dist/"
    echo ""
    echo "🚀 Next step: Redeploy to https://swktrtulitdq.space.minimax.io"
    echo ""
    echo "   You can now use the deploy tool to redeploy the frontend"
    echo "   with the updated backend URL configuration."
    echo ""
else
    echo ""
    echo "❌ Build failed. Check the error messages above."
    echo ""
    exit 1
fi

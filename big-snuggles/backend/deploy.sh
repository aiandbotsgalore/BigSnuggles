#!/bin/bash

# Quick Deployment Script for Big Snuggles Backend
# This script helps you deploy to Render.com quickly

echo "🚀 Big Snuggles Backend - Quick Deployment Helper"
echo "=================================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Big Snuggles Backend"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

echo ""
echo "📋 Deployment Options:"
echo ""
echo "1. RENDER.COM (Recommended - Free Tier)"
echo "   - Go to: https://render.com/deploy"
echo "   - Connect this repository"
echo "   - Render will use render.yaml for automatic configuration"
echo ""
echo "2. RAILWAY.APP"
echo "   - Go to: https://railway.app/new"
echo "   - Deploy from GitHub or local directory"
echo "   - Uses railway.json for configuration"
echo ""
echo "3. FLY.IO (If you have fly CLI installed)"
if command -v flyctl &> /dev/null; then
    echo "   ✅ fly CLI detected!"
    echo "   Run: flyctl launch"
else
    echo "   ❌ fly CLI not found. Install from: https://fly.io/docs/hands-on/install-flyctl/"
fi
echo ""

echo "📁 Backend Files Ready:"
echo "   ✅ Dockerfile"
echo "   ✅ render.yaml"
echo "   ✅ railway.json"
echo "   ✅ .env configured"
echo "   ✅ CORS updated for: https://swktrtulitdq.space.minimax.io"
echo ""

echo "🔑 Environment Variables Configured:"
echo "   ✅ SUPABASE credentials"
echo "   ✅ GOOGLE_AI_API_KEY"
echo "   ✅ STRIPE keys"
echo "   ✅ FRONTEND_URL"
echo ""

echo "📖 For detailed instructions, see: BACKEND_DEPLOYMENT_GUIDE.md"
echo ""

# Check if Render CLI is available
if command -v render &> /dev/null; then
    echo "🎯 Render CLI detected! Would you like to deploy now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "🚀 Deploying to Render..."
        render deploy
    fi
fi

echo ""
echo "✨ Next Steps:"
echo "   1. Deploy backend using one of the options above"
echo "   2. Copy your backend URL (e.g., https://your-app.onrender.com)"
echo "   3. Update frontend/.env with backend URL"
echo "   4. Redeploy frontend"
echo ""
echo "🌐 Your frontend is already live at:"
echo "   https://swktrtulitdq.space.minimax.io"
echo ""

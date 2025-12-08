#!/bin/bash

# Vercel Deployment Script
# This script helps you deploy your Soros Trading Backend to Vercel

set -e

echo "🚀 Soros Trading Backend - Vercel Deployment"
echo "=============================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
    echo "✅ Vercel CLI installed successfully!"
else
    echo "✅ Vercel CLI is already installed"
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo ""
echo "1. MongoDB Atlas database URL ready? (MONGODB_URI)"
echo "2. JWT secret prepared? (JWT_SECRET)"
echo "3. Email SMTP credentials ready? (SMTP_HOST, SMTP_USER, SMTP_PASS)"
echo "4. OpenAI API key ready? (OPENAI_API_KEY)"
echo ""
read -p "Have you prepared all environment variables? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  Please prepare your environment variables first:"
    echo ""
    echo "Required variables:"
    echo "  - MONGODB_URI"
    echo "  - JWT_SECRET"
    echo "  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM"
    echo "  - OPENAI_API_KEY"
    echo ""
    echo "You can add them in Vercel dashboard after deployment."
    echo ""
fi

echo ""
echo "🔐 Logging into Vercel..."
vercel login

echo ""
echo "📦 Deploying to Vercel (Preview)..."
echo ""
vercel

echo ""
echo "✅ Preview deployment complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Add environment variables in Vercel dashboard:"
echo "   https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
echo ""
echo "2. Test your preview deployment URL"
echo ""
echo "3. When ready, deploy to production:"
echo "   vercel --prod"
echo ""
echo "4. Update your frontend with the production URL"
echo ""
echo "Happy deploying! 🎉"

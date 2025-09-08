#!/bin/bash

# AI Email Summarizer Backend - Development Setup Script

echo "🚀 AI Email Summarizer Backend Setup"
echo "====================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your actual values."
    echo ""
    echo "Required configurations:"
    echo "- DATABASE_* (PostgreSQL connection)"
    echo "- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (OAuth2)"
    echo "- OPENAI_API_KEY (AI summarization)"
    echo ""
    read -p "Press Enter when you've configured your .env file..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running on localhost:5432"
    echo "Please start PostgreSQL and create the database:"
    echo "  createdb email_summarizer"
    echo ""
    read -p "Press Enter when PostgreSQL is ready..."
fi

echo "🎯 Starting development server..."
echo "📚 API Documentation will be available at: http://localhost:8000/api/docs"
echo ""

yarn start:dev

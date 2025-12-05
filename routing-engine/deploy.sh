#!/bin/bash

set -e

echo "🚀 VeilPool Routing Engine - Production Deployment"
echo "=================================================="

check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed"
        exit 1
    fi
    
    if ! command -v redis-cli &> /dev/null; then
        echo "⚠️  Redis CLI not found. Make sure Redis is running."
    fi
    
    echo "✅ Prerequisites check passed"
}

install_dependencies() {
    echo ""
    echo "📦 Installing dependencies..."
    npm ci --production
    echo "✅ Dependencies installed"
}

build_project() {
    echo ""
    echo "🔨 Building project..."
    npm run build
    echo "✅ Build completed"
}

setup_environment() {
    echo ""
    echo "🔧 Setting up environment..."
    
    if [ ! -f .env.production ]; then
        echo "❌ .env.production file not found"
        echo "Please create .env.production with required configuration"
        exit 1
    fi
    
    cp .env.production .env
    echo "✅ Environment configured"
}

check_redis() {
    echo ""
    echo "🔌 Checking Redis connection..."
    
    REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
    
    if redis-cli -u "$REDIS_URL" ping &> /dev/null; then
        echo "✅ Redis is accessible"
    else
        echo "❌ Cannot connect to Redis at $REDIS_URL"
        exit 1
    fi
}

start_server() {
    echo ""
    echo "🌟 Starting VeilPool Routing Engine..."
    echo ""
    
    if [ "$1" = "pm2" ]; then
        if ! command -v pm2 &> /dev/null; then
            echo "Installing PM2..."
            npm install -g pm2
        fi
        
        pm2 start dist/index.js --name veilpool-routing --time
        pm2 save
        echo "✅ Server started with PM2"
        echo "Run 'pm2 logs veilpool-routing' to view logs"
    else
        npm start
    fi
}

main() {
    check_prerequisites
    install_dependencies
    build_project
    setup_environment
    check_redis
    start_server "$1"
}

main "$@"

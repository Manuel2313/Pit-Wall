#!/usr/bin/env bash
# Pit Wall - Start All Services (Linux/Mac/Git Bash)
# Usage: ./start-all.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"
WEB_DIR="$PROJECT_ROOT/apps/web"

echo "========================================"
echo "  Pit Wall - Starting All Services"
echo "========================================"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL not ready. Start it first:"
    echo "   sudo systemctl start postgresql"
    echo "   or: brew services start postgresql"
    exit 1
fi

# Check if database exists
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw pitwall; then
    echo "Creating database 'pitwall'..."
    createdb -U postgres pitwall
fi

# Start API in background
echo "Starting API on port 3000..."
cd "$API_DIR"
npm run start:dev &
API_PID=$!

# Wait for API to be ready
echo "Waiting for API..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "API ready!"
        break
    fi
    sleep 1
done

# Start Web in background
echo "Starting Web on port 4200..."
cd "$WEB_DIR"
npm start &
WEB_PID=$!

echo ""
echo "========================================"
echo "  All services started!"
echo "========================================"
echo ""
echo "API:    http://localhost:3000"
echo "Web:    http://localhost:4200"
echo "Health: http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C to kill background processes
trap "kill $API_PID $WEB_PID 2>/dev/null; exit" INT TERM

# Wait for background processes
wait $API_PID $WEB_PID
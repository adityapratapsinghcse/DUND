#!/usr/bin/env bash
set -e

echo "=== Starting DEGRADE Development Environment ==="

# 1. Run migrations and seed
cd backend
python manage.py migrate
python manage.py seed_demo
cd ..

# 2. Start servers in background or tmux
echo "Starting backend with Daphne on port 8000..."
(cd backend && daphne -b 127.0.0.1 -p 8000 degrade.asgi:application) &
BACKEND_PID=$!

echo "Starting Vite frontend on port 5173..."
(npm --workspace=web run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait

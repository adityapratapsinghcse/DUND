#!/bin/bash
# Exit on error
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting Celery worker in the background..."
celery -A degrade worker -l info &

echo "Starting Daphne web server..."
daphne -b 0.0.0.0 -p $PORT degrade.asgi:application

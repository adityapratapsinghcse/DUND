#!/usr/bin/env bash
set -e
echo "Seeding DEGRADE database..."
cd backend
python manage.py seed_demo
echo "Seed complete!"

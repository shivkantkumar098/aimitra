#!/bin/bash
set -e

echo "==> Installing Python dependencies..."
pip install -r backend/requirements.txt

echo "==> Building React frontend..."
cd frontend
npm install
REACT_APP_API_URL="" npm run build
cd ..

echo "==> Copying build into backend/static..."
rm -rf backend/static
cp -r frontend/build/. backend/static/

echo "==> Build complete!"

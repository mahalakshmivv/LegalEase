#!/usr/bin/env bash
set -euo pipefail

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
python -m pip install -r requirements.txt

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env. Add GEMINI_API_KEY, then run this script again."
  exit 1
fi

python -m uvicorn legalEaseAPI.main:app --host 127.0.0.1 --port 8000

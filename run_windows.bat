@echo off
setlocal
cd /d "%~dp0"

if not exist venv (
  python -m venv venv
)

call venv\Scripts\activate
python -m pip install -r requirements.txt

if not exist .env (
  copy .env.example .env >nul
  echo Created .env. Add GEMINI_API_KEY, then run this file again.
  pause
  exit /b 0
)

python -m uvicorn legalEaseAPI.main:app --host 127.0.0.1 --port 8000

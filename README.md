# LegalEase — AI Legal Document Generator

LegalEase is a local full-stack application for AI-assisted legal document drafting. The project uses a normal HTML/CSS/JavaScript frontend served directly by FastAPI, a FastAPI JSON API, Google Gemini for generation, and Python exporters for TXT, DOCX, and PDF.

> LegalEase creates drafts for review. It is not a substitute for legal advice. Check the facts, jurisdiction, and final wording before signing or relying on a generated document.

## What was corrected

- Removed the old Streamlit frontend path from the runtime flow.
- The single FastAPI server now serves `frontend/index.html`, `frontend/style.css`, and `frontend/app.js`.
- The frontend calls `/api/generate`, which matches the FastAPI router prefix exactly.
- Health and export routes are exposed under predictable API paths.
- The document renderer converts plain text / lightweight Markdown into a formal legal-paper preview with headings, clauses, bullets, review notes, and signature blocks.
- DOCX and PDF exports remain available from the same backend.
- The AI integration uses the current Google GenAI Python SDK pattern and the Gemini Interactions API.
- The default stable text model is `gemini-3.6-flash`; it can be overridden with `GEMINI_MODEL`.
- Added automated API, static-asset, generation-mock, and export tests.

## Project structure

```text
LegalEase/
├── ai_core/
│   ├── __init__.py
│   └── gemini_generator.py
├── legalEaseAPI/
│   ├── __init__.py
│   ├── main.py
│   └── routes.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── services/
│   ├── __init__.py
│   └── document_formatter.py
├── utils/
│   ├── __init__.py
│   └── text_utils.py
├── Image/
│   └── Logo.png
├── tests/
│   ├── conftest.py
│   ├── test_api.py
│   └── test_formatters.py
├── .env.example
├── Dockerfile
├── README.md
├── requirements.txt
├── run.sh
└── run_windows.bat
```

## Windows setup

Open PowerShell in the `LegalEase` folder:

```powershell
python -m venv venv
.\venv\Scripts\activate
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `.env` and set:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
ALLOWED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000
```

Start the app:

```powershell
python -m uvicorn legalEaseAPI.main:app --reload
```

Open:

- http://127.0.0.1:8000/
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/health

## API routes

```text
GET  /
GET  /health
GET  /api/health
POST /api/generate
POST /api/export/txt
POST /api/export/docx
POST /api/export/pdf
```

## Testing

```powershell
pytest -q
```

The tests mock Gemini generation, so the API/static/export tests do not need a real Gemini API key.

## Gemini notes

Google's current Gemini documentation recommends the Interactions API as the default interface for new Gemini applications, and the project uses that API from the Python SDK. The default model is `gemini-3.6-flash`, a stable general-purpose model; change `GEMINI_MODEL` when you want to use another supported model. See the current Google AI documentation for model availability and SDK changes.

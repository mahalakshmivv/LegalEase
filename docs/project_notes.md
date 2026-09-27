# LegalEase Project Notes

## Final architecture

The project uses one FastAPI process for both frontend hosting and API requests.

```text
Browser
  |
  | GET /
  v
FastAPI
  |
  +--> frontend/index.html
  +--> /static/style.css
  +--> /static/app.js
  |
  | POST /api/generate
  v
GeminiDocumentGenerator
  |
  v
Gemini Interactions API
  |
  v
Structured document text
  |
  +--> A4-style HTML preview
  +--> TXT export
  +--> DOCX export
  +--> PDF export
```

## Final request flow

1. User chooses a template.
2. User supplies parties, key terms, effective date, jurisdiction, and optional instructions.
3. Browser sends JSON to `POST /api/generate`.
4. FastAPI validates the JSON with Pydantic.
5. Gemini creates the document using only supplied facts and placeholders for missing material facts.
6. Browser renders the response into formal legal-paper HTML.
7. User can edit the draft and export TXT, DOCX, or PDF.

## Deliberate fixes

- No Streamlit dependency or runtime path remains.
- No duplicate frontend script tag.
- No `/generate` vs `/api/generate` mismatch.
- No `style.css` / `script.js` root-path mismatch.
- Static files are served from `/static/*`.
- Exports use `/api/export/*`.
- The default Gemini model is configurable via `.env`.
- Error responses use useful HTTP status codes and readable messages.

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from legalEaseAPI.routes import router

load_dotenv()

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT / "frontend"
IMAGE_DIR = ROOT / "Image"

if not FRONTEND_DIR.is_dir():
    raise RuntimeError(f"Frontend directory not found: {FRONTEND_DIR}")
if not IMAGE_DIR.is_dir():
    raise RuntimeError(f"Image directory not found: {IMAGE_DIR}")

app = FastAPI(
    title="LegalEase AI Legal Document Generator",
    version="2.0.0",
    description="AI-assisted legal document drafting API powered by Gemini.",
)

allowed_origins = [
    value.strip()
    for value in os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:8000,http://localhost:8000").split(",")
    if value.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
app.mount("/images", StaticFiles(directory=str(IMAGE_DIR)), name="images")
app.include_router(router, prefix="/api")


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "LegalEase API"}


@app.get("/api", include_in_schema=False)
def api_home() -> dict[str, str]:
    return {
        "message": "Welcome to LegalEase AI Legal Document Generator API",
        "docs": "/docs",
        "health": "/health",
        "generate": "/api/generate",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("legalEaseAPI.main:app", host="127.0.0.1", port=8000, reload=True)

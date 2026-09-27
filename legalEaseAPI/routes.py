from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ai_core.gemini_generator import GeminiDocumentGenerator
from services.document_formatter import format_docx, format_pdf, format_txt

router = APIRouter(tags=["legal documents"])


class DocumentRequest(BaseModel):
    document_type: str = Field(min_length=2, max_length=120)
    parties: str = Field(min_length=2, max_length=4000)
    terms: str = Field(min_length=2, max_length=12000)
    dates: str = Field(min_length=2, max_length=500)
    jurisdiction: str = Field(default="", max_length=500)
    additional_instructions: str = Field(default="", max_length=5000)


class ExportRequest(BaseModel):
    text: str = Field(min_length=1, max_length=60000)
    document_type: str = Field(default="Legal Document", max_length=120)
    terms: str = Field(default="", max_length=12000)


@router.get("/health")
def api_health() -> dict[str, str]:
    return {"status": "ok", "service": "LegalEase API", "scope": "api"}


@router.post("/generate")
def generate_legal_document(request: DocumentRequest) -> dict[str, str]:
    try:
        generator = GeminiDocumentGenerator()
        document = generator.generate_document(
            request.document_type,
            request.parties,
            request.terms,
            request.dates,
            request.jurisdiction,
            request.additional_instructions,
        )
        return {
            "document": document,
            "document_type": request.document_type,
            "model": generator.model_name,
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {exc}") from exc


@router.post("/export/txt")
def export_txt(request: ExportRequest) -> StreamingResponse:
    filename = "LegalEase_Document.txt"
    return StreamingResponse(
        BytesIO(format_txt(request.text)),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/docx")
def export_docx(request: ExportRequest) -> StreamingResponse:
    try:
        root = Path(__file__).resolve().parents[1]
        logo = root / "Image" / "Logo.png"
        data = format_docx(
            request.text,
            request.document_type,
            request.terms,
            str(logo) if logo.exists() else None,
        )
        return StreamingResponse(
            BytesIO(data),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": 'attachment; filename="LegalEase_Document.docx"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DOCX export failed: {exc}") from exc


@router.post("/export/pdf")
def export_pdf(request: ExportRequest) -> StreamingResponse:
    try:
        data = format_pdf(request.text, request.document_type, request.terms)
        return StreamingResponse(
            BytesIO(data),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="LegalEase_Document.pdf"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF export failed: {exc}") from exc

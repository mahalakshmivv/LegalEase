from fastapi.testclient import TestClient

from legalEaseAPI.main import app
import legalEaseAPI.routes as routes


client = TestClient(app)


def test_home_and_static_assets():
    home = client.get("/")
    assert home.status_code == 200
    assert "LegalEase" in home.text

    css = client.get("/static/style.css")
    assert css.status_code == 200
    assert "document-paper" in css.text

    js = client.get("/static/app.js")
    assert js.status_code == 200
    assert "/api/generate" in js.text


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_generate_route_and_validation():
    invalid = client.post("/api/generate", json={})
    assert invalid.status_code == 422


def test_generate_with_mock(monkeypatch):
    class FakeGenerator:
        model_name = "test-model"

        def __init__(self):
            pass

        def generate_document(self, *args, **kwargs):
            return """EMPLOYMENT AGREEMENT

1. APPOINTMENT
The Employee is appointed to the role described in the request.

2. COMPENSATION
The compensation shall be [AMOUNT] per the agreed terms.

Review Note: This is an AI-assisted draft and should be reviewed before execution."""

    monkeypatch.setattr(routes, "GeminiDocumentGenerator", FakeGenerator)

    payload = {
        "document_type": "Employment Contract",
        "parties": "ABC Technologies Pvt Ltd (Employer) and John Doe (Employee)",
        "terms": "Annual salary INR 600000; 30-day notice period",
        "dates": "2026-09-27",
        "jurisdiction": "Tamil Nadu, India",
        "additional_instructions": "Use numbered clauses and signatures",
    }

    response = client.post("/api/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "test-model"
    assert "EMPLOYMENT AGREEMENT" in data["document"]


def test_exports():
    payload = {
        "text": "1. Services\nProvider will deliver the agreed services.",
        "document_type": "Test Agreement",
        "terms": "Payment within 7 days; Delivery by May 15",
    }

    txt = client.post("/api/export/txt", json=payload)
    assert txt.status_code == 200
    assert txt.content.startswith(b"1.")

    docx = client.post("/api/export/docx", json=payload)
    assert docx.status_code == 200
    assert docx.headers["content-type"].startswith("application/vnd.openxmlformats-officedocument")

    pdf = client.post("/api/export/pdf", json=payload)
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")

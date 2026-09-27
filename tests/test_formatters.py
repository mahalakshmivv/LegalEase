from services.document_formatter import format_docx, format_pdf, format_txt
from utils.text_utils import parse_terms, sanitize_text


def test_parse_terms():
    assert parse_terms("One; Two\nThree") == ["One", "Two", "Three"]


def test_sanitize_text():
    assert sanitize_text("Hello—world…") == "Hello-world..."


def test_exports():
    text = "1. Services\nProvider will deliver the agreed services."
    assert format_txt(text).startswith(b"1.")
    assert format_docx(text, "Test Agreement")
    assert format_pdf(text, "Test Agreement")

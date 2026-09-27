import html
import re
from typing import List


def sanitize_text(text: str) -> str:
    replacements = {
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "–": "-",
        "—": "-",
        "…": "...",
        "\u00a0": " ",
    }
    value = str(text or "")
    for source, target in replacements.items():
        value = value.replace(source, target)
    value = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", value)
    return value.strip()


def parse_terms(terms: str) -> List[str]:
    chunks = re.split(r"[;\n]+", terms or "")
    return [chunk.strip(" -\t") for chunk in chunks if chunk.strip(" -\t")]


def html_preview(text: str) -> str:
    safe = html.escape(sanitize_text(text)).replace("\n", "<br>")
    return f"<div class='legal-preview'><div class='legal-preview-inner'>{safe}</div></div>"

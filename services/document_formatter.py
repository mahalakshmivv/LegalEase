import re
from io import BytesIO
from typing import Optional

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt
from fpdf import FPDF
from fpdf.enums import XPos, YPos

from utils.text_utils import parse_terms, sanitize_text

BRAND_NAME = "LegalEase"
BRAND_TAGLINE = "AI-assisted legal document drafting"


def _set_run_font(run, size: int = 11, bold: bool = False, italic: bool = False):
    run.font.name = "Times New Roman"
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic


def _is_heading(line: str) -> bool:
    value = line.strip()
    return bool(
        re.match(r"^\d+(?:\.\d+)?[.)]?\s+", value)
        or re.match(r"^#{1,3}\s+", value)
        or value.lower() in {"signatures", "signature", "review note", "execution"}
    )


def _strip_markdown_heading(line: str) -> str:
    return re.sub(r"^#{1,3}\s+", "", line).strip()


def format_docx(text: str, doc_type: str, terms: str = "", logo_path: Optional[str] = None) -> bytes:
    document = Document()
    section = document.sections[0]
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.7)
    section.left_margin = Inches(0.82)
    section.right_margin = Inches(0.82)

    if logo_path:
        try:
            p = document.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.add_run().add_picture(logo_path, width=Inches(0.75))
        except Exception:
            pass

    title = document.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run(sanitize_text(doc_type).upper())
    _set_run_font(run, size=15, bold=True)
    title.paragraph_format.space_after = Pt(5)

    subtitle = document.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run(BRAND_TAGLINE)
    _set_run_font(run, size=9, italic=True)
    subtitle.paragraph_format.space_after = Pt(11)

    for raw in sanitize_text(text).splitlines():
        line = raw.strip()
        if not line:
            document.add_paragraph().paragraph_format.space_after = Pt(2)
            continue

        clean = _strip_markdown_heading(line)
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(5)
        paragraph.paragraph_format.line_spacing = 1.12

        if _is_heading(line) and len(clean) < 140:
            run = paragraph.add_run(clean)
            _set_run_font(run, size=11, bold=True)
        elif re.match(r"^[-*•]\s+", line):
            run = paragraph.add_run("• " + re.sub(r"^[-*•]\s+", "", line))
            _set_run_font(run, size=11)
            paragraph.paragraph_format.left_indent = Inches(0.25)
        else:
            run = paragraph.add_run(clean)
            _set_run_font(run, size=11)

    parsed_terms = parse_terms(terms)
    if parsed_terms:
        heading = document.add_paragraph()
        run = heading.add_run("Key Terms Summary")
        _set_run_font(run, size=11, bold=True)
        heading.paragraph_format.space_before = Pt(8)

        table = document.add_table(rows=1, cols=2)
        table.style = "Table Grid"
        table.rows[0].cells[0].text = "#"
        table.rows[0].cells[1].text = "Term"
        for cell in table.rows[0].cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    _set_run_font(r, size=10, bold=True)

        for number, term in enumerate(parsed_terms, start=1):
            cells = table.add_row().cells
            cells[0].text = str(number)
            cells[1].text = term
            for cell in cells:
                for p in cell.paragraphs:
                    for r in p.runs:
                        _set_run_font(r, size=9)

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run(f"{BRAND_NAME} | AI-assisted drafting | Review before signing")
    _set_run_font(run, size=8, italic=True)

    output = BytesIO()
    document.save(output)
    return output.getvalue()


class LegalEasePDF(FPDF):
    def header(self):
        self.set_font("Times", "B", 9)
        self.cell(0, 5, BRAND_NAME, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        self.set_draw_color(140, 140, 140)
        self.line(16, 15, 194, 15)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Times", "I", 8)
        self.cell(0, 8, f"{BRAND_NAME} | Page {self.page_no()} | Review before signing", align="C")


def _pdf_heading(line: str) -> bool:
    return bool(
        re.match(r"^\d+(?:\.\d+)?[.)]?\s+", line)
        or re.match(r"^#{1,3}\s+", line)
        or line.lower() in {"signature", "signatures", "review note", "execution"}
    )


def format_pdf(text: str, doc_type: str, terms: str = "") -> bytes:
    pdf = LegalEasePDF(format="A4")
    pdf.set_margins(20, 22, 20)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.set_font("Times", "B", 16)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 8, sanitize_text(doc_type).upper(), align="C")
    pdf.set_font("Times", "I", 9)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 5, BRAND_TAGLINE, align="C")
    pdf.ln(6)

    for raw in sanitize_text(text).splitlines():
        line = raw.strip()
        if not line:
            pdf.ln(3)
            continue

        clean = _strip_markdown_heading(line)
        if _pdf_heading(line) and len(clean) < 140:
            pdf.set_font("Times", "B", 11)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(pdf.epw, 6, clean)
            pdf.set_font("Times", "", 11)
        elif re.match(r"^[-*•]\s+", line):
            pdf.set_font("Times", "", 11)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(pdf.epw, 5.5, "- " + re.sub(r"^[-*•]\s+", "", line))
        else:
            pdf.set_font("Times", "", 11)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(pdf.epw, 5.5, clean)
        pdf.ln(1)

    parsed_terms = parse_terms(terms)
    if parsed_terms:
        pdf.ln(3)
        pdf.set_font("Times", "B", 11)
        pdf.cell(0, 6, "Key Terms Summary", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Times", "", 10)
        for number, term in enumerate(parsed_terms, start=1):
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(pdf.epw, 5, f"{number}. {term}")

    return bytes(pdf.output())


def format_txt(text: str) -> bytes:
    return sanitize_text(text).encode("utf-8")

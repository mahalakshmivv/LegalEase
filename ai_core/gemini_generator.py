import importlib.metadata
import os
from typing import Optional

from dotenv import load_dotenv

try:
    from google import genai
except ImportError:  # pragma: no cover
    genai = None


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()


# =========================================================
# CONFIGURATION
# =========================================================

DEFAULT_MODEL = "gemini-3.8-flash"
MIN_GENAI_VERSION = "2.3.0"


SYSTEM_INSTRUCTIONS = """
You are LegalEase, a professional legal-document drafting engine.

Your job is to draft a formal legal document using ONLY the facts
provided by the user.

DOCUMENT ACCURACY RULES

1. Never invent personal facts.
2. Never invent addresses.
3. Never invent dates.
4. Never invent salaries, fees, percentages, penalties, notice periods,
   deadlines, deposits, payment terms, or other commercial terms.
5. Never invent laws, statutes, regulations, courts, authorities,
   legal citations, or jurisdiction-specific requirements.
6. Preserve every user-supplied material fact accurately.
7. The user's supplied effective date is authoritative.
8. Never replace the user's effective date with today's date.
9. Never generate a different effective date.
10. If a material fact is missing, use a clear bracketed placeholder such as:
    [ADDRESS]
    [AMOUNT]
    [NOTICE PERIOD]
    [TERM]
    [JURISDICTION]
11. Do not silently modify, reinterpret, or overwrite supplied facts.

DOCUMENT STYLE

1. Use formal professional legal English.
2. Write as a contract or formal legal document, not as an explanation.
3. Start with one clear document title.
4. Do not repeat the document title inside the document body.
5. Use numbered sections.
6. Use numbered subsections where useful.
7. Use lettered clauses where useful.
8. Use bullet points only where they improve clarity.
9. Keep ordinary legal clauses in normal prose.
10. Use emphasis only for section headings, subsection headings,
    defined terms, and short labels when appropriate.
11. Do not add conversational commentary.
12. Do not say "Here is your document".
13. Do not provide an introduction outside the document.
14. Do not provide a conclusion outside the document.
15. Do not use ASCII divider lines such as:
    ==============================
    ------------------------------
16. Do not use decorative emojis.
17. Do not use marketing language.
18. Do not use "AI Generated Draft" as a heading or label.

DOCUMENT STRUCTURE

Where relevant to the selected document type, consider:

- Title
- Parties
- Purpose / background
- Definitions
- Appointment / engagement
- Duties and responsibilities
- Compensation / consideration
- Payment terms
- Working arrangements
- Term
- Renewal
- Leave
- Confidentiality
- Intellectual property
- Representations and obligations
- Termination
- Notice
- Indemnity
- Limitation of liability
- Dispute resolution
- Governing law
- Notices
- Entire agreement
- Severability
- Amendments
- Waiver
- Assignment
- General provisions

Only include provisions that are relevant and supported by the
user's facts or are standard structural provisions that do not
require invented factual details.

SIGNATURES

Do NOT generate a signature block.

LegalEase will create the standardized two-party signature block
separately in the document renderer.

Therefore, never output:
- employer signature lines
- employee signature lines
- signature labels
- repeated signature sections
- "Signed by"
- "For and on behalf of"

REVIEW NOTE

At the end, provide a concise review note stating that the
document is an AI-assisted draft and should be reviewed for
the applicable facts, jurisdiction, and legal requirements
before execution.

OUTPUT

Return ONLY the document text.

Do not wrap it in Markdown code fences.
Do not add conversational commentary.
""".strip()


# =========================================================
# VERSION HELPERS
# =========================================================

def get_installed_genai_version() -> Optional[str]:
    try:
        return importlib.metadata.version("google-genai")
    except importlib.metadata.PackageNotFoundError:
        return None


def version_tuple(version: str) -> tuple[int, ...]:
    parts: list[int] = []

    for part in str(version).split("."):
        digits = ""

        for character in part:
            if character.isdigit():
                digits += character
            else:
                break

        parts.append(
            int(digits) if digits else 0
        )

    return tuple(parts)


# =========================================================
# GEMINI GENERATOR
# =========================================================

class GeminiDocumentGenerator:

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = (
            api_key
            or os.getenv("GEMINI_API_KEY")
        )

        self.model_name = (
            model
            or os.getenv(
                "GEMINI_MODEL",
                DEFAULT_MODEL,
            )
        ).strip()


        # -------------------------------------------------
        # API KEY VALIDATION
        # -------------------------------------------------

        if (
            not self.api_key
            or self.api_key.strip()
            in {
                "",
                "your_google_gemini_api_key_here",
                "YOUR_API_KEY",
            }
        ):
            raise RuntimeError(
                "GEMINI_API_KEY is not configured. "
                "Add your Gemini API key to .env."
            )


        # -------------------------------------------------
        # SDK VALIDATION
        # -------------------------------------------------

        if genai is None:
            raise RuntimeError(
                "google-genai is not installed. "
                "Run: python -m pip install -U "
                '"google-genai>=2.3.0,<3.0.0"'
            )


        installed_version = (
            get_installed_genai_version()
        )


        if not installed_version:

            raise RuntimeError(
                "google-genai is not installed. "
                "Run: python -m pip install -U "
                '"google-genai>=2.3.0,<3.0.0"'
            )


        if (
            version_tuple(installed_version)
            < version_tuple(MIN_GENAI_VERSION)
        ):
            raise RuntimeError(
                "The installed google-genai SDK is too old "
                "for the current Interactions API. "
                f"Installed: {installed_version}. "
                f"Required: >= {MIN_GENAI_VERSION}. "
                'Run: python -m pip install -U '
                '"google-genai>=2.3.0,<3.0.0"'
            )


        # -------------------------------------------------
        # CLIENT
        # -------------------------------------------------

        try:

            self.client = genai.Client(
                api_key=self.api_key
            )

        except Exception as exc:

            raise RuntimeError(
                "Failed to initialize Gemini client: "
                f"{exc}"
            ) from exc


    # =====================================================
    # GENERATE LEGAL DOCUMENT
    # =====================================================

    def generate_document(
        self,
        document_type: str,
        parties: str,
        terms: str,
        dates: str,
        jurisdiction: str = "",
        additional_instructions: str = "",
    ) -> str:

        # -------------------------------------------------
        # CLEAN INPUT
        # -------------------------------------------------

        document_type = (
            document_type or ""
        ).strip()

        parties = (
            parties or ""
        ).strip()

        terms = (
            terms or ""
        ).strip()

        dates = (
            dates or ""
        ).strip()

        jurisdiction = (
            jurisdiction or ""
        ).strip()

        additional_instructions = (
            additional_instructions or ""
        ).strip()


        # -------------------------------------------------
        # SAFE PLACEHOLDERS
        # -------------------------------------------------

        safe_document_type = (
            document_type
            or "[DOCUMENT TYPE]"
        )

        safe_parties = (
            parties
            or "[PARTIES]"
        )

        safe_terms = (
            terms
            or "[KEY TERMS]"
        )

        safe_dates = (
            dates
            or "[EFFECTIVE DATE]"
        )

        safe_jurisdiction = (
            jurisdiction
            or "[JURISDICTION]"
        )

        safe_additional = (
            additional_instructions
            or "[NONE]"
        )


        # -------------------------------------------------
        # USER PROMPT
        # -------------------------------------------------

        prompt = f"""
LEGAL DOCUMENT REQUEST

Document Type:
{safe_document_type}

Parties Involved:
{safe_parties}

Effective Date / Dates:
{safe_dates}

Governing Law / Jurisdiction:
{safe_jurisdiction}

Key Terms and Conditions:
{safe_terms}

Additional Instructions:
{safe_additional}


IMPORTANT FACT PRESERVATION REQUIREMENTS

- Treat the supplied Effective Date / Dates as authoritative.
- Preserve the supplied date exactly.
- Never replace the supplied effective date with today's date.
- Never generate a different date.
- Do not add dates that were not supplied.
- Do not invent addresses.
- Do not invent amounts.
- Do not invent notice periods.
- Do not invent legal authorities.
- If required information is missing, use a bracketed placeholder.


DOCUMENT DRAFTING REQUIREMENTS

- Begin with one clear formal title.
- Identify the parties.
- Explain the purpose where appropriate.
- Use numbered sections.
- Use numbered subsections where appropriate.
- Use lettered clauses where appropriate.
- Use normal prose for ordinary contractual clauses.
- Use concise and professional legal language.
- Include only provisions relevant to the selected document type.
- Do not repeat the title.
- Do not generate a signature block.
- Do not generate signature lines.
- Do not use ASCII divider lines.
- End with a short Review Note.
- Return only the document text.
""".strip()


        # -------------------------------------------------
        # GEMINI INTERACTIONS API
        # -------------------------------------------------

        try:

            interaction = (
                self.client.interactions.create(
                    model=self.model_name,
                    system_instruction=SYSTEM_INSTRUCTIONS,
                    input=prompt,
                )
            )

        except Exception as exc:

            message = str(exc).strip()

            if not message:
                message = repr(exc)

            raise RuntimeError(
                f"Gemini request failed: {message}"
            ) from exc


        # -------------------------------------------------
        # OUTPUT TEXT
        # -------------------------------------------------

        text = getattr(
            interaction,
            "output_text",
            None,
        )


        if not text:

            raise RuntimeError(
                "Gemini returned an empty document response."
            )


        text = str(text).strip()


        # -------------------------------------------------
        # REMOVE CODE FENCES IF MODEL ADDS THEM
        # -------------------------------------------------

        if text.startswith("```"):

            lines = text.splitlines()


            if (
                lines
                and lines[0]
                .strip()
                .startswith("```")
            ):
                lines = lines[1:]


            if (
                lines
                and lines[-1]
                .strip() == "```"
            ):
                lines = lines[:-1]


            text = "\n".join(lines).strip()


        # -------------------------------------------------
        # REMOVE UNWANTED APPLICATION LABELS
        # -------------------------------------------------

        unwanted_labels = {
            "AI GENERATED DRAFT",
            "AI-GENERATED DRAFT",
            "GENERATED DRAFT",
            "DRAFT DOCUMENT",
        }


        output_lines = []


        for line in text.splitlines():

            normalized =line.strip().upper()

            if normalized in unwanted_labels:
                continue

            output_lines.append(line)


        text = "\n".join(
            output_lines
        ).strip()


        # -------------------------------------------------
        # FINAL VALIDATION
        # -------------------------------------------------

        if not text:

            raise RuntimeError(
                "Gemini returned an empty document after cleanup."
            )


        return text


# =========================================================
# OPTIONAL MANUAL TEST
# =========================================================

if __name__ == "__main__":

    generator = (
        GeminiDocumentGenerator()
    )


    result = generator.generate_document(

        document_type="Employment Contract",

        parties=(
            "ABC Technologies Private Limited — Employer\n"
            "Rahul Kumar — Employee / Software Engineer"
        ),

        terms=(
            "Annual salary: INR 600000.\n"
            "Working hours: Monday to Friday, 9:30 AM to 6:30 PM.\n"
            "Work location: Chennai, Tamil Nadu.\n"
            "Notice period: 30 days.\n"
            "Employee must maintain confidentiality."
        ),

        dates="2026-10-01",

        jurisdiction="Tamil Nadu, India",

        additional_instructions=(
            "Create a formal employment contract with "
            "numbered sections and subsections. "
            "Do not generate a signature block."
        ),
    )


    print()
    print("=" * 70)
    print("LEGASEASE GEMINI TEST")
    print("=" * 70)
    print()
    print(result)
    print()
    print("=" * 70)
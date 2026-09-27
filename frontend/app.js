"use strict";

/* =========================================================
   LegalEase Frontend
   ---------------------------------------------------------
   - Generates documents through FastAPI
   - Renders a formal legal document
   - Removes duplicate/application labels from the paper
   - Preserves user-supplied facts in preview metadata
   - Preserves the exact effective date entered by the user
   - Uses one standardized signature block
   - Supports editing and TXT/DOCX/PDF/print export
   ========================================================= */


const state = {
  document: "",
  originalDocument: "",
  model: "",
  documentType: "Employment Contract",
  lastRequest: null,
  isGenerating: false,
};


const API = {
  generate: "/api/generate",
  exportTxt: "/api/export/txt",
  exportDocx: "/api/export/docx",
  exportPdf: "/api/export/pdf",
};


const $ = (id) => document.getElementById(id);


/* =========================================================
   TEMPLATE INSTRUCTIONS
   ========================================================= */

const templateInstructions = {

  "Employment Contract":
    "Create a formal employment contract covering appointment, duties, compensation, working hours, leave, confidentiality, intellectual property where relevant, termination, notice, governing law, dispute resolution and signatures.",

  "Non-Disclosure Agreement (NDA)":
    "Create a formal NDA covering confidential information, permitted use, exclusions, disclosure exceptions, security obligations, duration, return or destruction, remedies, governing law and signatures.",

  "Lease Agreement":
    "Create a formal lease agreement covering premises, term, rent, deposit, permitted use, maintenance, utilities, default, termination, notices, governing law and signatures.",

  "Freelance Agreement":
    "Create a formal freelance services agreement covering scope, deliverables, fees, payment, revisions, intellectual property, confidentiality, independent contractor status, termination, governing law and signatures.",

  "Employment Offer Letter":
    "Create a formal employment offer letter covering role, reporting, start date, compensation, working arrangements, conditions, confidentiality, acceptance and signatures.",

  "Custom Agreement":
    "Create a formal agreement tailored to the supplied facts and instructions, using placeholders for missing material facts.",

};


/* =========================================================
   EXAMPLE DATA
   ========================================================= */

const exampleValues = {

  "Employment Contract": {

    parties:
      "ABC Technologies Private Limited — Employer\n" +
      "Rahul Kumar — Employee / Software Engineer",

    terms:
      "Annual salary: INR 600000.\n" +
      "Working hours: Monday to Friday, 9:30 AM to 6:30 PM.\n" +
      "Work location: Chennai, Tamil Nadu.\n" +
      "The employee must maintain confidentiality of company information, source code, customer information, business information and trade secrets.\n" +
      "The employee must comply with reasonable company policies and workplace instructions.\n" +
      "Leave is subject to applicable company policy and law.\n" +
      "Notice period for termination: 30 days.",

    dates: "2026-10-01",

    jurisdiction: "Tamil Nadu, India",

    additional:
      "Use formal numbered sections and concise subsections. " +
      "Include duties, compensation, working hours, leave, confidentiality, " +
      "intellectual property, termination, notice, governing law and dispute resolution. " +
      "Do not generate a signature block; LegalEase will render the standardized " +
      "signature block. End with a short Review Note. " +
      "Do not use ASCII divider lines.",

  },


  "Non-Disclosure Agreement (NDA)": {

    parties:
      "ABC Technologies Private Limited — Disclosing Party\n" +
      "Rahul Kumar — Receiving Party",

    terms:
      "Confidential information includes technical, commercial and business information disclosed for the permitted purpose. " +
      "The receiving party must protect confidential information and use it only for the permitted purpose. " +
      "Disclosure is permitted only where required by law or with written authorization.",

    dates: "2026-10-01",

    jurisdiction: "Tamil Nadu, India",

    additional:
      "Include definitions, exclusions, permitted disclosure, security obligations, duration, remedies, " +
      "return or destruction, governing law and dispute resolution. " +
      "Do not generate a signature block; LegalEase will render the standardized signature block.",

  },


  "Lease Agreement": {

    parties:
      "Jane Smith — Landlord\n" +
      "Rahul Kumar — Tenant",

    terms:
      "Residential premises. Monthly rent: INR 25000. " +
      "Refundable deposit: INR 100000. Lease term: 12 months. " +
      "Tenant is responsible for ordinary utility charges. " +
      "No subletting without consent.",

    dates: "2026-10-01",

    jurisdiction: "Tamil Nadu, India",

    additional:
      "Include premises, term, rent, deposit, maintenance, default, " +
      "termination, notice, governing law and dispute resolution. " +
      "Do not generate a signature block; LegalEase will render the standardized signature block.",

  },


  "Freelance Agreement": {

    parties:
      "Jane Doe — Service Provider\n" +
      "TechNova Inc. — Client",

    terms:
      "Payment within 7 days of invoice. " +
      "Final delivery by May 15, 2026. " +
      "Client owns final accepted work product. " +
      "Provider remains an independent contractor. " +
      "Termination notice: 30 days.",

    dates: "2026-10-01",

    jurisdiction: "Tamil Nadu, India",

    additional:
      "Include services, deliverables, fees, payment, revisions, intellectual property, " +
      "confidentiality, independent contractor status, termination and dispute resolution. " +
      "Do not generate a signature block; LegalEase will render the standardized signature block.",

  },


  "Employment Offer Letter": {

    parties:
      "ABC Technologies Private Limited — Employer\n" +
      "Rahul Kumar — Candidate",

    terms:
      "Position: Software Engineer. " +
      "Annual compensation: INR 600000. " +
      "Joining date: mutually agreed. " +
      "Full-time role. Standard company policies apply.",

    dates: "2026-10-01",

    jurisdiction: "Tamil Nadu, India",

    additional:
      "Keep the output in formal offer-letter style and include an acceptance section. " +
      "Do not generate a signature block; LegalEase will render the standardized signature block.",

  },


  "Custom Agreement": {

    parties:
      "Party A — First Party\n" +
      "Party B — Second Party",

    terms:
      "Describe the commercial arrangement, obligations, payments, timelines and termination terms here.",

    dates: "2026-10-01",

    jurisdiction: "Tamil Nadu, India",

    additional:
      "Use formal legal language, numbered clauses and placeholders for missing material facts. " +
      "Do not generate a signature block; LegalEase will render the standardized signature block.",

  },

};


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/[&<>'"]/g, (character) => {

      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      };

      return map[character];
    });
}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(text) {

  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/* =========================================================
   NORMALIZE COMPARISON TEXT
   ========================================================= */

function normalizeComparable(value) {

  return String(value ?? "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================================================
   INLINE FORMATTING
   ========================================================= */

function formatInline(text) {

  let safe = escapeHtml(text);

  /* Inline code */
  safe = safe.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  /* Bold */
  safe = safe.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );

  /* Italic */
  safe = safe.replace(
    /(^|[^*])\*([^*]+)\*(?!\*)/g,
    "$1<em>$2</em>"
  );

  return safe;
}


/* =========================================================
   ASCII DIVIDER
   ========================================================= */

function isAsciiDivider(line) {

  return /^[\s=_-]{5,}$/.test(
    line.trim()
  );
}


/* =========================================================
   SECTION PARSER
   ========================================================= */

function parseSection(line) {

  const value = line.trim();

  /*
    1.1 Definitions
    2.3 Compensation
  */

  let match = value.match(
    /^(\d+\.\d+)[.)]?\s+(.+)$/
  );

  if (match) {

    return {
      level: 3,
      number: match[1],
      title: match[2].trim(),
    };
  }


  /*
    1. Definitions
    2. Compensation
  */

  match = value.match(
    /^(\d+)[.)]\s+(.+)$/
  );

  if (match) {

    return {
      level: 2,
      number: match[1],
      title: match[2].trim(),
    };
  }


  /*
    Markdown heading
  */

  match = value.match(
    /^#{1,3}\s+(.+)$/
  );

  if (match) {

    return {
      level: 2,
      number: "",
      title: match[1].trim(),
    };
  }


  return null;
}


/* =========================================================
   LETTERED CLAUSE
   ========================================================= */

function parseClause(line) {

  const match = line
    .trim()
    .match(
      /^(?:\(([a-zA-Z])\)|([a-zA-Z])[.)])\s+(.+)$/
    );

  if (!match) {
    return null;
  }

  return {
    marker: match[1]
      ? `(${match[1]})`
      : match[2],

    text: match[3].trim(),
  };
}


/* =========================================================
   BULLET
   ========================================================= */

function parseBullet(line) {

  const match = line
    .trim()
    .match(
      /^([-*•]|\d+[.)])\s+(.+)$/
    );

  if (!match) {
    return null;
  }

  return {
    marker: match[1],
    text: match[2].trim(),
  };
}


/* =========================================================
   REVIEW NOTE
   ========================================================= */

function isReviewLine(line) {

  const value = line.trim();

  return (
    /^(review note|review|disclaimer|important)\s*:?/i.test(
      value
    ) ||
    /not legal advice/i.test(value)
  );
}


/* =========================================================
   SIGNATURE HEADING
   ========================================================= */

function isSignatureHeading(line) {

  return /^(signature|signatures|execution|executed by|acceptance)\s*:??$/i.test(
    line.trim()
  );
}


/* =========================================================
   DUPLICATE TITLE DETECTION
   ========================================================= */

function looksLikeGeneratedTitle(
  line,
  documentType
) {

  const value = line
    .trim()
    .replace(/^#{1,3}\s+/, "")
    .replace(/[.:]+$/, "");

  if (!value) {
    return false;
  }

  const normalized =
    normalizeComparable(value);

  const normalizedType =
    normalizeComparable(documentType);

  return (
    normalized === normalizedType ||
    normalized === "legal document" ||
    (
      normalizedType &&
      normalized.includes(normalizedType) &&
      normalized.length > 10
    ) ||
    (
      normalizedType &&
      normalizedType.includes(normalized) &&
      normalized.length > 10
    )
  );
}


/* =========================================================
   REMOVE LEADING DUPLICATE TITLE
   ========================================================= */

function stripLeadingDuplicateTitle(
  lines,
  documentType
) {

  const copy = [...lines];

  let index = 0;

  while (
    index < Math.min(copy.length, 5)
  ) {

    const value =
      copy[index].trim();

    if (!value) {

      index += 1;
      continue;
    }

    if (isAsciiDivider(value)) {

      copy.splice(index, 1);
      continue;
    }

    if (
      looksLikeGeneratedTitle(
        value,
        documentType
      )
    ) {

      copy.splice(index, 1);
    }

    break;
  }

  return copy;
}


/* =========================================================
   DATE FORMATTING
   IMPORTANT:
   Never use today's date automatically.
   ========================================================= */

function formatDatePreservingInput(value) {

  if (!value) {
    return "";
  }

  const match =
    String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return String(value);
  }

  const [, year, month, day] =
    match;

  const utcDate =
    new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day)
      )
    );

  if (
    Number.isNaN(
      utcDate.getTime()
    )
  ) {
    return String(value);
  }

  return utcDate.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }
  );
}


/* =========================================================
   PARTY PARSER
   ========================================================= */

function parsePartyLine(line) {

  let value = line
    .trim()
    .replace(/^[-*•]\s+/, "")
    .trim();

  if (!value) {
    return null;
  }

  let role = "";
  let name = value;


  /*
    Example:
    Rahul Kumar (Employee)
  */

  const parenthetical =
    value.match(
      /^(.+?)\s*\(([^)]+)\)\s*$/
    );

  if (parenthetical) {

    name =
      parenthetical[1].trim();

    role =
      parenthetical[2].trim();

  } else {

    /*
      Example:
      Rahul Kumar — Employee
    */

    const dash =
      value.match(
        /^(.+?)\s+[—-]\s+(.+)$/
      );

    if (dash) {

      name =
        dash[1].trim();

      role =
        dash[2].trim();
    }
  }

  return {
    name,
    role,
  };
}


/* =========================================================
   PARTY COLLECTION
   ========================================================= */

function parseParties(raw) {

  const value =
    String(raw || "").trim();

  if (!value) {

    return {
      first: null,
      second: null,
      extra: [],
    };
  }

  let lines =
    value
      .split(/\n+/)
      .map(
        (line) => line.trim()
      )
      .filter(Boolean);


  if (lines.length < 2) {

    lines =
      value
        .split(
          /\s+(?:and|&)\s+/i
        )
        .map(
          (line) => line.trim()
        )
        .filter(Boolean);
  }


  const parties =
    lines
      .map(parsePartyLine)
      .filter(Boolean);


  return {

    first:
      parties[0] || null,

    second:
      parties[1] || null,

    extra:
      parties.slice(2),

  };
}


/* =========================================================
   ROLE FROM TERMS
   ========================================================= */

function inferRoleFromTerms(terms) {

  const patterns = [

    /(?:role|position|job title)\s*(?:is|as|:|-)+\s*([^.;\n]+)/i,

  ];


  for (const pattern of patterns) {

    const match =
      String(terms || "")
        .match(pattern);

    if (match?.[1]) {

      return match[1].trim();
    }
  }


  return "";
}


/* =========================================================
   METADATA FROM FORM
   ========================================================= */

function metadataFromForm() {

  const raw =
    collectForm();

  const parties =
    parseParties(raw.parties);

  let position =
    inferRoleFromTerms(
      raw.terms
    );


  if (
    !position &&
    parties.second?.role
  ) {

    const pieces =
      parties.second.role
        .split(/\s*\/\s*/)
        .map(
          (part) => part.trim()
        )
        .filter(Boolean);

    if (pieces.length > 1) {

      position =
        pieces
          .slice(1)
          .join(" / ")
          .trim();
    }
  }


  return {

    documentType:
      raw.document_type,

    jurisdiction:
      raw.jurisdiction,

    effectiveDate:
      raw.dates,

    effectiveDateFormatted:
      formatDatePreservingInput(
        raw.dates
      ),

    firstParty:
      parties.first?.name || "",

    firstRole:
      parties.first?.role ||
      "First Party",

    secondParty:
      parties.second?.name || "",

    secondRole:
      parties.second?.role ||
      "Second Party",

    position,

    extraParties:
      parties.extra,

  };
}


/* =========================================================
   META HTML
   ========================================================= */

function createMeta(metadata) {

  const rows = [];


  const add =
    (
      label,
      value,
      modifier = ""
    ) => {

      if (!value) {
        return;
      }

      rows.push(`

        <div
          class="legal-meta-row ${modifier}"
        >

          <div class="legal-meta-label">
            ${escapeHtml(label)}
          </div>

          <div class="legal-meta-value">
            ${escapeHtml(value)}
          </div>

        </div>

      `);
    };


  add(
    "Employer / First Party",
    metadata.firstParty,
    "party-a"
  );


  add(
    "Employee / Second Party",
    metadata.secondParty,
    "party-b"
  );


  add(
    "Position",
    metadata.position
  );


  add(
    "Effective Date",
    metadata.effectiveDateFormatted
  );


  add(
    "Governing Law / Jurisdiction",
    metadata.jurisdiction
  );


  if (!rows.length) {
    return "";
  }


  return `

    <section
      class="legal-meta"
      aria-label="Agreement details"
    >

      ${rows.join("")}

    </section>

  `;
}


/* =========================================================
   DOCUMENT HEADER
   ========================================================= */

function createHeader(metadata) {

  const title =
    metadata.documentType ||
    "LEGAL DOCUMENT";


  return `

    <header
      class="legal-document-header"
    >

      <h1
        class="legal-document-title"
      >
        ${escapeHtml(title)}
      </h1>

      <div
        class="legal-header-rule"
      ></div>

    </header>

    ${createMeta(metadata)}

  `;
}


/* =========================================================
   ONE STANDARDIZED SIGNATURE BLOCK
   ========================================================= */

function createSignatureBlock(
  metadata
) {

  const firstParty =
    metadata.firstParty ||
    "First Party";

  const secondParty =
    metadata.secondParty ||
    "Second Party";

  const firstRole =
    metadata.firstRole ||
    "Authorized Representative";

  const secondRole =
    metadata.secondRole ||
    "Second Party";


  return `

    <section
      class="signature-section"
    >

      <div
        class="signature-title"
      >
        SIGNATURES
      </div>


      <div
        class="signature-grid"
      >


        <!-- FIRST PARTY -->

        <div
          class="signature-party"
        >

          <div
            class="signature-party-label"
          >
            Employer / First Party
          </div>

          <div
            class="signature-line"
          ></div>

          <div
            class="signature-name"
          >
            ${escapeHtml(firstParty)}
          </div>

          <div
            class="signature-role"
          >
            ${escapeHtml(firstRole)}
          </div>

          <div
            class="signature-date"
          >
            Date:
            __________________________
          </div>

        </div>


        <!-- SECOND PARTY -->

        <div
          class="signature-party"
        >

          <div
            class="signature-party-label"
          >
            Employee / Second Party
          </div>

          <div
            class="signature-line"
          ></div>

          <div
            class="signature-name"
          >
            ${escapeHtml(secondParty)}
          </div>

          <div
            class="signature-role"
          >
            ${escapeHtml(secondRole)}
          </div>

          <div
            class="signature-date"
          >
            Date:
            __________________________
          </div>

        </div>


      </div>

    </section>

  `;
}


/* =========================================================
   DOCUMENT RENDERER
   ========================================================= */

function renderLegalDocument(
  rawText,
  metadata = {}
) {

  const text =
    normalizeText(rawText);


  if (!text) {

    return `

      ${createHeader(metadata)}

      <div
        class="document-empty-state"
      >
        Your generated legal document
        will appear here.
      </div>

    `;
  }


  let lines =
    stripLeadingDuplicateTitle(
      text.split("\n"),
      metadata.documentType
    );


  const body = [];

  let paragraph = [];

  let skippedSignatureBlock =
    false;

  let i = 0;


  const flushParagraph =
    () => {

      const value =
        paragraph
          .join(" ")
          .trim();


      if (value) {

        body.push(
          `<p>${formatInline(value)}</p>`
        );
      }


      paragraph = [];
    };


  while (
    i < lines.length
  ) {

    const line =
      lines[i].trim();


    /* Blank line */

    if (!line) {

      flushParagraph();

      i += 1;

      continue;
    }


    /* ASCII divider */

    if (
      isAsciiDivider(line)
    ) {

      flushParagraph();

      i += 1;

      continue;
    }


    /*
      Ignore AI-generated signature content.
      LegalEase creates one standardized signature block later.
    */

    if (
      isSignatureHeading(line)
    ) {

      flushParagraph();

      skippedSignatureBlock =
        true;


      let j =
        i + 1;


      while (
        j < lines.length
      ) {

        const next =
          lines[j].trim();


        if (
          !next ||
          isReviewLine(next) ||
          parseSection(next)
        ) {

          break;
        }


        j += 1;
      }


      i = j;

      continue;
    }


    /* Review note */

    if (
      isReviewLine(line)
    ) {

      flushParagraph();


      const cleanedTitle =
        line.replace(
          /^(review note|review|disclaimer|important)\s*:?\s*/i,
          ""
        );


      const noteLines =
        cleanedTitle
          ? [cleanedTitle]
          : [];


      let j =
        i + 1;


      while (
        j < lines.length
      ) {

        const next =
          lines[j].trim();


        if (
          !next ||
          parseSection(next) ||
          isSignatureHeading(next)
        ) {

          break;
        }


        noteLines.push(next);

        j += 1;
      }


      body.push(`

        <aside
          class="legal-review-note"
        >

          <div
            class="review-note-heading"
          >
            Review Note
          </div>

          <div>
            ${formatInline(
              noteLines.join(" ")
            )}
          </div>

        </aside>

      `);


      i = j;

      continue;
    }


    /* Section */

    const section =
      parseSection(line);


    if (section) {

      flushParagraph();


      const number =
        section.number
          ? `
              <span
                class="legal-section-number"
              >
                ${escapeHtml(
                  section.number
                )}.
              </span>
            `
          : "";


      body.push(

        section.level === 3

          ? `
              <h3
                class="legal-subsection"
              >
                ${number}
                ${formatInline(
                  section.title
                )}
              </h3>
            `

          : `
              <h2
                class="legal-section"
              >
                ${number}
                ${formatInline(
                  section.title
                )}
              </h2>
            `
      );


      i += 1;

      continue;
    }


    /* Lettered clause */

    const clause =
      parseClause(line);


    if (clause) {

      flushParagraph();


      body.push(`

        <div
          class="legal-clause"
        >

          <span
            class="legal-clause-marker"
          >
            ${escapeHtml(
              clause.marker
            )}
          </span>

          <span>
            ${formatInline(
              clause.text
            )}
          </span>

        </div>

      `);


      i += 1;

      continue;
    }


    /* Bullet */

    const bullet =
      parseBullet(line);


    if (bullet) {

      flushParagraph();


      body.push(`

        <div
          class="document-list"
        >

          <span
            class="document-bullet"
          >
            ${escapeHtml(
              bullet.marker
            )}
          </span>

          <span>
            ${formatInline(
              bullet.text
            )}
          </span>

        </div>

      `);


      i += 1;

      continue;
    }


    /* Normal paragraph */

    paragraph.push(line);

    i += 1;
  }


  flushParagraph();


  /*
    Always use one standardized signature block
    when party information exists.
  */

  const shouldShowSignature =
    Boolean(
      metadata.firstParty ||
      metadata.secondParty
    ) ||
    skippedSignatureBlock;


  const signature =
    shouldShowSignature
      ? createSignatureBlock(
          metadata
        )
      : "";


  return `

    ${createHeader(metadata)}

    <div
      class="document-content"
    >

      ${body.join("")}

    </div>

    ${signature}

  `;
}


/* =========================================================
   COLLECT FORM
   ========================================================= */

function collectForm() {

  return {

    document_type:
      $("documentType")?.value.trim() ||
      "",

    parties:
      $("parties")?.value.trim() ||
      "",

    terms:
      $("terms")?.value.trim() ||
      "",

    dates:
      $("effectiveDate")?.value.trim() ||
      "",

    jurisdiction:
      $("jurisdiction")?.value.trim() ||
      "",

    additional_instructions:
      $("additional")?.value.trim() ||
      "",

  };
}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
  message,
  type = ""
) {

  const element =
    $("status");


  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.className =
    `status${
      type
        ? ` ${type}`
        : ""
    }`;
}


/* =========================================================
   GENERATING STATE
   ========================================================= */

function setGenerating(
  isGenerating
) {

  state.isGenerating =
    isGenerating;


  const button =
    $("generateButton");


  if (!button) {
    return;
  }


  button.disabled =
    isGenerating;


  button.textContent =
    isGenerating

      ? "Generating document..."

      : "Generate Legal Document";
}


/* =========================================================
   SHOW DOCUMENT
   ========================================================= */

function showDocumentState() {

  $("emptyState")
    ?.classList.add("hidden");

  $("documentState")
    ?.classList.remove("hidden");


  if (
    $("documentStageNote")
  ) {

    $("documentStageNote")
      .textContent =
      "Draft ready for review";
  }
}


/* =========================================================
   RENDER CURRENT DOCUMENT
   ========================================================= */

function renderCurrentDocument() {

  const preview =
    $("documentPreview");

  const editor =
    $("documentEditor");


  if (
    !preview ||
    !editor
  ) {

    return;
  }


  const metadata =
    metadataFromForm();


  preview.innerHTML =
    renderLegalDocument(
      state.document,
      metadata
    );


  editor.value =
    state.document;
}


/* =========================================================
   TEMPLATE SELECTION
   ========================================================= */

function selectTemplate(
  type
) {

  if (!type) {
    return;
  }


  state.documentType =
    type;


  if (
    $("documentType")
  ) {

    $("documentType").value =
      type;
  }


  document
    .querySelectorAll(
      ".template-card"
    )
    .forEach(
      (button) => {

        button.classList.toggle(
          "selected",
          button.dataset.type ===
            type
        );

      }
    );


  const example =
    exampleValues[type];


  if (
    example &&
    $("additional") &&
    !$("additional").value.trim()
  ) {

    $("additional").value =
      templateInstructions[type] ||
      example.additional;
  }
}


/* =========================================================
   FILL EXAMPLE
   ========================================================= */

function fillExample() {

  const type =
    $("documentType")?.value ||
    "Employment Contract";


  const example =
    exampleValues[type] ||
    exampleValues[
      "Custom Agreement"
    ];


  $("parties").value =
    example.parties;


  $("terms").value =
    example.terms;


  $("jurisdiction").value =
    example.jurisdiction;


  $("additional").value =
    example.additional;


  /*
    IMPORTANT:
    Use the example's own date.
    Never replace a date already entered by the user.
  */

  if (
    $("effectiveDate") &&
    !$("effectiveDate").value &&
    example.dates
  ) {

    $("effectiveDate").value =
      example.dates;
  }


  setStatus(
    "Example details filled. Review them and generate the document.",
    "success"
  );
}


/* =========================================================
   PARSE JSON RESPONSE
   ========================================================= */

async function parseJsonResponse(
  response
) {

  const text =
    await response.text();


  if (!text) {
    return {};
  }


  try {

    return JSON.parse(text);

  } catch {

    return {
      detail: text,
    };
  }
}


/* =========================================================
   GENERATE DOCUMENT
   ========================================================= */

async function generateDocument(
  event
) {

  event?.preventDefault();


  if (state.isGenerating) {
    return;
  }


  const payload =
    collectForm();


  const errors = [];


  if (!payload.document_type) {

    errors.push(
      "Select a document type."
    );
  }


  if (!payload.parties) {

    errors.push(
      "Enter the parties involved."
    );
  }


  if (!payload.terms) {

    errors.push(
      "Enter the key terms and conditions."
    );
  }


  if (!payload.dates) {

    errors.push(
      "Choose the effective date."
    );
  }


  if (errors.length) {

    setStatus(
      errors.join(" "),
      "error"
    );

    return;
  }


  state.lastRequest =
    payload;


  state.documentType =
    payload.document_type;


  setGenerating(true);


  setStatus(
    "Preparing the legal drafting request..."
  );


  try {

    const response =
      await fetch(
        API.generate,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );


    const result =
      await parseJsonResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        result.detail ||
          `Server returned ${response.status}.`
      );
    }


    if (
      !result.document
    ) {

      throw new Error(
        "The API returned an empty legal document."
      );
    }


    state.document =
      normalizeText(
        result.document
      );


    state.originalDocument =
      state.document;


    state.model =
      result.model ||
      "Configured Gemini model";


    renderCurrentDocument();

    showDocumentState();


    if (
      $("modelInfo")
    ) {

      $("modelInfo").textContent =
        `Model: ${state.model} · Draft prepared for review`;
    }


    setStatus(
      "Document generated successfully.",
      "success"
    );


    $("documentState")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });


  } catch (error) {

    console.error(error);


    setStatus(
      error.message ||
        "Generation failed.",
      "error"
    );


  } finally {

    setGenerating(false);
  }
}


/* =========================================================
   UPDATE PREVIEW
   ========================================================= */

function updatePreview() {

  const editor =
    $("documentEditor");


  if (!editor) {
    return;
  }


  const text =
    normalizeText(
      editor.value
    );


  if (!text) {

    setStatus(
      "The editor is empty.",
      "error"
    );

    return;
  }


  state.document =
    text;


  renderCurrentDocument();


  setStatus(
    "Preview updated from the editor.",
    "success"
  );
}


/* =========================================================
   RESET DRAFT
   ========================================================= */

function resetDraft() {

  if (
    !state.originalDocument
  ) {

    setStatus(
      "There is no generated draft to reset.",
      "error"
    );

    return;
  }


  state.document =
    state.originalDocument;


  renderCurrentDocument();


  setStatus(
    "Generated draft restored.",
    "success"
  );
}


/* =========================================================
   EXPORT
   ========================================================= */

async function downloadDocument(
  format
) {

  const text =
    normalizeText(
      $("documentEditor")?.value ||
        state.document
    );


  if (!text) {

    setStatus(
      "Generate a document before exporting.",
      "error"
    );

    return;
  }


  const endpoint =
    format === "txt"

      ? API.exportTxt

      : format === "docx"

        ? API.exportDocx

        : API.exportPdf;


  setStatus(
    `Preparing ${format.toUpperCase()}...`
  );


  try {

    const response =
      await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              text,

              document_type:
                $("documentType")?.value ||
                state.documentType,

              terms:
                $("terms")?.value ||
                "",
            }),
        }
      );


    if (!response.ok) {

      const result =
        await parseJsonResponse(
          response
        );


      throw new Error(
        result.detail ||
          `Could not create ${format.toUpperCase()}.`
      );
    }


    const blob =
      await response.blob();


    const url =
      URL.createObjectURL(blob);


    const anchor =
      document.createElement(
        "a"
      );


    const safeName =
      (
        $("documentType")?.value ||
        state.documentType ||
        "Document"
      )
        .replace(
          /[^a-z0-9]+/gi,
          "_"
        )
        .replace(
          /^_+|_+$/g,
          ""
        );


    anchor.href =
      url;


    anchor.download =
      `LegalEase_${
        safeName || "Document"
      }.${format}`;


    document.body.appendChild(
      anchor
    );


    anchor.click();


    anchor.remove();


    URL.revokeObjectURL(
      url
    );


    setStatus(
      `${format.toUpperCase()} downloaded successfully.`,
      "success"
    );


  } catch (error) {

    console.error(error);


    setStatus(
      error.message ||
        "Export failed.",
      "error"
    );
  }
}


/* =========================================================
   COPY
   ========================================================= */

async function copyDocument() {

  const text =
    normalizeText(
      $("documentEditor")?.value ||
        state.document
    );


  if (!text) {

    setStatus(
      "Generate a document before copying.",
      "error"
    );

    return;
  }


  try {

    await navigator.clipboard
      .writeText(text);


    setStatus(
      "Document copied to the clipboard.",
      "success"
    );


  } catch {

    setStatus(
      "Clipboard access was blocked by the browser.",
      "error"
    );
  }
}


/* =========================================================
   PRINT
   ========================================================= */

function printDocument() {

  if (
    !normalizeText(
      $("documentEditor")?.value ||
        state.document
    )
  ) {

    setStatus(
      "Generate a document before printing.",
      "error"
    );

    return;
  }


  window.print();
}


/* =========================================================
   THEME
   ========================================================= */

function applyTheme(
  theme
) {

  const value =
    theme === "light"
      ? "light"
      : "dark";


  document.body.dataset.theme =
    value;


  const themeButton =
    $("themeToggle");


  if (themeButton) {

    themeButton.textContent =
      value === "dark"
        ? "☀ Light"
        : "☾ Dark";
  }


  localStorage.setItem(
    "legalease-theme",
    value
  );
}


function toggleTheme() {

  applyTheme(
    document.body.dataset.theme === "dark"
      ? "light"
      : "dark"
  );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function init() {

  const savedTheme =
    localStorage.getItem(
      "legalease-theme"
    );


  applyTheme(
    savedTheme || "dark"
  );


  selectTemplate(
    "Employment Contract"
  );


  /*
    IMPORTANT:
    No automatic today's date here.
    The effective date must come from the user.
  */


  document
    .querySelectorAll(
      ".template-card"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            selectTemplate(
              button.dataset.type
            );

          }
        );

      }
    );


  $("documentType")
    ?.addEventListener(
      "change",
      (event) => {

        selectTemplate(
          event.target.value
        );

      }
    );


  $("themeToggle")
    ?.addEventListener(
      "click",
      toggleTheme
    );


  $("builderForm")
    ?.addEventListener(
      "submit",
      generateDocument
    );


  $("fillExampleButton")
    ?.addEventListener(
      "click",
      fillExample
    );


  $("updatePreviewButton")
    ?.addEventListener(
      "click",
      updatePreview
    );


  $("resetDraftButton")
    ?.addEventListener(
      "click",
      resetDraft
    );


  $("downloadTxt")
    ?.addEventListener(
      "click",
      () => downloadDocument("txt")
    );


  $("downloadDocx")
    ?.addEventListener(
      "click",
      () => downloadDocument("docx")
    );


  $("downloadPdf")
    ?.addEventListener(
      "click",
      () => downloadDocument("pdf")
    );


  $("printButton")
    ?.addEventListener(
      "click",
      printDocument
    );


  $("copyButton")
    ?.addEventListener(
      "click",
      copyDocument
    );


  setStatus(
    "Ready. Choose a template or fill the example details."
  );
}


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init,
    {
      once: true,
    }
  );

} else {

  init();
}
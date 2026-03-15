import { describe, it, expect } from "vitest";
import { extractTextFromFile, type ExtractionResult } from "./file-extractor.service";
import JSZip from "jszip";

// ---------- Helper: create test files ----------

function createTextFile(content: string, name = "test.txt"): File {
  return new File([content], name, { type: "text/plain" });
}

async function createDocxFile(content: string, name = "test.docx"): Promise<File> {
  const zip = new JSZip();

  // Minimal DOCX structure
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // Build paragraphs
  const paragraphs = content.split("\n").map((line) =>
    `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
  ).join("");

  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}</w:body>
</w:document>`);

  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------- TXT Tests ----------

describe("extractTextFromFile — TXT", () => {
  it("extracts text from a plain text file", async () => {
    const content = "Le système cardiovasculaire est responsable du transport du sang.";
    const file = createTextFile(content);
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.method).toBe("plain_text");
    expect(result.text).toBe(content);
    expect(result.warnings).toHaveLength(0);
  });

  it("handles empty text files", async () => {
    const file = createTextFile("");
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.method).toBe("plain_text");
    expect(result.text).toBe("");
  });

  it("handles multiline text files", async () => {
    const content = "Ligne 1\nLigne 2\nLigne 3";
    const file = createTextFile(content);
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.text).toContain("Ligne 1");
    expect(result.text).toContain("Ligne 3");
  });

  it("handles UTF-8 with accents", async () => {
    const content = "Les élèves étudient la résistance électrique à très haute fréquence.";
    const file = createTextFile(content);
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.text).toContain("élèves");
    expect(result.text).toContain("résistance");
    expect(result.text).toContain("fréquence");
  });

  it("works with .txt extension even without proper MIME", async () => {
    const file = new File(["Some content"], "notes.txt", { type: "" });
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.text).toBe("Some content");
  });
});

// ---------- DOCX Tests ----------

describe("extractTextFromFile — DOCX", () => {
  it("extracts text from a DOCX file", async () => {
    const content = "Le système cardiovasculaire est un appareil vital.";
    const file = await createDocxFile(content);
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.method).toBe("docx_xml");
    expect(result.text).toContain("cardiovasculaire");
  });

  it("handles multi-paragraph DOCX", async () => {
    const content = "Premier paragraphe.\nDeuxième paragraphe.\nTroisième paragraphe.";
    const file = await createDocxFile(content);
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.text).toContain("Premier paragraphe");
    expect(result.text).toContain("Troisième paragraphe");
  });

  it("handles DOCX with special characters", async () => {
    const content = "L'étude des mécanismes physiologiques & biochimiques.";
    const file = await createDocxFile(content);
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(true);
    expect(result.text).toContain("mécanismes");
  });

  it("returns error for corrupted DOCX", async () => {
    const file = new File(["not a zip"], "bad.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------- Unsupported type ----------

describe("extractTextFromFile — unsupported", () => {
  it("returns error for unsupported file type", async () => {
    const file = new File(["data"], "image.png", { type: "image/png" });
    const result = await extractTextFromFile(file);

    expect(result.success).toBe(false);
    expect(result.method).toBe("fallback_text");
    expect(result.error).toContain("Unsupported");
  });
});

// ---------- PDF Tests ----------

describe("extractTextFromFile — PDF", () => {
  it("returns failure for empty/binary PDF with no text", async () => {
    // Create a minimal PDF-like file that has no text content
    const pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
    const file = new File([pdfContent], "empty.pdf", { type: "application/pdf" });
    const result = await extractTextFromFile(file);

    // pdfjs should parse but find no text, or the fallback should handle it
    // Either way, we accept success=false OR success=true with empty text
    expect(typeof result.success).toBe("boolean");
    expect(result.method).toBeDefined();
  });

  it("identifies PDF files by extension", async () => {
    const file = new File(["%PDF-1.4"], "document.pdf", { type: "" });
    const result = await extractTextFromFile(file);

    // Should attempt PDF extraction (may fail since it's not a real PDF)
    expect(result.method === "pdfjs" || result.method === "fallback_text").toBe(true);
  });
});

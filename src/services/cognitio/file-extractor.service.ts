// ============================================================
// File Text Extractor Service
// Extracts readable text from TXT, PDF, and DOCX files
// Works client-side in the browser
// ============================================================

import JSZip from "jszip";

export interface ExtractionResult {
  text: string;
  /** Which extraction method was used */
  method: "plain_text" | "pdfjs" | "docx_xml" | "fallback_text";
  /** Warnings generated during extraction */
  warnings: string[];
  /** Whether extraction succeeded */
  success: boolean;
  /** Error message if extraction failed */
  error?: string;
}

/** Read file content as text, with fallback for environments where File.text() is unavailable */
async function readAsText(file: File): Promise<string> {
  // Prefer .text() when available (modern browsers)
  if (typeof file.text === "function") {
    return file.text();
  }
  // Fallback to FileReader (jsdom, older environments)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Read file content as ArrayBuffer, with fallback */
async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ---------- Main entry point ----------

export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  const contentType = file.type;
  const fileName = file.name.toLowerCase();

  // TXT / Markdown
  if (contentType === "text/plain" || contentType === "text/markdown" || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    return extractFromTxt(file);
  }

  // PDF
  if (contentType === "application/pdf" || fileName.endsWith(".pdf")) {
    return extractFromPdf(file);
  }

  // DOCX
  if (contentType.includes("wordprocessingml") || fileName.endsWith(".docx")) {
    return extractFromDocx(file);
  }

  return {
    text: "",
    method: "fallback_text",
    warnings: [`Type de fichier non supporté: ${contentType || fileName}`],
    success: false,
    error: `Unsupported file type: ${contentType}`,
  };
}

// ---------- TXT ----------

async function extractFromTxt(file: File): Promise<ExtractionResult> {
  try {
    const text = await readAsText(file);
    return {
      text,
      method: "plain_text",
      warnings: [],
      success: true,
    };
  } catch (err) {
    return {
      text: "",
      method: "plain_text",
      warnings: [],
      success: false,
      error: `Failed to read text file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------- PDF ----------

async function extractFromPdf(file: File): Promise<ExtractionResult> {
  const warnings: string[] = [];

  try {
    // Dynamic import to avoid bundling pdfjs if not needed
    const pdfjsLib = await import("pdfjs-dist");

    // Set up the worker - use the bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await readAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const totalPages = pdf.numPages;
    if (totalPages === 0) {
      return {
        text: "",
        method: "pdfjs",
        warnings: ["Le PDF ne contient aucune page"],
        success: false,
        error: "PDF has 0 pages",
      };
    }

    const pageTexts: string[] = [];
    let emptyPages = 0;

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");

      if (pageText.trim().length === 0) {
        emptyPages++;
      }
      pageTexts.push(pageText);
    }

    const fullText = pageTexts.join("\n\n");

    if (emptyPages === totalPages) {
      warnings.push("Toutes les pages du PDF sont vides — il s'agit peut-être d'un PDF scanné (image)");
      return {
        text: "",
        method: "pdfjs",
        warnings,
        success: false,
        error: "PDF contains only images/scanned pages, no extractable text",
      };
    }

    if (emptyPages > 0) {
      warnings.push(`${emptyPages}/${totalPages} pages sans texte (possiblement des images ou pages scannées)`);
    }

    return {
      text: fullText,
      method: "pdfjs",
      warnings,
      success: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // If pdfjs fails, try basic text extraction as last resort
    try {
      const text = await readAsText(file);
      if (text && text.trim().length > 50 && !text.includes("%PDF")) {
        warnings.push("Extraction PDF avancée échouée — mode dégradé utilisé");
        return {
          text,
          method: "fallback_text",
          warnings,
          success: true,
        };
      }
    } catch {
      // ignore fallback failure
    }

    return {
      text: "",
      method: "pdfjs",
      warnings: [`Extraction PDF échouée: ${message}`],
      success: false,
      error: `PDF extraction failed: ${message}`,
    };
  }
}

// ---------- DOCX ----------

async function extractFromDocx(file: File): Promise<ExtractionResult> {
  const warnings: string[] = [];

  try {
    const arrayBuffer = await readAsArrayBuffer(file);
    const zip = await JSZip.loadAsync(arrayBuffer);

    // DOCX main content is in word/document.xml
    const documentXml = zip.file("word/document.xml");
    if (!documentXml) {
      return {
        text: "",
        method: "docx_xml",
        warnings: ["Le fichier DOCX ne contient pas de document.xml — fichier corrompu ?"],
        success: false,
        error: "DOCX missing word/document.xml",
      };
    }

    const xmlContent = await documentXml.async("text");

    // Parse XML and extract text from <w:t> elements
    const text = extractTextFromDocxXml(xmlContent);

    if (!text || text.trim().length === 0) {
      return {
        text: "",
        method: "docx_xml",
        warnings: ["Le document DOCX semble vide"],
        success: false,
        error: "DOCX contains no text content",
      };
    }

    return {
      text,
      method: "docx_xml",
      warnings,
      success: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      text: "",
      method: "docx_xml",
      warnings: [`Extraction DOCX échouée: ${message}`],
      success: false,
      error: `DOCX extraction failed: ${message}`,
    };
  }
}

/**
 * Extract text from DOCX XML content.
 * Handles paragraphs (<w:p>), runs (<w:r>), text (<w:t>), tabs (<w:tab>),
 * and line breaks (<w:br>).
 */
function extractTextFromDocxXml(xml: string): string {
  const paragraphs: string[] = [];

  // Split by paragraphs (<w:p> ... </w:p>)
  const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const paragraphXml = pMatch[0];
    let paragraphText = "";

    // Extract text runs
    const rRegex = /<w:r[\s>][\s\S]*?<\/w:r>/g;
    let rMatch;

    while ((rMatch = rRegex.exec(paragraphXml)) !== null) {
      const runXml = rMatch[0];

      // Get <w:t> text content
      const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let tMatch;
      while ((tMatch = tRegex.exec(runXml)) !== null) {
        paragraphText += tMatch[1];
      }

      // Handle tabs
      if (/<w:tab\s*\/>/.test(runXml)) {
        paragraphText += "\t";
      }

      // Handle line breaks
      if (/<w:br\s*\/>/.test(runXml)) {
        paragraphText += "\n";
      }
    }

    paragraphs.push(paragraphText);
  }

  // Join paragraphs with newlines, collapse empty ones
  return paragraphs
    .map((p) => p.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

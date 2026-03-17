// ============================================================
// Edge Function: cognitio-ingest (M1)
// Parse uploaded documents, extract text, segment content
// Enhanced: detailed source typing, structure detection,
//           confidence scoring, ops logging, issue tracking
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Types ----------

interface IngestRequest {
  document_id: string;
  pasted_text?: string;
  content_type: string;
  objective: string;
  language?: string;
  user_id?: string;
}

interface SourceIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "blocking";
  action_required?: boolean;
  page_ref?: number;
}

interface SegmentOutput {
  segment_index: number;
  title: string | null;
  content: string;
  hierarchy_level: number;
  confidence_score: number;
  page_ref: string | null;
}

type DetailedSourceType = "institutional" | "polycopie" | "slides" | "personal_notes" | "unknown";
type DetectedStructureType = "prose" | "bullets" | "table" | "mixed" | "minimal";

// ---------- Constants ----------

const WORD_COUNT_MIN = 100;
const WORD_COUNT_CHUNK = 15000;
const CONFIDENCE_BLOCKING = 0.4;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: IngestRequest = await req.json();
    const { document_id, pasted_text, content_type, objective, language, user_id } = body;

    if (!document_id) {
      return errorResponse(400, "document_id required");
    }

    // Get document record
    const { data: doc, error: docError } = await supabase
      .from("source_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return errorResponse(404, "Document not found");
    }

    // Update status to parsing
    await supabase.from("source_documents").update({ ingestion_status: "parsing" }).eq("id", document_id);

    // Log ops event
    await logOps(supabase, "ingest_started", "info", document_id, user_id, { content_type, objective });

    let cleanText = "";
    const issues: SourceIssue[] = [];
    let rawInputLength = 0;

    // ---------- Text extraction ----------

    if (pasted_text) {
      rawInputLength = pasted_text.length;
      cleanText = pasted_text; // Will be cleaned once below
    } else if (doc.raw_storage_path) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from("source-raw")
        .download(doc.raw_storage_path);

      if (fileError) {
        // Fallback to course-uploads bucket
        const { data: fileData2, error: fileError2 } = await supabase.storage
          .from("course-uploads")
          .download(doc.raw_storage_path);

        if (fileError2) {
          await logOps(supabase, "upload_failed", "error", document_id, user_id, { error: fileError2.message });
          throw new Error(`File download failed: ${fileError2.message}`);
        }

        cleanText = await extractText(fileData2!, content_type, issues);
      } else {
        cleanText = await extractText(fileData!, content_type, issues);
      }
      rawInputLength = cleanText.length;
    }

    // ---------- Cleaning (single pass) ----------

    cleanText = cleanRawText(cleanText);

    console.log(`[COGNITIO] Text pipeline: raw=${rawInputLength} chars → cleaned=${cleanText.length} chars`);

    if (!cleanText || cleanText.trim().length === 0) {
      issues.push({ code: "EMPTY_DOCUMENT", message: "Aucun texte exploitable détecté", severity: "blocking", action_required: true });
      await supabase.from("source_documents").update({ ingestion_status: "error", warnings_json: issues }).eq("id", document_id);
      await logOps(supabase, "ingest_blocked", "error", document_id, user_id, { reason: "empty_document", raw_input_length: rawInputLength });
      return jsonResponse({ document_id, clean_text: "", word_count: 0, language: "unknown", source_type: "unknown", confidence_level: 0, detected_structure: "minimal", issues, segments: [] });
    }

    // ---------- Word count & issues ----------

    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    if (wordCount < WORD_COUNT_MIN) {
      issues.push({ code: "DOCUMENT_TOO_SHORT", message: `Seulement ${wordCount} mots (minimum recommandé: ${WORD_COUNT_MIN})`, severity: "warning", action_required: false });
    }

    if (wordCount > WORD_COUNT_CHUNK) {
      issues.push({ code: "DOCUMENT_TOO_LONG", message: `${wordCount} mots — segmentation automatique appliquée`, severity: "info", action_required: false });
    }

    // ---------- Language detection ----------

    const detectedLang = language || detectLanguage(cleanText);
    const mixedLang = detectMixedLanguage(cleanText, detectedLang);
    if (mixedLang) {
      issues.push({ code: "MIXED_LANGUAGE", message: "Plusieurs langues détectées dans le document", severity: "warning", action_required: false });
    }

    // ---------- Structure detection ----------

    const structure = detectStructure(cleanText);
    if (structure === "minimal") {
      issues.push({ code: "NO_STRUCTURE", message: "Aucune structure claire détectée (pas de titres, listes, etc.)", severity: "warning", action_required: false });
    }

    // ---------- Source type ----------

    const sourceType = detectDetailedSourceType(cleanText, content_type, structure);

    // ---------- Segmentation ----------

    const segments = segmentText(cleanText, structure);

    // ---------- Confidence scoring ----------

    const confidence = computeConfidence(wordCount, structure, segments.length, sourceType);

    if (confidence < CONFIDENCE_BLOCKING) {
      issues.push({ code: "LOW_CONFIDENCE_BLOCKING", message: "Confiance trop faible pour analyse fiable", severity: "blocking", action_required: true });
    }

    // ---------- Reliability score ----------

    const reliabilityScore = computeReliability(sourceType, wordCount, structure);

    // ---------- Persist ----------

    const latencyMs = Date.now() - startTime;

    await supabase.from("source_documents").update({
      ingestion_status: "parsed",
      quality_score: confidence,
      source_reliability_score: reliabilityScore,
      source_type: content_type === "application/pdf" ? "pdf_text" : content_type.includes("wordprocessingml") ? "docx" : "pasted_text",
      detailed_source_type: sourceType,
      detected_structure: structure,
      source_language: detectedLang,
      detected_language: detectedLang,
      word_count: wordCount,
      warnings_json: issues,
      parsing_latency_ms: latencyMs,
    }).eq("id", document_id);

    // Save segments
    if (segments.length > 0) {
      const segmentRows = segments.map((s) => ({
        document_id,
        segment_index: s.segment_index,
        title: s.title,
        content: s.content,
        hierarchy_level: s.hierarchy_level,
        confidence_score: s.confidence_score,
        page_ref: s.page_ref,
      }));

      await supabase.from("document_segments").insert(segmentRows);
    }

    // Save parsed text to storage
    try {
      const userId = user_id || doc.user_id;
      const parsedPath = `${userId}/${document_id}/parsed.txt`;
      await supabase.storage.from("source-parsed").upload(parsedPath, new Blob([cleanText], { type: "text/plain" }), { upsert: true });
      await supabase.from("source_documents").update({ parsed_text_storage_path: parsedPath }).eq("id", document_id);
    } catch {
      // Non-blocking: parsed text storage failure doesn't block pipeline
      issues.push({ code: "STORAGE_PARSED_FAILED", message: "Sauvegarde du texte parsé échouée (non bloquant)", severity: "info" });
    }

    // Log completion
    const hasBlocking = issues.some((i) => i.severity === "blocking");
    await logOps(supabase, hasBlocking ? "ingest_blocked" : "ingest_completed", hasBlocking ? "warning" : "info", document_id, user_id, {
      word_count: wordCount,
      language: detectedLang,
      source_type: sourceType,
      structure,
      confidence_level: confidence,
      issues_count: issues.length,
      latency_ms: latencyMs,
    });

    const result = {
      document_id,
      clean_text: cleanText,
      word_count: wordCount,
      language: detectedLang,
      source_type: sourceType,
      confidence_level: confidence,
      detected_structure: structure,
      issues,
      segments,
    };

    return jsonResponse(result);
  } catch (error: unknown) {
    console.error("Ingestion error:", error);
    const message = error instanceof Error ? error.message : String(error);
    // Include error source hints for client-side diagnostics
    let errorSource = "unknown";
    if (message.includes("storage") || message.includes("bucket") || message.includes("download")) {
      errorSource = "storage";
    } else if (message.includes("source_documents") || message.includes("document_segments") || message.includes("insert") || message.includes("update")) {
      errorSource = "database";
    } else if (message.includes("parse") || message.includes("extract") || message.includes("text")) {
      errorSource = "parsing";
    } else if (message.includes("auth") || message.includes("JWT") || message.includes("token") || message.includes("permission")) {
      errorSource = "auth";
    }
    return new Response(JSON.stringify({ error: message, error_source: errorSource }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------- Helpers ----------

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logOps(
  supabase: any,
  eventType: string,
  severity: string,
  documentId?: string,
  userId?: string,
  payload?: Record<string, unknown>
) {
  try {
    await supabase.from("ops_events").insert([{
      event_type: eventType,
      severity,
      document_id: documentId || null,
      user_id: userId || null,
      payload_json: payload || {},
    }]);
  } catch {
    // Ops logging failure should never block the pipeline
    console.error("Ops logging failed for:", eventType);
  }
}

async function extractText(fileData: Blob, contentType: string, issues: SourceIssue[]): Promise<string> {
  if (contentType === "text/plain" || contentType === "text/markdown") {
    return await fileData.text();
  }

  if (contentType === "application/pdf") {
    // PDF binary → attempt to extract readable text streams
    const arrayBuf = await fileData.arrayBuffer();
    const text = extractTextFromPdfBinary(new Uint8Array(arrayBuf));

    if (!text || text.trim().length < 20) {
      issues.push({
        code: "PDF_NO_TEXT",
        message: "Le PDF ne contient pas de texte extractible (scan/image ?). L'extraction côté client via pdfjs sera utilisée si disponible.",
        severity: "warning",
        action_required: false,
      });
      return "";
    }

    issues.push({
      code: "PDF_BASIC",
      message: "Extraction PDF côté serveur — certains formatages peuvent être perdus",
      severity: "info",
    });
    return text;
  }

  if (contentType.includes("wordprocessingml")) {
    // DOCX is a ZIP containing word/document.xml
    try {
      const text = await extractTextFromDocxBlob(fileData);
      if (!text || text.trim().length === 0) {
        issues.push({
          code: "DOCX_BASIC",
          message: "Le document DOCX semble vide",
          severity: "warning",
        });
        return "";
      }
      issues.push({ code: "DOCX_BASIC", message: "Extraction DOCX via XML", severity: "info" });
      return text;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      issues.push({
        code: "DOCX_BASIC",
        message: `Extraction DOCX échouée: ${msg}`,
        severity: "warning",
      });
      return "";
    }
  }

  issues.push({ code: "UNSUPPORTED_TYPE", message: `Type non supporté: ${contentType}`, severity: "blocking", action_required: true });
  return "";
}

/**
 * Basic PDF text extraction from binary data.
 * Extracts text from PDF text streams by parsing stream objects.
 * This is a simplified parser — it handles the most common PDF text encoding
 * but won't work for all PDFs (scanned, heavily encoded, etc.).
 */
function extractTextFromPdfBinary(data: Uint8Array): string {
  // Convert to string for regex matching (latin1 to preserve bytes)
  const raw = new TextDecoder("latin1").decode(data);

  const textParts: string[] = [];

  // Strategy 1: Extract text between BT (Begin Text) and ET (End Text) operators
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];

    // Extract text from Tj (show text) operator: (text) Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(decodePdfString(tjMatch[1]));
    }

    // Extract text from TJ (show text with positioning) operator: [(text) num (text)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strParts = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strParts.exec(inner)) !== null) {
        textParts.push(decodePdfString(strMatch[1]));
      }
    }
  }

  // Strategy 2: If no BT/ET found, try to find readable text sequences
  if (textParts.length === 0) {
    // Look for stream content that might contain text
    const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
    while ((match = streamRegex.exec(raw)) !== null) {
      const streamContent = match[1];
      // Only process if it looks like it contains text operators
      if (streamContent.includes("Tj") || streamContent.includes("TJ")) {
        const tjRegex2 = /\(([^)]*)\)\s*Tj/g;
        let tjMatch2;
        while ((tjMatch2 = tjRegex2.exec(streamContent)) !== null) {
          textParts.push(decodePdfString(tjMatch2[1]));
        }
      }
    }
  }

  return textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodePdfString(s: string): string {
  // Handle common PDF escape sequences
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/**
 * Extract text from a DOCX blob by reading the ZIP structure.
 * Uses Deno-compatible approach without external ZIP library.
 */
async function extractTextFromDocxBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Find word/document.xml in the ZIP
  const xmlContent = await extractFileFromZip(data, "word/document.xml");
  if (!xmlContent) {
    throw new Error("word/document.xml not found in DOCX");
  }

  // Parse XML text content from <w:t> elements
  const paragraphs: string[] = [];
  const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(xmlContent)) !== null) {
    const paragraphXml = pMatch[0];
    let paragraphText = "";

    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(paragraphXml)) !== null) {
      paragraphText += tMatch[1];
    }

    paragraphs.push(paragraphText);
  }

  return paragraphs
    .map((p) => p.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Minimal ZIP file reader to extract a specific file by name.
 * Handles the basic ZIP format (local file headers + data).
 */
async function extractFileFromZip(data: Uint8Array, targetName: string): Promise<string | null> {
  let offset = 0;

  while (offset < data.length - 4) {
    // Check for local file header signature (PK\x03\x04)
    if (data[offset] !== 0x50 || data[offset + 1] !== 0x4b ||
        data[offset + 2] !== 0x03 || data[offset + 3] !== 0x04) {
      break;
    }

    const compressionMethod = data[offset + 8] | (data[offset + 9] << 8);
    const compressedSize = data[offset + 18] | (data[offset + 19] << 8) |
                          (data[offset + 20] << 16) | (data[offset + 21] << 24);
    const uncompressedSize = data[offset + 22] | (data[offset + 23] << 8) |
                            (data[offset + 24] << 16) | (data[offset + 25] << 24);
    const nameLen = data[offset + 26] | (data[offset + 27] << 8);
    const extraLen = data[offset + 28] | (data[offset + 29] << 8);

    const nameBytes = data.slice(offset + 30, offset + 30 + nameLen);
    const fileName = new TextDecoder().decode(nameBytes);

    const dataStart = offset + 30 + nameLen + extraLen;
    const dataSize = compressedSize > 0 ? compressedSize : uncompressedSize;

    if (fileName === targetName) {
      if (compressionMethod === 0) {
        // Stored (no compression)
        const fileContent = data.slice(dataStart, dataStart + dataSize);
        return new TextDecoder("utf-8").decode(fileContent);
      } else if (compressionMethod === 8) {
        // Deflated - use DecompressionStream if available
        try {
          const compressed = data.slice(dataStart, dataStart + dataSize);
          // In Deno, we can try raw inflate
          const ds = new DecompressionStream("deflate-raw");
          const writer = ds.writable.getWriter();
          const reader = ds.readable.getReader();

          // Start decompression
          writer.write(compressed);
          writer.close();

          const chunks: Uint8Array[] = [];
          let totalLen = 0;

          // Read all chunks synchronously via async iteration
           
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            totalLen += value.length;
          }

          const result = new Uint8Array(totalLen);
          let pos = 0;
          for (const chunk of chunks) {
            result.set(chunk, pos);
            pos += chunk.length;
          }

          return new TextDecoder("utf-8").decode(result);
        } catch {
          // If decompression fails, skip this file
          return null;
        }
      }
    }

    offset = dataStart + dataSize;
  }

  return null;
}

function cleanRawText(text: string): string {
  let cleaned = text;

  // Remove common PDF artifacts
  cleaned = cleaned.replace(/\f/g, "\n"); // form feeds → newlines
  cleaned = cleaned.replace(/\r\n/g, "\n"); // normalize line endings
  cleaned = cleaned.replace(/\r/g, "\n");

  // Remove repeated headers/footers (heuristic: identical short lines at regular intervals)
  const lines = cleaned.split("\n");
  const lineCounts: Record<string, number> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 80) {
      lineCounts[trimmed] = (lineCounts[trimmed] || 0) + 1;
    }
  }
  // Remove lines that appear > 3 times (likely headers/footers/page numbers)
  const repeatedLines = new Set(Object.entries(lineCounts).filter(([, c]) => c > 3).map(([l]) => l));
  if (repeatedLines.size > 0) {
    cleaned = lines.filter((l) => !repeatedLines.has(l.trim())).join("\n");
  }

  // Remove page numbers (standalone numbers on a line)
  cleaned = cleaned.replace(/^\s*\d{1,4}\s*$/gm, "");

  // Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, " "); // collapse horizontal space
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // max 2 consecutive newlines
  cleaned = cleaned.trim();

  // Phase 2: Editorial artifact filtering WITH SAFETY GUARD
  const beforeFilter = cleaned;
  const filtered = filterEditorialArtifacts(cleaned);

  // SAFETY GUARD: If filtering removed >70% of content, keep original
  if (beforeFilter.length > 0 && filtered.length / beforeFilter.length < 0.3) {
    console.warn(`[COGNITIO] filterEditorialArtifacts removed ${Math.round((1 - filtered.length / beforeFilter.length) * 100)}% of text — reverting to pre-filter version`);
    return beforeFilter;
  }

  return filtered;
}

/**
 * Filter editorial artifacts, metadata, and structural noise from source text.
 * Runs after basic PDF cleanup to remove pedagogically irrelevant content.
 */
function filterEditorialArtifacts(text: string): string {
  const ARTIFACT_LINE_PATTERNS: RegExp[] = [
    // Platform branding lines (CODEX, S-ECN, iKB, etc.)
    /^\s*CODEX\b/i,
    /^\s*S[\s-]*ECN\b/i,
    /^\s*(?:KB|iKB)\s*[\/|]/i,
    /^\s*MED[\s-]*LINE\b/i,
    /^\s*ELLIPSES\b/i,
    /^\s*VERNAZOBRES/i,
    /^\s*PREP['']?ECN\b/i,
    // R2C header lines with color coding instructions
    /^\s*(?:COM\s+)?R2C\s*:/i,
    /^\s*R2C\s*:\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|BRUN|MARRON|Rang\s+[A-Z])/i,
    // Standalone Rang labels
    /^\s*Rang\s+[A-Z]\s*$/i,
    // Color coding instruction lines
    /^\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)/i,
    /^\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*$/i,
    // Revision/version metadata
    /^\s*(?:Dernière\s+)?(?:mise\s+à\s+jour|MAJ|révision)\s*[:—–-]\s*\d/i,
    /^\s*Version\s+\d+/i,
    /^\s*(?:Révisé|Modifié|Créé)\s+(?:le|en)\s+/i,
    /^\s*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\s*$/,
    // Course metadata headers
    /^\s*(?:UE|DFGSM|DFASM|ECN|EDN|iECN)\s*\d/i,
    /^\s*(?:Item|N°)\s*\d+\s*(?:[-–—:]|$)/i,
    /^\s*Collège\s+(?:national|des)\s/i,
    // Page/copyright
    /^\s*Page\s+\d+/i,
    /^\s*\d+\s*\/\s*\d+\s*$/,
    /^\s*©\s/,
    /^\s*Tous\s+droits\s+réservés/i,
    // Minimal punctuation-only lines
    /^\s*[-–—]+\s*$/,
    /^\s*[)(\]}\[{]\s*[-–—]\s*$/,
    /^\s*[•\-–]\s*$/,
    // URL/web residues
    /^\s*(?:www\.|https?:\/\/|mailto)/i,
  ];

  const lines = text.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      cleaned.push("");
      continue;
    }

    // Skip pure artifact lines
    if (ARTIFACT_LINE_PATTERNS.some(p => p.test(trimmed))) {
      continue;
    }

    // Clean inline editorial noise
    let cleanedLine = trimmed;
    // Rang labels and color coding
    cleanedLine = cleanedLine.replace(/\s*\(?\s*Rang\s+[A-Z]\s*\)?\s*/gi, " ");
    cleanedLine = cleanedLine.replace(/\s*[-–—]\s*R2C\s*:?\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON|Rang\s+[A-Z])(?:\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON|Rang\s+[A-Z]))*/gi, " ");
    cleanedLine = cleanedLine.replace(/\s*\(?\s*en\s+(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)\s*\)?\s*/gi, " ");
    // Platform branding inline (CODEX, S-ECN, etc.)
    cleanedLine = cleanedLine.replace(/\bCODEX\b[.:;,]?\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\bS[\s-]*ECN(?:\.\s*COM|\.\s*-|\.COM)?\b[.:;,\s-]*/gi, "");
    cleanedLine = cleanedLine.replace(/\bMED[\s-]*LINE\b\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\biKB\b\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\bPREP['']?ECN\b\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\bELLIPSES\b\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\bVERNAZOBRES[\s-]*GREGO?\b\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\bECN\.COM\b\s*/gi, "");
    // R2C classification blocks
    cleanedLine = cleanedLine.replace(/\bR2C\s*:?\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON)(?:\s*[-–—]\s*(?:en\s+)?(?:NOIR|BLEU|ROUGE|VERT|GRIS|BRUN|MARRON))*/gi, "");
    cleanedLine = cleanedLine.replace(/\bCOM\s+R2C\b[.:;,]?\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\bR2C\b[.:;,]?\s*/gi, "");
    // Revision dates inline (including partial date formats)
    cleanedLine = cleanedLine.replace(/\bRévision\s+\d[\d/]*\b\s*/gi, "");
    cleanedLine = cleanedLine.replace(/\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b\s*/g, "");
    // ITEM numbers inline
    cleanedLine = cleanedLine.replace(/\bITEM\s+\d+\s*/gi, "");
    // Collapse whitespace and trim residual punctuation
    cleanedLine = cleanedLine.replace(/\s{2,}/g, " ").trim();
    cleanedLine = cleanedLine.replace(/^[\s;:.,\-–—]+/, "").replace(/[\s;:.,\-–—]+$/, "").trim();

    if (cleanedLine.length >= 3) {
      cleaned.push(cleanedLine);
    }
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function detectLanguage(text: string): string {
  const frWords = ["le", "la", "les", "de", "du", "des", "un", "une", "est", "sont", "dans", "pour", "par", "avec", "que", "qui"];
  const enWords = ["the", "a", "an", "is", "are", "in", "of", "to", "and", "for", "that", "this", "with", "from"];

  const words = text.toLowerCase().split(/\s+/).slice(0, 300);
  const frCount = words.filter((w) => frWords.includes(w)).length;
  const enCount = words.filter((w) => enWords.includes(w)).length;

  return frCount > enCount ? "fr" : "en";
}

function detectMixedLanguage(text: string, primaryLang: string): boolean {
  const frWords = ["le", "la", "les", "de", "du", "des", "un", "une", "est", "sont"];
  const enWords = ["the", "a", "an", "is", "are", "in", "of", "to", "and", "for"];

  const words = text.toLowerCase().split(/\s+/).slice(0, 500);
  const frCount = words.filter((w) => frWords.includes(w)).length;
  const enCount = words.filter((w) => enWords.includes(w)).length;

  const total = frCount + enCount;
  if (total < 10) return false;

  const minority = primaryLang === "fr" ? enCount : frCount;
  return minority / total > 0.2;
}

function detectStructure(text: string): DetectedStructureType {
  const hasHeadings = /^#{1,6}\s/m.test(text) || /^[A-Z][A-ZÀÂÉÈÊËÎÏÔÙÛÇ\s]{3,}$/m.test(text);
  const hasBullets = /^[-*•]\s/m.test(text) || /^\d+[.)]\s/m.test(text);
  const hasTables = /\|.*\|.*\|/.test(text);
  const hasNumberedList = /^\s*\d+\.\s/m.test(text);

  const signals = [hasHeadings, hasBullets || hasNumberedList, hasTables].filter(Boolean).length;

  if (hasTables && signals >= 2) return "table";
  if (signals === 0) return text.length > 200 ? "prose" : "minimal";
  if (hasBullets && !hasHeadings) return "bullets";
  if (signals >= 2) return "mixed";
  if (hasHeadings) return "prose";
  return "minimal";
}

function detectDetailedSourceType(text: string, contentType: string, structure: DetectedStructureType): DetailedSourceType {
  const lower = text.toLowerCase();

  // Slides heuristic: short lines, many bullet points, little prose
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const avgLineLen = lines.reduce((s, l) => s + l.length, 0) / (lines.length || 1);
  const bulletRatio = lines.filter((l) => /^[-*•]\s/.test(l.trim())).length / (lines.length || 1);

  if (avgLineLen < 60 && bulletRatio > 0.3) return "slides";

  // Institutional: formal language, references to articles/lois
  const institutionalMarkers = ["article", "décret", "arrêté", "circulaire", "recommandation", "has", "ansm", "protocole", "référentiel"];
  const instCount = institutionalMarkers.filter((m) => lower.includes(m)).length;
  if (instCount >= 3) return "institutional";

  // Polycopié: long, structured, academic
  if (structure === "mixed" || structure === "prose") {
    if (text.length > 3000 && (structure === "mixed" || /^#{1,3}\s/m.test(text))) return "polycopie";
  }

  // Personal notes: short, unstructured
  if (structure === "minimal" && text.length < 2000) return "personal_notes";

  // PDF / DOCX default
  if (contentType === "application/pdf") return "polycopie";
  if (contentType.includes("wordprocessingml")) return "polycopie";

  return "unknown";
}

function segmentText(text: string, structure: DetectedStructureType): SegmentOutput[] {
  // Split by double newlines or heading patterns
  const parts = text.split(/\n{2,}|(?=^#{1,6}\s)/m);
  const segments: SegmentOutput[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.length === 0) continue;

    const firstLine = part.split("\n")[0];
    const isHeading = /^#{1,6}\s/.test(part) || /^[A-Z][A-ZÀÂÉÈÊËÎÏÔÙÛÇ\s]{3,}$/.test(firstLine);

    const headingMatch = part.match(/^(#+)\s*/);
    const headingLevel = headingMatch ? Math.min(headingMatch[1].length, 3) : (isHeading ? 1 : 0);

    segments.push({
      segment_index: segments.length,
      title: isHeading ? firstLine.replace(/^#+\s*/, "").trim() : null,
      content: part,
      hierarchy_level: headingLevel,
      confidence_score: structure === "minimal" ? 0.6 : 1.0,
      page_ref: null,
    });
  }

  return segments;
}

function computeConfidence(wordCount: number, structure: DetectedStructureType, segmentCount: number, sourceType: DetailedSourceType): number {
  let score = 0.3;

  // Word count contribution
  if (wordCount >= 200) score += 0.1;
  if (wordCount >= 500) score += 0.1;
  if (wordCount >= 1000) score += 0.05;

  // Structure contribution
  if (structure === "mixed") score += 0.15;
  else if (structure === "prose") score += 0.1;
  else if (structure === "bullets") score += 0.1;
  else if (structure === "table") score += 0.05;
  // minimal: no bonus

  // Segmentation quality
  if (segmentCount >= 3) score += 0.1;
  if (segmentCount >= 5) score += 0.05;

  // Source type bonus
  if (sourceType === "institutional") score += 0.1;
  else if (sourceType === "polycopie") score += 0.05;

  return Math.min(1, Math.max(0, score));
}

function computeReliability(sourceType: DetailedSourceType, wordCount: number, structure: DetectedStructureType): number {
  let score = 0.3;

  if (sourceType === "institutional") score += 0.3;
  else if (sourceType === "polycopie") score += 0.2;
  else if (sourceType === "slides") score += 0.1;

  if (wordCount >= 500) score += 0.1;
  if (structure !== "minimal") score += 0.15;
  if (structure === "mixed") score += 0.05;

  return Math.min(1, Math.max(0, score));
}

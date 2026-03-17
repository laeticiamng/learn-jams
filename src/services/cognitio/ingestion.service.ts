// ============================================================
// COGNITIO Ingestion Service (M1)
// Upload, parse, clean, segment, score documents
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { M1_Output, SourceIssue, SegmentOutput, IngestInput } from "@/domain/cognitio/contracts";
import type { DetailedSourceType, DetectedStructureType, SourceDocument } from "@/domain/cognitio/types";
import { validateWordCount, WORD_COUNT_THRESHOLDS } from "@/domain/cognitio/validators";
import { createCognitioError } from "@/lib/cognitio-errors";
import { toSourceDocument } from "@/domain/cognitio/mappers";
import { buildStoragePath } from "@/security/storagePaths";
import { extractTextFromFile, type ExtractionResult } from "./file-extractor.service";

// ---------- Upload ----------

export interface UploadResult {
  document_id: string;
  storage_path: string | null;
  storage_error: string | null;
  bucket_used: string | null;
}

export async function uploadDocument(
  userId: string,
  input: IngestInput
): Promise<UploadResult> {
  let storagePath: string | null = null;
  let storageError: string | null = null;
  let bucketUsed: string | null = null;
  const hasTextFallback = Boolean(input.pasted_text && input.pasted_text.trim().length > 0);

  if (input.file) {
    const fileName = `${userId}/${crypto.randomUUID()}/${input.file.name}`;

    // Try source-raw bucket first
    const { error: uploadError } = await supabase.storage
      .from("source-raw")
      .upload(fileName, input.file);

    if (!uploadError) {
      storagePath = fileName;
      bucketUsed = "source-raw";
    } else {
      console.warn("[COGNITIO] source-raw upload failed, trying course-documents:", uploadError.message);

      // Fallback to course-documents bucket
      const { error: uploadError2 } = await supabase.storage
        .from("course-documents")
        .upload(fileName, input.file);

      if (!uploadError2) {
        storagePath = fileName;
        bucketUsed = "course-documents";
      } else {
        storageError = `source-raw: ${uploadError.message} | course-documents: ${uploadError2.message}`;
        console.error("[COGNITIO] Both storage buckets failed:", storageError);

        // CRITICAL FIX: If text was already extracted client-side, storage is non-fatal.
        // We can proceed without the file in storage — the text is in pasted_text.
        if (!hasTextFallback) {
          throw createCognitioError(
            "STORAGE_WRITE_FAILED",
            `storage:upload failed on both buckets and no extracted text available. ${storageError}`
          );
        }
        // If text IS available, continue without storage — the local fallback will use pasted_text
        console.warn("[COGNITIO] Storage failed but text already extracted — proceeding without file storage");
      }
    }
  }

  const { data, error } = await supabase
    .from("source_documents")
    .insert([{
      user_id: userId,
      original_filename: input.file?.name ?? null,
      content_type: input.content_type,
      ingestion_status: "pending",
      raw_storage_path: storagePath,
      warnings_json: (storageError
        ? [{ code: "STORAGE_UPLOAD_FAILED", message: `Upload fichier échoué (non bloquant): ${storageError}`, severity: "info" }]
        : []) as unknown as Json,
    }])
    .select("id")
    .single();

  if (error) throw createCognitioError("DB_WRITE_FAILED", `db:source_documents insert failed: ${error.message} (code: ${error.code}, hint: ${error.hint ?? "none"})`);

  return { document_id: data.id, storage_path: storagePath, storage_error: storageError, bucket_used: bucketUsed };
}

// ---------- Run Ingestion (Edge Function) ----------

export async function runIngestion(
  documentId: string,
  input: IngestInput,
  userId?: string
): Promise<M1_Output> {
  try {
    const { data, error } = await supabase.functions.invoke("cognitio-ingest", {
      body: {
        document_id: documentId,
        pasted_text: input.pasted_text,
        content_type: input.content_type,
        objective: input.objective,
        language: input.language,
        user_id: userId,
      },
    });

    if (error) throw error;

    // Edge function may return an error payload with 200 status
    if (data?.error) {
      throw new Error(`edge_fn:${data.error_source ?? "unknown"}: ${data.error}`);
    }

    return data as M1_Output;
  } catch (err: unknown) {
    console.warn("[COGNITIO] Edge function failed, falling back to local ingestion:", err);
    return runLocalIngestion(documentId, input);
  }
}

// ---------- Client-side text extraction ----------

/**
 * Extract text from a file using proper parsers (pdfjs-dist for PDF, JSZip for DOCX).
 * This is the PRIMARY extraction path — called before edge function to ensure
 * text is available regardless of backend status.
 */
export async function extractFileText(file: File): Promise<ExtractionResult> {
  console.info(`[COGNITIO] Extracting text from file: ${file.name} (${file.type}, ${file.size} bytes)`);
  const result = await extractTextFromFile(file);

  if (result.success) {
    console.info(`[COGNITIO] Extraction success via ${result.method}: ${result.text.length} chars`);
  } else {
    console.error(`[COGNITIO] Extraction failed via ${result.method}: ${result.error}`);
  }

  if (result.warnings.length > 0) {
    console.warn("[COGNITIO] Extraction warnings:", result.warnings);
  }

  return result;
}

// ---------- Local Ingestion Fallback ----------

export async function runLocalIngestion(
  documentId: string,
  input: IngestInput
): Promise<M1_Output> {
  let text = input.pasted_text || "";
  const extraIssues: SourceIssue[] = [];

  // If no pasted text but a file was uploaded, extract text with proper parsers
  if (!text && input.file) {
    console.info("[COGNITIO] Local fallback: extracting text from uploaded file with proper parsers");
    const extraction = await extractTextFromFile(input.file);

    if (extraction.success && extraction.text.trim().length > 0) {
      text = extraction.text;
      // Track warnings from extraction
      for (const w of extraction.warnings) {
        extraIssues.push({ code: "EXTRACTION_WARNING", message: w, severity: "info" });
      }
      if (extraction.method !== "plain_text") {
        extraIssues.push({
          code: "LOCAL_EXTRACTION_USED",
          message: `Extraction locale (${extraction.method}) — le service distant n'était pas disponible`,
          severity: "info",
        });
      }
    } else {
      console.warn("[COGNITIO] Local fallback: extraction failed for", input.file.name, extraction.error);
      extraIssues.push({
        code: "FILE_PARSE_FAILED",
        message: extraction.error || `Impossible de lire le fichier ${input.file.name}`,
        severity: "blocking",
        action_required: true,
      });
    }
  }

  if (!text && !input.file && !input.pasted_text) {
    console.warn("[COGNITIO] Local fallback: no text and no file available");
  }

  const result = extractAndAnalyzeText(text);
  // Merge extraction issues
  result.issues = [...extraIssues, ...result.issues];

  try {
    const sourceType = input.content_type === "application/pdf"
      ? "pdf_text"
      : input.content_type?.includes("wordprocessingml")
        ? "docx"
        : "pasted_text";

    await supabase.from("source_documents").update({
      ingestion_status: "parsed",
      quality_score: result.confidence_level,
      source_type: sourceType,
      detailed_source_type: result.source_type,
      detected_structure: result.detected_structure,
      source_language: result.language,
      detected_language: result.language,
      word_count: result.word_count,
      warnings_json: result.issues as unknown as Json,
    }).eq("id", documentId);

    if (result.segments.length > 0) {
      await supabase.from("document_segments").insert(
        result.segments.map((s) => ({
          document_id: documentId,
          segment_index: s.segment_index,
          title: s.title,
          content: s.content,
          hierarchy_level: s.hierarchy_level,
          confidence_score: s.confidence_score,
          page_ref: s.page_ref != null ? Number(s.page_ref) : null,
        }))
      );
    }
  } catch (dbErr: unknown) {
    console.error("DB persist failed during local ingestion:", dbErr);
  }

  return { ...result, document_id: documentId };
}

// ---------- Text Extraction & Analysis (pure, no side-effects) ----------

export function extractAndAnalyzeText(rawText: string): Omit<M1_Output, "document_id"> {
  const issues: SourceIssue[] = [];

  const cleanText = cleanRawText(rawText);

  if (!cleanText || cleanText.trim().length === 0) {
    issues.push({ code: "EMPTY_DOCUMENT", message: "Aucun texte exploitable détecté", severity: "blocking", action_required: true });
    return { clean_text: "", word_count: 0, language: "unknown", source_type: "unknown", confidence_level: 0, detected_structure: "minimal", issues, segments: [] };
  }

  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const wcResult = validateWordCount(wordCount);

  if (!wcResult.valid) {
    issues.push({ code: "DOCUMENT_TOO_SHORT", message: `Seulement ${wordCount} mots (minimum recommandé: ${WORD_COUNT_THRESHOLDS.MIN_VIABLE})`, severity: "warning" });
  }
  if (wcResult.action === "chunk") {
    issues.push({ code: "DOCUMENT_TOO_LONG", message: `${wordCount} mots — segmentation automatique appliquée`, severity: "info" });
  }

  const language = detectLanguage(cleanText);
  const structure = detectStructure(cleanText);

  if (structure === "minimal") {
    issues.push({ code: "NO_STRUCTURE", message: "Aucune structure claire détectée", severity: "warning" });
  }

  const sourceType = detectDetailedSourceType(cleanText, structure);
  const segments = segmentText(cleanText);
  const confidence = computeConfidence(wordCount, structure, segments.length, sourceType);

  if (confidence < WORD_COUNT_THRESHOLDS.CONFIDENCE_BLOCKING) {
    issues.push({ code: "LOW_CONFIDENCE_BLOCKING", message: "Confiance trop faible pour analyse fiable", severity: "blocking", action_required: true });
  }

  return { clean_text: cleanText, word_count: wordCount, language, source_type: sourceType, confidence_level: confidence, detected_structure: structure, issues, segments };
}

// ---------- Helpers ----------

function cleanRawText(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\f/g, "\n");

  const lines = cleaned.split("\n");
  const lineCounts: Record<string, number> = {};
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 5 && t.length < 80) lineCounts[t] = (lineCounts[t] || 0) + 1;
  }
  const repeated = new Set(Object.entries(lineCounts).filter(([, c]) => c > 3).map(([l]) => l));
  if (repeated.size > 0) cleaned = lines.filter((l) => !repeated.has(l.trim())).join("\n");

  cleaned = cleaned.replace(/^\s*\d{1,4}\s*$/gm, "");
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

function detectLanguage(text: string): string {
  const frWords = ["le", "la", "les", "de", "du", "des", "un", "une", "est", "sont", "dans", "pour", "par"];
  const enWords = ["the", "a", "an", "is", "are", "in", "of", "to", "and", "for", "that", "this"];
  const words = text.toLowerCase().split(/\s+/).slice(0, 300);
  const frCount = words.filter((w) => frWords.includes(w)).length;
  const enCount = words.filter((w) => enWords.includes(w)).length;
  return frCount > enCount ? "fr" : "en";
}

function detectStructure(text: string): DetectedStructureType {
  const hasMarkdownHeadings = /^#{1,6}\s/m.test(text);
  const hasAllCapsHeadings = /^[A-Z][A-ZÀÂÉÈÊËÎÏÔÙÛÇ\s]{3,}$/m.test(text);
  const hasRomanHeadings = /^[IVXLC]+\s*[.):\-–—]\s+/m.test(text);
  const hasNumberedHeadings = /^\d+\.\s+[A-ZÀ-Ÿ]/m.test(text);
  const hasHeadings = hasMarkdownHeadings || hasAllCapsHeadings || hasRomanHeadings || hasNumberedHeadings;

  const hasBullets = /^[-*•]\s/m.test(text) || /^\s*\d+[.)]\s/m.test(text);
  const hasTables = /\|.*\|.*\|/.test(text) || /\t.*\t/.test(text);
  const hasSubsections = /^\d+\.\d+/m.test(text) || /^[A-Z]\)\s/m.test(text);
  const signals = [hasHeadings, hasBullets, hasTables, hasSubsections].filter(Boolean).length;

  if (hasTables && signals >= 2) return "table";
  if (signals === 0) return text.length > 200 ? "prose" : "minimal";
  if (hasBullets && !hasHeadings) return "bullets";
  if (signals >= 2) return "mixed";
  if (hasHeadings) return "prose";
  return "minimal";
}

function detectDetailedSourceType(text: string, structure: DetectedStructureType): DetailedSourceType {
  const lower = text.toLowerCase();
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const avgLineLen = lines.reduce((s, l) => s + l.length, 0) / (lines.length || 1);
  const bulletRatio = lines.filter((l) => /^[-*•]\s/.test(l.trim())).length / (lines.length || 1);

  if (avgLineLen < 60 && bulletRatio > 0.3) return "slides";
  const instMarkers = ["article", "décret", "arrêté", "circulaire", "recommandation", "protocole", "référentiel"];
  if (instMarkers.filter((m) => lower.includes(m)).length >= 3) return "institutional";
  if (structure === "mixed" || (structure === "prose" && text.length > 3000)) return "polycopie";
  if (structure === "minimal" && text.length < 2000) return "personal_notes";
  return "unknown";
}

// ---------- Section Header Detection Patterns ----------

const HEADING_PATTERNS: { pattern: RegExp; level: number }[] = [
  // Markdown headings
  { pattern: /^(#{1,6})\s+(.+)$/, level: 0 }, // level derived from # count
  // Roman numeral headings: "I.", "II.", "III. Title", "IV - Title"
  { pattern: /^([IVXLC]+)\s*[.):\-–—]\s*(.+)$/i, level: 1 },
  // Numbered headings: "1.", "1)", "1 -", "1.2.", "1.2.3"
  { pattern: /^(\d+)\s*[.):\-–—]\s+([A-ZÀ-Ÿ].{3,})$/, level: 1 },
  { pattern: /^(\d+\.\d+)\s*[.):\-–—]?\s*([A-ZÀ-Ÿ].{3,})$/, level: 2 },
  { pattern: /^(\d+\.\d+\.\d+)\s*[.):\-–—]?\s*(.{3,})$/, level: 3 },
  // Lettered headings: "A.", "B)", "a)"
  { pattern: /^([A-Z])\s*[.):\-–—]\s+([A-ZÀ-Ÿ].{5,})$/, level: 2 },
  // ALL-CAPS headings (min 4 chars, allow accented)
  { pattern: /^([A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ][A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ\s,'']{3,})$/, level: 1 },
  // French academic-style: "Chapitre X", "Partie X", "Section X"
  { pattern: /^(?:Chapitre|Partie|Section|Titre)\s+[\dIVXLC]+\s*[:\-–—.]?\s*(.+)$/i, level: 1 },
];

/**
 * Detect if a line is a section heading and return its level (1-3) and cleaned title.
 * Returns null if not a heading.
 */
function detectHeading(line: string): { level: number; title: string } | null {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 200) return null;

  for (const { pattern, level } of HEADING_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    // Markdown: derive level from # count
    if (pattern.source.startsWith("^(#{1,6})")) {
      const hashCount = match[1].length;
      return { level: Math.min(hashCount, 3), title: match[2].trim() };
    }

    // For ALL-CAPS pattern, reject if it's too short or looks like an acronym
    if (level === 1 && /^[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ]+$/.test(trimmed) && trimmed.length < 4) continue;

    const title = match[match.length - 1]?.trim() || match[0].replace(/^[\dIVXLC.)\-–—:\s]+/, "").trim();
    if (title.length < 3) continue;

    return { level, title };
  }

  return null;
}

// ---------- Table Extraction ----------

/**
 * Detect and extract table blocks from text.
 * Returns table content as structured semantic blocks.
 */
function extractTableBlocks(text: string): { startLine: number; endLine: number; semantic: string }[] {
  const lines = text.split("\n");
  const tables: { startLine: number; endLine: number; semantic: string }[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect pipe-delimited table rows
    if (/\|.*\|.*\|/.test(line)) {
      const startLine = i;
      const tableLines: string[] = [];

      while (i < lines.length && /\|/.test(lines[i].trim())) {
        const tl = lines[i].trim();
        // Skip separator rows (|---|---|)
        if (!/^[\s|:\-–—]+$/.test(tl)) {
          tableLines.push(tl);
        }
        i++;
      }

      if (tableLines.length >= 2) {
        // Parse table into semantic description
        const headers = tableLines[0].split("|").map(c => c.trim()).filter(Boolean);
        const rows = tableLines.slice(1).map(row =>
          row.split("|").map(c => c.trim()).filter(Boolean)
        );

        let semantic = `Tableau comparatif (${headers.join(" / ")}):\n`;
        for (const row of rows) {
          const pairs = row.map((cell, ci) => headers[ci] ? `${headers[ci]}: ${cell}` : cell).filter(Boolean);
          semantic += `- ${pairs.join(", ")}\n`;
        }
        tables.push({ startLine, endLine: i - 1, semantic: semantic.trim() });
      }
      continue;
    }

    // Detect tab-separated or multi-column text (heuristic)
    if (/\t/.test(line) && line.split("\t").filter(Boolean).length >= 2) {
      const startLine = i;
      const tabLines: string[] = [];

      while (i < lines.length && /\t/.test(lines[i])) {
        tabLines.push(lines[i].trim());
        i++;
      }

      if (tabLines.length >= 2) {
        const cols = tabLines[0].split("\t").filter(Boolean);
        let semantic = `Tableau (${cols.join(" / ")}):\n`;
        for (const tl of tabLines.slice(1)) {
          const cells = tl.split("\t").filter(Boolean);
          const pairs = cells.map((cell, ci) => cols[ci] ? `${cols[ci]}: ${cell}` : cell).filter(Boolean);
          semantic += `- ${pairs.join(", ")}\n`;
        }
        tables.push({ startLine, endLine: i - 1, semantic: semantic.trim() });
      }
      continue;
    }

    i++;
  }

  return tables;
}

// ---------- Hierarchical Segmentation ----------

function segmentText(text: string): SegmentOutput[] {
  const lines = text.split("\n");
  const segments: SegmentOutput[] = [];

  // First pass: extract tables so we can incorporate them
  const tableBlocks = extractTableBlocks(text);
  const tableLineSet = new Set<number>();
  for (const tb of tableBlocks) {
    for (let l = tb.startLine; l <= tb.endLine; l++) tableLineSet.add(l);
  }

  let currentTitle: string | null = null;
  let currentLevel = 0;
  let currentContent: string[] = [];
  let nextTableIdx = 0;

  function flushSegment() {
    const content = currentContent.join("\n").trim();
    if (content.length === 0 && !currentTitle) return;

    segments.push({
      segment_index: segments.length,
      title: currentTitle,
      content: content || (currentTitle ?? ""),
      hierarchy_level: currentLevel,
      confidence_score: currentTitle ? 1.0 : 0.7,
      page_ref: null,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    // Skip lines that belong to tables (they'll be added as table segments)
    if (tableLineSet.has(i)) {
      // Check if we've reached a table block start
      if (nextTableIdx < tableBlocks.length && tableBlocks[nextTableIdx].startLine === i) {
        const tb = tableBlocks[nextTableIdx];
        // Flush current content before adding table
        if (currentContent.length > 0 || currentTitle) {
          flushSegment();
          currentContent = [];
        }
        // Add table as its own segment
        segments.push({
          segment_index: segments.length,
          title: "Tableau",
          content: tb.semantic,
          hierarchy_level: Math.max(currentLevel + 1, 2),
          confidence_score: 0.9,
          page_ref: null,
        });
        nextTableIdx++;
      }
      continue;
    }

    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      if (currentContent.length > 0) currentContent.push("");
      continue;
    }

    const heading = detectHeading(trimmed);

    if (heading) {
      // Flush previous segment
      if (currentContent.length > 0 || currentTitle) {
        flushSegment();
        currentContent = [];
      }
      currentTitle = heading.title;
      currentLevel = heading.level;
    } else {
      currentContent.push(trimmed);
    }
  }

  // Flush last segment
  if (currentContent.length > 0 || currentTitle) {
    flushSegment();
  }

  // P0 FIX: If only 0–1 segments were created (flat document with no headings),
  // apply paragraph-based segmentation so downstream M2 gets usable chunks.
  if (segments.length <= 1 && text.length > 200) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 50);

    if (paragraphs.length >= 2) {
      console.info(`[COGNITIO] Flat document detected (${segments.length} segment). Applying paragraph-based fallback → ${paragraphs.length} paragraphs.`);
      const paraSegments: SegmentOutput[] = paragraphs.map((p, idx) => {
        const firstLine = p.split(/\n/)[0].trim();
        const autoTitle = firstLine.length <= 100 && firstLine.length >= 5
          ? firstLine
          : `Section ${idx + 1}`;
        return {
          segment_index: idx,
          title: autoTitle,
          content: p,
          hierarchy_level: 1,
          confidence_score: 0.5,
          page_ref: null,
        };
      });
      return paraSegments;
    }
  }

  return segments;
}

function computeConfidence(wordCount: number, structure: DetectedStructureType, segmentCount: number, sourceType: DetailedSourceType): number {
  let score = 0.3;
  if (wordCount >= 200) score += 0.1;
  if (wordCount >= 500) score += 0.1;
  if (wordCount >= 1000) score += 0.05;
  if (structure === "mixed") score += 0.15;
  else if (structure === "prose" || structure === "bullets") score += 0.1;
  else if (structure === "table") score += 0.05;
  if (segmentCount >= 3) score += 0.1;
  if (segmentCount >= 5) score += 0.05;
  if (sourceType === "institutional") score += 0.1;
  else if (sourceType === "polycopie") score += 0.05;
  return Math.min(1, Math.max(0, score));
}

// ---------- Getters ----------

export async function getDocument(documentId: string): Promise<SourceDocument | null> {
  const { data, error } = await supabase
    .from("source_documents")
    .select("*")
    .eq("id", documentId)
    .single();
  if (error || !data) return null;
  return toSourceDocument(data as Record<string, unknown>);
}

export async function getUserDocuments(userId: string): Promise<SourceDocument[]> {
  const { data, error } = await supabase
    .from("source_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => toSourceDocument(row as Record<string, unknown>));
}

export async function updateIngestionStatus(
  documentId: string,
  status: string,
  extra?: Record<string, unknown>
) {
  await supabase.from("source_documents").update({ ingestion_status: status, ...extra }).eq("id", documentId);
}

// ============================================================
// COGNITIO Ingestion Service (M1)
// Upload, parse, clean, segment, score documents
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { M1_Output, SourceIssue, SegmentOutput, IngestInput } from "@/domain/cognitio/contracts";
import type { DetailedSourceType, DetectedStructureType, SourceDocument } from "@/domain/cognitio/types";
import { validateWordCount, WORD_COUNT_THRESHOLDS } from "@/domain/cognitio/validators";
import { createCognitioError } from "@/lib/cognitio-errors";
import { toSourceDocument } from "@/domain/cognitio/mappers";
import { extractTextFromFile, type ExtractionResult } from "./file-extractor.service";

// ---------- Upload ----------

export async function uploadDocument(
  userId: string,
  input: IngestInput
): Promise<{ document_id: string; storage_path: string | null }> {
  let storagePath: string | null = null;

  if (input.file) {
    const fileName = `${userId}/${crypto.randomUUID()}/${input.file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("source-raw")
      .upload(fileName, input.file);

    if (uploadError) {
      console.warn("[COGNITIO] source-raw upload failed, trying course-documents:", uploadError.message);
      // Fallback to course-documents bucket
      const { error: uploadError2 } = await supabase.storage
        .from("course-uploads")
        .upload(fileName, input.file);

      if (uploadError2) {
        throw createCognitioError(
          "STORAGE_WRITE_FAILED",
          `storage:upload failed on both buckets. source-raw: ${uploadError.message} | course-documents: ${uploadError2.message}`
        );
      }
    }
    storagePath = fileName;
  }

  const { data, error } = await (supabase as any)
    .from("source_documents")
    .insert({
      user_id: userId,
      original_filename: input.file?.name ?? null,
      content_type: input.content_type,
      ingestion_status: "pending",
      raw_storage_path: storagePath,
      warnings_json: [],
    })
    .select("id")
    .single();

  if (error) throw createCognitioError("DB_WRITE_FAILED", `db:source_documents insert failed: ${error.message} (code: ${error.code}, hint: ${error.hint ?? "none"})`);

  return { document_id: data.id, storage_path: storagePath };
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
  } catch (err) {
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

    await (supabase as any).from("source_documents").update({
      ingestion_status: "parsed",
      quality_score: result.confidence_level,
      source_type: sourceType,
      detailed_source_type: result.source_type,
      detected_structure: result.detected_structure,
      source_language: result.language,
      detected_language: result.language,
      word_count: result.word_count,
      warnings_json: result.issues,
    }).eq("id", documentId);

    if (result.segments.length > 0) {
      await (supabase as any).from("document_segments").insert(
        result.segments.map((s) => ({
          document_id: documentId,
          segment_index: s.segment_index,
          title: s.title,
          content: s.content,
          hierarchy_level: s.hierarchy_level,
          confidence_score: s.confidence_score,
          page_ref: s.page_ref,
        }))
      );
    }
  } catch (dbErr) {
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
  const hasHeadings = /^#{1,6}\s/m.test(text) || /^[A-Z][A-ZÀÂÉÈÊËÎÏÔÙÛÇ\s]{3,}$/m.test(text);
  const hasBullets = /^[-*•]\s/m.test(text) || /^\s*\d+[.)]\s/m.test(text);
  const hasTables = /\|.*\|.*\|/.test(text);
  const signals = [hasHeadings, hasBullets, hasTables].filter(Boolean).length;

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

function segmentText(text: string): SegmentOutput[] {
  const parts = text.split(/\n{2,}|(?=^#{1,6}\s)/m);
  const segments: SegmentOutput[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    const firstLine = trimmed.split("\n")[0];
    const isHeading = /^#{1,6}\s/.test(trimmed) || /^[A-Z][A-ZÀÂÉÈÊËÎÏÔÙÛÇ\s]{3,}$/.test(firstLine);
    const headingMatch = trimmed.match(/^(#+)\s*/);
    const headingLevel = headingMatch ? Math.min(headingMatch[1].length, 3) : isHeading ? 1 : 0;

    segments.push({
      segment_index: segments.length,
      title: isHeading ? firstLine.replace(/^#+\s*/, "").trim() : null,
      content: trimmed,
      hierarchy_level: headingLevel,
      confidence_score: 1.0,
      page_ref: null,
    });
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
  const { data, error } = await (supabase as any)
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
  await (supabase as any).from("source_documents").update({ ingestion_status: status, ...extra }).eq("id", documentId);
}

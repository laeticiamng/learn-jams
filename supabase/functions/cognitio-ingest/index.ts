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

    // ---------- Text extraction ----------

    if (pasted_text) {
      cleanText = cleanRawText(pasted_text);
    } else if (doc.raw_storage_path) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from("source-raw")
        .download(doc.raw_storage_path);

      if (fileError) {
        // Fallback to course-documents bucket
        const { data: fileData2, error: fileError2 } = await supabase.storage
          .from("course-documents")
          .download(doc.raw_storage_path);

        if (fileError2) {
          await logOps(supabase, "upload_failed", "error", document_id, user_id, { error: fileError2.message });
          throw new Error(`File download failed: ${fileError2.message}`);
        }

        cleanText = await extractText(fileData2!, content_type, issues);
      } else {
        cleanText = await extractText(fileData!, content_type, issues);
      }
    }

    // ---------- Cleaning ----------

    cleanText = cleanRawText(cleanText);

    if (!cleanText || cleanText.trim().length === 0) {
      issues.push({ code: "EMPTY_DOCUMENT", message: "Aucun texte exploitable détecté", severity: "blocking", action_required: true });
      await supabase.from("source_documents").update({ ingestion_status: "error", warnings_json: issues }).eq("id", document_id);
      await logOps(supabase, "ingest_blocked", "error", document_id, user_id, { reason: "empty_document" });
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
  } catch (error) {
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
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  severity: string,
  documentId?: string,
  userId?: string,
  payload?: Record<string, unknown>
) {
  try {
    await supabase.from("ops_events").insert({
      event_type: eventType,
      severity,
      document_id: documentId || null,
      user_id: userId || null,
      payload_json: payload || {},
    });
  } catch {
    // Ops logging failure should never block the pipeline
    console.error("Ops logging failed for:", eventType);
  }
}

async function extractText(fileData: Blob, contentType: string, issues: SourceIssue[]): Promise<string> {
  if (contentType === "text/plain") {
    return await fileData.text();
  }

  if (contentType === "application/pdf") {
    // PDF text extraction (simplified - real impl would use pdf-parse)
    const text = await fileData.text();
    if (!text || text.trim().length < 20) {
      issues.push({ code: "PDF_NO_TEXT", message: "Le PDF ne contient pas de texte extractible (scan/image ?)", severity: "blocking", action_required: true });
      return "";
    }
    issues.push({ code: "PDF_BASIC", message: "Extraction PDF basique — certains formatages peuvent être perdus", severity: "info" });
    return text;
  }

  if (contentType.includes("wordprocessingml")) {
    const text = await fileData.text();
    issues.push({ code: "DOCX_BASIC", message: "Extraction DOCX basique", severity: "info" });
    return text;
  }

  issues.push({ code: "UNSUPPORTED_TYPE", message: `Type non supporté: ${contentType}`, severity: "blocking", action_required: true });
  return "";
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

  return cleaned;
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

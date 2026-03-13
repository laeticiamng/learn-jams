// ============================================================
// COGNITIO Ingestion Service — Upload, parse, segment
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { IngestInput, IngestOutput } from "@/domain/cognitio/contracts";
import type { IngestionWarning } from "@/domain/cognitio/types";
import { validateWordCount, WORD_COUNT_THRESHOLDS } from "@/domain/cognitio/validators";

export async function uploadDocument(
  userId: string,
  input: IngestInput
): Promise<{ document_id: string; storage_path: string | null }> {
  let storagePath: string | null = null;

  if (input.file) {
    const ext = input.file.name.split(".").pop() || "bin";
    const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("course-documents")
      .upload(filePath, input.file, { contentType: input.content_type });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    storagePath = filePath;
  }

  const { data, error } = await supabase
    .from("source_documents")
    .insert({
      user_id: userId,
      original_filename: input.file?.name ?? null,
      content_type: input.content_type,
      source_type: input.file ? detectSourceType(input.content_type) : "pasted_text",
      source_language: input.language ?? null,
      ingestion_status: "pending",
      raw_storage_path: storagePath,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Document insert failed: ${error.message}`);
  return { document_id: data.id, storage_path: storagePath };
}

function detectSourceType(contentType: string): string {
  if (contentType === "application/pdf") return "pdf_text";
  if (contentType.includes("wordprocessingml")) return "docx";
  return "pasted_text";
}

export async function runIngestion(
  documentId: string,
  input: IngestInput
): Promise<IngestOutput> {
  // Update status to parsing
  await updateIngestionStatus(documentId, "parsing");

  try {
    // Call edge function for server-side parsing
    const { data, error } = await supabase.functions.invoke("cognitio-ingest", {
      body: {
        document_id: documentId,
        pasted_text: input.pasted_text,
        content_type: input.content_type,
        objective: input.objective,
        language: input.language,
      },
    });

    if (error) throw new Error(`Ingestion failed: ${error.message}`);

    await updateIngestionStatus(documentId, "parsed");
    return data as IngestOutput;
  } catch (err) {
    await updateIngestionStatus(documentId, "error");
    throw err;
  }
}

export async function updateIngestionStatus(
  documentId: string,
  status: string,
  qualityScore?: number,
  reliabilityScore?: number,
  warnings?: IngestionWarning[]
) {
  const update: Record<string, unknown> = { ingestion_status: status };
  if (qualityScore !== undefined) update.quality_score = qualityScore;
  if (reliabilityScore !== undefined) update.source_reliability_score = reliabilityScore;
  if (warnings !== undefined) update.warnings_json = warnings;

  const { error } = await supabase
    .from("source_documents")
    .update(update)
    .eq("id", documentId);

  if (error) throw new Error(`Status update failed: ${error.message}`);
}

export async function saveSegments(
  documentId: string,
  segments: IngestOutput["segments"]
) {
  const rows = segments.map((seg) => ({
    document_id: documentId,
    segment_index: seg.segment_index,
    title: seg.title,
    content: seg.content,
    hierarchy_level: seg.hierarchy_level,
    confidence_score: seg.confidence_score,
    page_ref: seg.page_ref,
  }));

  const { error } = await supabase
    .from("document_segments")
    .insert(rows);

  if (error) throw new Error(`Segments insert failed: ${error.message}`);
}

// Client-side text extraction for pasted text (no edge function needed)
export function extractPastedText(text: string): {
  clean_text: string;
  word_count: number;
  warnings: IngestionWarning[];
  segments: IngestOutput["segments"];
} {
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const warnings: IngestionWarning[] = [];

  const wordCheck = validateWordCount(wordCount);
  if (!wordCheck.valid) {
    warnings.push({
      code: "TOO_SHORT",
      message: `Le texte contient seulement ${wordCount} mots (minimum ${WORD_COUNT_THRESHOLDS.MIN_VIABLE})`,
      severity: "error",
    });
  }
  if (wordCheck.action === "chunk") {
    warnings.push({
      code: "LONG_TEXT",
      message: `Texte de ${wordCount} mots — segmentation automatique appliquée`,
      severity: "info",
    });
  }

  // Simple paragraph-based segmentation
  const paragraphs = clean.split(/\n{2,}/);
  const segments: IngestOutput["segments"] = paragraphs
    .filter((p) => p.trim().length > 0)
    .map((p, i) => ({
      segment_index: i,
      title: null,
      content: p.trim(),
      hierarchy_level: 0,
      confidence_score: 1.0,
      page_ref: null,
    }));

  return { clean_text: clean, word_count: wordCount, warnings, segments };
}

export async function getDocument(documentId: string) {
  const { data, error } = await supabase
    .from("source_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) throw new Error(`Document fetch failed: ${error.message}`);
  return data;
}

export async function getUserDocuments(userId: string) {
  const { data, error } = await supabase
    .from("source_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Documents fetch failed: ${error.message}`);
  return data ?? [];
}

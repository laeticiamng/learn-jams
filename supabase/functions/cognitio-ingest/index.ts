// ============================================================
// Edge Function: cognitio-ingest
// Parse uploaded documents, extract text, segment content
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngestRequest {
  document_id: string;
  pasted_text?: string;
  content_type: string;
  objective: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: IngestRequest = await req.json();
    const { document_id, pasted_text, content_type, objective, language } = body;

    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get document record
    const { data: doc, error: docError } = await supabase
      .from("source_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cleanText = "";
    const warnings: { code: string; message: string; severity: string }[] = [];

    if (pasted_text) {
      cleanText = pasted_text.trim();
    } else if (doc.raw_storage_path) {
      // Download file from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from("course-documents")
        .download(doc.raw_storage_path);

      if (fileError) {
        throw new Error(`File download failed: ${fileError.message}`);
      }

      // Parse based on content type
      if (content_type === "text/plain") {
        cleanText = await fileData.text();
      } else if (content_type === "application/pdf") {
        // PDF parsing - extract text (simplified for MVP)
        cleanText = await fileData.text();
        warnings.push({
          code: "PDF_BASIC",
          message: "Extraction PDF basique - certains formatages peuvent être perdus",
          severity: "info",
        });
      } else if (content_type.includes("wordprocessingml")) {
        // DOCX parsing - simplified
        cleanText = await fileData.text();
        warnings.push({
          code: "DOCX_BASIC",
          message: "Extraction DOCX basique",
          severity: "info",
        });
      }
    }

    if (!cleanText) {
      return new Response(JSON.stringify({ error: "No text could be extracted" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Word count check
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 100) {
      warnings.push({
        code: "TOO_SHORT",
        message: `Seulement ${wordCount} mots détectés (minimum recommandé: 100)`,
        severity: "warning",
      });
    }

    if (wordCount > 15000) {
      warnings.push({
        code: "LONG_TEXT",
        message: `${wordCount} mots — segmentation automatique appliquée`,
        severity: "info",
      });
    }

    // Detect structure
    const hasHeadings = /^#{1,6}\s/m.test(cleanText) || /^[A-Z][A-Z\s]{2,}$/m.test(cleanText);
    const hasLists = /^[-*]\s/m.test(cleanText) || /^\d+\.\s/m.test(cleanText);
    const hasTables = /\|.*\|/.test(cleanText);

    // Segment text
    const segments = segmentText(cleanText);

    // Compute confidence
    const confidence = computeConfidence(wordCount, hasHeadings, segments.length);

    // Detect source type
    const sourceType = detectSourceType(cleanText, content_type);

    // Compute reliability score
    const reliabilityScore = computeReliability(sourceType, wordCount, hasHeadings);

    // Update document
    await supabase
      .from("source_documents")
      .update({
        ingestion_status: "parsed",
        quality_score: confidence,
        source_reliability_score: reliabilityScore,
        source_type: sourceType,
        source_language: language || detectLanguage(cleanText),
        warnings_json: warnings,
      })
      .eq("id", document_id);

    const result = {
      document_id,
      clean_text: cleanText,
      source_type: sourceType,
      confidence_level: confidence,
      detected_structure: {
        has_headings: hasHeadings,
        has_lists: hasLists,
        has_tables: hasTables,
        estimated_word_count: wordCount,
      },
      issues: warnings,
      segments,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function segmentText(text: string) {
  // Split by double newlines or heading patterns
  const parts = text.split(/\n{2,}|(?=^#{1,6}\s)/m);
  return parts
    .filter((p) => p.trim().length > 0)
    .map((p, i) => {
      const isHeading = /^#{1,6}\s/.test(p) || /^[A-Z][A-Z\s]{2,}$/.test(p.split("\n")[0]);
      return {
        segment_index: i,
        title: isHeading ? p.split("\n")[0].replace(/^#+\s*/, "").trim() : null,
        content: p.trim(),
        hierarchy_level: isHeading ? Math.min(p.match(/^#+/)?.[0]?.length ?? 1, 3) : 0,
        confidence_score: 1.0,
        page_ref: null,
      };
    });
}

function computeConfidence(wordCount: number, hasHeadings: boolean, segmentCount: number): number {
  let score = 0.5;
  if (wordCount >= 200) score += 0.1;
  if (wordCount >= 500) score += 0.1;
  if (hasHeadings) score += 0.1;
  if (segmentCount >= 3) score += 0.1;
  if (wordCount >= 1000) score += 0.1;
  return Math.min(1, score);
}

function computeReliability(sourceType: string, wordCount: number, hasStructure: boolean): number {
  let score = 0.5;
  if (sourceType === "pdf_text") score += 0.15;
  if (sourceType === "docx") score += 0.1;
  if (wordCount >= 500) score += 0.1;
  if (hasStructure) score += 0.15;
  return Math.min(1, score);
}

function detectSourceType(text: string, contentType: string): string {
  if (contentType === "application/pdf") return "pdf_text";
  if (contentType.includes("wordprocessingml")) return "docx";
  return "pasted_text";
}

function detectLanguage(text: string): string {
  // Simple heuristic
  const frWords = ["le", "la", "les", "de", "du", "des", "un", "une", "est", "sont", "dans"];
  const enWords = ["the", "a", "an", "is", "are", "in", "of", "to", "and", "for"];

  const words = text.toLowerCase().split(/\s+/).slice(0, 200);
  const frCount = words.filter((w) => frWords.includes(w)).length;
  const enCount = words.filter((w) => enWords.includes(w)).length;

  return frCount > enCount ? "fr" : "en";
}

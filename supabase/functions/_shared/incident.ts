// ============================================================
// Incident helper — auto-creates an incident when a critical
// alert is triggered, and exposes manual create/update helpers.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface IncidentInput {
  title: string;
  description?: string;
  severity?: "minor" | "major" | "critical";
  affectedComponents?: string[];
}

export async function createIncident(
  supabase: SupabaseClient,
  input: IncidentInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title: input.title,
      description: input.description ?? null,
      severity: input.severity ?? "minor",
      affected_components: input.affectedComponents ?? [],
      status: "investigating",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[incident] create failed:", error.message);
    return null;
  }
  return data.id as string;
}

export async function postIncidentUpdate(
  supabase: SupabaseClient,
  incidentId: string,
  message: string,
  statusAtPost: "investigating" | "identified" | "monitoring" | "resolved",
): Promise<void> {
  const { error } = await supabase.from("incident_updates").insert({
    incident_id: incidentId,
    message,
    status_at_post: statusAtPost,
  });
  if (error) console.error("[incident] update failed:", error.message);

  await supabase.from("incidents").update({ status: statusAtPost }).eq("id", incidentId);
}

/**
 * Auto-incident from a critical alert. Deduplicates by title within last 1h
 * (so repeated firings of the same alert don't spam the timeline).
 */
export async function autoIncidentFromAlert(
  supabase: SupabaseClient,
  title: string,
  description: string,
  components: string[] = [],
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("incidents")
    .select("id")
    .eq("title", title)
    .gte("started_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .neq("status", "resolved")
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  return createIncident(supabase, {
    title,
    description,
    severity: "critical",
    affectedComponents: components,
  });
}

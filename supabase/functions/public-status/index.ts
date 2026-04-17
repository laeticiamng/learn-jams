// ============================================================
// Edge Function: public-status (no auth) — public health page
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProviderStatus {
  key: string;
  label: string;
  state: "operational" | "degraded" | "outage";
  consecutive_failures: number;
  last_failure_at: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  suno: "Génération musicale",
  openai: "IA texte (OpenAI)",
  lovable_ai: "IA texte (Lovable)",
  resend: "Notifications email",
  twilio: "Notifications SMS",
  stripe: "Paiements",
};

function mapState(dbState: string): ProviderStatus["state"] {
  if (dbState === "open") return "outage";
  if (dbState === "half_open") return "degraded";
  return "operational";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: providers } = await supabase
      .from("provider_health")
      .select("provider_key, state, consecutive_failures, last_failure_at")
      .order("provider_key");

    const statuses: ProviderStatus[] = (providers ?? []).map((p: any) => ({
      key: p.provider_key,
      label: PROVIDER_LABELS[p.provider_key] ?? p.provider_key,
      state: mapState(p.state),
      consecutive_failures: p.consecutive_failures ?? 0,
      last_failure_at: p.last_failure_at,
    }));

    // Ensure standard providers always appear
    for (const [key, label] of Object.entries(PROVIDER_LABELS)) {
      if (!statuses.find((s) => s.key === key)) {
        statuses.push({ key, label, state: "operational", consecutive_failures: 0, last_failure_at: null });
      }
    }

    const overall: ProviderStatus["state"] = statuses.some((s) => s.state === "outage")
      ? "outage"
      : statuses.some((s) => s.state === "degraded")
        ? "degraded"
        : "operational";

    return new Response(
      JSON.stringify({
        overall,
        providers: statuses,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[public-status] error", err);
    return new Response(
      JSON.stringify({ overall: "operational", providers: [], error: "internal_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ============================================================
// Edge Function: cognitio-ops-metrics
// Log operational events and trigger alerts
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Alert thresholds
const ALERT_THRESHOLDS: Record<string, { severity: string; message: string }> = {
  hallucination_critical: { severity: "critical", message: "Hallucination critique détectée" },
  content_incorrect_repeated: { severity: "critical", message: "Contenu incorrect signalé plusieurs fois" },
  cost_per_session_high: { severity: "warning", message: "Coût/session au-dessus du seuil" },
  abandon_room1_high: { severity: "warning", message: "Taux d'abandon salle 1 élevé" },
  qa_score_low: { severity: "warning", message: "Score QA moyen trop faible" },
  medical_error: { severity: "critical", message: "Erreur médicale signalée" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { event_type, severity, mission_id, document_id, user_id, payload } = await req.json();

    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert event
    const { data: event, error } = await supabase
      .from("ops_events")
      .insert([{
        event_type,
        severity: severity || "info",
        mission_id: mission_id || null,
        document_id: document_id || null,
        user_id: user_id || null,
        payload_json: payload || {},
      }])
      .select("id")
      .single();

    if (error) throw new Error(`Event insert failed: ${error.message}`);

    // Check for alert conditions
    let alertTriggered = false;
    let alertMessage = "";

    const threshold = ALERT_THRESHOLDS[event_type];
    if (threshold && (severity === "critical" || severity === "error")) {
      alertTriggered = true;
      alertMessage = threshold.message;

      // Log alert event
      await supabase.from("ops_events").insert([{
        event_type: "alert_triggered",
        severity: "critical",
        payload_json: {
          source_event_id: event.id,
          source_event_type: event_type,
          alert_message: alertMessage,
        },
      }]);
    }

    return new Response(JSON.stringify({
      event_id: event.id,
      alert_triggered: alertTriggered,
      alert_message: alertTriggered ? alertMessage : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// OpenAI Video Provider — Sora API
// ============================================================

import type { VideoProvider, VideoOptions, VideoResult, VideoStatusResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const openaiVideoProvider: VideoProvider = {
  key: "openai_sora",

  async generateVideo(prompt, options) {
    let data: Record<string, unknown> | null = null;
    let lastError: Error | null = null;

    // Retry up to 2 times (3 attempts total) with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await supabase.functions.invoke("provider-openai-video", {
          body: { prompt, options },
        });
        if (result.error) {
          lastError = new Error(result.error.message);
          if (result.error.message?.includes("FunctionsFetchError") || result.error.message?.includes("timeout")) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            continue;
          }
          throw new Error(`Le service de génération vidéo est temporairement indisponible. Réessayez dans quelques instants. (${result.error.message})`);
        }
        data = result.data;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (!data) {
      throw new Error(
        lastError?.message?.startsWith("Le service")
          ? lastError.message
          : `Le service de génération vidéo (OpenAI) n'a pas répondu après 3 tentatives. Vérifiez votre connexion et réessayez. (${lastError?.message ?? "unknown"})`
      );
    }

    return data as unknown as VideoResult;
  },

  async getVideoStatus(generationId) {
    const { data, error } = await supabase.functions.invoke("provider-openai-video", {
      body: { action: "status", generation_id: generationId },
    });
    if (error) throw new Error(`Vérification du statut vidéo impossible : ${error.message}`);
    return data as VideoStatusResult;
  },
};

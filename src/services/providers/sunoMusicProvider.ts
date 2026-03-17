// ============================================================
// Suno Music Provider
// ============================================================

import type { MusicProvider, MusicGenerationInput, MusicResult, MusicStatusResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const sunoMusicProvider: MusicProvider = {
  key: "suno",

  async generateMusic(input) {
    let data: Record<string, unknown> | null = null;
    let lastError: Error | null = null;

    // Retry up to 2 times (3 attempts total) with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await supabase.functions.invoke("generate-music", {
          body: {
            title: input.title,
            lyrics: input.lyrics,
            style: input.style,
            instrumental: input.instrumental ?? false,
          },
        });
        if (result.error) {
          lastError = new Error(result.error.message);
          // Only retry on network/timeout errors, not on 4xx
          if (result.error.message?.includes("FunctionsFetchError") || result.error.message?.includes("timeout")) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            continue;
          }
          throw new Error(`Le service de génération musicale est temporairement indisponible. Réessayez dans quelques instants. (${result.error.message})`);
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
          : `Le service de génération musicale (Suno) n'a pas répondu après 3 tentatives. Vérifiez votre connexion et réessayez. (${lastError?.message ?? "unknown"})`
      );
    }

    return {
      task_id: (data.task_id ?? data.suno_task_id ?? "") as string,
      status: "pending" as const,
      audio_url: data.audio_url as string | undefined,
    };
  },

  async getStatus(taskId) {
    const { data, error } = await supabase.functions.invoke("generate-music", {
      body: { action: "status", task_id: taskId },
    });
    if (error) throw new Error(`Vérification du statut musical impossible : ${error.message}`);
    return data as MusicStatusResult;
  },
};

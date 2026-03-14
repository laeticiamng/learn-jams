// ============================================================
// Suno Music Provider
// ============================================================

import type { MusicProvider, MusicGenerationInput, MusicResult, MusicStatusResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const sunoMusicProvider: MusicProvider = {
  key: "suno",

  async generateMusic(input) {
    const { data, error } = await supabase.functions.invoke("generate-music", {
      body: {
        title: input.title,
        lyrics: input.lyrics,
        style: input.style,
        instrumental: input.instrumental ?? false,
      },
    });
    if (error) throw new Error(`Suno music generation failed: ${error.message}`);
    return {
      task_id: data.task_id ?? data.suno_task_id ?? "",
      status: "pending" as const,
      audio_url: data.audio_url,
    };
  },

  async getStatus(taskId) {
    const { data, error } = await supabase.functions.invoke("generate-music", {
      body: { action: "status", task_id: taskId },
    });
    if (error) throw new Error(`Suno status check failed: ${error.message}`);
    return data as MusicStatusResult;
  },
};

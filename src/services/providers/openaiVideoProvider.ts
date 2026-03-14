// ============================================================
// OpenAI Video Provider — Sora API
// ============================================================

import type { VideoProvider, VideoOptions, VideoResult, VideoStatusResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const openaiVideoProvider: VideoProvider = {
  key: "openai_sora",

  async generateVideo(prompt, options) {
    const { data, error } = await supabase.functions.invoke("provider-openai-video", {
      body: { prompt, options },
    });
    if (error) throw new Error(`OpenAI Video/Sora failed: ${error.message}`);
    return data as VideoResult;
  },

  async getVideoStatus(generationId) {
    const { data, error } = await supabase.functions.invoke("provider-openai-video", {
      body: { action: "status", generation_id: generationId },
    });
    if (error) throw new Error(`OpenAI Video status check failed: ${error.message}`);
    return data as VideoStatusResult;
  },
};

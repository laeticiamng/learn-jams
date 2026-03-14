// ============================================================
// OpenAI Image Provider — GPT Image / DALL-E
// ============================================================

import type { ImageProvider, ImageOptions, ImageResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const openaiImageProvider: ImageProvider = {
  key: "openai_gpt_image",

  async generateImage(prompt, options) {
    const { data, error } = await supabase.functions.invoke("provider-openai-image", {
      body: { prompt, options },
    });
    if (error) throw new Error(`OpenAI Image failed: ${error.message}`);
    return data as ImageResult;
  },
};

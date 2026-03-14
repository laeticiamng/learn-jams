// ============================================================
// OpenAI TTS Provider — Audio/Speech API
// ============================================================

import type { TTSProvider, TTSOptions, TTSResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const openaiTtsProvider: TTSProvider = {
  key: "openai_audio",

  async synthesize(text, options) {
    const { data, error } = await supabase.functions.invoke("provider-openai-tts", {
      body: { text, options },
    });
    if (error) throw new Error(`OpenAI TTS failed: ${error.message}`);
    // Edge function returns base64 audio
    const audioBase64 = (data as { audio_base64: string; duration_sec?: number; format: string }).audio_base64;
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return {
      audio_data: bytes.buffer,
      duration_sec: data.duration_sec,
      format: data.format ?? options?.format ?? "mp3",
    };
  },
};

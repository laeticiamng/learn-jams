// ============================================================
// OpenAI LLM Provider — Responses API
// ============================================================

import type { LLMProvider, LLMOptions, LLMResponse } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

/**
 * LLM calls go through Edge Functions to keep API keys server-side.
 * The edge function proxies to OpenAI Responses API.
 */
export const openaiLlmProvider: LLMProvider = {
  key: "openai_responses",

  async generateText(prompt, options) {
    const { data, error } = await supabase.functions.invoke("provider-openai-llm", {
      body: { prompt, options },
    });
    if (error) throw new Error(`OpenAI LLM failed: ${error.message}`);
    return data as LLMResponse;
  },

  async generateStructured<T>(prompt: string, schema: Record<string, unknown>, options?: LLMOptions): Promise<T> {
    const { data, error } = await supabase.functions.invoke("provider-openai-llm", {
      body: { prompt, schema, options, structured: true },
    });
    if (error) throw new Error(`OpenAI structured generation failed: ${error.message}`);
    return data.result as T;
  },
};

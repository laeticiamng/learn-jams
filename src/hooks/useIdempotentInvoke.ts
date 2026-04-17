// ============================================================
// useIdempotentInvoke — wraps supabase.functions.invoke and
// auto-attaches an Idempotency-Key header (UUID per call).
// ============================================================
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIdempotentInvoke() {
  return useCallback(
    async <T = unknown>(
      functionName: string,
      options?: { body?: Record<string, unknown> | FormData; idempotencyKey?: string },
    ): Promise<{ data: T | null; error: Error | null }> => {
      const key = options?.idempotencyKey ?? crypto.randomUUID();
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: options?.body,
          headers: { "Idempotency-Key": key },
        });
        if (error) return { data: null, error: error as Error };
        return { data: data as T, error: null };
      } catch (e) {
        return { data: null, error: e as Error };
      }
    },
    [],
  );
}

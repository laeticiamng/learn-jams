// ============================================================
// Idempotency helper — prevents duplicate execution of mutating
// endpoints when client retries or double-clicks.
//
// Usage in an edge function:
//   const idem = await checkIdempotency(supabaseAdmin, req, userId, "generate-music");
//   if (idem.cached) return idem.replay();
//   // ... do work, build `result` ...
//   await idem.complete(result, 200);
//   return new Response(JSON.stringify(result), { status: 200 });
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface IdempotencyHandle {
  cached: boolean;
  key: string | null;
  replay: () => Response;
  complete: (response: unknown, httpStatus: number, status?: "completed" | "failed") => Promise<void>;
}

const NOOP: IdempotencyHandle = {
  cached: false,
  key: null,
  replay: () => new Response("noop", { status: 500 }),
  complete: async () => {},
};

export async function checkIdempotency(
  supabase: SupabaseClient,
  req: Request,
  userId: string,
  endpoint: string,
  responseHeaders: HeadersInit = {},
): Promise<IdempotencyHandle> {
  const key = req.headers.get("Idempotency-Key");
  if (!key) return NOOP; // no key => no idempotency, caller proceeds normally

  // Try to claim the key
  const { data, error } = await supabase.rpc("get_or_create_idempotency", {
    p_key: key,
    p_user_id: userId,
    p_endpoint: endpoint,
  });

  if (error) {
    console.warn("[idempotency] rpc error, proceeding without:", error.message);
    return NOOP;
  }

  const payload = (data ?? {}) as {
    cached?: boolean;
    status?: string;
    response_json?: unknown;
    http_status?: number;
  };

  if (payload.cached) {
    return {
      cached: true,
      key,
      replay: () =>
        new Response(JSON.stringify(payload.response_json ?? { replay: true }), {
          status: payload.http_status ?? 200,
          headers: { ...responseHeaders, "Content-Type": "application/json", "X-Idempotent-Replay": "true" },
        }),
      complete: async () => {},
    };
  }

  return {
    cached: false,
    key,
    replay: () => new Response("no-replay", { status: 500 }),
    complete: async (response, httpStatus, status = "completed") => {
      try {
        await supabase.rpc("complete_idempotency", {
          p_key: key,
          p_user_id: userId,
          p_response: response as never,
          p_http_status: httpStatus,
          p_status: status,
        });
      } catch (e) {
        console.warn("[idempotency] complete failed:", (e as Error).message);
      }
    },
  };
}

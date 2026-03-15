// ============================================================
// Top-Up Service — Credit pack resolution and purchase
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { CreditPack, FeatureKey } from "@/domain/billing/pricing.types";

// ---------- Static Credit Packs ----------

export const CREDIT_PACKS: CreditPack[] = [
  { id: "", pack_key: "songs_5", label: "5 Extra Songs", price: 6.90, currency: "EUR", credits_json: { music_generation: 5 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "songs_15", label: "15 Extra Songs", price: 16.90, currency: "EUR", credits_json: { music_generation: 15 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "escape_5", label: "5 Extra Escape Games", price: 8.90, currency: "EUR", credits_json: { escape_game_generation: 5 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "escape_15", label: "15 Extra Escape Games", price: 21.90, currency: "EUR", credits_json: { escape_game_generation: 15 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "video_ai_30s", label: "+30s AI Video", price: 9.90, currency: "EUR", credits_json: { video_generation_ai_seconds: 30 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "video_ai_60s", label: "+60s AI Video", price: 18.90, currency: "EUR", credits_json: { video_generation_ai_seconds: 60 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "video_ai_120s", label: "+120s AI Video", price: 34.90, currency: "EUR", credits_json: { video_generation_ai_seconds: 120 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "sms_10", label: "10 Guardian SMS", price: 3.90, currency: "EUR", credits_json: { guardian_sms: 10 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
  { id: "", pack_key: "sms_50", label: "50 Guardian SMS", price: 14.90, currency: "EUR", credits_json: { guardian_sms: 50 }, stripe_price_id: null, active: true, created_at: "", updated_at: "" },
];

// ---------- Get packs for a specific feature ----------

export function getPacksForFeature(feature: FeatureKey): CreditPack[] {
  return CREDIT_PACKS.filter((p) => p.active && feature in p.credits_json);
}

// ---------- Provision credits after purchase ----------

export async function provisionCredits(
  userId: string,
  packKey: string,
  purchaseId: string,
): Promise<void> {
  const pack = CREDIT_PACKS.find((p) => p.pack_key === packKey);
  if (!pack) throw new Error(`Unknown pack: ${packKey}`);

  const entries = Object.entries(pack.credits_json) as [FeatureKey, number][];
  for (const [creditType, amount] of entries) {
    await (supabase as any).from("user_credit_balances").insert({
      user_id: userId,
      credit_type: creditType,
      remaining: amount,
      expires_at: null, // No expiration by default
      purchase_id: purchaseId,
    });
  }
}

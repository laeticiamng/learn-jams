// ============================================================
// Shared: Feature flag check for edge functions
// ============================================================

export async function isFeatureEnabled(
  supabase: any,
  flagKey: string,
  userId?: string | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_feature_enabled", {
    p_key: flagKey,
    p_user_id: userId ?? null,
  });
  if (error) {
    // Fail-open: if the RPC fails, assume enabled to avoid breaking the platform
    console.error("[featureFlag] RPC error", flagKey, error.message);
    return true;
  }
  return data === true;
}

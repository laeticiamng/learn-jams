// ============================================================
// Shared: Cost cap check for edge functions
// ============================================================

export interface CostCapResult {
  allowed: boolean;
  used_usd: number;
  cap_usd: number;
  remaining_usd: number;
  percent_used: number;
  threshold_pct: number;
}

export async function checkCostCap(
  supabase: any,
  userId: string,
): Promise<CostCapResult> {
  const { data, error } = await supabase.rpc("check_user_cost_cap", { p_user_id: userId });
  if (error || !data) {
    // Fail-open on infra error to avoid blocking legitimate users
    return {
      allowed: true,
      used_usd: 0,
      cap_usd: 0,
      remaining_usd: 0,
      percent_used: 0,
      threshold_pct: 80,
    };
  }
  return data as CostCapResult;
}

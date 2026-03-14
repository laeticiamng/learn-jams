// ============================================================
// Guardian Token Service — Secure invite token management
// ============================================================

/**
 * Validate a guardian invite token.
 */
export async function validateGuardianToken(
  supabase: any,
  token: string,
): Promise<{ valid: boolean; guardianId?: string; error?: string }> {
  if (!token || token.length < 10) {
    return { valid: false, error: "invalid_token_format" };
  }

  const { data: guardian } = await supabase
    .from("guardians")
    .select("id, invite_token, invite_expires_at, invite_used_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (!guardian) {
    return { valid: false, error: "token_not_found" };
  }

  // Check if already used
  if (guardian.invite_used_at) {
    return { valid: false, error: "token_already_used" };
  }

  // Check expiration
  if (guardian.invite_expires_at) {
    const expires = new Date(guardian.invite_expires_at);
    if (expires < new Date()) {
      return { valid: false, error: "token_expired" };
    }
  }

  return { valid: true, guardianId: guardian.id };
}

/**
 * Mark a guardian invite token as used (single-use enforcement).
 */
export async function consumeGuardianToken(
  supabase: any,
  guardianId: string,
): Promise<void> {
  await supabase
    .from("guardians")
    .update({
      invite_used_at: new Date().toISOString(),
      invite_token: null, // Clear token after use
    })
    .eq("id", guardianId);
}

/**
 * Revoke a guardian invite token.
 */
export async function revokeGuardianToken(
  supabase: any,
  guardianId: string,
): Promise<void> {
  await supabase
    .from("guardians")
    .update({
      invite_token: null,
      invite_expires_at: null,
    })
    .eq("id", guardianId);
}

/**
 * Check if a guardian has access to a specific child's data.
 */
export async function checkGuardianAccess(
  supabase: any,
  guardianId: string,
  childUserId: string,
): Promise<{ allowed: boolean; relationship?: string }> {
  const { data: link } = await supabase
    .from("user_guardians")
    .select("id, relationship, status")
    .eq("guardian_id", guardianId)
    .eq("user_id", childUserId)
    .eq("status", "active")
    .maybeSingle();

  if (!link) {
    return { allowed: false };
  }

  return { allowed: true, relationship: link.relationship };
}

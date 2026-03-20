// ============================================================
// Guardian Management Service
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { Guardian, UserGuardianLink, GuardianWithLink, GuardianInviteInput } from "@/domain/guardian/guardian.types";
import type { UserMinorProfile } from "@/domain/guardian/minorProfile.types";
import { DEFAULT_MINOR_PROFILE } from "@/domain/guardian/minorProfile.types";

// ── Minor Profile ──────────────────────────────────────────

export async function getMinorProfile(userId: string): Promise<UserMinorProfile | null> {
  const { data, error } = await supabase
    .from("user_minor_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as UserMinorProfile;
}

export async function upsertMinorProfile(
  userId: string,
  updates: Partial<Omit<UserMinorProfile, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<UserMinorProfile> {
  const { data, error } = await supabase
    .from("user_minor_profiles")
    .upsert(
      { user_id: userId, ...DEFAULT_MINOR_PROFILE, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(`Failed to upsert minor profile: ${error.message}`);
  return data as unknown as UserMinorProfile;
}

// ── Guardian Links ─────────────────────────────────────────

export async function getGuardiansForUser(userId: string): Promise<GuardianWithLink[]> {
  const { data: links, error: linksError } = await supabase
    .from("user_guardians")
    .select("*")
    .eq("user_id", userId);

  if (linksError || !links || links.length === 0) {
    if (linksError) console.warn("[guardianManagement] getGuardiansForUser links query failed:", linksError.message);
    return [];
  }

  const guardianIds = (links as unknown as UserGuardianLink[]).map(l => l.guardian_id);
  const { data: guardians, error: gError } = await supabase
    .from("guardians")
    .select("*")
    .in("id", guardianIds);

  if (gError || !guardians) {
    if (gError) console.warn("[guardianManagement] getGuardiansForUser guardians query failed:", gError.message);
    return [];
  }

  return (guardians as unknown as Guardian[]).map(g => ({
    ...g,
    link: (links as unknown as UserGuardianLink[]).find(l => l.guardian_id === g.id)!,
  }));
}

export async function revokeGuardianLink(userId: string, guardianId: string): Promise<void> {
  const { error } = await supabase
    .from("user_guardians")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("guardian_id", guardianId);

  if (error) throw new Error(`Failed to revoke guardian: ${error.message}`);
}

// ── Guardian Invite (calls edge function) ──────────────────

export async function inviteGuardian(input: GuardianInviteInput): Promise<{ guardian_id: string; invite_token: string }> {
  const { data, error } = await supabase.functions.invoke("guardian-invite", {
    body: input,
  });

  if (error) throw new Error(`Failed to invite guardian: ${error.message}`);
  return data;
}

// ── Accept Invite (calls edge function) ────────────────────

export async function acceptGuardianInvite(token: string): Promise<{ success: boolean; guardian_id: string }> {
  const { data, error } = await supabase.functions.invoke("guardian-accept-link", {
    body: { token },
  });

  if (error) throw new Error(`Failed to accept invite: ${error.message}`);
  return data;
}

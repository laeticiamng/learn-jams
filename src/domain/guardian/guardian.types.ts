// ============================================================
// Guardian Types
// ============================================================

export const GUARDIAN_RELATIONSHIPS = ["parent", "legal_guardian", "teacher", "institution_admin"] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export const GUARDIAN_LINK_STATUSES = ["pending", "active", "revoked"] as const;
export type GuardianLinkStatus = (typeof GUARDIAN_LINK_STATUSES)[number];

export interface Guardian {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  auth_user_id: string | null;
  verified_at: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
}

export interface UserGuardianLink {
  id: string;
  user_id: string;
  guardian_id: string;
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface GuardianWithLink extends Guardian {
  link: UserGuardianLink;
}

export interface GuardianInviteInput {
  guardian_email: string;
  guardian_name?: string;
  relationship: GuardianRelationship;
  minor_user_id: string;
}

// ============================================================
// Consent Event Types — Immutable audit log
// ============================================================

export const CONSENT_EVENT_TYPES = [
  "minor_declared",
  "guardian_invited",
  "guardian_accepted",
  "guardian_revoked",
  "consent_granted",
  "consent_withdrawn",
  "data_export_requested",
  "data_deletion_requested",
  "minor_mode_enabled",
  "minor_mode_disabled",
] as const;
export type ConsentEventType = (typeof CONSENT_EVENT_TYPES)[number];

export interface ConsentEvent {
  id: string;
  user_id: string;
  guardian_id: string | null;
  event_type: ConsentEventType;
  metadata_json: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ConsentEventInput {
  user_id: string;
  guardian_id?: string;
  event_type: ConsentEventType;
  metadata_json?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface InstitutionContact {
  id: string;
  institution_name: string;
  contact_email: string;
  contact_name: string | null;
  contact_role: string;
  country_code: string;
  contract_type: "trial" | "school" | "university" | "enterprise";
  max_users: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

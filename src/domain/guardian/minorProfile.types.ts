// ============================================================
// Minor Profile Types
// ============================================================

export const CONTENT_FILTER_LEVELS = ["standard", "strict", "institution"] as const;
export type ContentFilterLevel = (typeof CONTENT_FILTER_LEVELS)[number];

export interface UserMinorProfile {
  id: string;
  user_id: string;
  is_minor: boolean;
  birth_year: number | null;
  country_code: string;
  minor_mode_enabled: boolean;
  content_filter_level: ContentFilterLevel;
  max_daily_minutes: number;
  allowed_hours_start: number;
  allowed_hours_end: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_MINOR_PROFILE: Omit<UserMinorProfile, "id" | "user_id" | "created_at" | "updated_at"> = {
  is_minor: false,
  birth_year: null,
  country_code: "FR",
  minor_mode_enabled: false,
  content_filter_level: "standard",
  max_daily_minutes: 120,
  allowed_hours_start: 6,
  allowed_hours_end: 22,
};

export function isMinorByBirthYear(birthYear: number, referenceYear = new Date().getFullYear()): boolean {
  return referenceYear - birthYear < 18;
}

export function isWithinAllowedHours(profile: Pick<UserMinorProfile, "allowed_hours_start" | "allowed_hours_end">): boolean {
  const hour = new Date().getHours();
  return hour >= profile.allowed_hours_start && hour < profile.allowed_hours_end;
}

// ============================================================
// Guardian Domain Validators
// ============================================================

import { CONTENT_FILTER_LEVELS, type UserMinorProfile, isMinorByBirthYear } from "./minorProfile.types";
import { GUARDIAN_RELATIONSHIPS, type GuardianInviteInput } from "./guardian.types";
import { CONSENT_EVENT_TYPES, type ConsentEventType, type ConsentEventInput } from "./consent.types";
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, type NotificationType, type NotificationChannel } from "./notification.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Minor Profile ──────────────────────────────────────────

export function validateMinorProfile(
  profile: Partial<UserMinorProfile>,
): string[] {
  const errors: string[] = [];

  if (profile.birth_year !== undefined && profile.birth_year !== null) {
    const currentYear = new Date().getFullYear();
    if (profile.birth_year < 1900 || profile.birth_year > currentYear) {
      errors.push(`birth_year must be between 1900 and ${currentYear}`);
    }
  }

  if (profile.content_filter_level !== undefined) {
    if (!(CONTENT_FILTER_LEVELS as readonly string[]).includes(profile.content_filter_level)) {
      errors.push(`content_filter_level must be one of: ${CONTENT_FILTER_LEVELS.join(", ")}`);
    }
  }

  if (profile.max_daily_minutes !== undefined) {
    if (profile.max_daily_minutes < 10 || profile.max_daily_minutes > 480) {
      errors.push("max_daily_minutes must be between 10 and 480");
    }
  }

  if (profile.allowed_hours_start !== undefined || profile.allowed_hours_end !== undefined) {
    const start = profile.allowed_hours_start ?? 6;
    const end = profile.allowed_hours_end ?? 22;
    if (start < 0 || start > 23) errors.push("allowed_hours_start must be 0-23");
    if (end < 0 || end > 23) errors.push("allowed_hours_end must be 0-23");
    if (start >= end) errors.push("allowed_hours_start must be less than allowed_hours_end");
  }

  return errors;
}

// ── Guardian Invite ────────────────────────────────────────

export function validateGuardianInvite(input: GuardianInviteInput): string[] {
  const errors: string[] = [];

  if (!input.guardian_email || !EMAIL_RE.test(input.guardian_email)) {
    errors.push("guardian_email must be a valid email address");
  }

  if (!input.minor_user_id) {
    errors.push("minor_user_id is required");
  }

  if (!(GUARDIAN_RELATIONSHIPS as readonly string[]).includes(input.relationship)) {
    errors.push(`relationship must be one of: ${GUARDIAN_RELATIONSHIPS.join(", ")}`);
  }

  return errors;
}

// ── Consent Event ──────────────────────────────────────────

export function validateConsentEventInput(input: ConsentEventInput): string[] {
  const errors: string[] = [];

  if (!input.user_id) errors.push("user_id is required");

  if (!(CONSENT_EVENT_TYPES as readonly string[]).includes(input.event_type)) {
    errors.push(`event_type must be one of: ${CONSENT_EVENT_TYPES.join(", ")}`);
  }

  return errors;
}

export function isValidConsentEventType(type: string): type is ConsentEventType {
  return (CONSENT_EVENT_TYPES as readonly string[]).includes(type);
}

export function isValidNotificationType(type: string): type is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export function isValidNotificationChannel(channel: string): channel is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(channel);
}

// ── Age Verification ───────────────────────────────────────

export function requiresGuardianConsent(birthYear: number | null, countryCode: string = "FR"): boolean {
  if (!birthYear) return false;
  const age = new Date().getFullYear() - birthYear;
  // GDPR: most EU countries require parental consent for <16
  // France: <15 requires consent (CNIL)
  if (countryCode === "FR") return age < 15;
  return age < 16;
}

export function computeMinorStatus(birthYear: number | null): {
  isMinor: boolean;
  requiresConsent: boolean;
  age: number | null;
} {
  if (!birthYear) return { isMinor: false, requiresConsent: false, age: null };
  const age = new Date().getFullYear() - birthYear;
  return {
    isMinor: age < 18,
    requiresConsent: age < 16,
    age,
  };
}

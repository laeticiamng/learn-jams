// ============================================================
// Tests: Guardian Domain Validators
// ============================================================

import { describe, it, expect } from "vitest";
import {
  validateMinorProfile,
  validateGuardianInvite,
  validateConsentEventInput,
  isValidConsentEventType,
  isValidNotificationType,
  isValidNotificationChannel,
  requiresGuardianConsent,
  computeMinorStatus,
} from "./guardian.validators";

describe("validateMinorProfile", () => {
  it("accepts empty/partial profile with no errors", () => {
    expect(validateMinorProfile({})).toHaveLength(0);
  });

  it("rejects birth_year in the future", () => {
    const errors = validateMinorProfile({ birth_year: 2030 });
    expect(errors.some(e => e.includes("birth_year"))).toBe(true);
  });

  it("rejects birth_year before 1900", () => {
    const errors = validateMinorProfile({ birth_year: 1800 });
    expect(errors.some(e => e.includes("birth_year"))).toBe(true);
  });

  it("accepts valid birth_year", () => {
    expect(validateMinorProfile({ birth_year: 2010 })).toHaveLength(0);
  });

  it("rejects invalid content_filter_level", () => {
    const errors = validateMinorProfile({ content_filter_level: "ultra" as any });
    expect(errors.some(e => e.includes("content_filter_level"))).toBe(true);
  });

  it("rejects max_daily_minutes out of range", () => {
    expect(validateMinorProfile({ max_daily_minutes: 5 }).length).toBeGreaterThan(0);
    expect(validateMinorProfile({ max_daily_minutes: 500 }).length).toBeGreaterThan(0);
  });

  it("rejects start >= end for allowed hours", () => {
    const errors = validateMinorProfile({ allowed_hours_start: 22, allowed_hours_end: 6 });
    expect(errors.some(e => e.includes("allowed_hours_start"))).toBe(true);
  });
});

describe("validateGuardianInvite", () => {
  it("accepts valid invite", () => {
    const errors = validateGuardianInvite({
      guardian_email: "parent@example.com",
      relationship: "parent",
      minor_user_id: "user-123",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid email", () => {
    const errors = validateGuardianInvite({
      guardian_email: "not-email",
      relationship: "parent",
      minor_user_id: "user-123",
    });
    expect(errors.some(e => e.includes("email"))).toBe(true);
  });

  it("rejects missing minor_user_id", () => {
    const errors = validateGuardianInvite({
      guardian_email: "parent@example.com",
      relationship: "parent",
      minor_user_id: "",
    });
    expect(errors.some(e => e.includes("minor_user_id"))).toBe(true);
  });

  it("rejects invalid relationship", () => {
    const errors = validateGuardianInvite({
      guardian_email: "parent@example.com",
      relationship: "friend" as any,
      minor_user_id: "user-123",
    });
    expect(errors.some(e => e.includes("relationship"))).toBe(true);
  });
});

describe("validateConsentEventInput", () => {
  it("accepts valid consent event", () => {
    const errors = validateConsentEventInput({
      user_id: "user-123",
      event_type: "minor_declared",
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects missing user_id", () => {
    const errors = validateConsentEventInput({
      user_id: "",
      event_type: "minor_declared",
    });
    expect(errors.some(e => e.includes("user_id"))).toBe(true);
  });

  it("rejects invalid event_type", () => {
    const errors = validateConsentEventInput({
      user_id: "user-123",
      event_type: "invalid_type" as any,
    });
    expect(errors.some(e => e.includes("event_type"))).toBe(true);
  });
});

describe("type guards", () => {
  it("isValidConsentEventType works", () => {
    expect(isValidConsentEventType("minor_declared")).toBe(true);
    expect(isValidConsentEventType("fake")).toBe(false);
  });

  it("isValidNotificationType works", () => {
    expect(isValidNotificationType("weekly_summary")).toBe(true);
    expect(isValidNotificationType("fake")).toBe(false);
  });

  it("isValidNotificationChannel works", () => {
    expect(isValidNotificationChannel("email")).toBe(true);
    expect(isValidNotificationChannel("pigeon")).toBe(false);
  });
});

describe("requiresGuardianConsent", () => {
  it("returns false for null birth_year", () => {
    expect(requiresGuardianConsent(null)).toBe(false);
  });

  it("returns true for young minor in France", () => {
    const currentYear = new Date().getFullYear();
    expect(requiresGuardianConsent(currentYear - 12, "FR")).toBe(true);
  });

  it("returns false for adult", () => {
    expect(requiresGuardianConsent(1990, "FR")).toBe(false);
  });

  it("uses 16 threshold for non-FR countries", () => {
    const currentYear = new Date().getFullYear();
    expect(requiresGuardianConsent(currentYear - 15, "DE")).toBe(true);
    expect(requiresGuardianConsent(currentYear - 17, "DE")).toBe(false);
  });
});

describe("computeMinorStatus", () => {
  it("returns not minor for null birth_year", () => {
    const status = computeMinorStatus(null);
    expect(status.isMinor).toBe(false);
    expect(status.age).toBeNull();
  });

  it("computes correct status for minor", () => {
    const currentYear = new Date().getFullYear();
    const status = computeMinorStatus(currentYear - 14);
    expect(status.isMinor).toBe(true);
    expect(status.requiresConsent).toBe(true);
    expect(status.age).toBe(14);
  });

  it("computes correct status for adult", () => {
    const status = computeMinorStatus(1990);
    expect(status.isMinor).toBe(false);
    expect(status.requiresConsent).toBe(false);
  });
});

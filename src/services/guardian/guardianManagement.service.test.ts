// ============================================================
// Tests: Guardian Management Service (unit-testable parts)
// ============================================================

import { describe, it, expect } from "vitest";
import { isMinorByBirthYear, isWithinAllowedHours } from "@/domain/guardian/minorProfile.types";
import { computeMinorStatus, requiresGuardianConsent } from "@/domain/guardian/guardian.validators";

describe("isMinorByBirthYear", () => {
  it("returns true for birth year within 18 years of reference", () => {
    expect(isMinorByBirthYear(2015, 2026)).toBe(true);
  });

  it("returns false for adult", () => {
    expect(isMinorByBirthYear(2000, 2026)).toBe(false);
  });

  it("returns false for exactly 18", () => {
    expect(isMinorByBirthYear(2008, 2026)).toBe(false);
  });
});

describe("isWithinAllowedHours", () => {
  it("validates against profile hours", () => {
    const profile = { allowed_hours_start: 0, allowed_hours_end: 23 };
    expect(isWithinAllowedHours(profile)).toBe(true);
  });
});

describe("computeMinorStatus", () => {
  it("handles null birth year", () => {
    const status = computeMinorStatus(null);
    expect(status.isMinor).toBe(false);
    expect(status.age).toBeNull();
  });

  it("detects minor correctly", () => {
    const currentYear = new Date().getFullYear();
    const status = computeMinorStatus(currentYear - 10);
    expect(status.isMinor).toBe(true);
    expect(status.requiresConsent).toBe(true);
    expect(status.age).toBe(10);
  });
});

describe("requiresGuardianConsent", () => {
  it("returns false for null", () => {
    expect(requiresGuardianConsent(null)).toBe(false);
  });

  it("uses CNIL threshold for France (15)", () => {
    const currentYear = new Date().getFullYear();
    // 14 year old in France -> requires consent
    expect(requiresGuardianConsent(currentYear - 14, "FR")).toBe(true);
    // 15 year old in France -> no consent needed
    expect(requiresGuardianConsent(currentYear - 15, "FR")).toBe(false);
  });
});

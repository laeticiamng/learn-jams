// ============================================================
// Tests: Experiments Service
// ============================================================

import { describe, it, expect } from "vitest";
import { assignVariantLocally } from "./experiments.service";

describe("assignVariantLocally", () => {
  it("returns a valid variant", () => {
    const variant = assignVariantLocally("test_exp", "user-123");
    expect(["control", "baseline_summary", "dynamic_sheet", "animated_story"]).toContain(variant);
  });

  it("returns same variant for same user + experiment", () => {
    const v1 = assignVariantLocally("test_exp", "user-123");
    const v2 = assignVariantLocally("test_exp", "user-123");
    expect(v1).toBe(v2);
  });

  it("may return different variant for different experiment key", () => {
    const v1 = assignVariantLocally("exp_a", "user-123");
    const v2 = assignVariantLocally("exp_b", "user-123");
    // Not guaranteed to differ, but runs without error
    expect(["control", "baseline_summary", "dynamic_sheet", "animated_story"]).toContain(v1);
    expect(["control", "baseline_summary", "dynamic_sheet", "animated_story"]).toContain(v2);
  });

  it("distributes variants across users", () => {
    const variants = new Set<string>();
    for (let i = 0; i < 100; i++) {
      variants.add(assignVariantLocally("test_exp", `user-${i}`));
    }
    // With 100 users, should have at least 2 different variants
    expect(variants.size).toBeGreaterThanOrEqual(2);
  });
});
